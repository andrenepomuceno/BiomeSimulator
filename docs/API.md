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
    initial_plant_density: 0.10,
    initial_animal_counts: {  // per-species populations
      RABBIT: 100, SQUIRREL: 60, BEETLE: 80, GOAT: 35, DEER: 35,
      FOX: 28, WOLF: 20, BOAR: 30, BEAR: 12, RACCOON: 25, CROW: 35,
    },
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
| `config.initial_plant_density` | float | 0.10 | Fraction of eligible tiles seeded |
| `config.initial_animal_counts` | object | (per-species) | Map of species ID → initial count |

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
worker.postMessage({ cmd: 'placeEntity', entityType: 'RABBIT', x: 100, y: 200 });
```

| Field | Type | Description |
|---|---|---|
| `entityType` | string | Any animal species ID (`"RABBIT"`, `"FOX"`, `"WOLF"`, etc.) or plant type (`"GRASS"`, `"STRAWBERRY"`, `"OAK_TREE"`, etc.) |
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

### `saveState`

Serialize the entire world state for saving.

```javascript
worker.postMessage({ cmd: 'saveState' });
```

**Response:** Worker posts a `savedState` message.

---

### `loadState`

Restore a previously saved world state.

```javascript
worker.postMessage({ cmd: 'loadState', state: savedStateData });
```

| Field | Type | Description |
|---|---|---|
| `state` | object | Full serialized world data from a `savedState` message |

**Response:** Worker posts a `worldReady` message.

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
      species: 'RABBIT',
      x: 234,
      y: 102,
      state: 1,
      energy: 85.2,
      hunger: 30.1,
      thirst: 22.0,
      age: 143,
      alive: true,
      lifeStage: 2,
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
    plants_total: 100000,
    fruits: 15000,
  },
  statsHistory: [ ... ],  // Last 1000 stat snapshots
  animalCount: 59,        // Total alive animals
  activePlants: 80000,    // Non-dead plants
  tickMs: 12.5,           // Tick processing time in ms
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
      type: 2,      // 0=none, 1–10 (see Plant Types)
      stage: 3,     // 0=none, 1=seed, 2=young_sprout, 3=adult_sprout, 4=adult, 5=fruit, 6=dead
      age: 245,
      fruit: 0,
    },
    animals: [
      { id: 1, species: 'RABBIT', x: 100, y: 200, ... }
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
  entity: { id: 66, species: 'RABBIT', x: 100, y: 200, ... }
  // or entity: { type: 'STRAWBERRY', x: 100, y: 200 } for plants
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

| ID | Name | Stage Ages (seed→young→adult→max) |
|---|---|---|
| 0 | None | — |
| 1 | Grass | 5, 18, 35, 180 |
| 2 | Strawberry | 10, 40, 100, 400 |
| 3 | Blueberry | 15, 55, 140, 550 |
| 4 | Apple Tree | 35, 140, 350, 1600 |
| 5 | Mango Tree | 40, 180, 420, 1800 |
| 6 | Carrot | 8, 35, 80, 350 |
| 7 | Sunflower | 8, 38, 100, 500 |
| 8 | Tomato | 10, 45, 120, 450 |
| 9 | Mushroom | 6, 22, 50, 220 |
| 10 | Oak Tree | 50, 220, 500, 2500 |

### Plant Stages

| ID | Name | Description |
|---|---|---|
| 0 | None | Empty tile |
| 1 | Seed | Newly planted |
| 2 | Young Sprout | Early growth |
| 3 | Adult Sprout | Late growth |
| 4 | Adult | Fully grown |
| 5 | Fruit | Producing fruit (food source) |
| 6 | Dead | Decayed; slot available for reseeding |

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

| Species | ID | Diet | Speed | Vision | Attack | Defense | Max Energy | Max Age |
|---|---|---|---|---|---|---|---|---|
| 🐰 Rabbit | RABBIT | Herbivore | 1 | 10 | 1 | 2 | 100 | 1400 |
| 🐿️ Squirrel | SQUIRREL | Herbivore | 1 | 11 | 1 | 1 | 80 | 1300 |
| 🪲 Beetle | BEETLE | Herbivore | 1 | 7 | 1 | 4 | 60 | 1000 |
| 🐐 Goat | GOAT | Herbivore | 1 | 12 | 3 | 5 | 140 | 2200 |
| 🦌 Deer | DEER | Herbivore | 2 | 14 | 2 | 3 | 130 | 2000 |
| 🦊 Fox | FOX | Carnivore | 2 | 14 | 6 | 4 | 120 | 1600 |
| 🐺 Wolf | WOLF | Carnivore | 2 | 16 | 9 | 6 | 150 | 1800 |
| 🐗 Boar | BOAR | Omnivore | 1 | 12 | 5 | 5 | 140 | 1800 |
| 🐻 Bear | BEAR | Omnivore | 1 | 14 | 10 | 8 | 180 | 2500 |
| 🦝 Raccoon | RACCOON | Omnivore | 1 | 11 | 3 | 3 | 90 | 1400 |
| 🐦‍⬛ Crow | CROW | Omnivore | 2 | 16 | 2 | 1 | 70 | 1200 |
