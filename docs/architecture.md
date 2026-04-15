# Architecture

Navigation: [Documentation Home](README.md) > [Architecture](architecture.md)
Return to [Documentation Home](README.md).

High-level overview of how BiomeSimulator is structured and how data flows between layers.

Related documentation: [README](README.md), [Engine](engine/), [Renderer](renderer/), [API](api/).

---

## Layer Architecture

```mermaid
block-beta
  columns 3
  block:ui["React Components"]:3
    columns 3
    Toolbar StatsPanel EntityInspector
  end
  block:mid:3
    columns 3
    Store["Zustand Store"] Hooks["Hooks\nuseSimulation\nuseEditor"] Renderer["Pixi.js Renderer\nTerrain · Plant · Entity\nAnimation · Camera"]
  end
  block:worker["Main Web Worker (simWorker.js)"]:3
    columns 3
    simWorker["Tick Loop\nState Sync"] faunaPool["Fauna Worker Pool\n(1–4 sub-workers)"] stateSync["Incremental\nSerialization"]
  end
  block:engine["Engine (pure JS — no DOM/React/Pixi)"]:3
    columns 3
    SimEngine["SimulationEngine\nWorld · Clock"] AI["Behaviors\nPathfinding\nSpatialHash"] Flora["Flora · MapGen\nSpecies Registries"]
  end

  ui --> mid
  mid --> worker
  worker --> engine
```

### Boundaries

| Layer | Rules |
|-------|-------|
| **Engine** (`src/engine/`) | No DOM, no React, no Pixi. Pure classes and functions. Must be serializable for Worker. |
| **Worker** (`src/worker/`) | Hosts the engine. Communicates via `postMessage` only. |
| **Store** (`src/store/`) | Single Zustand store. Immutable updates via `set()`. No side effects. |
| **Hooks** (`src/hooks/`) | Bridge worker messages to store. Own the worker lifecycle. |
| **Renderer** (`src/renderer/`) | Pixi.js only. No game logic. Reads data, draws frames. |
| **Components** (`src/components/`) | React + Bootstrap UI. Read store, dispatch commands via hooks. App owns transient modal state for major overlays such as GameMenu, HelpModal, SimulationConfigModal, SimulationReport, and EntitySummaryWindow. |

---

## Source Graph

This file-level graph maps the main runtime handoff from React on the main thread to the worker-hosted simulation engine. Helper modules are grouped where expanding every file would make the graph unreadable.

