# Worker → Main Messages

Navigation: [Documentation Home](../README.md) > [API](README.md) > [Current Document](messages.md)
Return to [Documentation Home](../README.md).

All messages arrive via `worker.onmessage = (e) => { const msg = e.data; ... }`.

---

## `worldReady`

Sent after a `generate` or `loadState` command completes.

```javascript
{
  type: 'worldReady',
  width: 500,
  height: 500,
  seed: 42,
  config: { ... },
  max_animal_population: 10000,
  hungerMultiplier: 1.6,
  thirstMultiplier: 1.6,
  terrain: ArrayBuffer,        // Uint8Array, flat [height × width], row-major
  waterProximity: ArrayBuffer, // Uint8Array, flat [height × width]
  heightmap: ArrayBuffer,      // Float32Array, optional renderer shading map
  plantType: ArrayBuffer,      // Uint8Array, flat [height × width]
  plantStage: ArrayBuffer,     // Uint8Array, flat [height × width]
  animals: [ ... ],
  clock: {
    tick: 0,
    day: 0,
    tick_in_day: 0,
    is_night: false,
    ticks_per_day: 260,
  }
}
```

The `terrain`, `waterProximity`, `plantType`, and `plantStage` fields are `ArrayBuffer`s — wrap with `new Uint8Array(buffer)`. `heightmap` (when present) should be wrapped with `new Float32Array(buffer)`.

---

## `tick`

Sent after each worker loop iteration. At high TPS, one message may represent multiple simulated ticks because the worker caps UI update rate to 30 Hz and batches ticks internally.

```javascript
{
  type: 'tick',
  clock: {
    tick: 143,
    day: 0,
    tick_in_day: 143,
    is_night: false,
    ticks_per_day: 260,
  },
  animals: [
    {
      id: 1,
      species: 'RABBIT',
      x: 234, y: 102,
      state: 1,
      energy: 85.2,
      hp: 48.5,
      hunger: 30.1,
      thirst: 22.0,
      age: 143,
      alive: true,
      lifeStage: 2,
      actionHistory: [        // Last N actions (ring buffer; default 150)
        { tick: 140, action: 'Eat', detail: 'Strawberry (Fruit) hunger=22' },
      ],
    }
  ],
  plantChanges: [
    [10, 20, 2, 3],   // [x, y, plantType, plantStage]
    [15, 25, 0, 0],
  ],
  itemChanges: [
    { op: 'add',    item: { id: 2000000001, x: 42, y: 17, type: 'MEAT', source: 'WOLF', createdTick: 500, germinationTicks: 0 } },
    { op: 'remove', item: { id: 2000000001, consumed: true } },
    { op: 'update', item: { id: 2000000002, type: 'SEED', createdTick: 720 } },  // fruit → seed decay
  ],
  incremental: true,      // false on full sync boundary (every 30 ticks or forced)
  animalsDead: [12, 55],  // optional: IDs explicitly removed from client caches
  plantsFullSync: {       // optional: present when plantChanges overflows max budget
    width: 500,
    height: 500,
    plantType: ArrayBuffer,
    plantStage: ArrayBuffer,
  },
  itemsFullSync: [ ... ], // optional: present when itemChanges overflows max budget
  phases: {               // per-phase timing telemetry from engine
    floraMs: 1.5,
    behaviorMs: 7.2,
    cleanupMs: 0.8,
    spatialMs: 0.6,
    totalMs: 10.4,
  },
  supervisorReport: {     // optional: only when sampled audit finds issues
    tick: 143,
    issueCount: 2,
    countsByType: { animal_numeric: 1, plant_grid: 1 },
    samples: { ... },
  },
  // Included every 10 ticks:
  stats: {
    tick: 140,
    herbivores: 49,
    carnivores: 10,
    plants_total: 100000,
    fruits: 15000,
    tickMs: 12.5,
    animalCount: 59,
    activePlants: 80000,
  },
  statsHistory: [ ... ],  // Last 1000 stat snapshots
}
```

`itemChanges` is an incremental delta list of ground item events since the last posted worker update. Each entry has:

| Field | Description |
|-------|-------------|
| `op` | `'add'` — item spawned; `'remove'` — item consumed or decayed; `'update'` — item type changed (e.g. fruit→seed) |
| `item` | Partial or full `GroundItem` delta (always includes `id`) |

On `'add'`, the full item fields (`x`, `y`, `type`, `source`, `createdTick`, `germinationTicks`) are included. On `'remove'`, only `id` and `consumed` are guaranteed. On `'update'`, only changed fields plus `id` are included.

When change lists exceed configured caps, delta arrays are intentionally dropped and replaced by full-sync payloads:

- `plantsFullSync` replaces `plantChanges`
- `itemsFullSync` replaces `itemChanges`

Animals may be a full array or an incremental delta list (dirty-flag based; full sync every 30 ticks).

---

## `tileInfo`

Response to a `getTileInfo` command.

