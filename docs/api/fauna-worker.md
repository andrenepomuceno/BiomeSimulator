# Fauna Sub-Worker Protocol

Navigation: [Documentation Home](../README.md) > [API](README.md) > [Current Document](fauna-worker.md)
Return to [Documentation Home](../README.md).

`faunaWorker.js` is an optional sub-worker used for parallel fauna processing. The main `simWorker.js` splits animals into chunks, distributes them across sub-workers, and merges the resulting deltas back into the main world state.

## Message Schema

| Direction | Type | Payload |
|-----------|------|---------|
| main → sub | `init` | `config`, `terrain`, `waterProximity`, `plantType`, `plantStage`, `plantFruit`, `occupancy`, `width`, `height` |
| main → sub | `tick` | `animalStates[]`, `tick`, `isNight` (transferable ArrayBuffers for plant grids) |
| sub → main | `result` | `deltas[]`, `births[]`, `plantChanges[]`, `deadIds[]` |
| main → sub | `dispose` | — (terminate) |

## Behavior

- Sub-workers receive immutable config and terrain once on `init`
- Per-tick mutable animal chunks are sent as transferable ArrayBuffers for zero-copy transfer
- Sub-workers run `decideAndAct` locally and return deltas rather than full state
- The main worker merges results via `applyFaunaResults()` — see [Simulation Engine](../engine/simulation-engine.md) for the merge algorithm
