# Engine Reference

The engine layer (`frontend/src/engine/`) contains all simulation logic. It is class-based, has zero DOM or React dependencies, and is designed to run inside a Web Worker.

---

## File Overview

| File | Purpose |
|------|---------|
| `config.js` | Default simulation parameters, sex/reproduction constants |
| `animalSpecies.js` | Canonical species registry (single source of truth) |
| `simulation.js` | Tick orchestration, world generation, entity management |
| `world.js` | World model: terrain grid, plant arrays, animal list, clock |
| `entities.js` | Animal class with state machine, energy, needs |
| `flora.js` | Plant lifecycle: growth, fruiting, seed spreading |
| `behaviors.js` | Animal AI: decision tree, pathfinding, combat, mating |
| `pathfinding.js` | Bounded A* algorithm (4-directional) |
| `spatialHash.js` | O(1) spatial indexing for neighbor queries |
| `mapGenerator.js` | Procedural terrain via Perlin noise + island masks |

---

## Dependency Graph

```
config.js ← animalSpecies.js (builds species/counts)

simulation.js
├── world.js
├── entities.js (Animal)
├── spatialHash.js (SpatialHash)
├── mapGenerator.js (generateTerrain, computeWaterProximity)
├── flora.js (seedInitialPlants, processPlants)
└── behaviors.js (decideAndAct)

behaviors.js
├── entities.js (AnimalState)
├── world.js (terrain checks)
├── pathfinding.js (aStar)
└── config.js (sex/reproduction constants)

flora.js ← world.js (terrain constants)
mapGenerator.js ← world.js (terrain constants)
pathfinding.js ← world.js (walkability)
entities.js ← config.js (sex constants)
spatialHash.js — no dependencies
world.js — no dependencies
```

---

## Configuration (`config.js`)

### Constants

| Export | Values |
|--------|--------|
| `SEX_MALE`, `SEX_FEMALE`, `SEX_ASEXUAL`, `SEX_HERMAPHRODITE` | String identifiers |
| `REPRO_SEXUAL`, `REPRO_ASEXUAL`, `REPRO_HERMAPHRODITE` | Reproduction mode identifiers |

### `DEFAULT_CONFIG`

| Category | Parameter | Default | Description |
|----------|-----------|---------|-------------|
| Map | `map_width` | 1000 | Grid width in tiles |
| Map | `map_height` | 1000 | Grid height in tiles |
| Map | `sea_level` | 0.38 | Height threshold for water (0.0–1.0) |
| Map | `island_count` | 5 | Number of island blobs |
| Map | `island_size_factor` | 0.3 | Relative island radius |
| Map | `seed` | null | Random seed (null = random) |
| Clock | `ticks_per_second` | 10 | Simulation speed |
| Clock | `ticks_per_day` | 200 | Ticks in one full day cycle |
| Clock | `day_fraction` | 0.6 | Fraction of day that is daylight |
| Flora | `initial_plant_density` | 0.15 | Fraction of eligible tiles seeded |
| Flora | `water_proximity_threshold` | 10 | Tiles from water for growth bonus |
| Fauna | `initial_animal_counts` | `{RABBIT: 25, ...}` | Derived from `animalSpecies.js` |
| Fauna | `animal_species` | `{RABBIT: {...}, ...}` | Derived from `animalSpecies.js` |

---

## Species Registry (`animalSpecies.js`)

This file is the **single source of truth** for all animal data. `config.js` derives its fauna configuration from here via `buildAnimalSpeciesConfig()` and `buildInitialAnimalCounts()`.

### Species Table

| Species | Diet | Speed | Vision | Max Energy | Max Age | Attack | Defense | Initial Count |
|---------|------|-------|--------|-----------|---------|--------|---------|---------------|
| 🐰 Rabbit | Herbivore | 1 | 8 | 90 | 1200 | 1 | 2 | 25 |
| 🐿️ Squirrel | Herbivore | 1 | 9 | 80 | 1100 | 1 | 1 | 15 |
| 🪲 Beetle | Herbivore | 1 | 5 | 60 | 800 | 1 | 4 | 20 |
| 🐐 Goat | Herbivore | 1 | 10 | 140 | 2000 | 3 | 5 | 10 |
| 🦌 Deer | Herbivore | 2 | 12 | 130 | 1800 | 2 | 3 | 10 |
| 🦊 Fox | Carnivore | 2 | 12 | 120 | 1400 | 6 | 4 | 8 |
| 🐺 Wolf | Carnivore | 2 | 14 | 150 | 1600 | 9 | 6 | 5 |

