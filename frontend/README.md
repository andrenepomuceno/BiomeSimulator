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
| `npm run profile:headless` | Run headless engine profiling scenarios and save JSON report |
| `npm run profile:headless:ci` | Run headless profiling in CI mode (fails on threshold regression) |

### Headless Performance Profiling

The simulation engine can be benchmarked without React/Pixi rendering:

```bash
npm run profile:headless
```

This runs predefined `small`, `medium`, and `stress` scenarios, prints tick/phase metrics, and saves a JSON report under `perf-reports/`.
At the end of each run, it also saves a text report using the same format as the UI export button.

Advanced options:

```bash
node scripts/headlessProfile.mjs --scenario stress --ticks 500 --warmup 120
node scripts/headlessProfile.mjs --scenario medium --out perf-reports/medium.json
node scripts/headlessProfile.mjs --ci
node scripts/headlessProfile.mjs --map 500x500 --days 30 --name map500_30d --out perf-reports/map500x500-30d.json
```

- `--scenario`: `small`, `medium`, `stress`, or `all`
- `--ticks`: measured ticks per scenario
- `--warmup`: warmup ticks before measurement
- `--out`: custom output path for the JSON report
- `--ci`: exits with code `1` when thresholds are exceeded

Custom long-run options:

- `--map`: map size in `WIDTHxHEIGHT` format (for example `1000x1000`)
- `--days`: converts to measured ticks using `days * ticks_per_day`
- `--ticks-per-day`: override day length
- `--animal-scale`: scales all initial species counts
- `--max-animals`: override global animal population cap
- `--name`: custom scenario name in output

### CPU Hotspot Profiling (Function-Level)

Capture V8 CPU profile while running the headless simulation:

```bash
node --cpu-prof --cpu-prof-dir perf-reports --cpu-prof-name cpu-500x500-30d.cpuprofile scripts/headlessProfile.mjs --map 500x500 --days 30 --name map500_30d
```

Analyze the generated `.cpuprofile` and print top functions:

```bash
npm run profile:cpu:analyze -- --input perf-reports/cpu-500x500-30d.cpuprofile --top 20
```

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
1. Opportunistic drink (thirst > 25 and adjacent to water)
2. Opportunistic eat (hunger > 20 and on food tile)
3. Critical thirst > 55 → seek water
4. Critical hunger > 45 → seek food
5. Energy < 20 → sleep
6. Predator nearby → flee
7. Moderate hunger > 30 → seek food
8. Moderate thirst > 35 → seek water
9. Adult + cooldown=0 + energy > 50 → find mate
10. Otherwise → wander

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

#### `plantSpecies.js`

Plant species registry (10 species). Single source of truth for plant data: stage ages, emojis, colors, reproduction modes, production chances. Provides builder functions used by `flora.js` and the renderer.

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

Sprite pool for animal rendering. Uses emoji textures (🐰 🐿️ 🪲 🐐 🦌 🦊 🐺 🐗 🐻 🦝 🐦‍⬛) generated from `emojiTextures.js`. Dynamically allocates/recycles sprites based on visible animals in the viewport. Supports life stage scaling (Baby 0.5×, Young 0.7×, Young Adult 0.85×, Adult 1.0×), sleeping (💤) and dead (💀) emoji overlays, and fade animation for dead animals over 300 ticks.

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
- **Population**: Per-species animal count sliders, plant density
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

#### `SimulationReport.jsx`

Full-screen analytics overlay with Chart.js graphs showing population trends, species breakdowns, and ecosystem statistics over time.

---

### Utilities (`src/utils/`)

#### `terrainColors.js`

Mapping of terrain type IDs (0–4) to RGBA color values used by the terrain renderer. Also exports `PLANT_COLORS` and `SPECIES_INFO`.

#### `emojiTextures.js`

Generates PIXI.Texture objects from emoji characters via offscreen canvas. Provides `generateEmojiTextures()` (13 animal/state textures) and `generatePlantEmojiTextures()` (stage-specific plant textures). Textures are 64×64px and cached as singletons.

---

## Build

```bash
npm run build
```

Outputs optimized static files to `frontend/dist/`. Serve with any static file server — no backend needed.
