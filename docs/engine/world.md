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
| `items` | `GroundItem[]` | All active ground items (meat, fruit, seed) |
| `itemChanges` | `object[]` | Per-tick item deltas `{op:'add'|'remove'|'update', item}` sent to the renderer |
| `_itemById` | `Map<id, GroundItem>` | Fast O(1) item lookup by numeric ID |
| `_itemSpatialHash` | `SpatialHash` | 16-unit-cell spatial index for item proximity queries |
| `_itemTiles` | `Set<number>` | Flat tile indices where an item sits — O(1) anti-stacking check in `_findItemTile()` |
| `itemConsumptionClaims` | `object[]` | `{itemId}` records written by fauna sub-workers; merged in `applyFaunaResults()` |
| `_itemClaimMode` | `boolean` | When `true` (parallel path), `removeItem()` records a claim instead of removing immediately |

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
| `spawnItem(type, x, y, source, tick, germinationTicks?)` | `→ GroundItem\|null` | Place a ground item at or near `(x, y)`, avoiding occupied tiles (uses `_findItemTile`); returns `null` if no free tile found within `item_drop_radius_animal` |
| `removeItem(item)` | `→ void` | Remove an item from all structures; in claim mode (`_itemClaimMode=true`) records a claim instead |
| `tickItemLifecycle(config)` | `→ void` | Decay MEAT after `item_meat_decay_ticks`; transform FRUIT → SEED after `item_fruit_to_seed_ticks`; attempt seed germination when SEED age ≥ `germinationTicks` |

---

## Ground Items (`items.js`)

Ground items are physical objects lying on tiles that animals can pick up and eat. They are created on animal death or plant fruit drop and expire after a fixed number of ticks.

### Item Types

| Constant | Type | Nutrition (hunger / energy / HP) | Source |
|----------|------|----------------------------------|--------|
| `ITEM_TYPE.MEAT` | 🥩 Meat | −65 hunger / +20 energy / +12 HP | Animal death |
| `ITEM_TYPE.FRUIT` | 🍎 Fruit | −40 hunger / +6 energy / +6 HP | Plant fruit stage (via flora seeding system) |
| `ITEM_TYPE.SEED` | 🌱 Seed | −15 hunger / +2 energy / +2 HP | Fruit → Seed decay |

### Meat Drop Ranges (by animal mass)

| Size class | `mass_kg` threshold | Drops |
|------------|--------------------|----|
| Small | < 5 kg | Exactly **1** meat |
| Medium | 5 – 79 kg | **1 – 2** meat |
| Large | ≥ 80 kg | **2 – 3** meat |

All size classes guarantee at least 1 meat drop. Drop counts use `meatDropRange(mass_kg)` from `items.js`.

### Seed Germination

When a SEED item's age reaches its `germinationTicks` threshold (per-species value from `plantSpecies.js`, fallback `item_seed_germination_ticks = 400`), `tickItemLifecycle()` rolls a germination chance (default `item_seed_germination_chance = 0.20`). On success:

1. `plantType[tileIdx]` is set to the seed's source plant type (`item.source`)
2. `plantStage[tileIdx]` is set to `S_SEED` (stage 1)
3. `plantAge[tileIdx]` is reset to 0
4. The tile is added to `activePlantTiles`
5. A `[x, y, type, stage]` entry is pushed to `plantChanges` for the renderer
6. A `GERMINATED` plant event is logged

Regardless of whether germination succeeds, the SEED item is removed.

### `GroundItem` Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `number` | Unique ID from `nextItemId()` (base 2,000,000,000) |
| `x`, `y` | `number` | Tile position (integer) |
| `type` | `ITEM_TYPE` | `MEAT`, `FRUIT`, or `SEED` |
| `source` | `number\|string` | Species name (meat) or plant typeId (fruit/seed) |
| `createdTick` | `number` | Tick when the item was spawned (used for age calculation) |
| `germinationTicks` | `number` | Ticks until seed germination attempt (0 = use config fallback) |
| `consumed` | `boolean` | Marked `true` when eaten or removed; prevents double-removal |

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
