# Engine Reference

The engine layer (`frontend/src/engine/`) contains all simulation logic. It is class-based, has zero DOM or React dependencies, and is designed to run inside a Web Worker.

---

## File Overview

| File | Purpose |
|------|---------|
| `config.js` | Default simulation parameters, sex/reproduction constants |
| `animalSpecies.js` | Canonical animal species registry (single source of truth) |
| `plantSpecies.js` | Canonical plant species registry (12 species, single source of truth) |
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
         ← plantSpecies.js (builds plant data)

simulation.js
├── world.js
├── entities.js (Animal)
├── spatialHash.js (SpatialHash)
├── mapGenerator.js (generateTerrain, computeWaterProximity)
├── flora.js (seedInitialPlants, processPlants)
├── behaviors.js (decideAndAct)
└── plantSpecies.js (stage ages, production chances)

behaviors.js
├── entities.js (AnimalState)
├── world.js (terrain checks)
├── pathfinding.js (aStar)
└── config.js (sex/reproduction constants)

flora.js
├── world.js (terrain constants)
└── plantSpecies.js (stage thresholds, reproduction modes)

mapGenerator.js ← world.js (terrain constants)
pathfinding.js ← world.js (walkability)
entities.js ← config.js (sex constants)
plantSpecies.js — no dependencies
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
| Map | `map_width` | 500 | Grid width in tiles |
| Map | `map_height` | 500 | Grid height in tiles |
| Map | `sea_level` | 0.38 | Height threshold for water (0.0–1.0) |
| Map | `island_count` | 5 | Number of island blobs |
| Map | `island_size_factor` | 0.3 | Relative island radius |
| Map | `seed` | null | Random seed (null = random) |
| Clock | `ticks_per_second` | 20 | Simulation speed |
| Clock | `ticks_per_day` | 200 | Ticks in one full day cycle |
| Clock | `day_fraction` | 0.6 | Fraction of day that is daylight |
| Flora | `initial_plant_density` | 0.10 | Fraction of eligible tiles seeded |
| Flora | `water_proximity_threshold` | 10 | Tiles from water for growth bonus |
| Fauna | `initial_animal_counts` | `{RABBIT: 25, ...}` | Derived from `animalSpecies.js` |
| Fauna | `animal_species` | `{RABBIT: {...}, ...}` | Derived from `animalSpecies.js` |

---

## Species Registry (`animalSpecies.js`)

This file is the **single source of truth** for all animal data. `config.js` derives its fauna configuration from here via `buildAnimalSpeciesConfig()` and `buildInitialAnimalCounts()`.

### Species Table

| Species | Diet | Speed | Vision | Max Energy | Max Age | Attack | Defense | Initial Count |
|---------|------|-------|--------|-----------|---------|--------|---------|---------------|
| 🐰 Rabbit | Herbivore | 1 | 10 | 100 | 1400 | 1 | 2 | 100 |
| 🐿️ Squirrel | Herbivore | 1 | 11 | 90 | 1300 | 1 | 1 | 60 |
| 🪲 Beetle | Herbivore | 1 | 7 | 70 | 1000 | 1 | 4 | 80 |
| 🐐 Goat | Herbivore | 1 | 12 | 150 | 2200 | 3 | 5 | 35 |
| 🦌 Deer | Herbivore | 2 | 14 | 140 | 2000 | 2 | 3 | 35 |
| 🦟 Mosquito | Herbivore | 2 | 8 | 40 | 600 | 1 | 0 | 60 |
| 🐛 Caterpillar | Herbivore | 1 | 5 | 50 | 800 | 0 | 1 | 70 |
| 🦊 Fox | Carnivore | 2 | 14 | 130 | 1600 | 6 | 4 | 28 |
| 🐺 Wolf | Carnivore | 2 | 16 | 160 | 1800 | 9 | 6 | 20 |
| 🐍 Snake | Carnivore | 1 | 12 | 120 | 1600 | 5 | 3 | 20 |
| 🐗 Boar | Omnivore | 1 | 12 | 150 | 1800 | 5 | 5 | 30 |
| 🐻 Bear | Omnivore | 1 | 14 | 200 | 2500 | 10 | 8 | 12 |
| 🦝 Raccoon | Omnivore | 1 | 11 | 100 | 1400 | 3 | 3 | 25 |
| 🐦‍⬛ Crow | Omnivore | 2 | 16 | 80 | 1200 | 2 | 1 | 35 |

