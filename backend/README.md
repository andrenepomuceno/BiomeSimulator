# EcoGame Backend

Python/Flask backend for the EcoGame ecosystem simulation. Handles terrain generation, simulation logic, REST API, and real-time WebSocket streaming.

---

## Setup

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Server starts on **http://0.0.0.0:5000** with Flask debug mode and eventlet async worker.

### Dependencies

| Package | Version | Purpose |
|---|---|---|
| flask | 3.1.1 | HTTP framework |
| flask-socketio | 5.5.1 | WebSocket support |
| flask-cors | 5.0.1 | CORS headers for dev |
| numpy | 2.2.4 | Vectorized computation |
| msgpack | 1.1.0 | Binary serialization |
| eventlet | 0.39.1 | Async I/O for SocketIO |

---

## Module Overview

### `app.py`

Flask application factory. Creates the Flask app, configures SocketIO with eventlet, initializes the simulation runner, and registers API routes and socket events.

### `config.py`

`DEFAULT_CONFIG` dictionary containing all simulation parameters: map generation settings, flora growth rates, fauna species stats, and simulation timing. All values can be overridden at runtime via the API.

### `api/routes.py`

REST API blueprint with endpoints for:
- **Map**: generate, get terrain, edit tiles
- **Simulation**: start, pause, resume, step, reset, set speed, get status
- **Entities**: place, get, remove
- **Stats**: population counts and history
- **Tiles**: detailed tile info query

See [API.md](../docs/API.md) for the full reference.

### `api/socket_events.py`

Socket.IO event handlers. Tracks per-client viewports and broadcasts simulation tick data as MessagePack binary, scoped to each client's visible area for bandwidth efficiency.

### `engine/map_generator.py`

Procedural terrain generation using pure-NumPy Perlin noise (no external noise libraries). Features:
- Multi-octave fractional Brownian motion (FBM)
- Vectorized gradient noise with smoothstep interpolation
- Circular island blob masking
- BFS-based water proximity computation
- Height-to-terrain classification (Water → Sand → Dirt → Grass → Rock)

### `engine/world.py`

World state container holding:
- `terrain` — NumPy uint8 2D array
- `water_proximity` — NumPy uint8 2D array (distance to nearest water)
- `plant_grid` — NumPy structured array with dtype `PLANT_DTYPE` (type, stage, age, fruit)
- `animals` — list of `Animal` instances
- `Clock` — tick counter, day/night cycle computation
- `stats_history` — population snapshots per tick

### `engine/entities.py`

`Animal` data class with `__slots__` for memory efficiency. Manages:
- Position (float x, y)
- State (IntEnum: IDLE, WALK, RUN, EAT, DRINK, SLEEP, ATTACK, FLEE, MATE, DEAD)
- Vitals: energy, hunger, thirst, HP, age
- Species config reference
- Serialization via `to_dict()`

### `engine/flora.py`

Vectorized plant lifecycle processing using NumPy mask operations:
- `seed_initial_plants()` — places initial plants on eligible terrain
- `process_plants()` — advances plant ages and stages, applies water proximity bonus
- `_spread_seeds()` — handles seed dispersal (capped at 500 per tick)

Plant types (Grass, Bush, Tree) each have independent growth rates, max ages, and spread chances.

### `engine/behaviors.py`

Animal AI state machine with priority-based decision logic:

1. **Thirst > 80** → seek nearest water tile
2. **Hunger > 70** → seek food (plants for herbivores, prey for carnivores)
3. **Energy < 20** → sleep to recover
4. **Predator nearby** → flee
5. **Mature + partner nearby** → mate
6. **Default** → random walk

Each behavior function handles movement, resource consumption, and state transitions.

### `engine/simulation.py`

`SimulationRunner` — manages the simulation loop in a background thread:
- `generate_world()` — creates terrain + seeds plants/animals
- `start() / pause() / resume() / step() / stop()` — lifecycle control
- `set_speed(tps)` — adjustable tick rate
- `_tick()` — per-tick pipeline: flora → fauna → spatial hash rebuild → cleanup dead → record stats
- `get_state_for_viewport()` — returns viewport-scoped state for WebSocket broadcasting
- `edit_terrain()` / `place_entity()` / `remove_entity()` — editor operations

### `engine/pathfinding.py`

Bounded A* pathfinding on the terrain grid. Maximum search distance of 50 tiles. Returns a list of (x, y) waypoints or `None` if no path found. Respects terrain passability (water is impassable for land animals).

### `engine/spatial_hash.py`

`SpatialHash` with configurable `cell_size` (default 16). Provides O(1) average-case neighbor lookups for:
- Finding nearby animals within a radius
- Predator/prey detection
- Mate finding

Methods: `insert()`, `remove()`, `update()`, `query_radius()`, `rebuild()`.

---

## Performance Notes

- **Terrain generation**: ~1–2 seconds for 500×500 grid on modern hardware
- **Plant processing**: Fully vectorized via NumPy — handles 100k+ plants per tick
- **Animal processing**: Sequential per-animal; practical limit ~10k animals at 10 TPS
- **Spatial hash**: Rebuilds every tick; O(n) rebuild, O(1) per query
- **WebSocket**: Viewport-scoped streaming reduces payload size; MessagePack binary encoding
