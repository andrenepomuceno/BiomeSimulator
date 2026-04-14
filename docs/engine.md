# Engine Reference

The engine layer (`frontend/src/engine/`) contains all simulation logic. It is class-based, has zero DOM or React dependencies, and is designed to run inside a Web Worker.

See [README](README.md) for the docs index, [Architecture](architecture.md) for layer boundaries, and [Game Logic](game-logic.md) for the runtime rules implemented by these modules.

---

## File Overview

| File | Purpose |
|------|---------|
| `config.js` | Default simulation parameters, sex/reproduction constants |
| `animalSpecies.js` | Canonical animal species registry (single source of truth) |
| `plantSpecies.js` | Canonical plant species registry (15 species, single source of truth) |
| `simulation.js` | Tick orchestration, world generation, entity management |
| `world.js` | World model: terrain grid, plant arrays, animal list, clock |
| `entities.js` | Animal class with state machine, energy, needs |
| `flora.js` | Plant lifecycle: growth, fruiting, seed spreading |
| `behaviors.js` | Animal AI: decision tree, pathfinding, combat, mating |
| `pathfinding.js` | Bounded A* algorithm (4-directional) |
| `spatialHash.js` | O(1) spatial indexing for neighbor queries |
| `mapGenerator.js` | Procedural terrain via Perlin noise + island masks |
| `benchmarkProfiler.js` | In-engine tick timing and perf metrics collection |

### Worker Files (`frontend/src/worker/`)

| File | Purpose |
|------|--------|
| `simWorker.js` | Main simulation Web Worker: async tick loop, fauna worker pool, incremental serialization |
| `faunaWorker.js` | Sub-worker for parallel fauna processing: receives animal chunks, runs `decideAndAct`, returns deltas |

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
├── world.js (terrain checks, terrain type constants for speed/energy modifiers)
├── pathfinding.js (aStar)
└── config.js (sex/reproduction constants, SUB_CELL_STEP/DIVISOR)

simWorker.js
├── simulation.js (SimulationEngine)
├── faunaWorker.js (sub-worker pool, optional)
└── entities.js (for delta merge)

faunaWorker.js
├── behaviors.js (decideAndAct)
├── entities.js (Animal, for reconstruction)
├── spatialHash.js (local spatial index)
└── world.js (read-only terrain/plant data)

flora.js
├── world.js (terrain constants)
└── plantSpecies.js (stage thresholds, reproduction modes)

mapGenerator.js ← world.js (terrain constants)
pathfinding.js ← world.js (walkability)
entities.js ← config.js (sex constants)
plantSpecies.js ← world.js (terrain IDs)
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
| `SUB_CELL_DIVISOR` | `4` — each tile is divided into a 4×4 sub-grid for movement |
| `SUB_CELL_STEP` | `0.25` — movement increment per sub-step (1 / SUB_CELL_DIVISOR) |

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
| Clock | `ticks_per_day` | 260 | Ticks in one full day cycle |
| Clock | `day_fraction` | 0.6 | Fraction of day that is daylight |
| Flora | `initial_plant_density` | 0.10 | Fraction of eligible tiles seeded |
| Flora | `water_proximity_threshold` | 10 | Tiles from water for growth bonus |
| Flora | `plant_spawn_water_thresholds` | `{near: 5, mid: 15}` | Bands for weighted plant spawning |
| Flora | `plant_tick_phases` | 4 | Staggered plant processing phases |
| Flora | `season_*_multiplier` | arrays | Growth/reproduction/death per season |
| Flora | `plant_reproduction_*` | various | Dynamic offspring caps at high coverage |
| Flora | `plant_water_growth_modifiers` | object | Near/far growth factors by water context |
| Flora | `plant_dirt_death_chance_by_stage` | object | Stage-based harsh-terrain death rates |
| Fauna | `pathfinding_cache_ttl` | 15 | Path reuse TTL in ticks |
| Fauna | `threat_cache_ttl` | 4 | Threat cache TTL in ticks |
| Fauna | `threat_scan_cooldown_ticks` | 2 | Delay between expensive threat rescans |
| Fauna | `animal_global_vision_multiplier` | 1.2 | Global multiplier applied to every species base vision range |
| Fauna | `night_vision_reduction_factor` | 0.65 | Night vision reduction for non-nocturnal species |
| Fauna | `nocturnal_day_vision_factor` | 0.8 | Day vision reduction for nocturnal species |
| Fauna | `scavenge_decay_ticks` | 100 | Fresh-corpse window for scavenging |
| Fauna | `initial_animal_counts` | `{RABBIT: 25, ...}` | Derived from `animalSpecies.js` |
| Fauna | `animal_species` | `{RABBIT: {...}, ...}` | Derived from `animalSpecies.js` |

