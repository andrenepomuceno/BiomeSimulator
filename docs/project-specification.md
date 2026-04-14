# EcoGame Project Specification

Navigation: [Documentation Home](README.md) > [Project Specification](project-specification.md)
Return to [Documentation Home](README.md).

Related documentation: [Architecture](architecture.md), [Engine](engine/), [Simulation](simulation/), [Renderer](renderer/), [API](api/), [Frontend README](../frontend/README.md).

---

This document defines the intended product behavior and technical shape of EcoGame. It is the master specification for stakeholders who need a single, navigable view of the project. Detailed pages under `docs/` remain the drill-down reference for subsystem formulas, registries, and message schemas.

Implementation details may evolve, but the product behaviors, system boundaries, and acceptance criteria defined here are the expected baseline.

## Contents

- [1. Product Summary](#1-product-summary)
- [2. Design Goals](#2-design-goals)
- [3. Core User Workflows](#3-core-user-workflows)
- [4. Domain Model](#4-domain-model)
- [5. Simulation Specification](#5-simulation-specification)
- [6. Interface Specification](#6-interface-specification)
- [7. Configuration and Persistence](#7-configuration-and-persistence)
- [8. Technical Architecture](#8-technical-architecture)
- [9. Non-Functional Requirements](#9-non-functional-requirements)
- [10. Acceptance Criteria](#10-acceptance-criteria)
- [11. Detailed References](#11-detailed-references)
- [12. Glossary](#12-glossary)

---

## 1. Product Summary

| Dimension | Specification |
|-----------|---------------|
| Product type | Browser-based 2D ecosystem simulation |
| Core mode | Real-time sandbox with pause, step, inspection, and editing |
| Primary loop | Generate world -> observe -> inspect -> intervene -> analyze -> save or reset |
| Simulation catalog | 18 animal species, 15 plant species, 9 terrain types |
| Execution model | React UI and Pixi.js renderer on the main thread, simulation engine in a Web Worker |
| Persistence | Full-state JSON save and load |
| Analysis surface | Live inspector, minimap, stats panel, entity summary, historical report, audio controls |
| Primary users | Mixed product and engineering stakeholders, simulation tinkerers, and technical reviewers |

EcoGame is a sandbox simulation rather than a mission-driven game. Its main value is making ecological cause and effect observable, reproducible, and editable. Users are expected to generate a world, let it evolve, pause to inspect specific outcomes, and then modify conditions to observe how the ecosystem responds.

## 2. Design Goals

- Make food chains, terrain constraints, and time-based ecosystem changes easy to observe.
- Support both passive observation and active experimentation in the same runtime.
- Keep the simulation inspectable at three levels: local entity or tile state, regional world state, and historical trends.
- Preserve a clear technical separation between simulation logic, worker orchestration, state management, and rendering.
- Allow reproducible scenarios through explicit configuration and seed-based world generation.
- Maintain responsive controls and a readable UI while the simulation continues to evolve.
- Provide a single-document overview without replacing the deeper technical pages in the existing documentation set.

## 3. Core User Workflows

### 3.1 Generate a World

The user opens the main menu, configures map and population parameters, and starts a new simulation.

Expected behavior:

- The world is generated procedurally from the selected map settings.
- Initial flora and fauna populations are seeded into the world.
- The application receives a complete initial state and hydrates the canvas, minimap, store, and panels.
- If a seed is supplied, the generated terrain and initial distribution are reproducible for the same configuration.

### 3.2 Run, Pause, Resume, and Step Time

The user controls time from the toolbar.

Expected behavior:

- `Start` begins continuous ticking.
- `Pause` freezes simulation time without discarding state.
- `Resume` continues from the paused state.
- `Step` advances the world by exactly one tick while paused.
- A speed control adjusts the target ticks per second without requiring a new world.

### 3.3 Inspect Entities and Tiles

The user switches to the select tool and clicks an animal, plant, or terrain tile.

Expected behavior:

- The inspector shows the selected target's current state.
- Tile inspection includes terrain and plant information plus animals currently on the tile.
- Animal inspection includes status, needs, energy, health, age, and recent behavior context.
- Inspection works both while the simulation is running and while it is paused.

### 3.4 Edit the World

The user paints terrain, places entities, or removes animals to create experiments.

Expected behavior:

- Terrain edits reshape movement lanes, water access, and plant viability.
- Entity placement can introduce animals or plants at explicit coordinates.
- Entity removal can delete animals by selection.
- Edits are reflected promptly in the visual world and then applied to the authoritative simulation state.

### 3.5 Analyze Trends

The user studies the simulation at broader scale through the minimap, live counters, entity summary, and historical report.

Expected behavior:

- The stats panel summarizes current population health.
- The report view presents history derived from recorded simulation snapshots.
- The entity summary provides searchable and filterable access to animals and plants.
- The minimap exposes global terrain shape and quick camera repositioning.

### 3.6 Save and Restore Scenarios

The user exports the current simulation and later reloads it.

Expected behavior:

- Saving produces a complete JSON snapshot of the world.
- Loading reconstructs the same scenario, including terrain, flora, fauna, clock, and history.
- Save and load operate through the main menu rather than through external tooling.

## 4. Domain Model

### 4.1 World Grid

EcoGame simulates a 2D tile world with the following rules:

- The world has configurable `width x height` dimensions.
- Terrain and plant state are tile-based.
- Animals move at sub-tile precision using floating-point coordinates.
- Grid storage is row-major, using `index = y * width + x` for flat array access.
- Tile occupancy is tracked separately from sub-tile movement so movement can stay smooth without losing tile-level constraints.

### 4.2 Terrain Taxonomy

| Terrain | Role in the Simulation |
|---------|------------------------|
| Water | Primary drinking resource and a movement barrier for many species |
| Sand | Transitional terrain with lower plant productivity and slower traversal |
| Dirt | General land terrain with modest plant support |
| Soil | Baseline fertile ground for common plant growth |
| Rock | Harsh terrain with limited plant compatibility and species-specific traversal |
| Fertile Soil | High-quality growth terrain that supports dense plant life |
| Deep Water | Stronger water barrier used for larger bodies of water |
| Mountain | Hard terrain boundary with limited traversal and plant support |
| Mud | Wet terrain that slows movement and can create chokepoints |

### 4.3 Time Model

| Clock Element | Meaning | Default |
|---------------|---------|---------|
| `ticks_per_second` | Target simulation speed | 20 |
| `ticks_per_day` | Number of ticks in one day-night cycle | 260 |
| `day_fraction` | Fraction of the cycle counted as daylight | 0.6 |
| `tick` | Global simulation tick counter | Starts at 0 |
| `day` | Day number derived from the tick counter | Starts at 0 |
| `tick_in_day` | Tick offset within the current day | Starts at 0 |
| `is_night` | Whether the current tick is in the night portion of the cycle | Derived |

### 4.4 Entity Classes

| Entity | Purpose | Core State |
|--------|---------|------------|
| Animal | Autonomous moving organism with needs, AI, and lifecycle | identity, position, state, energy, hunger, thirst, hp, age, sex, species config |
| Plant | Tile-bound food and growth source | type, stage, age, fruit status |
| Tile | Static terrain cell that may host plants and animals | terrain type, water proximity, occupancy |
| Clock | Shared time context for all systems | tick, day, tick-in-day, day/night state |

The animal catalog spans herbivores, carnivores, and omnivores. The plant catalog spans grass, crops, shrubs, fungi, and trees with different growth ages and terrain preferences.

## 5. Simulation Specification

### 5.1 Tick Pipeline

One simulation step is divided into three phases:

1. `tickFlora()` advances the clock and processes plant growth.
2. Fauna processing updates all animal decisions and movement, either sequentially or through sub-worker chunking.
3. `tickCleanup()` removes expired dead animals, samples consistency checks, and records periodic statistics.

This phase split is part of the intended architecture. Any optimized implementation must preserve the same logical ordering: time and flora first, fauna second, cleanup and metrics last.

### 5.2 Animal AI and Priorities

Animals act through a strict priority system. Ongoing actions such as sleeping, eating, and drinking continue before new decisions are considered. Local opportunistic actions are checked before the main priority queue.

| Priority | Condition | Intended Action |
|----------|-----------|-----------------|
| Ongoing | Already sleeping, eating, or drinking | Continue current action until complete |
| Opportunistic | Adjacent water while thirsty, or edible plant while hungry | Drink or eat immediately |
| P1 | Critical thirst | Seek water |
| P2 | Predator detected in vision range | Flee |
| P3 | Critical hunger | Seek food |
| P4 | Low energy | Sleep |
| P5 | Mature, ready to reproduce, and energetic enough | Find mate or reproduce |
| P6 | Moderate hunger | Proactively seek food |
| P7 | Moderate thirst | Proactively seek water |
| P8 | Existing path already available | Continue following path |
| P9 | No higher-priority need | Random walk or idle |

Decision thresholds are species-configurable, but the strict-order evaluation model is part of the intended behavior.

### 5.3 Perception and Activity Period

Vision is derived from species configuration and adjusted by global runtime modifiers and the day-night cycle.

```text
vision_now = max(1, floor(vision_range * animal_global_vision_multiplier * dayNightModifier))
```

Expected modifiers:

- Non-nocturnal species receive reduced vision at night.
- Nocturnal species receive reduced vision during the day.
- Vision must never collapse below 1 tile.
- Species active in the wrong period pay an energy penalty while operating.

Threat detection is expected to use nearby queries rather than whole-world scans, and species may vary in how frequently they re-evaluate threats.

### 5.4 Movement and Traversal

Movement is sub-tile and terrain-aware.

| Rule | Specification |
|------|---------------|
| Position model | Animals use floating-point `x` and `y` coordinates |
| Sub-cell grid | Each tile is divided into a `4 x 4` logical sub-grid |
| Movement increment | One sub-step equals `0.25` tiles |
| Speed unit | Species `speed` values represent sub-cell steps per tick |
| Pathfinding model | A* is tile-based even though movement is sub-tile |
| Occupancy model | Tile occupancy is updated on tile-boundary crossings |

Terrain affects both movement speed and energy cost:

| Terrain Group | Speed Factor | Energy Multiplier |
|---------------|-------------|-------------------|
| Soil, Dirt, Fertile Soil | 1.0x | 1.0x |
| Sand, Rock | 0.75x | 1.3x |
| Mud | 0.5x | 1.5x |
| Mountain | 0.5x | 1.8x |

Random exploration should remain directionally smooth rather than purely jittery. Path following should advance toward waypoint centers while respecting tile compatibility.

### 5.5 Energy, Hunger, Thirst, and Recovery

Energy is the immediate action budget. Hunger and thirst are long-term survival pressures.

| System | Intended Behavior |
|--------|-------------------|
| Energy | Spent on actions and clamped between zero and species max energy |
| Hunger | Increases over time; high values cause HP loss |
| Thirst | Increases over time; high values cause HP loss |
| Forced sleep | Zero energy forces the animal into recovery behavior |
| Passive recovery | Idle and sleeping states restore some energy and HP |

Typical action cost ranges:

| Action | Typical Cost Range |
|--------|--------------------|
| Idle | 0.01 to 0.04 |
| Walk | 0.06 to 0.15 |
| Run | 0.20 to 0.55 |
| Eat | 0.03 to 0.08 |
| Drink | 0.03 to 0.08 |
| Sleep | Negative cost, used for energy recovery |
| Attack | 0.4 to 2.0 |
| Mate | 0.8 to 2.5 |
| Flee | 0.2 to 0.6 |

High hunger and thirst do not kill directly. Instead, they drain HP once they exceed the configured critical fraction.

### 5.6 Feeding, Hunting, and Scavenging

Food acquisition depends on diet class.

- Herbivores primarily consume plants at species-compatible stages.
- Carnivores hunt prey in range and may fall back to fruit when species rules allow it.
- Omnivores can combine plant and prey strategies.
- Scavenger-capable species can consume fresh corpses inside a configurable decay window.

Plant nutrition is stage-dependent:

- Seeds provide minimal recovery.
- Mature edible plants provide moderate recovery.
- Fruit provides the highest hunger relief and the strongest plant-based health recovery.

### 5.7 Combat, Injury, and Death

HP is the definitive survival metric.

```text
damage = attackPower - (defense * defense_factor)
minimum damage = min_damage
```

Expected combat behavior:

- Predators attack when they reach valid prey.
- Incoming damage reduces HP.
- Kill events reward the attacker with hunger recovery and health or energy restoration.
- Animals die when HP reaches zero or when age exceeds species max age.
- Dead animals remain visible for a limited period before permanent cleanup.

High hunger and thirst penalties stack with combat pressure, allowing ecological collapse to emerge from resource shortages rather than from predation alone.

### 5.8 Reproduction and Population Control

Reproduction requires maturity, sufficient energy, and cooldown availability.

| Requirement | Specification |
|-------------|---------------|
| Life stage | Must be adult |
| Energy | Must exceed the mating threshold |
| Cooldown | Must be zero |
| Partner search | Required for sexual and hermaphrodite reproduction |
| Radius | Mate search uses a local radius rather than a global scan |

Supported reproduction modes:

| Mode | Rule |
|------|------|
| Sexual | Requires compatible opposite-sex parents of the same species |
| Hermaphrodite | Requires two same-species parents without sex split constraints |
| Asexual | Allows self-reproduction when other requirements are met |

Population regulation is part of the intended simulation. Species mating success declines as species population approaches its effective cap.

```text
effectiveCap = baseCap * globalBudget / BASE_POP_TOTAL
```

Offspring spawn near the parent location on walkable adjacent tiles and begin as new low-age individuals with reduced starting energy.

### 5.9 Plant Growth and Reseeding

Plants progress through a staged lifecycle:

`Seed -> Young Sprout -> Adult Sprout -> Adult -> Fruit or Seed Production -> Dead -> Cleared Tile`

Growth is determined by an effective age model:

```text
effectiveAge = baseAge * waterMult * terrainMult * seasonGrowth * crowdingMult
```

The intended plant system includes:

- Species-specific growth ages and maximum lifespan.
- Water proximity bonuses near viable water tiles.
- Terrain growth modifiers that make some species desert-tolerant, tree-friendly, or wetland-compatible.
- Seasonal multipliers that change growth, reproduction, and death pressure over time.
- Fruit-bearing and seed-spreading strategies depending on plant type.

Dead plants should release the tile back to the ecosystem so reseeding and succession can continue.

### 5.10 Metrics and History

The simulation must expose both current and historical state.

Expected metrics include:

- Herbivore, carnivore, and omnivore population counts.
- Per-species population history.
- Total plant counts and fruit counts.
- Current tick timing and clock state.
- Stored history snapshots suitable for charts and textual export.

Statistics are recorded periodically rather than every frame so reporting remains useful without overwhelming the runtime.

## 6. Interface Specification

### 6.1 Main Runtime Surfaces

| Surface | Purpose | Expected Behavior |
|---------|---------|------------------|
| World canvas | Main simulation view | Renders terrain, plants, animals, effects, and selection-driven interaction |
| Toolbar | Time and mode control | Start, pause, resume, step, speed, audio, config, report, and high-level actions |
| Terrain editor | World intervention | Paint terrain, place entities, erase entities, control brush behavior |
| Minimap | Global navigation | Show whole-world context and support fast camera jumps |
| Stats panel | Live overview | Display current population and ecosystem summaries |
| Entity inspector | Detailed inspection | Show current data for the selected animal or tile |
| Entity summary window | Broad searchable view | Search and filter animals and plants, then focus them in the UI |
| Game menu | Scenario management | Create a new world, save the current state, or load a previous state |
| Help modal | In-app guidance | Explain tools, controls, concepts, and panel meaning |
| Simulation config modal | Runtime configuration view | Present the active world configuration in read-only form |
| Simulation report | Historical analytics | Show chart-based population and flora trends over time |
| Audio settings modal | Sound control | Control master, SFX, and ambience volumes and inspect audio activity |

### 6.2 Interaction Rules

| Input | Expected Behavior |
|-------|-------------------|
| Click | Select tile or entity, or apply the active tool |
| Click and drag | Pan the camera |
| Mouse wheel | Zoom in or out around the pointer |
| Space | Start, resume, or pause the simulation |
| Escape | Close the active major modal, or open the main menu when no major modal is open |

Camera behavior must support:

- Smooth panning.
- Zooming between low-detail overview and close inspection.
- Screen-to-tile conversion for all editing and selection actions.
- Tile-centered navigation from the minimap and related panels.

### 6.3 Menu and Scenario Controls

The game menu is the primary control surface for starting and restoring scenarios.

Expected menu capabilities:

- New game configuration for map size, sea level, island layout, and seed.
- Fauna presets and editable per-species counts.
- Flora presets and density controls.
- Save to a JSON file.
- Load from a JSON file with user-visible parse failure handling.

### 6.4 Reporting and Guidance

The analytics and guidance surfaces must remain part of the product experience, not optional developer-only tooling.

Required behavior:

- The report visualizes historical changes, including population and flora trends.
- The help modal explains tools, controls, needs, diet categories, terrain meaning, and panel usage.
- The config modal makes the active runtime settings visible without requiring source-code access.

## 7. Configuration and Persistence

### 7.1 Configuration Categories

| Category | Representative Controls |
|----------|-------------------------|
| Map generation | width, height, sea level, island count, island size factor, seed |
| Clock | ticks per second, ticks per day, daylight fraction |
| Flora | initial density, water proximity threshold, seasonal multipliers, reproduction tuning |
| Fauna | initial species counts, global animal budget, pathfinding and threat cache settings |
| Vision and activity | global vision multiplier, nocturnal and non-nocturnal penalties |
| Safety and auditing | supervisor enable flag, audit interval, logging cooldown |

Configuration should be explicit, serializable, and portable between generation and save files.

### 7.2 Save and Load Contract

The save payload must include enough data to fully reconstruct the world.

| Save Field | Requirement |
|------------|-------------|
| `config` | Full runtime configuration used by the scenario |
| `width`, `height` | World dimensions |
| `clock` | Current time state |
| `terrain` | Full terrain grid |
| `waterProximity` | Water-distance grid |
| `plantType`, `plantStage`, `plantAge` | Plant state grids |
| `animals` | Full serialized animal list |
| `nextAnimalId` | Spawn counter for future births and placements |
| `statsHistory` | Historical metrics used by reporting surfaces |

Typed arrays may be serialized to plain arrays for JSON export, but load must reconstruct the optimized runtime representation.

### 7.3 Reproducibility

- World generation should be reproducible when the same seed and configuration are used.
- Save and load should preserve the exact current world, regardless of whether the seed is known.
- Persisted scenarios should be suitable for experimentation, regression checking, and demonstration.

## 8. Technical Architecture

### 8.1 Layer Boundaries

| Layer | Responsibility | Boundary Rule |
|-------|----------------|---------------|
| Components | UI composition and modal state | Read state and trigger actions; no simulation rules |
| Zustand store | Single source of client state | Immutable updates; no worker ownership or rendering logic |
| Hooks | Bridge between worker, store, and UI | Own worker lifecycle and message hydration |
| Renderer | Pixi.js drawing and camera handling | Read-only visualization; no game-state mutation rules |
| Worker | Simulation host and protocol endpoint | Own ticking, command handling, and state serialization |
| Engine | Pure simulation logic | No DOM, React, or Pixi dependencies |

### 8.2 Runtime Flow

1. The application creates the simulation worker and the Pixi renderer.
2. The UI sends a `generate` command with the active configuration.
3. The worker generates the world and returns a `worldReady` message.
4. The store hydrates terrain, plants, animals, and clock state.
5. The renderer consumes store state to draw the world.
6. User interactions send commands back through the worker for authoritative simulation updates.
7. During active play, the worker emits `tick` messages and the main thread updates panels and rendering.

### 8.3 Worker Protocol Summary

| Direction | Contract |
|-----------|----------|
| Main -> Worker | `generate`, `start`, `pause`, `resume`, `step`, `setSpeed`, `editTerrain`, `placeEntity`, `removeEntity`, `getTileInfo`, `saveState`, `loadState` |
| Worker -> Main | `worldReady`, `tick`, `tileInfo`, `entityPlaced`, `entityRemoved`, `savedState` |
| Worker -> Sub-worker | Optional fauna chunk processing for parallel animal AI |

Protocol rules:

- Large terrain and plant grids use structured clone friendly buffers.
- Animal sync may be full-state or incremental delta based.
- Full animal sync is expected to occur periodically even when deltas are enabled.
- Worker messages must stay serializable and independent from DOM or Pixi objects.

### 8.4 Rendering Pipeline

The intended layer order is:

| Order | Layer | Responsibility |
|-------|-------|----------------|
| 1 | Terrain layer | Base map texture for terrain tiles |
| 2 | Plant pixel layer | Always-visible plant coverage at world scale |
| 3 | Plant emoji layer | Higher-detail plant rendering when zoomed in |
| 4 | Entity layer | Animal rendering and status display |
| 5 | Animation layer | Visual effects for notable world events |
| 6 | Night overlay | Day-night visualization over the world |

Renderer requirements:

- Camera pan and zoom operate on one transformed world container.
- Rendering must remain visually responsive even while the worker is ticking.
- Viewport-aware updates should be used where practical to reduce unnecessary draw work.

## 9. Non-Functional Requirements

- The simulation must run client-side without blocking the main UI thread during normal operation.
- Engine code must remain worker-safe and free of React, DOM, and Pixi dependencies.
- Renderer code must remain presentation-only and must not embed simulation decisions.
- The application must keep one centralized Zustand store rather than splitting state across multiple stores.
- State transfer between worker and main thread must stay serializable and efficient for large worlds.
- The project must continue to support headless regression and profiling workflows for simulation changes.
- Performance-sensitive systems should be designed for worlds around `1000 x 1000` tiles and animal populations at or above `1000` without material architectural regression.
- Changes to simulation, rendering, or worker messaging should be evaluated against the existing profiling workflow when practical.

## 10. Acceptance Criteria

1. The product can generate a new world from explicit map and population settings.
2. The runtime supports start, pause, resume, step, and speed control without resetting state.
3. Users can inspect animals, plants, and terrain tiles through the main interface.
4. Users can edit terrain and place or remove entities from the running scenario.
5. Animal behavior follows a need-driven priority system that includes survival, movement, and reproduction.
6. Plant growth depends on stage progression plus terrain, water, seasonal, and crowding context.
7. The product exposes both live metrics and historical reporting views.
8. The current scenario can be saved to JSON and later restored.
9. The architecture preserves the separation between UI, store, renderer, worker, and engine.
10. The project retains detailed supporting documentation under `docs/` for subsystem drill-down.

## 11. Detailed References

- [Architecture](architecture.md)
- [Engine Overview](engine/README.md)
- [Configuration](engine/config.md)
- [World and Entities](engine/world.md)
- [Animal Species Registry](engine/animal-species.md)
- [Plant Species Registry](engine/plant-species.md)
- [Simulation Engine](engine/simulation-engine.md)
- [Animal AI](simulation/ai.md)
- [Movement System](simulation/movement.md)
- [Energy and Needs](simulation/energy.md)
- [Animal Interactions](simulation/animal-interactions.md)
- [Plant Lifecycle](simulation/plants.md)
- [Renderer Overview](renderer/overview.md)
- [Worker Commands](api/commands.md)
- [Worker Messages](api/messages.md)
- [Frontend README](../frontend/README.md)

## 12. Glossary

| Term | Meaning |
|------|---------|
| Active tile | A tile currently participating in plant or occupancy logic |
| Animal delta | Incremental state update for an animal rather than a full serialization |
| Day fraction | Fraction of each day-night cycle counted as daylight |
| Effective cap | Species population cap after applying the global population budget |
| Effective age | Plant growth age after environmental multipliers are applied |
| Fauna worker pool | Optional sub-worker layer used to parallelize animal processing |
| Full sync | Periodic complete animal serialization used to realign main-thread state |
| Incremental sync | Dirty-flag based animal updates between full synchronizations |
| Row-major grid | Flat grid indexing scheme using `y * width + x` |
| Sub-cell movement | Animal movement model using `0.25`-tile steps inside each tile |
| Tick | One discrete simulation step |
| Water proximity | Distance-from-water field used by plant growth and spawning rules |