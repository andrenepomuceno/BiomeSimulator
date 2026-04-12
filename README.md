# EcoGame — Ecosystem Simulation

A browser-based 2D ecosystem simulation featuring procedural terrain generation, plant lifecycle management, and autonomous animal AI with energy systems — all rendered in real time through a PixiJS-powered frontend.

![Stack](https://img.shields.io/badge/Python-3.10+-blue?logo=python)
![Stack](https://img.shields.io/badge/Flask-3.x-lightgrey?logo=flask)
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
- [API Reference](#api-reference)
- [License](#license)

---

## Features

### Terrain
- Procedural island generation using multi-octave Perlin noise (pure NumPy, no external noise libraries)
- Five terrain types: **Water**, **Sand**, **Dirt**, **Grass**, **Rock**
- Configurable sea level, island count, island size, and random seed
- Real-time terrain editing (paint brush tool)

### Flora
- Three plant types: **Grass**, **Bush**, **Tree**
- Four lifecycle stages: Seed → Sprout → Mature → Fruiting → Dead
- Vectorized plant processing via NumPy structured arrays (~100k+ plants per tick)
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
- Adjustable simulation speed (1–60 ticks per second)
- Pause, resume, single-step, and reset controls
- Real-time population statistics and history charts

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
┌─────────────────────────────────────────────────────────┐
│                    Browser (React + PixiJS)              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Toolbar  │ │ Control  │ │  Stats   │ │  Terrain  │  │
│  │          │ │  Panel   │ │  Panel   │ │  Editor   │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
│  ┌──────────────────────────────────────────────────┐   │
│  │         PixiJS Canvas (GameRenderer)             │   │
│  │   TerrainLayer ← PlantLayer ← EntityLayer       │   │
│  │   Camera (pan/zoom) + Night overlay              │   │
│  └──────────────────────────────────────────────────┘   │
│                     │ REST + WebSocket                   │
└─────────────────────┼───────────────────────────────────┘
                      │  Vite dev proxy (:3000 → :5000)
┌─────────────────────┼───────────────────────────────────┐
│                Flask + SocketIO (:5000)                  │
│  ┌──────────┐ ┌──────────────┐ ┌────────────────────┐  │
│  │  REST    │ │  WebSocket   │ │  SimulationRunner   │  │
│  │  Routes  │ │  Events      │ │  (background thread)│  │
│  └──────────┘ └──────────────┘ └────────┬───────────┘  │
│                                          │              │
│  ┌──────────┐ ┌──────────┐ ┌────────────┴───────────┐  │
│  │  Flora   │ │  Fauna   │ │  World (terrain, grid,  │  │
│  │ (NumPy)  │ │ (AI/FSM) │ │   plants, animals)     │  │
│  └──────────┘ └──────────┘ └────────────────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌────────────────────────┐  │
│  │ MapGen   │ │ Spatial  │ │  A* Pathfinding        │  │
│  │ (Perlin) │ │  Hash    │ │  (bounded)             │  │
│  └──────────┘ └──────────┘ └────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

- **Python 3.10+** (tested on 3.14)
- **Node.js 18+** and npm

### 1. Clone the repository

```bash
git clone <repo-url>
cd ecogame
```

### 2. Start the backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

The Flask server starts on **http://localhost:5000**.

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server starts on **http://localhost:3000** and proxies API/WebSocket requests to the backend.

### 4. Open the app

Navigate to **http://localhost:3000** in your browser.

---

## Project Structure

```
ecogame/
├── backend/
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes.py            # REST API endpoints
│   │   └── socket_events.py     # WebSocket event handlers
│   ├── engine/
│   │   ├── __init__.py
│   │   ├── behaviors.py         # Animal AI state machine
│   │   ├── entities.py          # Animal data model
│   │   ├── flora.py             # Vectorized plant lifecycle
│   │   ├── map_generator.py     # Procedural terrain generation
│   │   ├── pathfinding.py       # A* pathfinding
│   │   ├── simulation.py        # Simulation loop manager
│   │   ├── spatial_hash.py      # Spatial hash for neighbor queries
│   │   └── world.py             # World state container
│   ├── app.py                   # Flask application factory
│   ├── config.py                # Default simulation config
│   └── requirements.txt         # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ControlPanel.jsx     # Map generation & population sliders
│   │   │   ├── EntityInspector.jsx  # Entity detail panel on click
│   │   │   ├── Minimap.jsx          # Minimap with viewport indicator
│   │   │   ├── StatsPanel.jsx       # Population counts & charts
│   │   │   ├── TerrainEditor.jsx    # Terrain brush controls
│   │   │   └── Toolbar.jsx          # Top toolbar (tools, sim controls)
│   │   ├── hooks/
│   │   │   ├── useEditor.js         # Editor tool logic
│   │   │   └── useSimulation.js     # WebSocket connection & state sync
│   │   ├── renderer/
│   │   │   ├── Camera.js            # Pan/zoom/viewport
│   │   │   ├── EntityLayer.js       # Animal sprite pool
│   │   │   ├── GameRenderer.js      # PixiJS app & layer orchestration
│   │   │   ├── PlantLayer.js        # Plant overlay texture
│   │   │   └── TerrainLayer.js      # Terrain texture renderer
│   │   ├── store/
│   │   │   └── simulationStore.js   # Zustand state management
│   │   ├── utils/
│   │   │   ├── msgpack.js           # MessagePack encode/decode
│   │   │   └── terrainColors.js     # Terrain type → RGBA color map
│   │   ├── App.jsx                  # Main application component
│   │   ├── index.css                # Global styles
│   │   └── main.jsx                 # React entry point
│   ├── index.html                   # HTML shell
│   ├── package.json                 # Node dependencies
│   └── vite.config.js               # Vite dev server + proxy config
├── .gitignore
└── README.md
```

---

## Configuration

All simulation parameters are defined in [`backend/config.py`](backend/config.py). Key parameters:

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
Adjusts the simulation speed from **1** to **60** ticks per second.

---

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **Flask 3.x** | HTTP REST API |
| **Flask-SocketIO** | WebSocket for real-time tick streaming |
| **eventlet** | Async worker for SocketIO |
| **NumPy** | Vectorized terrain generation and plant processing |
| **msgpack** | Binary serialization for terrain data |

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | UI component framework |
| **Vite** | Dev server with HMR and proxy |
| **PixiJS 7** | WebGL 2D rendering engine |
| **Zustand** | Lightweight state management |
| **Chart.js** | Population history graphs |
| **Bootstrap 5** | UI styling |
| **Socket.IO Client** | WebSocket connection |
| **msgpack-lite** | Binary deserialization |

---

## API Reference

See the full API documentation in [`docs/API.md`](docs/API.md).

### Quick Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/map/generate` | Generate a new world |
| `GET` | `/api/map/terrain` | Get current terrain (msgpack) |
| `POST` | `/api/map/edit` | Edit terrain tiles |
| `POST` | `/api/sim/start` | Start simulation |
| `POST` | `/api/sim/pause` | Pause simulation |
| `POST` | `/api/sim/resume` | Resume simulation |
| `POST` | `/api/sim/step` | Single tick step |
| `POST` | `/api/sim/reset` | Reset and regenerate |
| `POST` | `/api/sim/speed` | Set ticks per second |
| `GET` | `/api/sim/status` | Full simulation state |
| `POST` | `/api/entity/place` | Place a new entity |
| `GET` | `/api/entity/:id` | Get entity details |
| `DELETE` | `/api/entity/:id` | Remove an entity |
| `GET` | `/api/stats` | Population statistics |
| `GET` | `/api/tile/:x/:y` | Tile information |

---

## License

This project is provided as-is for educational and personal use.
