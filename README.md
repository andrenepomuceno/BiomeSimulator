# BiomeSimulator — Ecosystem Simulation

Browser-based 2D ecosystem simulation with procedural terrain generation, plant lifecycle management, and autonomous animal AI. The simulation runs client-side in a Web Worker and is rendered in real time with Pixi.js.

![Stack](https://img.shields.io/badge/JavaScript-ES2022-f7df1e?logo=javascript)
![Stack](https://img.shields.io/badge/React-18-61dafb?logo=react)
![Stack](https://img.shields.io/badge/PixiJS-7-e91e63?logo=webgl)

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Run locally

```bash
cd frontend
npm install
npm run dev
```

Vite starts on **http://localhost:3000**.

---

## Documentation

Use [docs/README.md](docs/README.md) as the central documentation hub.

| Section | Description |
|---------|-------------|
| [docs/architecture.md](docs/architecture.md) | High-level system architecture and data flow |
| [docs/engine/](docs/engine/) | Engine internals: config, species registries, world model, algorithms |
| [docs/simulation/](docs/simulation/) | Runtime rules: AI, movement, energy, combat, reproduction, plants |
| [docs/renderer/](docs/renderer/) | Pixi renderer architecture and layer details |
| [docs/api/](docs/api/) | Worker command/message protocol |

Frontend-specific scripts, profiling commands, and dependency details are in [frontend/README.md](frontend/README.md).

---

## Tech Stack

- React 18
- Zustand
- Pixi.js 7
- Web Worker
- Vite
- Bootstrap 5
- Chart.js

---

## License

This project is provided as-is for educational and personal use.