```mermaid
flowchart TB
  subgraph MainThread["Main Thread (src/)"]
    direction LR

    subgraph UI["React UI"]
      direction TB
      App["App.jsx<br/>layout, effects, renderer wiring"]
      Components["components/<br/>Toolbar, StatsPanel, Minimap,<br/>EntityInspector, TerrainEditor,<br/>GameMenu, HelpModal,<br/>SimulationConfigModal,<br/>SimulationReport, EntitySummaryWindow"]
    end

    subgraph Bridge["State Bridge"]
      direction TB
      Store["store/simulationStore.js<br/>single Zustand store"]
      UseSim["hooks/useSimulation.js<br/>worker lifecycle + inbound sync"]
      UseEditor["hooks/useEditor.js<br/>tile tools + selection commands"]
    end

    subgraph Render["Pixi Renderer"]
      direction TB
      GameRenderer["renderer/GameRenderer.js<br/>Pixi app + orchestration"]
      Camera["renderer/Camera.js<br/>pan, zoom, tile coordinates"]
      TerrainLayer["renderer/TerrainLayer.js"]
      PlantLayer["renderer/PlantLayer.js"]
      EntityLayer["renderer/EntityLayer.js"]
      AnimationLayer["renderer/AnimationLayer.js"]
    end
  end

  subgraph WorkerBoundary["Worker Boundary (src/worker/)"]
    direction LR
    SimWorker["simWorker.js<br/>command handler, tick loop,<br/>incremental/full serialization"]
    FaunaPool["faunaWorker.js x N<br/>parallel animal AI chunks"]
  end

  subgraph Engine["Pure Engine (src/engine/)"]
    direction LR
    SimEngine["simulation.js<br/>SimulationEngine"]
    World["world.js<br/>World, Clock, typed arrays"]
    Entities["entities.js<br/>Animal model + serialization"]
    Behaviors["behaviors/<br/>combat, eating, movement,<br/>reproduce, scavenge, seek, states"]
    Flora["flora.js<br/>seedInitialPlants + processPlants"]
    MapGen["mapGenerator.js<br/>terrain + water proximity"]
    Spatial["spatialHash.js<br/>neighbor queries"]
    Path["pathfinding.js<br/>bounded A*"]
    Species["animalSpecies.js, plantSpecies.js,<br/>config.js"]
  end

  App -->|renders| Components
  Components -->|read state and fire UI callbacks| Store
  Store -->|terrain, animals, plants,<br/>clock, selection, viewport| App
  App -->|uses| UseSim
  App -->|uses| UseEditor
  App -->|creates and updates| GameRenderer
  GameRenderer -->|tile click callback| UseEditor
  GameRenderer -->|viewport callback| Store
  UseEditor -->|reads tool, worker, selection| Store
  UseEditor -->|optimistic terrain paint| TerrainLayer
  GameRenderer --> Camera
  GameRenderer --> TerrainLayer
  GameRenderer --> PlantLayer
  GameRenderer --> EntityLayer
  GameRenderer --> AnimationLayer

  App -->|generate, start, pause,<br/>resume, step, save, load| UseSim
  UseSim -->|new Worker() + postMessage| SimWorker
  SimWorker -->|worldReady, tick, tileInfo,<br/>savedState| UseSim
  UseSim -->|setWorker + hydrate store| Store
  UseEditor -->|getTileInfo, editTerrain,<br/>placeEntity, removeEntity| SimWorker

  SimWorker -->|generateWorld, tick,<br/>editTerrain, load, save| SimEngine
  SimWorker -->|parallel fauna chunks| FaunaPool
  FaunaPool -->|deltas, births,<br/>plantChanges, deadIds| SimWorker

  SimEngine --> World
  SimEngine --> Entities
  SimEngine --> Behaviors
  SimEngine --> Flora
  SimEngine --> MapGen
  SimEngine --> Spatial
  SimEngine --> Species
  Behaviors -->|mutates animal state| Entities
  Behaviors -->|reads terrain, plants,<br/>clock, occupancy| World
  Behaviors --> Spatial
  Behaviors --> Path
  Flora --> World
  MapGen --> World
  Species --> Behaviors
  Species --> FaunaPool
  FaunaPool -->|reconstructs chunk world state| World
  FaunaPool --> Behaviors
  FaunaPool --> Spatial
```

Current implementation notes:

- `useEditor` sends canvas commands directly through the worker reference stored in Zustand, while `useSimulation` owns worker creation and inbound message hydration.
- Worker sync is driven by incremental or full-state serialization in `simWorker.js`; the viewport currently stays on the main thread for renderer and minimap feedback.
- `behaviors/` and the renderer layers are grouped so the graph stays readable while still pointing at the files contributors usually touch first.

---

## Data Flow

### Simulation Tick

The tick pipeline is split into composable phases:

```mermaid
sequenceDiagram
    participant W as simWorker
    participant E as SimulationEngine
    participant FW as faunaWorkers (×N)
    participant M as Main Thread
    participant S as Zustand Store
    participant R as Pixi.js Renderer

    W->>E: tickFlora()
    activate E
    E->>E: advanceClock()
    E->>E: processPlants(world)
    deactivate E

    alt Parallel fauna (sub-workers enabled)
        W->>FW: send animal chunks (ArrayBuffer transfer)
        FW->>FW: decideAndAct() per animal
        FW-->>W: deltas[], births[], plantChanges[], deadIds[]
        W->>E: applyFaunaResults(allDeltas)
        E->>E: resolve movement conflicts
        E->>E: rebuild spatialHash
    else Sequential fauna
        W->>E: tickFaunaSequential()
        E->>E: decideAndAct() × N animals
        E->>E: rebuild spatialHash
    end

    W->>E: tickCleanup()
    E->>E: remove dead, adaptive cleanup, record stats
    W->>W: serialize full or incremental state

    W->>M: postMessage({type: 'tick', clock, animals, plantChanges, stats})
    M->>S: setAnimals() or mergeAnimalDeltas()
    M->>S: setClock(), setPlantChanges(), setStats()
    S->>R: entityLayer.update(animals)
    S->>R: updatePlants(plantChanges)
    S->>R: setNight(is_night)
    R->>R: render at 60fps
```

Animals may be a full array or an incremental delta list (dirty-flag based; full sync every 30 ticks).

### User Interaction

