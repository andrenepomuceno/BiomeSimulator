# EcoGame API Reference

Complete reference for the EcoGame backend REST API and WebSocket events.

**Base URL:** `http://localhost:5000`  
**Content Types:** JSON (`application/json`) for most endpoints; MessagePack (`application/x-msgpack`) for terrain data.

---

## Table of Contents

- [Map Endpoints](#map-endpoints)
- [Simulation Control](#simulation-control)
- [Entity Endpoints](#entity-endpoints)
- [Statistics](#statistics)
- [WebSocket Events](#websocket-events)
- [Data Types](#data-types)

---

## Map Endpoints

### POST `/api/map/generate`

Generate a new terrain map and populate it with plants and animals according to the current configuration.

**Request Body** (optional — all fields are optional overrides):

```json
{
  "map_width": 500,
  "map_height": 500,
  "sea_level": 0.38,
  "island_count": 5,
  "island_size_factor": 0.3,
  "seed": 42
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `map_width` | int | 500 | Grid width in tiles |
| `map_height` | int | 500 | Grid height in tiles |
| `sea_level` | float | 0.38 | Height threshold for water (0.0–1.0) |
| `island_count` | int | 5 | Number of island blobs |
| `island_size_factor` | float | 0.3 | Relative island radius (0.0–1.0) |
| `seed` | int\|null | null | Random seed (null = random) |

**Response:** `200 OK` — MessagePack binary

```
{
  "width": 500,
  "height": 500,
  "terrain": <bytes>,        // uint8 flat array [height × width], row-major
  "water_proximity": <bytes>, // uint8 flat array [height × width]
  "seed": 42
}
```

**Terrain byte values:**

| Value | Terrain |
|---|---|
| 0 | Water |
| 1 | Sand |
| 2 | Dirt |
| 3 | Grass |
| 4 | Rock |

---

### GET `/api/map/terrain`

Get the current terrain without regenerating.

**Response:** `200 OK` — MessagePack binary (same format as `/api/map/generate` without `seed`).

**Error:** `400` if no world has been generated yet.

---

### POST `/api/map/edit`

Edit terrain tiles in bulk. Used by the terrain paint tool.

**Request Body:**

```json
{
  "changes": [
    { "x": 10, "y": 20, "terrain": 3 },
    { "x": 11, "y": 20, "terrain": 3 }
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `changes` | array | List of tile edits |
| `changes[].x` | int | Tile X coordinate |
| `changes[].y` | int | Tile Y coordinate |
| `changes[].terrain` | int | New terrain type (0–4) |

**Response:** `200 OK`

```json
{ "ok": true }
```

---

## Simulation Control

### POST `/api/sim/start`

Start the simulation loop in a background thread.

**Response:** `200 OK`

```json
{ "ok": true, "paused": false }
```

---

### POST `/api/sim/pause`

Pause the running simulation.

**Response:** `200 OK`

```json
{ "ok": true, "paused": true }
```

---

### POST `/api/sim/resume`

Resume a paused simulation.

**Response:** `200 OK`

```json
{ "ok": true, "paused": false }
```

---

### POST `/api/sim/step`

Advance the simulation by exactly one tick. Works only when paused.

**Response:** `200 OK`

```json
{ "ok": true }
```

---

### POST `/api/sim/reset`

Stop the simulation, regenerate terrain with optional config overrides, and return the new terrain.

**Request Body** (optional):

```json
{
  "map_width": 500,
  "map_height": 500,
  "sea_level": 0.38,
  "island_count": 5,
  "island_size_factor": 0.3,
  "seed": null,
  "initial_herbivore_count": 50,
  "initial_carnivore_count": 15,
  "initial_plant_density": 0.15
}
```

**Response:** `200 OK` — MessagePack binary (same format as `/api/map/generate`).

---

### POST `/api/sim/speed`

Set the simulation speed in ticks per second.

**Request Body:**

```json
{ "tps": 16 }
```

| Field | Type | Default | Description |
|---|---|---|---|
| `tps` | int | 10 | Ticks per second (1–60) |

**Response:** `200 OK`

```json
{ "ok": true, "tps": 16 }
```

---

### GET `/api/sim/status`

Get the full simulation state including world info, clock, and all animals.

**Response (no world):** `200 OK`

```json
{
  "running": false,
  "paused": true,
  "world": null
}
```

**Response (with world):** `200 OK`

```json
{
  "running": true,
  "paused": false,
  "tps": 10,
  "tick": 142,
  "day": 0,
  "time_of_day": 0.71,
  "is_night": false,
  "width": 500,
  "height": 500,
  "animals": [
    {
      "id": 1,
      "species": "HERBIVORE",
      "x": 234.5,
      "y": 102.3,
      "state": 1,
      "energy": 85.2,
      "hunger": 30.1,
      "thirst": 22.0,
      "age": 142,
      "hp": 50
    }
  ]
}
```

---

## Entity Endpoints

### POST `/api/entity/place`

Place a new entity at the specified coordinates.

**Request Body:**

```json
{
  "type": "HERBIVORE",
  "x": 100,
  "y": 200
}
```

| Field | Type | Description |
|---|---|---|
| `type` | string | `"HERBIVORE"` or `"CARNIVORE"` |
| `x` | int | Tile X coordinate |
| `y` | int | Tile Y coordinate |

**Response:** `200 OK` — Returns the created entity object.

**Error:** `400` if placement fails (e.g., water tile).

---

### GET `/api/entity/:id`

Get detailed information about a specific animal.

**Response:** `200 OK`

```json
{
  "id": 1,
  "species": "HERBIVORE",
  "x": 234.5,
  "y": 102.3,
  "state": 1,
  "state_name": "WALK",
  "energy": 85.2,
  "hunger": 30.1,
  "thirst": 22.0,
  "age": 142,
  "hp": 50,
  "max_energy": 100,
  "max_hunger": 100,
  "max_thirst": 100
}
```

**Error:** `404` if entity not found.

---

### DELETE `/api/entity/:id`

Remove an entity from the simulation.

**Response:** `200 OK`

```json
{ "ok": true }
```

**Error:** `404` if entity not found.

---

## Statistics

### GET `/api/stats`

Get current population counts and historical data for charting.

**Response:** `200 OK`

```json
{
  "current": {
    "herbivores": 49,
    "carnivores": 10,
    "plants": 131352,
    "fruits": 121824,
    "tick": 142,
    "day": 0,
    "time_of_day": 0.71,
    "is_night": false
  },
  "history": [
    {
      "tick": 0,
      "herbivores": 50,
      "carnivores": 15,
      "plants": 130000,
      "fruits": 120000
    }
  ]
}
```

The `history` array contains up to the last **200** recorded snapshots.

---

### GET `/api/tile/:x/:y`

Get detailed information about a specific tile, including terrain type and plant data.

**Response:** `200 OK`

```json
{
  "x": 100,
  "y": 200,
  "terrain": "grass",
  "terrain_id": 3,
  "water_proximity": 5,
  "plant": {
    "type": "bush",
    "stage": "mature",
    "age": 245,
    "fruit": false
  }
}
```

**Error:** `400` if coordinates are out of bounds or no world exists.

---

## WebSocket Events

The server uses Socket.IO for real-time communication. Connect to `http://localhost:5000` (or via the Vite proxy at `http://localhost:3000`).

### Client → Server

#### `viewport`

Report the client's current viewport so the server only sends entities within the visible area.

```json
{
  "x": 100,
  "y": 50,
  "w": 80,
  "h": 60
}
```

| Field | Type | Description |
|---|---|---|
| `x` | int | Left tile coordinate of viewport |
| `y` | int | Top tile coordinate of viewport |
| `w` | int | Viewport width in tiles |
| `h` | int | Viewport height in tiles |

This should be emitted whenever the camera moves or zooms.

### Server → Client

#### `tick`

Emitted after each simulation tick. Contains the current simulation state scoped to the client's viewport. Data is serialized as **MessagePack binary**.

Decoded payload:

```json
{
  "tick": 143,
  "day": 0,
  "time_of_day": 0.715,
  "is_night": false,
  "animals": [
    {
      "id": 1,
      "species": "HERBIVORE",
      "x": 234.5,
      "y": 102.3,
      "state": 1,
      "energy": 85.0,
      "hunger": 30.4,
      "thirst": 22.3,
      "age": 143,
      "hp": 50
    }
  ],
  "plant_changes": [
    { "x": 10, "y": 20, "type": 2, "stage": 3, "fruit": true },
    { "x": 15, "y": 25, "type": 0, "stage": 0, "fruit": false }
  ]
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

| ID | Name | Growth Rate | Max Age | Spread Chance |
|---|---|---|---|---|
| 0 | None | — | — | — |
| 1 | Grass | 1.0 | 300 | 2% |
| 2 | Bush | 0.5 | 800 | 1% |
| 3 | Tree | 0.2 | 2000 | 0.5% |

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
| 1 | Walk | Moving at normal speed |
| 2 | Run | Moving at increased speed |
| 3 | Eat | Consuming food |
| 4 | Drink | Consuming water |
| 5 | Sleep | Resting to recover energy |
| 6 | Attack | In combat |
| 7 | Flee | Running from predator |
| 8 | Mate | Reproducing |
| 9 | Dead | No longer active |

### Animal Species

| Species | Speed | Vision | Attack | Defense | Max Energy | Hunger Rate | Thirst Rate |
|---|---|---|---|---|---|---|---|
| Herbivore | 1 | 8 | 2 | 3 | 100 | 0.3/tick | 0.4/tick |
| Carnivore | 2 | 12 | 8 | 5 | 120 | 0.5/tick | 0.35/tick |