---

## Species Registry (`animalSpecies.js`)

This file is the **single source of truth** for all animal data. `config.js` derives its fauna configuration from here via `buildAnimalSpeciesConfig()` and `buildInitialAnimalCounts()`.

### Species Table

Speed values are in **sub-cell steps per tick**. With `SUB_CELL_DIVISOR = 4`, a speed of 4 means the animal crosses 1 tile per tick, speed 8 = 2 tiles/tick, etc.

| Species | Diet | Speed | Tiles/tick | Vision | Max Energy | Max HP | Max Age | Attack | Defense | Max Pop | Initial Count |
|---------|------|-------|------------|--------|-----------|--------|---------|--------|---------|---------|---------------|
| 🐰 Rabbit | Herbivore | 4 | 1 | 10 | 100 | 50 | 1400 | 1 | 2 | 500 | 100 |
| 🐿️ Squirrel | Herbivore | 4 | 1 | 11 | 90 | 40 | 1300 | 1 | 1 | 500 | 60 |
| 🪲 Beetle | Herbivore | 4 | 1 | 7 | 70 | 20 | 1000 | 1 | 4 | 800 | 80 |
| 🐐 Goat | Herbivore | 4 | 1 | 12 | 150 | 80 | 2200 | 3 | 5 | 300 | 35 |
| 🦌 Deer | Herbivore | 8 | 2 | 14 | 140 | 70 | 2000 | 2 | 3 | 300 | 35 |
| 🦟 Mosquito | Herbivore | 8 | 2 | 8 | 40 | 10 | 600 | 1 | 0 | 800 | 60 |
| 🐛 Caterpillar | Herbivore | 4 | 1 | 5 | 50 | 15 | 800 | 0 | 1 | 800 | 70 |
| 🦗 Cricket | Herbivore | 8 | 2 | 6 | 45 | 15 | 700 | 0 | 0 | 800 | 90 |
| 🦊 Fox | Carnivore | 8 | 2 | 14 | 130 | 60 | 1600 | 6 | 4 | 150 | 28 |
| 🐺 Wolf | Carnivore | 8 | 2 | 16 | 160 | 120 | 1800 | 9 | 6 | 80 | 20 |
| 🐍 Snake | Carnivore | 4 | 1 | 12 | 120 | 40 | 1600 | 5 | 3 | 150 | 20 |
| 🦅 Hawk | Carnivore | 12 | 3 | 20 | 110 | 45 | 1800 | 7 | 3 | 150 | 15 |
| 🐊 Crocodile | Carnivore | 4 | 1 | 12 | 180 | 180 | 2400 | 9 | 8 | 80 | 10 |
| 🐗 Boar | Omnivore | 4 | 1 | 12 | 150 | 100 | 1800 | 5 | 5 | 300 | 30 |
| 🐻 Bear | Omnivore | 4 | 1 | 14 | 200 | 200 | 2500 | 10 | 8 | 80 | 12 |
| 🦝 Raccoon | Omnivore | 4 | 1 | 11 | 100 | 50 | 1400 | 3 | 3 | 300 | 25 |
| 🐦‍⬛ Crow | Omnivore | 8 | 2 | 16 | 80 | 30 | 1200 | 2 | 1 | 300 | 35 |
| 🦎 Lizard | Omnivore | 4 | 1 | 11 | 85 | 45 | 1300 | 3 | 2 | 300 | 35 |

