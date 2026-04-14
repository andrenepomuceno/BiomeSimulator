# World & Entities

Navigation: [Documentation Home](../README.md) > [Engine](README.md) > [Current Document](world.md)
Return to [Documentation Home](../README.md).

---

## Terrain Types (`world.js`)

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
| `plantFruit` | `Uint8Array` | Boolean (0 or 1) |

All `World` methods that accept `(x, y)` coordinates **floor float inputs** internally using `| 0`. This allows sub-tile animal positions (e.g. `5.75, 3.25`) to be passed directly.

**Key Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `idx(x, y)` | `→ number` | Flat array index (floors float inputs) |
| `isInBounds(x, y)` | `→ boolean` | Boundary check |
| `isWalkable(x, y)` | `→ boolean` | Not WATER or ROCK |
| `isWalkableFor(x, y, walkableSet)` | `→ boolean` | Species-specific walkability check |
| `isWaterAdjacent(x, y)` | `→ boolean` | 8-neighbor water check |
| `isTileOccupied(x, y)` | `→ boolean` | Whether `animalGrid` has an occupant |
| `placeAnimal(x, y)` | — | Mark tile as occupied |
| `vacateAnimal(x, y)` | — | Mark tile as vacant |
| `getAliveSpeciesCount(species)` | `→ number` | Alive count for a species (lazy cached per tick) |
| `getStats()` | `→ object` | Population counts, plant stats |

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
