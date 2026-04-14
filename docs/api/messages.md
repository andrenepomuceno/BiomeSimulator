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
  max_animal_population: 10000,
  terrain: ArrayBuffer,        // Uint8Array, flat [height × width], row-major
  waterProximity: ArrayBuffer, // Uint8Array, flat [height × width]
  plantType: ArrayBuffer,      // Uint8Array, flat [height × width]
  plantStage: ArrayBuffer,     // Uint8Array, flat [height × width]
  animals: [ ... ],
  clock: {
    tick: 0,
    day: 0,
    tick_in_day: 0,
    is_night: false,
    ticks_per_day: 200,
  }
}
```

The `terrain`, `waterProximity`, `plantType`, and `plantStage` fields are `ArrayBuffer`s — wrap with `new Uint8Array(buffer)`.

---

## `tick`

Sent after each simulation tick.

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
      x: 234, y: 102,
      state: 1,
      energy: 85.2,
      hp: 48.5,
      hunger: 30.1,
      thirst: 22.0,
      age: 143,
      alive: true,
      lifeStage: 2,
      actionHistory: [        // Last 100 actions (FIFO ring buffer)
        { tick: 140, action: 'Eat', detail: 'Strawberry (Fruit) hunger=22' },
      ],
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

Animals may be a full array or an incremental delta list (dirty-flag based; full sync every 30 ticks).

---

## `tileInfo`

Response to a `getTileInfo` command.

```javascript
{
  type: 'tileInfo',
  x: 100, y: 200,
  info: {
    terrain: 'grass',
    waterProximity: 5,
    plant: {
      type: 2,    // 0=none, 1–15 (see Plant Types below)
      stage: 3,   // 0=none, 1=seed, 2=young_sprout, 3=adult_sprout, 4=adult, 5=fruit, 6=dead
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
