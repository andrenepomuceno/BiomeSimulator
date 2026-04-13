# EcoGame Documentation

Detailed technical documentation for the EcoGame ecosystem simulation.

---

## Contents

| Document | Description |
|----------|-------------|
| [Architecture](architecture.md) | System overview, layer boundaries, data flow, store structure, design decisions |
| [Engine](engine.md) | Engine layer reference: config, species, world model, simulation engine, terrain generation, pathfinding, spatial hash |
| [Game Logic](game-logic.md) | Simulation rules: animal AI decision tree, energy system, combat, reproduction, plant lifecycle, day/night cycle |
| [Renderer](renderer.md) | Pixi.js rendering: layer stack, camera, terrain/plant/entity rendering, emoji textures, viewport culling |
| [API](API.md) | Web Worker message protocol: commands, responses, data types |

Performance benchmarking and profiling commands are documented in `frontend/README.md`, including the headless runner, phase 2 dense scenarios, CPU profile analysis, and the expected outputs under `frontend/perf-reports/`.
