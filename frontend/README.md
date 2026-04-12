# EcoGame Frontend

React + PixiJS frontend for the EcoGame ecosystem simulation. The entire simulation engine runs client-side in a Web Worker — no backend server needed.

---

## Setup

```bash
cd frontend
npm install
npm run dev
```

Vite dev server starts on **http://localhost:3000** with hot module replacement.

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production (`dist/`) |
| `npm run preview` | Preview production build locally |

### Dependencies

| Package | Version | Purpose |
|---|---|---|
| react | 18.3.1 | UI component framework |
| react-dom | 18.3.1 | React DOM renderer |
| pixi.js | 7.4.2 | WebGL 2D rendering engine |
| zustand | 5.0.3 | Lightweight state management |
| chart.js | 4.4.7 | Population charts |
| react-chartjs-2 | 5.2.0 | React wrapper for Chart.js |
| bootstrap | 5.3.3 | UI styling |

---

## Module Overview

### `App.jsx`

Root component. Initializes the `GameRenderer`, creates a Web Worker for the simulation engine, and wires up simulation controls (start/pause/resume/step/reset/speed). Receives tick updates from the worker and pushes them to the Zustand store.

### `main.jsx`

React entry point. Mounts `<App />` into the DOM with `React.StrictMode`.

### `index.css`

Global styles — dark theme, full-viewport layout, sidebar and toolbar positioning.

---

### Engine (`src/engine/`)

The simulation engine — a full port of the original Python backend to JavaScript.

#### `config.js`

`DEFAULT_CONFIG` object with all simulation parameters: map dimensions, sea level, island settings, flora growth rates, fauna species stats, and timing.

#### `world.js`

World state container with parallel TypedArrays:
- `terrain` — `Uint8Array` (flat, row-major, `idx = y * width + x`)
- `waterProximity` — `Uint8Array` (BFS distance to nearest water)
- `plantType / plantStage / plantAge / plantFruit` — parallel typed arrays for the plant grid
- `animals` — array of `Animal` instances
- `Clock` — tick counter with day/night cycle
- Helper methods: `isWalkable()`, `isWaterAdjacent()`, `getStats()`

#### `entities.js`

`Animal` class with properties for position, vitals (energy, hunger, thirst), state machine (`AnimalState` enum: IDLE through DEAD), species config reference, path/pathIndex for A*, and serialization via `toDict()`.

#### `mapGenerator.js`

Procedural terrain generation with:
- `mulberry32` seeded PRNG for reproducibility
- Multi-octave Perlin noise (gradient table + smoothstep interpolation)
- Circular island blob masking
- Height-to-terrain classification
- BFS water proximity computation

#### `flora.js`

Plant lifecycle processing:
- `seedInitialPlants()` — scatters plants on eligible terrain
- `processPlants()` — ages plants, applies stage transitions with water proximity bonus
- `spreadSeeds()` — seed dispersal from fruiting plants (capped for performance)

#### `behaviors.js`

Animal AI state machine with priority-based decisions:
1. Thirst > 80 → seek water
2. Hunger > 70 → seek food
3. Energy < 20 → sleep
4. Predator nearby → flee
5. Mature + partner → mate
6. Otherwise → wander

#### `pathfinding.js`

Bounded A* with binary heap. Returns `[x, y]` waypoint array. Handles water-adjacent goal relaxation for drinking behavior.

#### `spatialHash.js`

Grid-based spatial hash (`Map<string, Map<id, entity>>`) for O(1) neighbor lookups. Supports `insert`, `remove`, `update`, `queryRadius`, and `rebuild`.

#### `simulation.js`

`SimulationEngine` class with:
- `generateWorld()` — terrain + plants + animals
- `tick()` — clock → flora → fauna → spatial hash rebuild → stats
- `editTerrain()`, `placeEntity()`, `removeEntity()`
- `getFullState()`, `getStateForViewport()`

---

### Worker (`src/worker/`)

#### `simWorker.js`

Web Worker entry point. Holds a `SimulationEngine` instance and processes commands via `postMessage`. Runs the tick loop with `setInterval` at the target TPS. Sends tick results (clock, animals, plant changes, stats) back to the main thread.

---

### Renderer (`src/renderer/`)