### Species Data Fields

```javascript
{
  id: 'RABBIT',           // unique key
  name: 'Rabbit',         // display name
  emoji: '🐰',            // renderer display
  diet: 'HERBIVORE',      // HERBIVORE | CARNIVORE | OMNIVORE
  reproduction: 'SEXUAL', // SEXUAL | ASEXUAL | HERMAPHRODITE
  color: 0x66cc66,        // hex color for renderer
  speed: 4,               // sub-cell steps per tick (4 steps = 1 tile)
  vision_range: 10,       // perception radius
  max_energy: 100,        // energy cap
  max_hp: 50,              // health points cap
  max_hunger: 100,        // hunger cap
  max_thirst: 100,        // thirst cap
  max_age: 1400,          // ticks until death from old age
  max_population: 500,    // population cap per species (varies by tier)
  mature_age: 80,         // ticks before eligible to mate
  life_stage_ages: [30, 60, 80], // [baby→young, young→young_adult, young_adult→adult] (optional)
  decision_interval: 2,   // ticks between AI decisions
  attack_power: 1,        // damage dealt in combat
  defense: 2,             // reduces incoming damage
  walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'FERTILE_SOIL', 'MUD'], // terrain names (resolved to IDs at build time)
  edible_plants: ['GRASS', 'STRAWBERRY', 'CARROT'],   // plant names (resolved to IDs at build time)
  prey_species: [],       // species IDs this animal can hunt
  can_scavenge: false,    // whether the animal can eat decomposing bodies
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

Effective runtime vision is calculated in the behavior layer as:

`vision_now = max(1, floor(vision_range * animal_global_vision_multiplier * dayNightModifier))`

Where `dayNightModifier` is:

- non-nocturnal at night: `night_vision_reduction_factor`
- nocturnal during day: `nocturnal_day_vision_factor`
- otherwise: `1.0`

### Exports

| Export | Type | Description |
|--------|------|-------------|
| `default` (ANIMAL_SPECIES) | Object | Full registry keyed by species ID |
| `ALL_ANIMAL_IDS` | Array | All 18 species keys |
| `HERBIVORE_IDS` | Array | 8 herbivore species keys |
| `CARNIVORE_IDS` | Array | 5 carnivore species keys |
| `OMNIVORE_IDS` | Array | 5 omnivore species keys |
| `BASE_POP_TOTAL` | Number | Sum of all species' `max_population` (5690) |
| `buildAnimalSpeciesConfig()` | Function | Returns sim-only params (strips display fields) |
| `buildInitialAnimalCounts()` | Function | Returns `{RABBIT: 100, ...}` from registry |
| `buildDecisionIntervals()` | Function | Returns `{RABBIT: 3, ...}` from registry |

---

## Plant Species Registry (`plantSpecies.js`)

This file is the **single source of truth** for all plant data. `flora.js` derives its stage thresholds, production chances, and reproduction modes from here.

### Plant Species Table

| Species | TypeId | Reproduction | Water Affinity | Edible Stages | Stage Ages (seed→young→adult→max) |
|---------|--------|-------------|----------------|---------------|-----------------------------------|
| 🌱 Grass | 1 | Seed | low (1) | Seed, Adult | 5, 18, 35, 180 |
| 🍓 Strawberry | 2 | Fruit | medium (2) | Seed, Fruit | 10, 40, 100, 400 |
| 🪶 Blueberry | 3 | Fruit | medium (2) | Seed, Fruit | 15, 55, 140, 550 |
| 🍎 Apple Tree | 4 | Fruit | high (3) | Seed, Fruit | 35, 140, 350, 1600 |
| 🥭 Mango Tree | 5 | Fruit | high (3) | Seed, Fruit | 40, 180, 420, 1800 |
| 🥕 Carrot | 6 | Seed | low (1) | Seed, Adult | 8, 35, 80, 350 |
| 🌻 Sunflower | 7 | Seed | medium (2) | Seed, Adult | 8, 38, 100, 500 |
| 🍅 Tomato | 8 | Fruit | high (3) | Seed, Fruit | 10, 45, 120, 450 |
| 🍄 Mushroom | 9 | Seed | low (1) | Seed, Adult | 6, 22, 50, 220 |
| 🌳 Oak Tree | 10 | Seed | high (3) | Seed | 50, 220, 500, 2500 |
| 🌵 Cactus | 11 | Seed | none (0) | Seed | 30, 120, 300, 1600 |
| 🌴 Coconut Palm | 12 | Fruit | high (3) | Seed, Fruit | 60, 260, 580, 2400 |
| 🥔 Potato | 13 | Seed | low (1) | Seed, Adult | 12, 42, 95, 420 |
| 🌶️ Chili Pepper | 14 | Fruit | medium (2) | Seed, Fruit | 11, 46, 125, 500 |
| 🫒 Olive Tree | 15 | Fruit | medium (2) | Seed, Fruit | 55, 240, 560, 2600 |

### Exports

| Export | Type | Description |
|--------|------|-------------|
| `PLANT_SPECIES` | Object | Full registry keyed by species ID |
| `ALL_PLANT_IDS` | Array | All 15 plant species keys |
| `getPlantByTypeId(typeId)` | Function | Lookup plant data by numeric typeId |
| `buildStageAges()` | Function | Returns `{1: [5,18,35,180], ...}` per typeId |
| `buildFruitSpoilAges()` | Function | Returns fruit decay thresholds per typeId |
| `buildPlantColors()` | Function | Returns stage→RGBA colors per typeId |
| `buildPlantEmojiMap()` | Function | Returns stage→emoji per typeId |
| `buildProductionChances()` | Function | Returns seed spreading chance per typeId |
| `buildReproductionModes()` | Function | Returns `SEED` or `FRUIT` per typeId |
| `buildEdibleStagesMap()` | Function | Returns `{typeId: Set([stages...]), ...}` for edible stages |
| `buildWaterAffinityMap()` | Function | Returns `{typeId: numericAffinity, ...}` (0–3) |
| `buildTreeTypes()` | Function | Returns `Set<typeId>` for tree compatibility rules |
| `buildLowPlantTypes()` | Function | Returns `Set<typeId>` for mountain-compatible low plants |
| `buildDesertPlantTypes()` | Function | Returns `Set<typeId>` for sand-compatible desert plants |
| `buildSpawnWeightMap()` | Function | Returns per-type weighted spawn data for near/mid/far water zones |

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
| `plantType` | `Uint8Array` | Plant type per tile (0 = none, 1–15) |
| `plantStage` | `Uint8Array` | Growth stage (0–6) |
| `plantAge` | `Uint16Array` | Ticks since planted |
| `plantFruit` | `Uint8Array` | Boolean (0 or 1) |

All World methods that accept `(x, y)` coordinates **floor float inputs** internally using `| 0` (bitwise OR). This allows sub-tile animal positions (e.g. `5.75, 3.25`) to be passed directly — the tile lookup always resolves to the integer tile.

**Key Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `idx(x, y)` | `→ number` | Flat array index (floors float inputs) |
| `isInBounds(x, y)` | `→ boolean` | Boundary check (floors float inputs) |
| `isWalkable(x, y)` | `→ boolean` | Not WATER or ROCK (floors float inputs) |
| `isWalkableFor(x, y, walkableSet)` | `→ boolean` | Species-specific walkability check |
| `isWaterAdjacent(x, y)` | `→ boolean` | 8-neighbor water check (floors float inputs) |
| `isTileOccupied(x, y)` | `→ boolean` | Whether animalGrid has an occupant (floors float inputs) |
| `placeAnimal(x, y)` | — | Mark tile as occupied (floors float inputs) |
| `vacateAnimal(x, y)` | — | Mark tile as vacant (floors float inputs) |
| `getAliveSpeciesCount(species)` | `→ number` | Alive count for a species (lazy cached per tick) |
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

**Core Properties:** `id`, `x`, `y` (float, tile-center e.g. `5.5, 3.25`), `species`, `diet`, `sex`, `state`, `energy`, `hp`, `hunger`, `thirst`, `age`, `alive`, `_deathTick`, `actionHistory`

**Dirty Tracking:** `_dirty` flag set on any mutation (position, energy, state, HP). Used by incremental serialization to send only changed animals per tick.

**Computed:** `lifeStage` (getter, derived from age + `life_stage_ages`). Reverse lookup uses pre-computed `LIFE_STAGE_KEYS` array (avoids `Object.keys().find()` per tick).

**Pathfinding:** `targetX/Y`, `path` (waypoint array), `pathIndex`

**Cooldowns:** `mateCooldown`, `attackCooldown`

**Key Methods:**

| Method | Description |
|--------|-------------|
| `energyCost(action)` | Lookup cost from species config |
| `applyEnergyCost(action)` | Subtract cost, clamp to [0, maxEnergy] |
| `tickNeeds()` | Increment hunger/thirst by species rate (with life-stage metabolic multipliers), apply HP penalties when needs > 80%, tick cooldowns |
| `logAction(tick, action, detail)` | Append action to ring buffer (O(1), max `action_history_max_size` entries) |
| `toDict()` | Serializable snapshot for renderer/UI (includes `hp`, `lifeStage`, `_deathTick`, `actionHistory`) |
| `toDelta()` | Lightweight delta for incremental updates (omits `actionHistory`, `species`, `diet`) |
| `toWorkerState()` | Full internal state for sub-worker transfer (includes path, caches, config references) |
| `clearDirty()` | Reset `_dirty` flag after serialization |

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

The tick is split into composable phases for parallelism support:

```
1. tickFlora():
   a. Reset plantChanges
   b. Advance clock
   c. processPlants(world)

