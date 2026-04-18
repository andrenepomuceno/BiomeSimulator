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
   b. Run the sampled consistency supervisor on scheduled audit ticks
   c. Adaptive cleanup interval: every 10/25/50 ticks (by population)
   d. Every 10 ticks: record stats snapshot (max 1000)
```

The legacy `tick()` method calls all three phases in sequence for backward compatibility.

---

## Parallel Fauna Path (`applyFaunaResults`)

When fauna sub-workers are active, the main worker calls `applyFaunaResults(results)` instead of `tickFaunaSequential()`:

- Sorts all deltas by `animal.id` for a deterministic merge order — this ensures that movement conflict resolution and birth ID assignment produce the same outcome regardless of which sub-worker finished first
- Rebuilds the occupancy grid from scratch
- Resolves movement conflicts (first delta wins)
- Resolves **plant consumption claims** (first-claim-wins per tile index; rejected animals have their state rolled back to pre-consumption values)
- Resolves **item consumption claims** (first-claim-wins per `itemId`; winning claims trigger `world.removeItem()` on the main world; rejected claims are accepted without rollback — the animal keeps its nutrition, which is acceptable given the rarity of the conflict)
- Deduplicates plant eating (Set-based tracking)
- Reassigns proper IDs to births from the main world counter
- Rebuilds the spatial hash after merge

Each fauna sub-worker receives a read-only snapshot of all active ground items (`items: itemsSnapshot`). Workers run in **claim mode** (`world._itemClaimMode = true`), so `removeItem()` records a `{itemId}` claim rather than mutating the shared state. Claims are merged back in `applyFaunaResults`.

---

## Sampled Consistency Supervisor

The engine runs a lightweight supervisor from `tickCleanup()` on a configurable audit interval instead of every tick. This keeps the hot path cheap while still checking critical invariants regularly.

Current checks include:

- `animal + egg` overlap on the same tile
- `egg + egg` overlap on the same tile
- mismatches between `animalGrid` and the actual alive non-egg animals
- plant grid inconsistencies across `plantType`, `plantStage`, `plantAge`, and `activePlantTiles`
- corrupted animal numeric fields and stale spatial-hash membership

The supervisor only logs inside the worker. It does not pause the simulation or mutate state.

---

## Dead Animal Lifecycle

When an animal dies, `world.killAnimal()` records `_deathTick`. Dead animals remain in the `animals` array (visible as 💀 skulls in the renderer) for **300 ticks**, after which `tickCleanup` permanently removes them from the array.

Two separate windows govern post-death behaviour:

| Window | Parameter | Default | Purpose |
|--------|-----------|---------|--------|
| Visibility window | hard-coded | 300 ticks | How long skull sprites are rendered |
| Scavenge window | `scavenge_decay_ticks` | ~100 ticks | How long a corpse can be eaten by scavengers |

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