```mermaid
flowchart TD
    Click["User clicks canvas"] --> GR["GameRenderer.onTileClick(x, y)"]
    GR --> UE["useEditor.handleTileClick(x, y)"]
    UE --> Tool{Active Tool?}

    Tool -->|SELECT| Q["worker.postMessage({cmd: 'getTileInfo', x, y})"]
    Q --> TI["Worker returns tileInfo"]
    TI --> Store["store.setSelectedEntity()\nor store.setSelectedTile()"]
    Store --> EI["EntityInspector re-renders"]

    Tool -->|PAINT_TERRAIN| Brush["Compute brush circle"]
    Brush --> Opt["renderer.terrainLayer.updateTiles()\n(optimistic)"]
    Opt --> Edit["worker.postMessage({cmd: 'editTerrain', changes})"]

    Tool -->|PLACE_ENTITY| Place["worker.postMessage({cmd: 'placeEntity',\nentityType, x, y})"]

    Tool -->|ERASE| Find["Find animal at tile"]
    Find --> Rem["worker.postMessage({cmd: 'removeEntity', entityId})"]
```

---

## Worker Protocol

Communication between main thread and worker uses structured messages. See [API Reference](api/) for the full schema and payload examples.

### Worker Lifecycle & Error Handling

```mermaid
flowchart LR
    Init["new Worker('simWorker.js')"] --> Idle["Idle\n(awaiting commands)"]
    Idle -->|"cmd: generate"| Gen["Generate World"]
    Gen -->|"worldReady"| Ready["Ready"]
    Ready -->|"cmd: start"| Running["Tick Loop\n(setInterval)"]
    Running -->|"cmd: pause"| Paused["Paused"]
    Paused -->|"cmd: resume"| Running
    Running -->|"cmd: step"| Running
    Running -->|"cmd: setSpeed"| Running
```

**Fauna worker pool sizing:**

| `navigator.hardwareConcurrency` | Sub-workers |
|---------------------------------|-------------|
| ≤ 2 | 1 |
| 3–4 | 2 |
| 5–8 | 3 |
| > 8 | 4 |

**Timeout handling:** If a parallel fauna tick exceeds **800ms**, the main worker falls back to applying partial results and logs a warning. This prevents UI freezes on large populations.

**Incremental serialization:** Animals have a dirty flag incremented on state changes. Only dirty animals are sent per tick. A full sync is forced every **30 ticks** to prevent desynchronization.

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
  _animalsById,                    // Map<id, animal> (internal index for delta merge)

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

```mermaid
graph TD
    App["App"]
    App --> GameMenu["GameMenu\n(modal: New Game / Save / Load)"]
  App --> HelpModal["HelpModal\n(in-game guide / tutorial hub)"]
    App --> SimConfig["SimulationConfigModal\n(read-only runtime config overlay)"]
    App --> Toolbar["Toolbar\n(controls, tools, speed, day/night)"]
    App --> SL["Sidebar Left"]
    SL --> Minimap
    SL --> StatsPanel["StatsPanel\n(population counters + chart)"]
    App --> Canvas["Canvas Area\n(Pixi.js via GameRenderer)"]
    App --> SR["Sidebar Right"]
    SR --> EntityInspector["EntityInspector\n(entity/tile details)"]
    SR --> TerrainEditor["TerrainEditor\n(brush settings, entity palette)"]
    App --> SimReport["SimulationReport\n(full-screen analytics overlay)"]
    App --> EntitySummary["EntitySummaryWindow\n(entity browser overlay)"]
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
| **Fauna sub-worker parallelism** | Split animal AI across multiple workers; deterministic merge via ID-sorted deltas |
| **Incremental tick serialization** | Dirty-flag on `Animal`; only changed entities sent per tick, full sync every 30 ticks |
| **Integer spatial hash keys** | Packed `(cx & 0xFFFF) | ((cy & 0xFFFF) << 16)` avoids string allocation in hot loop |
| **Ring buffer action history** | O(1) `logAction` replaces O(n) `Array.shift()` — constant time regardless of history size |
| **Lazy species population cache** | `World.getAliveSpeciesCount()` caches per tick; eliminates O(N) scan in mating checks |

---

## Deep-Dive Docs

Use this page for the system map, then continue in focused references:

- [Engine Reference](engine/)
- [Simulation Rules](simulation/)
- [Renderer Reference](renderer/)
- [Worker API Reference](api/)
