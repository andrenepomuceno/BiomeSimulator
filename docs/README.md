# EcoGame Documentation

Detailed technical documentation for the EcoGame ecosystem simulation.

Start here for the technical docs, or go back to the project overview in [../README.md](../README.md).

---

## Contents

| Document | Description |
|----------|-------------|
| [Architecture](architecture.md) | System overview, layer boundaries, data flow, store structure, design decisions |
| [Engine](engine.md) | Engine layer reference: config, species, world model, simulation engine, terrain generation, pathfinding, spatial hash |
| [Game Logic](game-logic.md) | Simulation rules: animal AI decision tree, energy system, combat, reproduction, plant lifecycle, day/night cycle |
| [Renderer](renderer.md) | Pixi.js rendering: layer stack, camera, terrain/plant/entity rendering, emoji textures, viewport culling |
| [API](API.md) | Web Worker message protocol: commands, responses, data types |

For setup, build commands, and performance profiling workflows, see [../frontend/README.md](../frontend/README.md).
