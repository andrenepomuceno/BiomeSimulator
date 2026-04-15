# Engine Reference

Navigation: [Documentation Home](../README.md) > [Engine](README.md) > [Current Document](README.md)
Return to [Documentation Home](../README.md).

The engine layer (`src/engine/`) contains all simulation logic. It has zero DOM or React dependencies and is designed to run inside a Web Worker.

## Contents

| Document | Description |
|----------|-------------|
| [Configuration](config.md) | `DEFAULT_CONFIG` parameters and engine constants |
| [Animal Species](animal-species.md) | Species table, stat fields, exports from `animalSpecies.js` |
| [Plant Species](plant-species.md) | Plant species table and exports from `plantSpecies.js` |
| [World & Entities](world.md) | Terrain types, World model, Clock class, Animal class |
| [Simulation Engine](simulation-engine.md) | Tick pipeline, `SimulationEngine` API |
| [Algorithms](algorithms.md) | Terrain generation, spatial hash, A* pathfinding, dependency graph |

See [Simulation Rules](../simulation/) for runtime behavior and [Architecture](../architecture.md) for layer boundaries.

---

## File Overview

| File | Purpose |
|------|---------|
| `config.js` | Default simulation parameters, sex/reproduction constants |
| `animalSpecies.js` | Canonical animal species registry (single source of truth) |
| `plantSpecies.js` | Canonical plant species registry (15 species) |
| `simulation.js` | Tick orchestration, world generation, entity management |
| `world.js` | World model: terrain grid, plant arrays, animal list, clock |
| `entities.js` | Animal class with state machine, energy, needs |
| `flora.js` | Stable facade for plant lifecycle modules under `flora/` |
| `behaviors.js` | Stable facade for animal AI modules under `behaviors/` |
| `pathfinding.js` | Bounded A* algorithm (4-directional) |
| `spatialHash.js` | O(1) spatial indexing for neighbor queries |
| `mapGenerator.js` | Procedural terrain via Perlin noise + island masks |
| `benchmarkProfiler.js` | In-engine tick timing and perf metrics |

Internal folders such as `src/engine/flora/` and `src/engine/behaviors/` hold the extracted implementation details while the top-level facade files preserve import stability for `simulation.js`, workers, and other engine consumers.

### Worker Files (`src/worker/`)

| File | Purpose |
|------|---------|
| `simWorker.js` | Main simulation Web Worker: async tick loop, fauna worker pool, incremental serialization |
| `faunaWorker.js` | Sub-worker for parallel fauna processing: receives animal chunks, runs `decideAndAct`, returns deltas |
