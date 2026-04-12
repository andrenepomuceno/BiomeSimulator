# EcoGame Worker Message API Reference

Complete reference for the Web Worker message protocol used between the main thread (React UI) and the simulation worker.

**Communication:** `postMessage` / `onmessage` via the standard Web Worker API.

---

## Table of Contents

- [Main → Worker Commands](#main--worker-commands)
- [Worker → Main Messages](#worker--main-messages)
- [Data Types](#data-types)

---

## Main → Worker Commands

All commands are sent via `worker.postMessage({ cmd, ...params })`.

### `generate`

Generate a new terrain map, populate it with plants and animals, and return the full world state.

```javascript
worker.postMessage({
  cmd: 'generate',
  config: {           // optional — all fields override DEFAULT_CONFIG
    map_width: 500,
    map_height: 500,
    sea_level: 0.38,
    island_count: 5,
    island_size_factor: 0.3,
    seed: 42,
    initial_herbivore_count: 50,
    initial_carnivore_count: 15,
    initial_plant_density: 0.15,
  }
});
```

| Field | Type | Default | Description |
|---|---|---|---|
| `config.map_width` | int | 500 | Grid width in tiles |
| `config.map_height` | int | 500 | Grid height in tiles |
| `config.sea_level` | float | 0.38 | Height threshold for water (0.0–1.0) |
| `config.island_count` | int | 5 | Number of island blobs |
| `config.island_size_factor` | float | 0.3 | Relative island radius (0.0–1.0) |
| `config.seed` | int\|null | null | Random seed (null = random) |
| `config.initial_herbivore_count` | int | 50 | Starting herbivore population |
| `config.initial_carnivore_count` | int | 15 | Starting carnivore population |
| `config.initial_plant_density` | float | 0.15 | Fraction of eligible tiles seeded |

**Response:** Worker posts a `worldReady` message (see below).

---

### `start`

Start the simulation tick loop.

```javascript
worker.postMessage({ cmd: 'start' });
```

---

### `pause`

Pause the simulation tick loop.

```javascript
worker.postMessage({ cmd: 'pause' });
```

---

### `resume`

Resume a paused simulation.

```javascript
worker.postMessage({ cmd: 'resume' });
```

---

### `step`

Advance the simulation by exactly one tick.

```javascript
worker.postMessage({ cmd: 'step' });
```

**Response:** Worker posts a `tick` message.

---

### `setSpeed`

Set the simulation speed in ticks per second.

```javascript
worker.postMessage({ cmd: 'setSpeed', tps: 16 });
```

| Field | Type | Range | Description |
|---|---|---|---|
| `tps` | int | 1–120 | Target ticks per second |

---

### `editTerrain`

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
| `changes[].terrain` | int | New terrain type (0–4) |

Water proximity is automatically recomputed after edits.

---

### `placeEntity`

Place a new entity at the specified coordinates.

```javascript
worker.postMessage({ cmd: 'placeEntity', entityType: 'HERBIVORE', x: 100, y: 200 });
```

| Field | Type | Description |
|---|---|---|
| `entityType` | string | `"HERBIVORE"`, `"CARNIVORE"`, `"TREE"`, `"BUSH"`, or `"GRASS_PLANT"` |
| `x` | int | Tile X coordinate |
| `y` | int | Tile Y coordinate |

**Response:** Worker posts an `entityPlaced` message.

---

### `removeEntity`

Remove an animal entity by ID.

```javascript
worker.postMessage({ cmd: 'removeEntity', entityId: 42 });
```

| Field | Type | Description |
|---|---|---|
| `entityId` | int | The animal's unique ID |

**Response:** Worker posts an `entityRemoved` message.

---

### `getTileInfo`

Query detailed information about a specific tile.

```javascript
worker.postMessage({ cmd: 'getTileInfo', x: 100, y: 200 });
```

**Response:** Worker posts a `tileInfo` message.

---

## Worker → Main Messages

All messages arrive via `worker.onmessage = (e) => { const msg = e.data; ... }`.

### `worldReady`

Sent after a `generate` command completes. Contains the full initial world state.

```javascript
{
  type: 'worldReady',
  width: 500,
  height: 500,
  seed: 42,
  terrain: ArrayBuffer,       // Uint8Array, flat [height × width], row-major
  waterProximity: ArrayBuffer, // Uint8Array, flat [height × width]
  plantType: ArrayBuffer,      // Uint8Array, flat [height × width]
  plantStage: ArrayBuffer,     // Uint8Array, flat [height × width]
  animals: [ ... ],            // Array of animal dicts
  clock: {
    tick: 0,
    day: 0,
    tick_in_day: 0,
    is_night: false,
    ticks_per_day: 200,
  }
}
```

The `terrain`, `waterProximity`, `plantType`, and `plantStage` fields are `ArrayBuffer`s that should be wrapped with `new Uint8Array(buffer)`.

---

### `tick`

Sent after each simulation tick. Contains the current state.

```javascript
{
  type: 'tick',
  clock: {
    tick: 143,
    day: 0,
    tick_in_day: 143,
    is_night: false,
    ticks_per_day: 200,
  },
  animals: [
    {
      id: 1,
      species: 'HERBIVORE',
      x: 234,
      y: 102,
      state: 1,
      energy: 85.2,
      hunger: 30.1,
      thirst: 22.0,
      age: 143,
      alive: true,
    }
  ],
  plantChanges: [
    [10, 20, 2, 3],   // [x, y, plantType, plantStage]
    [15, 25, 0, 0],
  ],
  // Included every 10 ticks:
  stats: {
    tick: 140,
    herbivores: 49,
    carnivores: 10,
    plants_grass: 50000,
    plants_bush: 30000,
    plants_tree: 20000,
    plants_total: 100000,
    fruits: 15000,
  },
  statsHistory: [ ... ],  // Last 1000 stat snapshots
}
```

---

### `tileInfo`

Response to a `getTileInfo` command.

```javascript
{
  type: 'tileInfo',
  x: 100,
  y: 200,
  info: {
    terrain: 'grass',
    waterProximity: 5,
    plant: {
      type: 2,      // 0=none, 1=grass, 2=bush, 3=tree
      stage: 3,     // 0=none, 1=seed, 2=sprout, 3=mature, 4=fruiting, 5=dead
      age: 245,
      fruit: 0,
    },
    animals: [
      { id: 1, species: 'HERBIVORE', x: 100, y: 200, ... }
    ]
  }
}
```

Returns `info: null` if coordinates are out of bounds.

---

### `entityPlaced`

Confirmation after a `placeEntity` command.

```javascript
{
  type: 'entityPlaced',
  entity: { id: 66, species: 'HERBIVORE', x: 100, y: 200, ... }
  // or entity: { type: 'TREE', x: 100, y: 200 } for plants
  // or entity: null if placement failed
}
```

---

### `entityRemoved`

Confirmation after a `removeEntity` command.

```javascript
{
  type: 'entityRemoved',
  entityId: 42,
  ok: true   // false if entity not found
}
```

---

## Data Types

### Terrain Types

| ID | Name | Description |
|---|---|---|
| 0 | Water | Impassable; animals seek for drinking |
| 1 | Sand | Beach/shore terrain |
| 2 | Dirt | Bare ground |
| 3 | Grass | Default fertile terrain; plants grow here |
| 4 | Rock | Highland/mountain terrain |

### Plant Types

| ID | Name | Stage Ages (seed→sprout→mature→fruiting→dead) |
|---|---|---|
| 0 | None | — |
| 1 | Grass | 10, 40, 80, 300 |
| 2 | Bush | 20, 80, 200, 800 |
| 3 | Tree | 50, 200, 500, 2000 |

### Plant Stages

| ID | Name | Description |
|---|---|---|
| 0 | None | Empty tile |
| 1 | Seed | Newly planted |
| 2 | Sprout | Growing |
| 3 | Mature | Fully grown |
| 4 | Fruiting | Producing fruit (food source) |
| 5 | Dead | Decayed; slot available for reseeding |

### Animal States

| ID | Name | Description |
|---|---|---|
| 0 | Idle | Standing still |
| 1 | Walking | Moving at normal speed |
| 2 | Running | Moving at increased speed |
| 3 | Eating | Consuming food |
| 4 | Drinking | Consuming water |
| 5 | Sleeping | Resting to recover energy |
| 6 | Attacking | In combat |
| 7 | Fleeing | Running from predator |
| 8 | Mating | Reproducing |
| 9 | Dead | No longer active |

### Animal Species

| Species | Speed | Vision | Attack | Defense | Max Energy | Hunger Rate | Thirst Rate |
|---|---|---|---|---|---|---|---|
| Herbivore | 1 | 8 | 2 | 3 | 100 | 0.3/tick | 0.4/tick |
| Carnivore | 2 | 12 | 8 | 5 | 120 | 0.5/tick | 0.35/tick |
