# World & Entities

Navigation: [Documentation Home](../README.md) > [Engine](README.md) > [Current Document](world.md)
Return to [Documentation Home](../README.md).

---

## Terrain Types (`world.js`)

Terrain is stored as a `Uint8Array` using 9 constants. These constants are also exported as `TERRAIN_IDS` (name→number) and `TERRAIN_NAMES` (number→string) for serialization and species config builders.

| Constant | Value | Walkable (default) | Notes |
|----------|-------|--------------------|-------|
| `WATER` | 0 | No | Shallow water; blocks most land animals; flying species can cross |
| `SAND` | 1 | Yes | Coastal and desert terrain; slower movement (0.75×) |
| `DIRT` | 2 | Yes | Common inland terrain; standard growth conditions |
| `SOIL` | 3 | Yes | Fertile terrain; standard movement and plant growth |
| `ROCK` | 4 | Yes\* | Walkable by rock-tolerant species; most plants cannot grow here |
| `FERTILE_SOIL` | 5 | Yes | Best growing terrain for most non-desert plants |
| `DEEP_WATER` | 6 | No | Open ocean; blocks all species except flyers |
| `MOUNTAIN` | 7 | No\* | Blocks most species; only a few (Goat, Bear, Crow, Hawk) can traverse it |
| `MUD` | 8 | Yes | Slow terrain (0.5× speed); found near water edges |

\* Rock is walkable only for species that include it in `walkable_terrain`. Mountain is blocked by `isWalkable()` (the default A\* predicate) but accessible for species whose `walkable_terrain` set includes `MOUNTAIN`.

---

## `Clock` Class

Tracks simulation time with a day/night cycle.

```javascript
const clock = new Clock(ticksPerDay, dayFraction);
clock.advance();           // increment tick
clock.dayNumber;           // current day (tick / ticksPerDay)
clock.tickInDay;           // tick within current day
clock.isNight;             // tickInDay >= dayFraction * ticksPerDay
clock.toDict();            // serializable snapshot
```

---

## `World` Class

Holds the entire world state using flat TypedArrays for memory efficiency. Grid storage is row-major: `index = y * width + x`.

| Array | Type | Description |
|-------|------|-------------|
| `terrain` | `Uint8Array` | Terrain type per tile (0–8) |
| `waterProximity` | `Uint8Array` | BFS distance to nearest water (capped 255) |
| `plantType` | `Uint8Array` | Plant type per tile (0 = none, 1–15) |
| `plantStage` | `Uint8Array` | Growth stage (0–6) |
| `plantAge` | `Uint16Array` | Ticks since planted |
| `plantFruit` | `Uint8Array` | Boolean fruit flag (0 or 1) |
| `animalGrid` | `Uint8Array` | Count of living animals occupying each tile |
| `eggGrid` | `Uint8Array` | Count of egg-stage animals on each tile |
| `activePlantTiles` | `Set<number>` | Flat indices of tiles that have a living plant — avoids iterating the full grid each tick |

All `World` methods that accept `(x, y)` coordinates **floor float inputs** internally using `| 0`. This allows sub-tile animal positions (e.g. `5.75, 3.25`) to be passed directly.

**Key Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `idx(x, y)` | `→ number` | Flat array index (floors float inputs) |
| `isInBounds(x, y)` | `→ boolean` | Boundary check |
| `isWalkable(x, y)` | `→ boolean` | Default A\* predicate: not WATER, DEEP\_WATER, or MOUNTAIN |
| `isWalkableFor(x, y, walkableSet)` | `→ boolean` | Species-specific walkability: checks the tile type against the species' `walkable_terrain` Set |
| `isTileOccupied(x, y)` | `→ boolean` | Whether `animalGrid` count > 0 at that tile |
| `isTileBlocked(x, y)` | `→ boolean` | `isWalkable` AND not occupied — used by birth placement to find a free adjacent tile |
| `isWaterAdjacent(x, y)` | `→ boolean` | 8-neighbor water check |
| `placeAnimal(x, y)` | — | Increment `animalGrid` count at that tile |
| `vacateAnimal(x, y)` | — | Decrement `animalGrid` count at that tile |
| `getAliveSpeciesCount(species)` | `→ number` | Alive count for a species (lazily cached once per tick via `_speciesPopCache`) |
| `getStats()` | `→ object` | Population counts, plant totals, and event tallies |

---

## `Animal` Class (`entities.js`)

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

### Core Properties

**Identity:** `id`, `species`, `diet`, `sex`  
**Position:** `x`, `y` (float, e.g. `5.5, 3.25`)  
**Vitals:** `state`, `energy`, `hp`, `hunger`, `thirst`, `age`, `alive`, `_deathTick`  
**Pathfinding:** `targetX/Y`, `path` (waypoint array), `pathIndex`  
**Cooldowns:** `mateCooldown`, `attackCooldown`  
**Dirty tracking:** `_dirty` flag set on any mutation, used for incremental serialization  

### Key Methods

| Method | Description |
|--------|-------------|
| `energyCost(action)` | Lookup cost from species config |
| `applyEnergyCost(action)` | Subtract cost, clamp to [0, maxEnergy] |
| `tickNeeds()` | Increment hunger/thirst, apply HP penalties when needs > 80%, tick cooldowns |
| `logAction(tick, action, detail)` | Append to ring buffer (O(1), max `action_history_max_size` entries) |
| `toDict()` | Serializable snapshot for renderer/UI |
| `toDelta()` | Lightweight delta for incremental updates |
| `toWorkerState()` | Full internal state for sub-worker transfer |
| `clearDirty()` | Reset `_dirty` flag after serialization |

**Sex assignment:** `SEXUAL` → 50% male / 50% female. `HERMAPHRODITE` / `ASEXUAL` → assigned directly.

**`lifeStage` getter:** derived from `age` + `life_stage_ages`. Uses pre-computed `LIFE_STAGE_KEYS` array instead of `Object.keys().find()` per tick.
