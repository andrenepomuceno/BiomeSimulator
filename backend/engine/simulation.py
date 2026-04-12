"""Simulation runner — manages the game loop in a background thread."""

import threading
import time
import random

from engine.world import World, WATER, ROCK
from engine.map_generator import generate_terrain
from engine.entities import Animal
from engine.spatial_hash import SpatialHash
from engine.flora import seed_initial_plants, process_plants
from engine.behaviors import decide_and_act


class SimulationRunner:
    """Runs the simulation loop in a background thread."""

    def __init__(self, config, on_tick=None):
        self.config = config
        self.world = None
        self.spatial_hash = SpatialHash(cell_size=16)
        self.on_tick = on_tick  # callback(world) called after each tick

        self._running = False
        self._paused = True
        self._thread = None
        self._tps = config.get("ticks_per_second", 10)
        self._lock = threading.Lock()

        self._step_event = threading.Event()

    def generate_world(self):
        """Generate a new world with terrain, plants, and animals."""
        with self._lock:
            self.world = World(self.config)
            terrain, water_prox, seed = generate_terrain(self.config)
            self.world.terrain = terrain
            self.world.water_proximity = water_prox

            # Seed plants
            seed_initial_plants(self.world)

            # Spawn animals
            self._spawn_animals()

            # Build spatial hash
            self.spatial_hash.rebuild(self.world.animals)

        return seed

    def _spawn_animals(self):
        """Place initial animals on walkable terrain."""
        w = self.world
        h, width = w.terrain.shape

        for species, count_key in [("HERBIVORE", "initial_herbivore_count"),
                                    ("CARNIVORE", "initial_carnivore_count")]:
            count = self.config.get(count_key, 10)
            species_config = self.config["animal_species"][species]
            placed = 0
            attempts = 0
            while placed < count and attempts < count * 50:
                x = random.randint(0, width - 1)
                y = random.randint(0, h - 1)
                if w.terrain[y, x] not in (WATER, ROCK):
                    animal = Animal(w.next_id(), x, y, species, species_config)
                    w.animals.append(animal)
                    placed += 1
                attempts += 1

    def start(self):
        """Start the simulation thread."""
        if self._running:
            return
        if self.world is None:
            self.generate_world()
        self._running = True
        self._paused = False
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def pause(self):
        self._paused = True

    def resume(self):
        self._paused = False

    def step(self):
        """Advance exactly one tick (while paused)."""
        self._step_event.set()

    def stop(self):
        self._running = False
        self._step_event.set()
        if self._thread:
            self._thread.join(timeout=2)
            self._thread = None

    def set_speed(self, tps):
        self._tps = max(1, min(120, tps))

    @property
    def tps(self):
        return self._tps

    @property
    def paused(self):
        return self._paused

    def _loop(self):
        """Main simulation loop."""
        while self._running:
            if self._paused:
                # Wait for step event or unpause
                self._step_event.wait(timeout=0.1)
                if self._step_event.is_set():
                    self._step_event.clear()
                    if self._running:
                        self._tick()
                continue

            start = time.perf_counter()
            self._tick()
            elapsed = time.perf_counter() - start

            # Sleep to maintain target TPS
            target_dt = 1.0 / self._tps
            sleep_time = target_dt - elapsed
            if sleep_time > 0:
                time.sleep(sleep_time)

    def _tick(self):
        """Process one simulation tick."""
        with self._lock:
            w = self.world
            w.plant_changes = []

            # Advance clock
            w.clock.advance()

            # Process flora
            process_plants(w)

            # Process fauna
            alive_animals = [a for a in w.animals if a.alive]
            for animal in alive_animals:
                decide_and_act(animal, w, self.spatial_hash)

            # Update spatial hash for moved/dead animals
            self.spatial_hash.rebuild([a for a in w.animals if a.alive])

            # Clean up dead animals periodically (every 50 ticks)
            if w.clock.tick % 50 == 0:
                w.animals = [a for a in w.animals if a.alive]

            # Record stats periodically
            if w.clock.tick % 10 == 0:
                stats = w.get_stats()
                stats["tick"] = w.clock.tick
                w.stats_history.append(stats)
                # Keep last 1000 samples
                if len(w.stats_history) > 1000:
                    w.stats_history = w.stats_history[-1000:]

        # Notify listeners
        if self.on_tick:
            self.on_tick(w)

    def get_state_for_viewport(self, vx, vy, vw, vh, buffer=20):
        """Get simulation state scoped to a viewport rectangle."""
        with self._lock:
            w = self.world
            if w is None:
                return None

            # Viewport bounds with buffer
            x1 = max(0, vx - buffer)
            y1 = max(0, vy - buffer)
            x2 = min(w.width, vx + vw + buffer)
            y2 = min(w.height, vy + vh + buffer)

            # Animals in viewport
            animals_data = []
            for a in w.animals:
                if a.alive and x1 <= a.x < x2 and y1 <= a.y < y2:
                    animals_data.append(a.to_dict())

            return {
                "clock": w.clock.to_dict(),
                "animals": animals_data,
                "plant_changes": w.plant_changes[:5000],  # cap for bandwidth
            }

    def get_full_state(self):
        """Get complete state for initial load."""
        with self._lock:
            w = self.world
            if w is None:
                return None

            return {
                "clock": w.clock.to_dict(),
                "animals": [a.to_dict() for a in w.animals if a.alive],
                "stats": w.get_stats(),
            }

    def edit_terrain(self, changes):
        """Apply terrain edits: list of {x, y, terrain}."""
        with self._lock:
            w = self.world
            for c in changes:
                x, y, t = c["x"], c["y"], c["terrain"]
                if 0 <= x < w.width and 0 <= y < w.height:
                    w.terrain[y, x] = t

            # Recompute water proximity (full recompute for simplicity)
            from engine.map_generator import _compute_water_proximity
            w.water_proximity = _compute_water_proximity(w.terrain)

    def place_entity(self, entity_type, x, y):
        """Place a new entity at (x, y)."""
        with self._lock:
            w = self.world
            if not (0 <= x < w.width and 0 <= y < w.height):
                return None

            if entity_type in ("HERBIVORE", "CARNIVORE"):
                species_config = w.config["animal_species"][entity_type]
                animal = Animal(w.next_id(), x, y, entity_type, species_config)
                w.animals.append(animal)
                self.spatial_hash.insert(animal)
                return animal.to_dict()
            elif entity_type in ("TREE", "BUSH", "GRASS_PLANT"):
                from engine.flora import P_TREE, P_BUSH, P_GRASS, S_MATURE
                type_map = {"TREE": P_TREE, "BUSH": P_BUSH, "GRASS_PLANT": P_GRASS}
                ptype = type_map[entity_type]
                w.plant_grid[y, x]["type"] = ptype
                w.plant_grid[y, x]["stage"] = S_MATURE
                w.plant_grid[y, x]["age"] = 100
                w.plant_grid[y, x]["fruit"] = 0
                return {"type": entity_type, "x": x, "y": y}
            return None

    def remove_entity(self, entity_id):
        """Remove an entity by ID."""
        with self._lock:
            w = self.world
            for a in w.animals:
                if a.id == entity_id:
                    a.alive = False
                    a.state = 9  # DEAD
                    self.spatial_hash.remove(a)
                    return True
            return False
