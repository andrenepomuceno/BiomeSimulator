# Simulation Engine

Navigation: [Documentation Home](../README.md) > [Engine](README.md) > [Current Document](simulation-engine.md)
Return to [Documentation Home](../README.md).

`simulation.js` hosts the `SimulationEngine` class, which orchestrates each tick and manages the world lifecycle.

```javascript
const engine = new SimulationEngine(config);
engine.generateWorld();  // → returns seed
engine.tick();           // advance one step
```

---

## Tick Pipeline

The tick is split into composable phases to support parallelism:

```
1. tickFlora()
   a. Reset plantChanges
   b. Advance clock
   c. processPlants(world)

2. tickFaunaSequential()            ← sequential path
   a. For each alive animal: decideAndAct(animal, world, spatialHash)
   b. Rebuild spatialHash

   — OR (when fauna sub-workers are enabled) —

   doParallelFauna()               ← parallel path
   a. Split animals into chunks
   b. Send chunks to faunaWorker sub-workers
   c. Collect deltas
   d. applyFaunaResults(allDeltas)
   e. Rebuild spatialHash

3. tickCleanup()
   a. Remove newly dead from spatial hash + occupancy grid
   b. Adaptive cleanup interval: every 10/25/50 ticks (by population)
   c. Every 10 ticks: record stats snapshot (max 1000)
```

The legacy `tick()` method calls all three phases in sequence for backward compatibility.

---

## Parallel Fauna Path (`applyFaunaResults`)

When fauna sub-workers are active, the main worker calls `applyFaunaResults(results)` instead of `tickFaunaSequential()`:

- Sorts all deltas by `animal.id` for deterministic merge order
- Rebuilds the occupancy grid from scratch
- Resolves movement conflicts (first delta wins)
- Deduplicates plant eating (Set-based tracking)
- Reassigns proper IDs to births from the main world counter
- Rebuilds the spatial hash after merge

---

## Dead Animal Lifecycle

When an animal dies, `_deathTick` is recorded. Dead animals remain in the array (and are visible as 💀 skulls) for 300 ticks, then are permanently removed.

---

## Public Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `generateWorld()` | `→ number (seed)` | Create world, generate terrain, seed plants and animals |
| `resetSimulation()` | `→ void` | Clear everything, re-seed |
| `tick()` | `→ void` | One simulation step (tickFlora + tickFaunaSequential + tickCleanup) |
| `tickFlora()` | `→ void` | Advance clock, process plants |
| `tickFaunaSequential()` | `→ void` | Run all animal AI sequentially, rebuild spatial hash |
| `tickCleanup()` | `→ void` | Remove dead, adaptive cleanup, record stats |
| `applyFaunaResults(results)` | `→ void` | Merge parallel fauna deltas (replaces `tickFaunaSequential`) |
| `getStateForViewport(vx, vy, vw, vh)` | `→ object` | Viewport-culled state for renderer |
| `getFullState()` | `→ object` | Complete state snapshot |
| `editTerrain(changes)` | `→ void` | Apply terrain edits, recompute water proximity |
| `placeEntity(type, x, y)` | `→ object\|null` | Spawn animal or plant |
| `removeEntity(id)` | `→ boolean` | Kill animal by ID |