### Species Data Fields

```javascript
{
  id: 'RABBIT',           // unique key
  name: 'Rabbit',         // display name
  emoji: '🐰',            // renderer display
  diet: 'HERBIVORE',      // HERBIVORE | CARNIVORE
  reproduction: 'SEXUAL', // SEXUAL | ASEXUAL | HERMAPHRODITE
  color: 0x66cc66,        // hex color for renderer
  speed: 1,               // tiles per tick
  vision_range: 8,        // perception radius
  max_energy: 90,         // energy cap
  max_hunger: 100,        // hunger cap
  max_thirst: 100,        // thirst cap
  max_age: 1200,          // ticks until death from old age
  mature_age: 100,        // ticks before eligible to mate
  attack_power: 1,        // damage dealt in combat
  defense: 2,             // reduces incoming damage
  energy_costs: {         // energy per tick by action
    IDLE: 0.02, WALK: 0.1, RUN: 0.35,
    EAT: 0.05, DRINK: 0.05, SLEEP: -3.0,
    ATTACK: 0.8, MATE: 1.5, FLEE: 0.35,
  },
  hunger_rate: 0.12,      // hunger increase per tick
  thirst_rate: 0.14,      // thirst increase per tick
  initial_count: 25,      // default spawn count
}
```

### Exports

| Export | Type | Description |
|--------|------|-------------|
| `default` (ANIMAL_SPECIES) | Object | Full registry keyed by species ID |
| `ALL_ANIMAL_IDS` | Array | All 7 species keys |
| `HERBIVORE_IDS` | Array | 5 herbivore species keys |
| `CARNIVORE_IDS` | Array | 2 carnivore species keys |
| `buildAnimalSpeciesConfig()` | Function | Returns sim-only params (strips display fields) |
| `buildInitialAnimalCounts()` | Function | Returns `{RABBIT: 25, ...}` from registry |

---

## World Model (`world.js`)

### Terrain Types

| Constant | Value | Walkable |
|----------|-------|----------|
| `WATER` | 0 | No |
| `SAND` | 1 | Yes |
| `DIRT` | 2 | Yes |
| `GRASS` | 3 | Yes |
| `ROCK` | 4 | No |

### `Clock` Class

Tracks simulation time with a day/night cycle.

```javascript
const clock = new Clock(ticksPerDay, dayFraction);
clock.advance();           // increment tick
clock.dayNumber;           // current day (tick / ticksPerDay)
clock.tickInDay;           // tick within current day
clock.isNight;             // tickInDay >= dayFraction * ticksPerDay
clock.toDict();            // serializable snapshot
```

### `World` Class

Holds the entire world state using flat TypedArrays for memory efficiency.

**Grid Storage** — row-major flat indexing: `index = y * width + x`

| Array | Type | Description |
|-------|------|-------------|
| `terrain` | `Uint8Array` | Terrain type per tile (0–4) |
| `waterProximity` | `Uint8Array` | BFS distance to nearest water (capped 255) |
| `plantType` | `Uint8Array` | Plant type per tile (0 = none, 1–6) |
| `plantStage` | `Uint8Array` | Growth stage (0–5) |
| `plantAge` | `Uint16Array` | Ticks since planted |
| `plantFruit` | `Uint8Array` | Boolean (0 or 1) |

**Key Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `idx(x, y)` | `→ number` | Flat array index |
| `isInBounds(x, y)` | `→ boolean` | Boundary check |
| `isWalkable(x, y)` | `→ boolean` | Not WATER or ROCK |
| `isWaterAdjacent(x, y)` | `→ boolean` | 8-neighbor water check |
| `getStats()` | `→ object` | Population counts, plant stats |

---

## Animal Entity (`entities.js`)

### Animal States

```
IDLE=0 → WALKING=1 → RUNNING=2
EATING=3, DRINKING=4, SLEEPING=5
ATTACKING=6, FLEEING=7, MATING=8
DEAD=9
```

### `Animal` Class

```javascript
const animal = new Animal(id, x, y, 'RABBIT', speciesConfig);
```

**Core Properties:** `id`, `x`, `y`, `species`, `diet`, `sex`, `state`, `energy`, `hunger`, `thirst`, `age`, `alive`

