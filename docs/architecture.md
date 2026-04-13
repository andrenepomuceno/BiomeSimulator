# Architecture

High-level overview of how EcoGame is structured and how data flows between layers.

---

## Layer Architecture

```
┌─────────────────────────────────────────────────┐
│                 React Components                 │
│  Toolbar · StatsPanel · EntityInspector · etc.   │
├─────────────┬───────────────────┬───────────────┤
│   Zustand   │      Hooks        │   Renderer    │
│   Store     │  useSimulation    │  GameRenderer │
│             │  useEditor        │  Camera       │
│             │                   │  TerrainLayer │
│             │                   │  PlantLayer   │
│             │                   │  EntityLayer  │
├─────────────┴───────────┬───────┴───────────────┤
│                    Web Worker                     │
│                   simWorker.js                    │
├──────────────────────────────────────────────────┤
│                  Engine (pure JS)                 │
│  SimulationEngine · World · Animal · Flora       │
│  Behaviors · Pathfinding · SpatialHash · MapGen  │
└──────────────────────────────────────────────────┘
```

### Boundaries

| Layer | Rules |
|-------|-------|
| **Engine** (`src/engine/`) | No DOM, no React, no Pixi. Pure classes and functions. Must be serializable for Worker. |
| **Worker** (`src/worker/`) | Hosts the engine. Communicates via `postMessage` only. |
| **Store** (`src/store/`) | Single Zustand store. Immutable updates via `set()`. No side effects. Includes `gameConfig` (synced from worker on `worldReady`). |
| **Hooks** (`src/hooks/`) | Bridge worker messages to store. Own the worker lifecycle. |
| **Renderer** (`src/renderer/`) | Pixi.js only. No game logic. Reads data, draws frames. |
| **Components** (`src/components/`) | React + Bootstrap UI. Read store, dispatch commands via hooks. |

---

## Data Flow

### Simulation Tick

```
Worker: engine.tick()
  → processPlants(world)
  → decideAndAct(animal, world, spatialHash)  ×N
  → rebuild spatialHash
  → getStateForViewport(vx, vy, vw, vh)
  ↓
Worker: postMessage({ type: 'tick', clock, animals, plantChanges, stats })
  ↓
Main Thread: useSimulation.onmessage
  → store.setClock(clock)
  → store.setAnimals(animals)
  → store.setPltChanges(plantChanges)
  → store.setStats(stats)
  ↓
React: App.jsx useEffect hooks
  → renderer.entityLayer.update(animals, renderer, clock.tick)
  → renderer.updatePlants(plantChanges)
  → renderer.setNight(clock.is_night)
  ↓
Pixi.js: renders at 60fps
```

### User Interaction

```
User clicks canvas
  → GameRenderer.onTileClick(x, y)
  → useEditor.handleTileClick(x, y)
  ↓
If tool = SELECT:
  → postCmd('getTileInfo', {x, y})
  → Worker returns tileInfo
  → store.setSelectedEntity() or store.setSelectedTile()
  → EntityInspector re-renders

If tool = PAINT_TERRAIN:
  → Compute brush circle
  → renderer.terrainLayer.updateTiles(changes)  (optimistic)
  → postCmd('editTerrain', {changes})

If tool = PLACE_ENTITY:
  → postCmd('placeEntity', {entityType, x, y})

If tool = ERASE:
  → Find animal at tile
  → postCmd('removeEntity', {entityId})
```

---

## Worker Protocol

Communication between main thread and worker uses structured messages.

### Main → Worker

| Command | Params | Description |
|---------|--------|-------------|
| `generate` | `config?` | Create new world |
| `start` | — | Begin tick loop |
| `pause` | — | Stop tick loop |
| `resume` | — | Resume tick loop |
| `step` | — | Single tick |
| `setSpeed` | `tps` | Change tick rate (1–120) |
| `editTerrain` | `changes[]` | Modify terrain tiles |
| `placeEntity` | `entityType, x, y` | Spawn entity |
| `removeEntity` | `entityId` | Kill entity |
| `getTileInfo` | `x, y` | Query tile data |
| `saveState` | — | Serialize world |
| `loadState` | `state` | Restore world |
| `reset` | — | Reset simulation |

### Worker → Main

| Type | Payload | When |
|------|---------|------|
| `worldReady` | terrain, plants, animals, clock, dimensions | After generate/load |
| `tick` | clock, animals, plantChanges, stats (every 10 ticks) | Each engine tick |
| `tileInfo` | terrain, plant, animals at tile | On getTileInfo |
| `entityPlaced` | entity dict | On placeEntity |
| `entityRemoved` | entityId, ok | On removeEntity |
| `savedState` | full serialized world data | On saveState |

### Binary Data

Terrain and plant arrays are sent as `ArrayBuffer` copies (not transferred) so the worker retains its own arrays.

---

## Store Structure

Single Zustand store (`simulationStore.js`):

```javascript
{
  // Worker
  worker,                          // Worker instance

  // World
  mapWidth, mapHeight,             // number
  terrainData,                     // Uint8Array

  // Simulation
  running, paused,                 // boolean
  tps,                             // number
  clock,                           // {tick, day, tick_in_day, is_night}

  // Entities
  animals,                         // [{id, x, y, species, state, energy, hp, ...}]

  // Plants
  plantChanges,                    // [[x, y, type, stage], ...]

  // Stats
  stats,                           // {herbivores, carnivores, plants_total, fruits, species}
  statsHistory,                    // array of past snapshots

  // Selection
  selectedEntity,                  // entity dict or null
  selectedTile,                    // tile info or null

  // Editor
  tool,                            // 'SELECT' | 'PAINT_TERRAIN' | 'PLACE_ENTITY' | 'ERASE'
  paintTerrain,                    // terrain constant
  brushSize,                       // number
  placeEntityType,                 // species name

  // Viewport
  viewport,                        // {x, y, w, h}
}
```

---

## Component Tree

```
App
├── GameMenu (modal: New Game / Save / Load)
├── Toolbar (top bar: controls, tools, speed, day/night)
├── Sidebar Left
│   ├── Minimap
│   └── StatsPanel (population counters + chart)
├── Canvas Area (Pixi.js via GameRenderer)
├── Sidebar Right
│   ├── EntityInspector (selected entity/tile details, life stage display)
│   └── TerrainEditor (brush settings, entity palette)
└── SimulationReport (full-screen analytics overlay)
```

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Web Worker for simulation** | Keeps 60fps rendering on main thread while simulation runs independently |
| **TypedArrays for world data** | Memory-efficient grid storage; fast binary transfer to main thread |
| **Spatial hash for neighbors** | O(1) average-case lookups vs O(n) brute force; critical for AI vision/mating |
| **Single Zustand store** | Simple state management; all UI reads from one source of truth |
| **1px-per-tile textures** | Efficient rendering at any zoom; nearest-neighbor scaling preserves crispness |
| **Sprite pooling** | Limits GPU memory; max 8000 plant emojis + dynamic animal sprites |
| **Bounded A*** | `maxDist` parameter prevents pathfinding from exploring the entire map |
| **Optimistic terrain edits** | Renderer updates instantly while worker processes change asynchronously |
