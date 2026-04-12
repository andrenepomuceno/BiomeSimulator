"""Flora system — vectorized plant lifecycle using NumPy."""

import numpy as np
from engine.world import WATER, GRASS, DIRT

# Plant types
P_NONE = 0
P_GRASS = 1
P_BUSH = 2
P_TREE = 3

# Plant stages
S_NONE = 0
S_SEED = 1
S_SPROUT = 2
S_MATURE = 3
S_FRUITING = 4
S_DEAD = 5

# Growth thresholds per type (seed→sprout, sprout→mature, mature→fruiting, fruiting→dead)
STAGE_AGES = {
    P_GRASS: (10, 40, 80, 300),
    P_BUSH:  (20, 80, 200, 800),
    P_TREE:  (50, 200, 500, 2000),
}


def seed_initial_plants(world):
    """Scatter initial plants on eligible terrain tiles."""
    config = world.config
    density = config.get("initial_plant_density", 0.15)
    rng = np.random.RandomState()

    eligible = (world.terrain == GRASS) | (world.terrain == DIRT)
    elig_count = int(np.sum(eligible))

    # Number of plants to place
    n_plants = int(elig_count * density)
    ys, xs = np.where(eligible)
    indices = rng.choice(len(ys), size=min(n_plants, len(ys)), replace=False)

    for idx in indices:
        y, x = ys[idx], xs[idx]
        # Weighted type selection — grass more common, trees rarer
        wp = world.water_proximity[y, x]
        # Near water: more trees and bushes
        if wp < 5:
            ptype = rng.choice([P_GRASS, P_BUSH, P_TREE], p=[0.3, 0.35, 0.35])
        elif wp < 15:
            ptype = rng.choice([P_GRASS, P_BUSH, P_TREE], p=[0.5, 0.3, 0.2])
        else:
            ptype = rng.choice([P_GRASS, P_BUSH, P_TREE], p=[0.7, 0.2, 0.1])

        # Start at random growth stage
        stage = rng.choice([S_SEED, S_SPROUT, S_MATURE])
        ages = STAGE_AGES[ptype]
        age = ages[stage - 1] if stage > 1 else rng.randint(0, ages[0])

        world.plant_grid[y, x]["type"] = ptype
        world.plant_grid[y, x]["stage"] = stage
        world.plant_grid[y, x]["age"] = age
        world.plant_grid[y, x]["fruit"] = 0


def process_plants(world):
    """Process one tick of plant lifecycle — fully vectorized."""
    pg = world.plant_grid
    alive = (pg["type"] > 0) & (pg["stage"] > S_NONE) & (pg["stage"] < S_DEAD)
    world.plant_changes = []

    if not np.any(alive):
        return

    # --- Age all alive plants ---
    pg["age"][alive] += 1

    # --- Process stage transitions ---
    for ptype in (P_GRASS, P_BUSH, P_TREE):
        ages = STAGE_AGES[ptype]
        type_mask = alive & (pg["type"] == ptype)
        if not np.any(type_mask):
            continue

        # Water proximity bonus: plants near water grow faster
        wp_bonus = np.ones_like(pg["age"], dtype=np.float32)
        near_water = world.water_proximity < world.config.get("water_proximity_threshold", 10)
        wp_bonus[near_water] = 1.3

        effective_age = (pg["age"].astype(np.float32) * wp_bonus).astype(np.uint16)

        # Seed → Sprout
        mask = type_mask & (pg["stage"] == S_SEED) & (effective_age >= ages[0])
        if np.any(mask):
            pg["stage"][mask] = S_SPROUT
            _record_changes(world, mask)

        # Sprout → Mature
        mask = type_mask & (pg["stage"] == S_SPROUT) & (effective_age >= ages[1])
        if np.any(mask):
            pg["stage"][mask] = S_MATURE
            _record_changes(world, mask)

        # Mature → Fruiting
        mask = type_mask & (pg["stage"] == S_MATURE) & (effective_age >= ages[2])
        if np.any(mask):
            pg["stage"][mask] = S_FRUITING
            pg["fruit"][mask] = 1
            _record_changes(world, mask)

        # Fruiting → Dead (age out)
        mask = type_mask & (pg["stage"] == S_FRUITING) & (effective_age >= ages[3])
        if np.any(mask):
            pg["stage"][mask] = S_DEAD
            pg["fruit"][mask] = 0
            _record_changes(world, mask)

    # --- Dead plants decompose (remove after 50 ticks as dead) ---
    dead_mask = (pg["stage"] == S_DEAD)
    if np.any(dead_mask):
        # Simple: just clear dead plants (they had their time)
        pg["type"][dead_mask] = P_NONE
        pg["stage"][dead_mask] = S_NONE
        pg["age"][dead_mask] = 0
        pg["fruit"][dead_mask] = 0
        _record_changes(world, dead_mask)

    # --- Reproduction: fruiting plants spread seeds ---
    fruiting = (pg["stage"] == S_FRUITING)
    if np.any(fruiting):
        _spread_seeds(world, fruiting)


def _spread_seeds(world, fruiting_mask):
    """Fruiting plants have a chance to spawn seeds in adjacent empty tiles."""
    ys, xs = np.where(fruiting_mask)
    if len(ys) == 0:
        return

    rng = np.random.RandomState()
    h, w = world.terrain.shape

    # Sample a subset for performance (max 500 spread attempts per tick)
    if len(ys) > 500:
        indices = rng.choice(len(ys), 500, replace=False)
        ys, xs = ys[indices], xs[indices]

    directions = [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]

    for y, x in zip(ys, xs):
        if rng.random() > 0.02:  # 2% chance per tick
            continue
        ptype = world.plant_grid[y, x]["type"]
        dy, dx = directions[rng.randint(0, len(directions))]
        ny, nx = y + dy, x + dx
        if 0 <= ny < h and 0 <= nx < w:
            if world.plant_grid[ny, nx]["type"] == P_NONE:
                terrain = world.terrain[ny, nx]
                if terrain in (GRASS, DIRT):
                    world.plant_grid[ny, nx]["type"] = ptype
                    world.plant_grid[ny, nx]["stage"] = S_SEED
                    world.plant_grid[ny, nx]["age"] = 0
                    world.plant_grid[ny, nx]["fruit"] = 0
                    world.plant_changes.append((int(nx), int(ny), int(ptype), int(S_SEED)))


def _record_changes(world, mask):
    """Record changed plant positions for delta streaming."""
    ys, xs = np.where(mask)
    for y, x in zip(ys, xs):
        pg = world.plant_grid[y, x]
        world.plant_changes.append((int(x), int(y), int(pg["type"]), int(pg["stage"])))