### Species Data Fields

```javascript
{
  id: 'RABBIT',           // unique key
  name: 'Rabbit',         // display name
  emoji: '🐰',            // renderer display
  diet: 'HERBIVORE',      // HERBIVORE | CARNIVORE | OMNIVORE
  reproduction: 'SEXUAL', // SEXUAL | ASEXUAL | HERMAPHRODITE
  color: 0x66cc66,        // hex color for renderer
  speed: 1,               // tiles per tick
  vision_range: 10,       // perception radius
  max_energy: 100,        // energy cap
  max_hunger: 100,        // hunger cap
  max_thirst: 100,        // thirst cap
  max_age: 1400,          // ticks until death from old age
  max_population: 5000,   // population cap per species
  mature_age: 80,         // ticks before eligible to mate
  life_stage_ages: [30, 60, 80], // [baby→young, young→young_adult, young_adult→adult] (optional)
  decision_interval: 2,   // ticks between AI decisions
  attack_power: 1,        // damage dealt in combat
  defense: 2,             // reduces incoming damage
  walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'FERTILE_SOIL', 'MUD'], // terrain names (resolved to IDs at build time)
  edible_plants: ['GRASS', 'STRAWBERRY', 'CARROT'],   // plant names (resolved to IDs at build time)
  prey_species: [],       // species IDs this animal can hunt
  energy_costs: {         // energy per tick by action
    IDLE: 0.02, WALK: 0.1, RUN: 0.35,
    EAT: 0.05, DRINK: 0.05, SLEEP: -4.0,
    ATTACK: 0.8, MATE: 1.5, FLEE: 0.35,
  },
  hunger_rate: 0.12,      // hunger increase per tick
  thirst_rate: 0.14,      // thirst increase per tick
  initial_count: 100,     // default spawn count
}
```

### Exports

| Export | Type | Description |
|--------|------|-------------|
| `default` (ANIMAL_SPECIES) | Object | Full registry keyed by species ID |
| `ALL_ANIMAL_IDS` | Array | All 14 species keys |
| `HERBIVORE_IDS` | Array | 7 herbivore species keys |
| `CARNIVORE_IDS` | Array | 3 carnivore species keys |
| `OMNIVORE_IDS` | Array | 4 omnivore species keys |
| `buildAnimalSpeciesConfig()` | Function | Returns sim-only params (strips display fields) |
| `buildInitialAnimalCounts()` | Function | Returns `{RABBIT: 100, ...}` from registry |
| `buildDecisionIntervals()` | Function | Returns `{RABBIT: 3, ...}` from registry |

---

## Plant Species Registry (`plantSpecies.js`)

This file is the **single source of truth** for all plant data. `flora.js` derives its stage thresholds, production chances, and reproduction modes from here.

### Plant Species Table

| Species | TypeId | Reproduction | Water Affinity | Stage Ages (seed→young→adult→max) |
|---------|--------|-------------|----------------|-----------------------------------|
| 🌱 Grass | 1 | Seed | low | 5, 18, 35, 180 |
| 🍓 Strawberry | 2 | Fruit | medium | 10, 40, 100, 400 |
| 🫐 Blueberry | 3 | Fruit | medium | 15, 55, 140, 550 |
| 🍎 Apple Tree | 4 | Fruit | medium | 35, 140, 350, 1600 |
| 🥭 Mango Tree | 5 | Fruit | medium | 40, 180, 420, 1800 |
| 🥕 Carrot | 6 | Seed | low | 8, 35, 80, 350 |
| 🌻 Sunflower | 7 | Seed | low | 8, 38, 100, 500 |
| 🍅 Tomato | 8 | Fruit | medium | 10, 45, 120, 450 |
| 🍄 Mushroom | 9 | Seed | low | 6, 22, 50, 220 |
| 🌳 Oak Tree | 10 | Seed | high | 50, 220, 500, 2500 |
| 🌵 Cactus | 11 | Seed | low | 20, 80, 200, 1200 |
| 🌴 Coconut Palm | 12 | Fruit | medium | 45, 200, 450, 2000 |

