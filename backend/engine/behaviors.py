"""Animal behavior — state machine and decision logic."""

import random
import math
from engine.entities import Animal, AnimalState
from engine.pathfinding import a_star
from engine.world import WATER


def decide_and_act(animal, world, spatial_hash):
    """Process one tick for an animal: decide action, execute it."""
    if not animal.alive:
        return

    # Update needs
    animal.tick_needs()

    # Die of old age or zero energy
    if animal.age > animal.max_age or animal.energy <= 0:
        animal.alive = False
        animal.state = AnimalState.DEAD
        return

    # State machine decision
    if animal.state == AnimalState.SLEEPING:
        _do_sleep(animal)
        return

    if animal.state == AnimalState.EATING:
        _do_eat(animal, world)
        return

    if animal.state == AnimalState.DRINKING:
        _do_drink(animal, world)
        return

    # --- Priority-based decision ---

    # 1. Critical thirst → seek water
    if animal.thirst > 80:
        if world.is_water_adjacent(animal.x, animal.y):
            animal.state = AnimalState.DRINKING
            animal.apply_energy_cost("DRINK")
            return
        _seek_water(animal, world)
        return

    # 2. Critical hunger → seek food
    if animal.hunger > 70:
        if animal.species == "HERBIVORE":
            _seek_plant_food(animal, world)
        else:
            _seek_prey(animal, world, spatial_hash)
        return

    # 3. Low energy → sleep
    if animal.energy < 20:
        animal.state = AnimalState.SLEEPING
        return

    # 4. Flee from predators (herbivores only)
    if animal.species == "HERBIVORE":
        threat = _find_nearest_threat(animal, spatial_hash)
        if threat:
            _flee_from(animal, threat, world)
            return

    # 5. Mating opportunity
    if (animal.age >= animal.mature_age and
            animal.mate_cooldown <= 0 and
            animal.energy > 60):
        mate = _find_mate(animal, spatial_hash)
        if mate:
            _do_mate(animal, mate, world)
            return

    # 6. Idle or wander
    if animal.path and animal.path_index < len(animal.path):
        _follow_path(animal, world)
    elif random.random() < 0.3:
        _random_walk(animal, world)
    else:
        animal.state = AnimalState.IDLE
        animal.apply_energy_cost("IDLE")


def _do_sleep(animal):
    """Sleep: recover energy. Wake up when energy is above 60."""
    animal.apply_energy_cost("SLEEP")  # negative cost = recovery
    if animal.energy >= 60:
        animal.state = AnimalState.IDLE


def _do_eat(animal, world):
    """Eat: reduce hunger, then go idle."""
    animal.hunger = max(0, animal.hunger - 25)
    animal.apply_energy_cost("EAT")
    animal.state = AnimalState.IDLE


def _do_drink(animal, world):
    """Drink: reduce thirst, then go idle."""
    animal.thirst = max(0, animal.thirst - 30)
    animal.apply_energy_cost("DRINK")
    animal.state = AnimalState.IDLE


def _seek_water(animal, world):
    """Move toward nearest water tile."""
    if animal.path and animal.path_index < len(animal.path):
        _follow_path(animal, world)
        return

    # Find nearest water via simple spiral search
    best = None
    best_dist = float("inf")
    r = animal.vision_range
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            nx, ny = animal.x + dx, animal.y + dy
            if 0 <= nx < world.width and 0 <= ny < world.height:
                if world.terrain[ny, nx] == WATER:
                    d = abs(dx) + abs(dy)
                    if d < best_dist:
                        best_dist = d
                        best = (nx, ny)

    if best:
        # Path to a walkable tile adjacent to water
        animal.path = a_star(animal.x, animal.y, best[0], best[1], world, max_dist=50)
        animal.path_index = 0

    if animal.path:
        _follow_path(animal, world)
    else:
        _random_walk(animal, world)


def _seek_plant_food(animal, world):
    """Herbivore seeks fruit or edible plants nearby."""
    # Check current tile
    pg = world.plant_grid[animal.y, animal.x]
    if pg["fruit"] > 0:
        world.plant_grid[animal.y, animal.x]["fruit"] = 0
        animal.state = AnimalState.EATING
        animal.apply_energy_cost("EAT")
        animal.hunger = max(0, animal.hunger - 25)
        world.plant_changes.append((animal.x, animal.y, int(pg["type"]), int(pg["stage"])))
        return

    # Search nearby for fruit
    best = None
    best_dist = float("inf")
    r = animal.vision_range
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            nx, ny = animal.x + dx, animal.y + dy
            if 0 <= nx < world.width and 0 <= ny < world.height:
                if world.plant_grid[ny, nx]["fruit"] > 0:
                    d = abs(dx) + abs(dy)
                    if d < best_dist:
                        best_dist = d
                        best = (nx, ny)

    if best:
        animal.path = a_star(animal.x, animal.y, best[0], best[1], world, max_dist=30)
        animal.path_index = 0
        if animal.path:
            _follow_path(animal, world)
            return

    # No fruit found — eat grass/bush if on one
    if pg["type"] > 0 and pg["stage"] >= 3:
        # Eat the plant (degrade it)
        world.plant_grid[animal.y, animal.x]["stage"] = max(1, pg["stage"] - 1)
        animal.state = AnimalState.EATING
        animal.hunger = max(0, animal.hunger - 15)
        world.plant_changes.append((animal.x, animal.y, int(pg["type"]), int(world.plant_grid[animal.y, animal.x]["stage"])))
        return

    _random_walk(animal, world)