```javascript
{
  type: 'tileInfo',
  x: 100, y: 200,
  info: {
    terrain: 'soil',
    terrainId: 3,
    waterProximity: 5,
    plant: {
      type: 2,    // 0=none, 1–15 (see Plant Types below)
      stage: 3,   // 0=none, 1=seed, 2=young_sprout, 3=adult_sprout, 4=adult, 5=fruit, 6=dead
      age: 245,
      log: [ ... ],
    },
    adjacentPlants: 4,
    neighbors: [3,3,2,3,3,2,1,1,0],
    neighborPlants: [null,{type:1,stage:4}, ...],
    waterAdjacent: true,
    animals: [
      { id: 1, species: 'RABBIT', x: 100, y: 200, ... }
    ],
    items: [
      { id: 2000000001, type: 'MEAT', x: 100, y: 200, source: 'WOLF', createdTick: 500 }
    ],
  }
}
```

Returns `info: null` if coordinates are out of bounds.

---

## `entityPlaced`

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

## `entityRemoved`

Confirmation after a `removeEntity` command.

```javascript
{
  type: 'entityRemoved',
  entityId: 42,
  ok: true   // false if entity not found
}
```

---

## `savedState`

Response to a `saveState` command — full serialized world data for storage and later restoration via `loadState`.

---

## Data Types

### Terrain Types

| ID | Name | Description |
|---|---|---|
| 0 | Water | Impassable; animals seek for drinking |
| 1 | Sand | Beach/shore terrain |
| 2 | Dirt | Bare ground |
| 3 | Soil | Default fertile terrain; plants grow here |
| 4 | Rock | Highland/mountain terrain |
| 5 | Fertile Soil | Enhanced growth terrain |
| 6 | Deep Water | Impassable ocean tiles |
| 7 | Mountain | High altitude; very few species can traverse |
| 8 | Mud | Swampy terrain; slows movement |

### Plant Types

| ID | Name |
|---|---|
| 0 | None |
| 1 | Grass |
| 2 | Strawberry |
| 3 | Blueberry |
| 4 | Apple Tree |
| 5 | Mango Tree |
| 6 | Carrot |
| 7 | Sunflower |
| 8 | Tomato |
| 9 | Mushroom |
| 10 | Oak Tree |
| 11 | Cactus |
| 12 | Coconut Palm |
| 13 | Potato |
| 14 | Chili Pepper |
| 15 | Olive Tree |

See [Plant Lifecycle](../simulation/plants.md) for stage ages and growth details.

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

### Animal Species Quick Reference

For full stats, see [Animal Species Registry](../engine/animal-species.md).

| Species | ID | Diet | Max Energy | Max HP |
|---|---|---|---|---|
| 🐰 Rabbit | RABBIT | Herbivore | 100 | 50 |
| 🐿️ Squirrel | SQUIRREL | Herbivore | 90 | 40 |
| 🪲 Beetle | BEETLE | Herbivore | 70 | 20 |
| 🐐 Goat | GOAT | Herbivore | 150 | 80 |
| 🦌 Deer | DEER | Herbivore | 140 | 70 |
| 🦟 Mosquito | MOSQUITO | Herbivore | 40 | 10 |
| 🐛 Caterpillar | CATERPILLAR | Herbivore | 50 | 15 |
| 🦗 Cricket | CRICKET | Herbivore | 45 | 15 |
| 🦊 Fox | FOX | Carnivore | 130 | 60 |
| 🐺 Wolf | WOLF | Carnivore | 160 | 120 |
| 🐍 Snake | SNAKE | Carnivore | 120 | 40 |
| 🦅 Hawk | HAWK | Carnivore | 110 | 45 |
| 🐊 Crocodile | CROCODILE | Carnivore | 180 | 180 |
| 🐗 Boar | BOAR | Omnivore | 150 | 100 |
| 🐻 Bear | BEAR | Omnivore | 200 | 200 |
| 🦝 Raccoon | RACCOON | Omnivore | 100 | 50 |
| 🐦‍⬛ Crow | CROW | Omnivore | 80 | 30 |
| 🦎 Lizard | LIZARD | Omnivore | 85 | 45 |

---

## Fauna Sub-Worker Protocol

`faunaWorker.js` is an optional sub-worker used for parallel fauna processing. The main `simWorker.js` splits animals into chunks, distributes them across sub-workers, and merges the resulting deltas back into the main world state.

### Sub-Worker Message Schema

| Direction | Type | Payload |
|-----------|------|---------|
| main → sub | `init` | `config`, `terrain`, `waterProximity`, `plantType`, `plantStage`, `plantFruit`, `occupancy`, `width`, `height` |
| main → sub | `tick` | `animalStates[]`, `tick`, `isNight` (transferable ArrayBuffers for plant grids) |
| sub → main | `result` | `deltas[]`, `births[]`, `plantChanges[]`, `deadIds[]` |
| main → sub | `dispose` | — (terminate) |

### Sub-Worker Behavior

- Sub-workers receive immutable config and terrain once on `init`
- Per-tick mutable animal chunks are sent as transferable ArrayBuffers for zero-copy transfer
- Sub-workers run `decideAndAct` locally and return deltas rather than full state
- The main worker merges results via `applyFaunaResults()` — see [Simulation Engine](../engine/simulation-engine.md) for the merge algorithm