**Pathfinding:** `targetX/Y`, `path` (waypoint array), `pathIndex`

**Cooldowns:** `mateCooldown`, `attackCooldown`

**Key Methods:**

| Method | Description |
|--------|-------------|
| `energyCost(action)` | Lookup cost from species config |
| `applyEnergyCost(action)` | Subtract cost, clamp to [0, maxEnergy] |
| `tickNeeds()` | Increment hunger/thirst by species rate, tick cooldowns |
| `toDict()` | Serializable snapshot for renderer/UI |

**Sex Assignment:** `SEXUAL` → 50% male / 50% female. `HERMAPHRODITE` / `ASEXUAL` → assigned directly.

---

## Simulation Engine (`simulation.js`)

### `SimulationEngine` Class

Orchestrates each tick, manages world lifecycle.

```javascript
const engine = new SimulationEngine(config);
engine.generateWorld();  // → returns seed
engine.tick();           // advance one step
```

### Tick Pipeline

```
1. Advance clock
2. processPlants(world)          — aging, stage transitions, seed spreading
3. For each alive animal:
     decideAndAct(animal, world, spatialHash)
4. Rebuild spatialHash           — re-index all alive animals
5. Every 50 ticks: cull dead animals from array
6. Every 10 ticks: record stats snapshot (max 1000)
```

### Public Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `generateWorld()` | `→ number (seed)` | Create world, gen terrain, seed plants/animals |
| `resetSimulation()` | `→ void` | Clear everything, re-seed |
| `tick()` | `→ void` | One simulation step |
| `getStateForViewport(vx, vy, vw, vh)` | `→ object` | Viewport-culled state for renderer |
| `getFullState()` | `→ object` | Complete state snapshot |
| `editTerrain(changes)` | `→ void` | Apply terrain edits, recompute water proximity |
| `placeEntity(type, x, y)` | `→ object\|null` | Spawn animal or plant |
| `removeEntity(id)` | `→ boolean` | Kill animal by ID |

---

## Terrain Generation (`mapGenerator.js`)

### `generateTerrain(config)` → `{terrain, waterProximity, seed}`

**Pipeline:**

1. **Perlin noise FBM** — 6 octaves at scale 0.005, persistence 0.5 → heightmap [0, 1]
2. **Island mask** — Gaussian blobs centered near map center, with configurable count and size
3. **Combine** — `heightmap × islandMask`
4. **Classify terrain** by height thresholds:
   - `> seaLevel + 0.45` → ROCK
   - `0.12 – 0.45` → GRASS
   - `0.05 – 0.12` → DIRT
   - `0 – 0.05` → SAND
   - `≤ 0` → WATER
5. **Detail noise** — 3-octave FBM on GRASS tiles adds DIRT/ROCK variation
6. **Water proximity BFS** — flood fill from all water tiles, 4-directional

### Noise Functions

| Function | Purpose |
|----------|---------|
| `mulberry32(seed)` | Seeded 32-bit PRNG |
| `perlinNoise2D(w, h, seed, scale)` | Single-octave gradient noise with Perlin fade curve |
| `fbmNoise(w, h, seed, octaves, scale, lacunarity, persistence)` | Multi-octave fractal Brownian motion |
| `generateIslandMask(w, h, count, sizeFactor, seed)` | Circular blobs via normal distribution |

---

## Spatial Hash (`spatialHash.js`)

Grid-based spatial indexing for efficient neighbor queries.

### `SpatialHash` Class

```javascript
const hash = new SpatialHash(cellSize); // default 16
hash.rebuild(aliveAnimals);
hash.queryRadius(x, y, radius); // → [entity, ...]
```

**How it works:**
- Divides world into cells of `cellSize × cellSize` tiles
- Entities stored in `Map<"cx,cy", Map<id, entity>>`
- `queryRadius` checks all cells overlapping the query circle, then filters by Euclidean distance
- `rebuild` called each tick after movement

---

## Pathfinding (`pathfinding.js`)

### `aStar(sx, sy, gx, gy, world, maxDist = 50)` → `[[x,y], ...]`

Bounded A* with 4-directional movement (no diagonals).

- **Heuristic:** Manhattan distance
- **Expansion limit:** `maxDist` tiles from start position
- **Goal adjustment:** If goal tile is unwalkable, searches adjacent tiles
- **Data structures:** Binary min-heap for open set, flat array for visited
- **Returns:** Waypoint array or empty array if unreachable
