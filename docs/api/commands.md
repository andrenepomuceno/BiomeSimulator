# Main → Worker Commands

Navigation: [Documentation Home](../README.md) > [API](README.md) > [Current Document](commands.md)
Return to [Documentation Home](../README.md).

All commands are sent via `worker.postMessage({ cmd, ...params })`.

---

## `generate`

Generate a new terrain map, populate it with plants and animals, and return the full world state.

```javascript
worker.postMessage({
  cmd: 'generate',
  config: {           // optional — all fields override DEFAULT_CONFIG
    map_width: 500,
    map_height: 500,
    sea_level: 0.46,
    island_count: 8,
    island_size_factor: 0.24,
    min_land_ratio: 0.35,
    river_count: 4,
    seed: 42,
    initial_plant_density: 0.10,
    max_animal_population: 10000,
    animal_global_vision_multiplier: 1.2,
    initial_animal_counts: {
      RABBIT: 100, SQUIRREL: 60, BEETLE: 100, GOAT: 35, DEER: 50,
      FOX: 28, WOLF: 20, SNAKE: 20, HAWK: 15, CROCODILE: 10,
      BOAR: 30, BEAR: 12, RACCOON: 25, CROW: 40, LIZARD: 35,
      MOSQUITO: 120, CATERPILLAR: 120, CRICKET: 90,
    },
  }
});
```

| Field | Type | Default | Description |
|---|---|---|---|
| `config.map_width` | int | 500 | Grid width in tiles |
| `config.map_height` | int | 500 | Grid height in tiles |
| `config.sea_level` | float | 0.46 | Height threshold for water (0.0–1.0) |
| `config.island_count` | int | 8 | Number of island blobs |
| `config.island_size_factor` | float | 0.24 | Relative island radius (0.0–1.0) |
| `config.min_land_ratio` | float | 0.35 | Minimum fraction of tiles that must remain land; sea level is clamped downward to satisfy this floor (0 disables clamping) |
| `config.river_count` | int | 4 | Number of rivers carved from highland sources toward existing water (0 disables river carving) |
| `config.seed` | int\|null | null | Random seed (null = random) |
| `config.initial_plant_density` | float | 0.10 | Fraction of eligible tiles seeded |
| `config.max_animal_population` | int | 10000 | Global animal population budget (0 = use per-species defaults) |
| `config.animal_global_vision_multiplier` | float | 1.2 | Scales all species base vision before day/night modifiers |
| `config.initial_animal_counts` | object | (per-species) | Map of species ID → initial count, normalized against `max_animal_population` and each species effective cap before spawn |

When `config.max_animal_population` is enabled, the worker clamps and rebalances the requested initial animal counts before the first spawn pass so the world starts within the same effective caps used later for reproduction.

**Response:** Worker posts a [`worldReady`](messages.md#worldready) message.

---

## `start`

Start the simulation tick loop.

```javascript
worker.postMessage({ cmd: 'start' });
```

---

## `pause`

Pause the simulation tick loop.

```javascript
worker.postMessage({ cmd: 'pause' });
```

---

## `resume`

Resume a paused simulation.

```javascript
worker.postMessage({ cmd: 'resume' });
```

---

## `step`

Advance the simulation by exactly one tick.

```javascript
worker.postMessage({ cmd: 'step' });
```

**Response:** Worker posts a [`tick`](messages.md#tick) message.

---

## `setSpeed`

Set the simulation speed in ticks per second.

```javascript
worker.postMessage({ cmd: 'setSpeed', tps: 16 });
```

| Field | Type | Range | Description |
|---|---|---|---|
| `tps` | int | 1–120 | Target ticks per second |

---

## `editTerrain`

Apply terrain edits in bulk. Used by the terrain paint tool.

```javascript
worker.postMessage({
  cmd: 'editTerrain',
  changes: [
    { x: 10, y: 20, terrain: 3 },
    { x: 11, y: 20, terrain: 3 },
  ]
});
```

| Field | Type | Description |
|---|---|---|
| `changes` | array | List of tile edits |
| `changes[].x` | int | Tile X coordinate |
| `changes[].y` | int | Tile Y coordinate |
| `changes[].terrain` | int | New terrain type (0–8) |

Water proximity is automatically recomputed after edits.

---

## `placeEntity`

Place a new entity at the specified coordinates.

```javascript
worker.postMessage({ cmd: 'placeEntity', entityType: 'RABBIT', x: 100, y: 200 });
```

| Field | Type | Description |
|---|---|---|
| `entityType` | string | Any animal species ID (`"RABBIT"`, `"FOX"`, etc.) or plant type (`"GRASS"`, `"OAK_TREE"`, etc.) |
| `x` | int | Tile X coordinate |
| `y` | int | Tile Y coordinate |

**Response:** Worker posts an [`entityPlaced`](messages.md#entityplaced) message.

---

## `removeEntity`

Remove an animal entity by ID.

```javascript
worker.postMessage({ cmd: 'removeEntity', entityId: 42 });
```

| Field | Type | Description |
|---|---|---|
| `entityId` | int | The animal's unique ID |

**Response:** Worker posts an [`entityRemoved`](messages.md#entityremoved) message.

---

## `getTileInfo`

Query detailed information about a specific tile.

```javascript
worker.postMessage({ cmd: 'getTileInfo', x: 100, y: 200 });
```

**Response:** Worker posts a [`tileInfo`](messages.md#tileinfo) message.

---

## `saveState`

Serialize the entire world state for persistence.

```javascript
worker.postMessage({ cmd: 'saveState' });
```

**Response:** Worker posts a [`savedState`](messages.md#savedstate) message containing the full save object.

### Save Data Schema

```javascript
{
  config: { ... },                // Full simulation config used to generate this world
  width: 500,                     // Map width in tiles
  height: 500,                    // Map height in tiles
  clock: { tick, day, tick_in_day, is_night, ticks_per_day },
  terrain: [0, 3, 3, 1, ...],    // Flat array (was Uint8Array, serialized to regular array)
  waterProximity: [255, 10, ...], // Flat array (was Uint8Array)
  plantType: [0, 1, 2, ...],     // Flat array (was Uint8Array)
  plantStage: [0, 3, 4, ...],    // Flat array (was Uint8Array)
  plantAge: [0, 120, 400, ...],  // Flat array (was Uint16Array)
  animals: [ { id, x, y, species, energy, hunger, thirst, age, alive, state, sex, diet, ... } ],
  nextAnimalId: 1042,             // ID counter for new spawns
  statsHistory: [ ... ],          // Historical stat snapshots
}
```

All TypedArrays are converted to regular arrays via `Array.from()` for JSON serialization.

---

## `loadState`

Restore a previously saved world state.

```javascript
worker.postMessage({ cmd: 'loadState', state: savedData });
```

| Field | Type | Description |
|---|---|---|
| `state` | object | A save data object previously received from `savedState` |

The worker reconstructs all TypedArrays, re-creates `Animal` instances from dicts, rebuilds the spatial hash, and re-initializes fauna sub-workers with the loaded terrain.

**Response:** Worker posts a [`worldReady`](messages.md#worldready) message.

## `saveState`

Serialize the entire world state for saving.

```javascript
worker.postMessage({ cmd: 'saveState' });
```

**Response:** Worker posts a [`savedState`](messages.md#savedstate) message.

---

## `loadState`

Restore a previously saved world state.

```javascript
worker.postMessage({ cmd: 'loadState', state: savedStateData });
```

| Field | Type | Description |
|---|---|---|
| `state` | object | Full serialized world data from a `savedState` message |

**Response:** Worker posts a [`worldReady`](messages.md#worldready) message.
