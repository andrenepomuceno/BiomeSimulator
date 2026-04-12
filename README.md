# EcoGame — Ecosystem Simulation

A browser-based 2D ecosystem simulation featuring procedural terrain generation, plant lifecycle management, and autonomous animal AI with energy systems — all running client-side in a Web Worker and rendered in real time with PixiJS.

![Stack](https://img.shields.io/badge/JavaScript-ES2022-f7df1e?logo=javascript)
![Stack](https://img.shields.io/badge/React-18-61dafb?logo=react)
![Stack](https://img.shields.io/badge/PixiJS-7-e91e63?logo=webgl)

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Controls](#controls)
- [Tech Stack](#tech-stack)
- [Worker API Reference](#worker-api-reference)
- [License](#license)

---

## Features

### Terrain
- Procedural island generation using multi-octave Perlin noise (pure JavaScript)
- Five terrain types: **Water**, **Sand**, **Dirt**, **Grass**, **Rock**
- Configurable sea level, island count, island size, and random seed
- Real-time terrain editing (paint brush tool)

### Flora
- Three plant types: **Grass**, **Bush**, **Tree**
- Four lifecycle stages: Seed → Sprout → Mature → Fruiting → Dead
- Loop-based plant processing over parallel TypedArrays (~250k tiles)
- Water proximity bonus accelerates growth near water bodies
- Seed spreading with configurable rates per plant type

### Fauna
- Two species: **Herbivore** and **Carnivore**
- Full energy system: energy, hunger, thirst — each with independent drain rates
- State-machine AI with priority-based decisions:
  - Thirst → Seek water
  - Hunger → Seek food (plants for herbivores, prey for carnivores)
  - Low energy → Sleep
  - Predator nearby → Flee
  - Mature + partner nearby → Mate
  - Otherwise → Wander
- A* pathfinding (bounded to 50 tiles)
- Spatial hash grid for O(1) neighbor lookups
- Aging, reproduction, combat, and natural death

### Simulation
- Day/night cycle with configurable duration
- Adjustable simulation speed (1–120 ticks per second)
- Pause, resume, single-step, and reset controls
- Real-time population statistics and history charts
- Entire engine runs in a Web Worker — zero main-thread blocking

### Rendering
- PixiJS WebGL 2D renderer with terrain-as-texture approach (1 pixel = 1 tile)
- Plant overlay texture with delta updates
- Animal sprite pool with dynamic allocation
- Smooth camera pan (drag) and zoom (scroll wheel, 1×–40×)
- Minimap with viewport indicator
- Night overlay tint during night phase

### Editor Tools
- **Select** — Click entities to inspect properties
- **Paint** — Paint terrain types with adjustable brush size
- **Place** — Place new herbivores or carnivores
- **Erase** — Remove entities by clicking

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   Browser (React + PixiJS)                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐   │
│  │ Toolbar  │ │ Control  │ │  Stats   │ │  Terrain  │   │
│  │          │ │  Panel   │ │  Panel   │ │  Editor   │   │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘   │
│  ┌───────────────────────────────────────────────────┐   │
│  │         PixiJS Canvas (GameRenderer)              │   │
│  │   TerrainLayer ← PlantLayer ← EntityLayer        │   │
│  │   Camera (pan/zoom) + Night overlay               │   │
│  └───────────────────────────────────────────────────┘   │
│        │ postMessage                                     │
│  ┌─────┴─────────────────────────────────────────────┐   │
│  │              Web Worker (simWorker.js)             │   │
│  │  ┌──────────────────────────────────────────────┐ │   │
│  │  │          SimulationEngine                    │ │   │
│  │  │  Clock → Flora → Fauna AI → Spatial Hash     │ │   │
│  │  └──────────────────────────────────────────────┘ │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │   │
│  │  │ MapGen   │ │ Spatial  │ │ A* Pathfinding   │  │   │
│  │  │ (Perlin) │ │  Hash    │ │ (bounded)        │  │   │
│  │  └──────────┘ └──────────┘ └──────────────────┘  │   │
│  └───────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

No backend server is needed. The entire simulation runs in the browser.

---

## Quick Start

### Prerequisites

- **Node.js 18+** and npm

### 1. Clone the repository

```bash
git clone <repo-url>
cd ecogame
```

### 2. Install and run

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server starts on **http://localhost:3000**.

### 3. Open the app

Navigate to **http://localhost:3000** in your browser. The simulation world generates automatically on load.

---

## Project Structure

```
ecogame/
├── frontend/
│   ├── src/
│   │   ├── engine/
│   │   │   ├── behaviors.js         # Animal AI state machine
│   │   │   ├── config.js            # Default simulation parameters
│   │   │   ├── entities.js          # Animal data model
│   │   │   ├── flora.js             # Plant lifecycle processing
│   │   │   ├── mapGenerator.js      # Procedural terrain generation (Perlin noise)
│   │   │   ├── pathfinding.js       # A* pathfinding (bounded, binary heap)
│   │   │   ├── simulation.js        # SimulationEngine — tick pipeline
│   │   │   ├── spatialHash.js       # Spatial hash for neighbor queries
│   │   │   └── world.js             # World state container (TypedArrays)
│   │   ├── worker/
│   │   │   └── simWorker.js         # Web Worker entry point
│   │   ├── components/
│   │   │   ├── ControlPanel.jsx     # Map generation & population sliders
│   │   │   ├── EntityInspector.jsx  # Entity detail panel on click
│   │   │   ├── Minimap.jsx          # Minimap with viewport indicator
│   │   │   ├── StatsPanel.jsx       # Population counts & charts
│   │   │   ├── TerrainEditor.jsx    # Terrain brush controls
│   │   │   └── Toolbar.jsx          # Top toolbar (tools, sim controls)
│   │   ├── hooks/
│   │   │   ├── useEditor.js         # Editor tool logic (via Worker messages)
│   │   │   └── useSimulation.js     # Web Worker lifecycle & state sync
│   │   ├── renderer/
│   │   │   ├── Camera.js            # Pan/zoom/viewport
│   │   │   ├── EntityLayer.js       # Animal sprite pool
│   │   │   ├── GameRenderer.js      # PixiJS app & layer orchestration
│   │   │   ├── PlantLayer.js        # Plant overlay texture
│   │   │   └── TerrainLayer.js      # Terrain texture renderer
│   │   ├── store/
│   │   │   └── simulationStore.js   # Zustand state management
│   │   ├── utils/
│   │   │   └── terrainColors.js     # Terrain type → RGBA color map
│   │   ├── App.jsx                  # Main application component
│   │   ├── index.css                # Global styles
│   │   └── main.jsx                 # React entry point
│   ├── index.html                   # HTML shell
│   ├── package.json                 # Node dependencies
│   └── vite.config.js               # Vite dev server config
├── docs/
│   └── API.md                       # Worker message API reference
├── .gitignore
└── README.md
```

---

## Configuration

All simulation parameters are defined in [`frontend/src/engine/config.js`](frontend/src/engine/config.js). Key parameters:

| Parameter | Default | Description |
|---|---|---|
| `map_width` | 500 | Terrain grid width (tiles) |
| `map_height` | 500 | Terrain grid height (tiles) |
| `sea_level` | 0.38 | Height threshold for water (0.0–1.0) |
| `island_count` | 5 | Number of island blobs |
| `island_size_factor` | 0.30 | Relative island radius |
| `ticks_per_second` | 10 | Default simulation speed |
| `ticks_per_day` | 200 | Ticks per full day/night cycle |
| `day_fraction` | 0.60 | Daylight percentage of each cycle |
| `initial_plant_density` | 0.15 | Fraction of eligible tiles seeded with plants |
| `initial_herbivore_count` | 50 | Starting herbivore population |
| `initial_carnivore_count` | 15 | Starting carnivore population |
| `water_proximity_threshold` | 10 | Tiles from water to receive growth bonus |

Most of these can be adjusted through the UI control panel before generating a world.

---

## Controls

### Camera
| Action | Input |
|---|---|
| Pan | Click and drag on the map |
| Zoom in/out | Scroll wheel |

### Toolbar
| Button | Function |
|---|---|
| **Resume / Pause** | Start or pause the simulation |
| **Step** | Advance exactly one tick |
| **Reset** | Stop simulation and regenerate world |
| **Select** | Click entities to inspect |
| **Paint** | Paint terrain (select type + brush size in editor panel) |
| **Place** | Place herbivore or carnivore at clicked position |
| **Erase** | Remove entity at clicked position |

### Speed Slider
Adjusts the simulation speed from **1** to **120** ticks per second.

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **React 18** | UI component framework |
| **Vite** | Dev server with HMR |
| **PixiJS 7** | WebGL 2D rendering engine |
| **Web Worker** | Off-main-thread simulation engine |
| **Zustand** | Lightweight state management |
| **Chart.js** | Population history graphs |
| **Bootstrap 5** | UI styling |

---

## Worker API Reference

See the full message API documentation in [`docs/API.md`](docs/API.md).

The simulation runs in a Web Worker. The main thread communicates via `postMessage`:

### Main → Worker (commands)

| Command | Description |
|---|---|
| `generate` | Generate a new world |
| `start` | Start simulation loop |
| `pause` | Pause simulation |
| `resume` | Resume simulation |
| `step` | Advance one tick |
| `setSpeed` | Change ticks per second |
| `editTerrain` | Apply terrain edits |
| `placeEntity` | Place a new animal or plant |
| `removeEntity` | Remove an entity by ID |
| `getTileInfo` | Query tile details |

### Worker → Main (events)

| Message Type | Description |
|---|---|
| `worldReady` | Terrain + initial state after generation |
| `tick` | Per-tick update (animals, plant changes, stats) |
| `tileInfo` | Response to getTileInfo query |
| `entityPlaced` | Confirmation of entity placement |
| `entityRemoved` | Confirmation of entity removal |

---

## License

This project is provided as-is for educational and personal use.