### Exports

| Export | Type | Description |
|--------|------|-------------|
| `PLANT_SPECIES` | Object | Full registry keyed by species ID |
| `ALL_PLANT_IDS` | Array | All 12 plant species keys |
| `getPlantByTypeId(typeId)` | Function | Lookup plant data by numeric typeId |
| `buildStageAges()` | Function | Returns `{1: [5,18,35,180], ...}` per typeId |
| `buildFruitSpoilAges()` | Function | Returns fruit decay thresholds per typeId |
| `buildPlantColors()` | Function | Returns stage→RGBA colors per typeId |
| `buildPlantEmojiMap()` | Function | Returns stage→emoji per typeId |
| `buildProductionChances()` | Function | Returns seed spreading chance per typeId |
| `buildReproductionModes()` | Function | Returns `SEED` or `FRUIT` per typeId |

---

## World Model (`world.js`)

### Terrain Types

| Constant | Value | Walkable |
|----------|-------|----------|
| `WATER` | 0 | No |
| `SAND` | 1 | Yes |
| `DIRT` | 2 | Yes |
| `SOIL` | 3 | Yes |
| `ROCK` | 4 | Varies (per species) |
| `FERTILE_SOIL` | 5 | Yes |
| `DEEP_WATER` | 6 | No |
| `MOUNTAIN` | 7 | Varies (per species) |
| `MUD` | 8 | Yes |

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
| `terrain` | `Uint8Array` | Terrain type per tile (0–8) |
| `waterProximity` | `Uint8Array` | BFS distance to nearest water (capped 255) |
| `plantType` | `Uint8Array` | Plant type per tile (0 = none, 1–12) |
| `plantStage` | `Uint8Array` | Growth stage (0–6) |
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

### Life Stages

```
BABY=0 → YOUNG=1 → YOUNG_ADULT=2 → ADULT=3
```

Stage is determined by comparing `animal.age` against `life_stage_ages` thresholds from the species config. Only `ADULT` animals can mate.

### `Animal` Class

```javascript
const animal = new Animal(id, x, y, 'RABBIT', speciesConfig);
```

**Core Properties:** `id`, `x`, `y`, `species`, `diet`, `sex`, `state`, `energy`, `hunger`, `thirst`, `age`, `alive`, `_deathTick`

**Computed:** `lifeStage` (getter, derived from age + `life_stage_ages`)

**Pathfinding:** `targetX/Y`, `path` (waypoint array), `pathIndex`

**Cooldowns:** `mateCooldown`, `attackCooldown`

**Key Methods:**

| Method | Description |
|--------|-------------|
| `energyCost(action)` | Lookup cost from species config |
| `applyEnergyCost(action)` | Subtract cost, clamp to [0, maxEnergy] |
| `tickNeeds()` | Increment hunger/thirst by species rate, tick cooldowns |
| `toDict()` | Serializable snapshot for renderer/UI (includes `lifeStage`, `_deathTick`) |

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
5. Remove dead animals from spatial hash/occupancy grid
6. Adaptive cleanup: every 10 ticks (pop>1500) / 25 ticks (pop>800) / 50 ticks (otherwise): cull dead animals that have lingered ≥ 300 ticks
7. Every 10 ticks: record stats snapshot (max 1000)
```

**Dead animal lifecycle:** When an animal dies, `_deathTick` is recorded. Dead animals remain in the array (and are visible as 💀 skulls) for 300 ticks, then are permanently removed.

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
