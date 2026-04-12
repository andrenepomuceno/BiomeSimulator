# EcoGame Frontend

React + PixiJS frontend for the EcoGame ecosystem simulation. Provides real-time 2D rendering of the terrain, plants, and animals with interactive editor tools.

---

## Setup

```bash
cd frontend
npm install
npm run dev
```

Vite dev server starts on **http://localhost:3000** with hot module replacement. API and WebSocket requests are proxied to the backend at `localhost:5000`.

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
| socket.io-client | 4.8.1 | WebSocket client |
| msgpack-lite | 0.1.26 | Binary MessagePack decoding |

---

## Module Overview

### `App.jsx`

Root component. Initializes the `GameRenderer`, connects to the backend, handles map generation, and wires up simulation controls (start/pause/resume/step/reset/speed). Polls stats every 2 seconds.

### `main.jsx`

React entry point. Mounts `<App />` into the DOM with `React.StrictMode`.

### `index.css`

Global styles — dark theme, full-viewport layout, sidebar and toolbar positioning.

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

Semi-transparent overlay texture for plants. Supports delta updates from WebSocket tick data to avoid full redraws every frame.

#### `EntityLayer.js`

Sprite pool for animal rendering. Pre-generates circle textures per species (green for herbivores, red for carnivores). Dynamically allocates/recycles sprites based on visible animals in the viewport.

#### `Camera.js`

Camera system with:
- **Pan**: Click-drag translation
- **Zoom**: Scroll wheel, 1×–40× range, zooms toward mouse cursor
- **Viewport calculation**: `getViewportTiles()` returns the visible tile rectangle for viewport-scoped streaming

---

### State Management (`src/store/`)

#### `simulationStore.js`

Zustand store managing all application state:

| State | Description |
|---|---|
| `connected` | WebSocket connection status |
| `terrain` | Current terrain data (Uint8Array) |
| `width / height` | Map dimensions |
| `simRunning / simPaused` | Simulation lifecycle flags |
| `tick / day / timeOfDay / isNight` | Clock state |
| `animals` | Array of visible animal objects |
| `plantChanges` | Delta plant updates from last tick |
| `selectedEntity` | Currently inspected entity |
| `editorTool` | Active tool (select/paint/place/erase) |
| `brushSize` | Terrain brush radius |
| `paintTerrain` | Selected terrain type for painting |
| `placeType` | Entity type to place |
| `stats / statsHistory` | Population data |
| `viewport` | Current camera viewport |

---

### Hooks (`src/hooks/`)

#### `useSimulation.js`

Manages the Socket.IO connection lifecycle:
- Connects to the server on mount
- Emits `viewport` events when camera moves
- Receives `tick` events with MessagePack-encoded state
- Updates the Zustand store with decoded tick data

#### `useEditor.js`

Editor tool logic:
- **Select**: Queries `/api/tile/:x/:y` or finds clicked animal
- **Paint**: Sends terrain changes via `POST /api/map/edit`
- **Place**: Creates entities via `POST /api/entity/place`
- **Erase**: Removes entities via `DELETE /api/entity/:id`

---

### Components (`src/components/`)

#### `Toolbar.jsx`

Top toolbar with:
- Simulation controls (Resume/Pause, Step, Reset)
- Tool selection (Select, Paint, Place, Erase)
- Speed slider (1–60 TPS)
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
- Minimap integration

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
- Age and HP

---

### Utilities (`src/utils/`)

#### `msgpack.js`

Wrapper around `msgpack-lite` for encoding/decoding MessagePack binary data received from the backend WebSocket.

#### `terrainColors.js`

Mapping of terrain type IDs (0–4) to RGBA color values used by the terrain renderer.

---

## Build

```bash
npm run build
```

Outputs optimized static files to `frontend/dist/`. Serve with any static file server. Ensure the backend is accessible and update API URLs if not using the dev proxy.