def _seek_prey(animal, world, spatial_hash):
    """Carnivore seeks nearest herbivore."""
    nearby = spatial_hash.query_radius(animal.x, animal.y, animal.vision_range)
    prey = [e for e in nearby if e.species == "HERBIVORE" and e.alive and e.id != animal.id]

    if not prey:
        _random_walk(animal, world)
        return

    # Find closest prey
    target = min(prey, key=lambda p: abs(p.x - animal.x) + abs(p.y - animal.y))
    dist = abs(target.x - animal.x) + abs(target.y - animal.y)

    if dist <= 1:
        # Attack!
        _attack(animal, target, world)
    else:
        # Chase (run toward prey)
        animal.path = a_star(animal.x, animal.y, target.x, target.y, world, max_dist=30)
        animal.path_index = 0
        animal.state = AnimalState.RUNNING
        if animal.path:
            # Move up to speed tiles along path
            for _ in range(animal.speed):
                _follow_path(animal, world)
        animal.apply_energy_cost("RUN")


def _attack(attacker, defender, world):
    """Resolve an attack between two animals."""
    attacker.state = AnimalState.ATTACKING
    attacker.apply_energy_cost("ATTACK")
    attacker.attack_cooldown = 3

    damage = attacker._config["attack_power"] - defender._config["defense"] * 0.5
    damage = max(1, damage)
    defender.energy -= damage

    if defender.energy <= 0:
        defender.alive = False
        defender.state = AnimalState.DEAD
        # Eating the kill restores hunger
        attacker.hunger = max(0, attacker.hunger - 50)
        attacker.state = AnimalState.EATING


def _find_nearest_threat(animal, spatial_hash):
    """Find the nearest carnivore within vision range."""
    nearby = spatial_hash.query_radius(animal.x, animal.y, animal.vision_range)
    threats = [e for e in nearby if e.species == "CARNIVORE" and e.alive and e.id != animal.id]
    if not threats:
        return None
    return min(threats, key=lambda t: abs(t.x - animal.x) + abs(t.y - animal.y))


def _flee_from(animal, threat, world):
    """Run away from a threat."""
    dx = animal.x - threat.x
    dy = animal.y - threat.y
    dist = max(1, abs(dx) + abs(dy))
    # Normalize direction and move away
    fx = animal.x + int(round(dx / dist * 3))
    fy = animal.y + int(round(dy / dist * 3))
    fx = max(0, min(world.width - 1, fx))
    fy = max(0, min(world.height - 1, fy))

    if world.is_walkable(fx, fy):
        animal.x, animal.y = fx, fy
    animal.state = AnimalState.FLEEING
    animal.apply_energy_cost("FLEE")


def _find_mate(animal, spatial_hash):
    """Find eligible mate of same species nearby."""
    nearby = spatial_hash.query_radius(animal.x, animal.y, 3)
    candidates = [
        e for e in nearby
        if e.species == animal.species and e.alive and e.id != animal.id
        and e.age >= e.mature_age and e.mate_cooldown <= 0 and e.energy > 50
    ]
    if candidates:
        return min(candidates, key=lambda m: abs(m.x - animal.x) + abs(m.y - animal.y))
    return None


def _do_mate(animal, mate, world):
    """Two animals mate and produce offspring."""
    animal.state = AnimalState.MATING
    mate.state = AnimalState.MATING
    animal.apply_energy_cost("MATE")
    mate.apply_energy_cost("MATE")
    animal.mate_cooldown = 100
    mate.mate_cooldown = 100

    # Spawn baby nearby
    baby_x, baby_y = animal.x, animal.y
    for dx, dy in [(0, 1), (1, 0), (0, -1), (-1, 0), (1, 1)]:
        nx, ny = animal.x + dx, animal.y + dy
        if world.is_walkable(nx, ny):
            baby_x, baby_y = nx, ny
            break

    species_config = world.config["animal_species"][animal.species]
    baby = Animal(world.next_id(), baby_x, baby_y, animal.species, species_config)
    baby.energy = species_config["max_energy"] * 0.4
    baby.age = 0
    world.animals.append(baby)


def _follow_path(animal, world):
    """Move animal one step along its current path."""
    if not animal.path or animal.path_index >= len(animal.path):
        animal.path = []
        animal.path_index = 0
        return

    nx, ny = animal.path[animal.path_index]
    if world.is_walkable(nx, ny):
        animal.x, animal.y = nx, ny
    animal.path_index += 1
    animal.state = AnimalState.WALKING
    animal.apply_energy_cost("WALK")

    if animal.path_index >= len(animal.path):
        animal.path = []
        animal.path_index = 0


def _random_walk(animal, world):
    """Move in a random walkable direction."""
    directions = [(0, 1), (0, -1), (1, 0), (-1, 0)]
    random.shuffle(directions)
    for dx, dy in directions:
        nx, ny = animal.x + dx, animal.y + dy
        if world.is_walkable(nx, ny):
            animal.x, animal.y = nx, ny
            animal.state = AnimalState.WALKING
            animal.apply_energy_cost("WALK")
            return
    animal.state = AnimalState.IDLE
    animal.apply_energy_cost("IDLE")