2. tickFaunaSequential():
   a. For each alive animal:
        decideAndAct(animal, world, spatialHash)
   b. Update spatialHash positions

3. tickCleanup():
   a. Remove newly dead from spatial hash + occupancy grid
   b. Adaptive cleanup interval: every 10/25/50 ticks (by population)
   c. Every 10 ticks: record stats snapshot (max 1000)
```

The legacy `tick()` method calls all three in sequence for backward compatibility. The split enables the worker to run fauna in parallel sub-workers via `applyFaunaResults()`.

#### Parallel Fauna Path (`applyFaunaResults`)

When fauna sub-workers are active, the main worker calls `applyFaunaResults(results)` instead of `tickFaunaSequential()`. This method:
- Sorts all deltas by `animal.id` for deterministic merge order
- Rebuilds the occupancy grid from scratch
- Resolves movement conflicts (first delta wins)
- Deduplicates plant eating (Set-based tracking)
- Reassigns proper IDs to births from the main world counter
- Rebuilds spatial hash after merge

**Dead animal lifecycle:** When an animal dies, `_deathTick` is recorded. Dead animals remain in the array (and are visible as 💀 skulls) for 300 ticks, then are permanently removed.

### Public Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `generateWorld()` | `→ number (seed)` | Create world, gen terrain, seed plants/animals |
| `resetSimulation()` | `→ void` | Clear everything, re-seed |
| `tick()` | `→ void` | One simulation step (tickFlora + tickFaunaSequential + tickCleanup) |
| `tickFlora()` | `→ void` | Advance clock, process plants |
| `tickFaunaSequential()` | `→ void` | Run all animal AI sequentially, rebuild spatial hash |
| `tickCleanup()` | `→ void` | Remove dead, adaptive cleanup, record stats |
| `applyFaunaResults(results)` | `→ void` | Merge parallel fauna deltas (replaces tickFaunaSequential) |
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
- Cell key is a packed integer: `(cx & 0xFFFF) | ((cy & 0xFFFF) << 16)` — avoids string allocation in the hot loop
- Entities stored in `Map<intKey, Map<id, entity>>`
- `queryRadius` checks all cells overlapping the query circle, then filters by Euclidean distance²
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
