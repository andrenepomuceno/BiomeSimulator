"""World model — holds terrain, plant layer, animals, and simulation clock."""

import numpy as np

# Terrain types
WATER = 0
SAND = 1
DIRT = 2
GRASS = 3
ROCK = 4

TERRAIN_NAMES = {WATER: "water", SAND: "sand", DIRT: "dirt", GRASS: "grass", ROCK: "rock"}

# Plant dtype for structured numpy array
PLANT_DTYPE = np.dtype([
    ("type", np.uint8),    # 0=NONE, 1=GRASS, 2=BUSH, 3=TREE
    ("stage", np.uint8),   # 0=NONE, 1=SEED, 2=SPROUT, 3=MATURE, 4=FRUITING, 5=DEAD
    ("age", np.uint16),
    ("fruit", np.uint8),   # 0 or 1
])


class Clock:
    """Tracks simulation time: ticks, day count, day/night phase."""

    def __init__(self, ticks_per_day=200, day_fraction=0.6):
        self.tick = 0
        self.ticks_per_day = ticks_per_day
        self.day_fraction = day_fraction

    @property
    def day_number(self):
        return self.tick // self.ticks_per_day

    @property
    def tick_in_day(self):
        return self.tick % self.ticks_per_day

    @property
    def is_night(self):
        return self.tick_in_day >= int(self.ticks_per_day * self.day_fraction)

    def advance(self):
        self.tick += 1

    def to_dict(self):
        return {
            "tick": self.tick,
            "day": self.day_number,
            "tick_in_day": self.tick_in_day,
            "is_night": self.is_night,
            "ticks_per_day": self.ticks_per_day,
        }


class World:
    """Container for all simulation state."""

    def __init__(self, config):
        self.config = config
        w, h = config["map_width"], config["map_height"]
        self.width = w
        self.height = h

        # Terrain: uint8 MxN
        self.terrain = np.zeros((h, w), dtype=np.uint8)

        # Water proximity: uint8 MxN (distance to nearest water tile, capped at 255)
        self.water_proximity = np.full((h, w), 255, dtype=np.uint8)

        # Plant layer: structured array MxN
        self.plant_grid = np.zeros((h, w), dtype=PLANT_DTYPE)

        # Animals: list of Animal objects
        self.animals = []

        # Next entity ID counter
        self._next_id = 1

        # Clock
        self.clock = Clock(
            ticks_per_day=config.get("ticks_per_day", 200),
            day_fraction=config.get("day_fraction", 0.6),
        )

        # Stats history (sampled periodically)
        self.stats_history = []

        # Dirty tracking for plant changes per tick
        self.plant_changes = []

    def next_id(self):
        eid = self._next_id
        self._next_id += 1
        return eid

    def is_walkable(self, x, y):
        """Check if a tile is walkable by land animals."""
        if x < 0 or y < 0 or x >= self.width or y >= self.height:
            return False
        t = self.terrain[y, x]
        return t not in (WATER, ROCK)

    def is_water_adjacent(self, x, y):
        """Check if any neighbor of (x,y) is water."""
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                if dx == 0 and dy == 0:
                    continue
                nx, ny = x + dx, y + dy
                if 0 <= nx < self.width and 0 <= ny < self.height:
                    if self.terrain[ny, nx] == WATER:
                        return True
        return False

    def get_stats(self):
        """Return current population statistics."""
        plant_mask = self.plant_grid["type"] > 0
        alive_plants = self.plant_grid["stage"][plant_mask]
        alive_plants = alive_plants[(alive_plants > 0) & (alive_plants < 5)]

        herbs = sum(1 for a in self.animals if a.species == "HERBIVORE" and a.alive)
        carns = sum(1 for a in self.animals if a.species == "CARNIVORE" and a.alive)
        fruits = int(np.sum(self.plant_grid["fruit"]))

        grass_count = int(np.sum((self.plant_grid["type"] == 1) & (self.plant_grid["stage"] > 0) & (self.plant_grid["stage"] < 5)))
        bush_count = int(np.sum((self.plant_grid["type"] == 2) & (self.plant_grid["stage"] > 0) & (self.plant_grid["stage"] < 5)))
        tree_count = int(np.sum((self.plant_grid["type"] == 3) & (self.plant_grid["stage"] > 0) & (self.plant_grid["stage"] < 5)))

        return {
            "herbivores": herbs,
            "carnivores": carns,
            "plants_grass": grass_count,
            "plants_bush": bush_count,
            "plants_tree": tree_count,
            "plants_total": grass_count + bush_count + tree_count,
            "fruits": fruits,
        }