#### `GameRenderer.js`

PixiJS application orchestrator. Creates the WebGL canvas, a `worldContainer` with three rendering layers, camera controls, and a night overlay. Handles mouse/touch input for drag, click, and zoom.

**Layers (bottom to top):**
1. `TerrainLayer` — terrain grid texture
2. `PlantLayer` — plant overlay texture
3. `EntityLayer` — animal sprites

#### `TerrainLayer.js`

Renders the entire terrain grid as a single PixiJS `Sprite` backed by a `BaseTexture` created from raw RGBA pixel data (1 pixel = 1 tile). Extremely efficient for large maps — a 500×500 grid is a single 500×500 texture.

#### `PlantLayer.js`

Semi-transparent overlay texture for plants. Supports delta updates from worker tick data to avoid full redraws every frame.

#### `EntityLayer.js`

Sprite pool for animal rendering. Pre-generates circle textures per species (green for herbivores, red for carnivores). Dynamically allocates/recycles sprites based on visible animals in the viewport.

#### `Camera.js`

Camera system with:
- **Pan**: Click-drag translation
- **Zoom**: Scroll wheel, 1×–40× range, zooms toward mouse cursor
- **Viewport calculation**: `getViewportTiles()` returns the visible tile rectangle

---

### State Management (`src/store/`)

#### `simulationStore.js`

Zustand store managing all application state:

| State | Description |
|---|---|
| `worker` | Web Worker reference |
| `terrain` | Current terrain data (Uint8Array) |
| `width / height` | Map dimensions |
| `running / paused` | Simulation lifecycle flags |
| `clock` | Clock state (tick, day, isNight) |
| `animals` | Array of visible animal objects |
| `plantChanges` | Delta plant updates from last tick |
| `worldReady` | Terrain + plant arrays from worker on generation |
| `selectedEntity` | Currently inspected entity |
| `tool` | Active tool (select/paint/place/erase) |
| `brushSize` | Terrain brush radius |
| `paintTerrain` | Selected terrain type for painting |
| `placeEntityType` | Entity type to place |
| `stats / statsHistory` | Population data |
| `viewport` | Current camera viewport |

---

### Hooks (`src/hooks/`)

#### `useSimulation.js`

Manages the Web Worker lifecycle:
- Creates a Worker on mount (pointing to `simWorker.js`)
- Stores it in the Zustand store for other hooks to use
- Listens for `worldReady`, `tick`, `tileInfo` messages
- Updates the store with received data
- Returns `postCmd(cmd, data)` for sending commands to the worker

#### `useEditor.js`

Editor tool logic — all operations route through the Web Worker:
- **Select**: Sends `getTileInfo` command
- **Paint**: Sends `editTerrain` command + updates terrain layer for instant visual feedback
- **Place**: Sends `placeEntity` command
- **Erase**: Sends `removeEntity` command

---

### Components (`src/components/`)

#### `Toolbar.jsx`

Top toolbar with:
- Simulation controls (Resume/Pause, Step, Reset)
- Tool selection (Select, Paint, Place, Erase)
- Speed slider (1–120 TPS)
- Day/tick display

#### `ControlPanel.jsx`

Right sidebar panel with:
- **Map Generation**: Size slider (100–2000), sea level, island count/size, seed input
- **Population**: Herbivore/carnivore counts, plant density
- **Regenerate World** button

#### `StatsPanel.jsx`

Population display with:
- Current counts (herbivores, carnivores, plants, fruits)
- Line chart showing population history over time (Chart.js)

#### `Minimap.jsx`

Downscaled terrain overview with a viewport indicator rectangle. Provides spatial context for navigation on large maps.

#### `TerrainEditor.jsx`

Terrain paint controls:
- Terrain type selector (Water, Sand, Dirt, Grass, Rock)
- Brush size slider

#### `EntityInspector.jsx`

Detail panel shown when an entity is selected:
- Species, position, state
- Energy/hunger/thirst progress bars
- Age

---

### Utilities (`src/utils/`)

#### `terrainColors.js`

Mapping of terrain type IDs (0–4) to RGBA color values used by the terrain renderer.

---

## Build

```bash
npm run build
```

Outputs optimized static files to `frontend/dist/`. Serve with any static file server — no backend needed.
