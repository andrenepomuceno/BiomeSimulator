# Configuration

Navigation: [Documentation Home](../README.md) > [Engine](README.md) > [Current Document](config.md)
Return to [Documentation Home](../README.md).

`config.js` exports the `DEFAULT_CONFIG` object, a `createSimulationConfig()` factory, and a set of named constants used throughout the engine.

Timing values are authored in game minutes and converted back to ticks from the active `ticks_per_day`. `ticks_per_game_minute` is derived as `ticks_per_day / 1440`.

---

## Constants

| Export | Values |
|--------|--------|
| `SEX_MALE`, `SEX_FEMALE`, `SEX_ASEXUAL`, `SEX_HERMAPHRODITE` | String identifiers for animal sex |
| `REPRO_SEXUAL`, `REPRO_ASEXUAL`, `REPRO_HERMAPHRODITE` | Reproduction mode identifiers |
| `SUB_CELL_DIVISOR` | `4` — each tile is divided into a 4×4 sub-grid for movement |
| `SUB_CELL_STEP` | `0.25` — movement increment per sub-step (1 / SUB_CELL_DIVISOR) |

---

## `DEFAULT_CONFIG`

| Category | Parameter | Default | Description |
|----------|-----------|---------|-------------|
| Map | `map_width` | 500 | Grid width in tiles |
| Map | `map_height` | 500 | Grid height in tiles |
| Map | `sea_level` | 0.38 | Height threshold for water (0.0–1.0) |
| Map | `island_count` | 5 | Number of island blobs |
| Map | `island_size_factor` | 0.3 | Relative island radius |
| Map | `seed` | null | Random seed (null = random) |
| Clock | `ticks_per_second` | 20 | Simulation speed |
| Clock | `ticks_per_day` | 260 | Ticks in one full day cycle |
| Clock | `ticks_per_game_minute` | `ticks_per_day / 1440` | Derived conversion factor between game minutes and engine ticks |
| Clock | `day_fraction` | 0.6 | Fraction of day that is daylight |
| Flora | `initial_plant_density` | 0.10 | Fraction of eligible tiles seeded |
| Flora | `water_proximity_threshold` | 10 | Tiles from water for growth bonus |
| Flora | `plant_spawn_water_thresholds` | `{near: 5, mid: 15}` | Bands for weighted plant spawning |
| Flora | `plant_tick_phases` | 4 | Staggered plant processing phases |
| Flora | `season_*_multiplier` | arrays | Growth/reproduction/death per season |
| Flora | `plant_reproduction_*` | various | Dynamic offspring caps at high coverage |
| Flora | `plant_water_growth_modifiers` | object | Near/far growth factors by water context |
| Flora | `plant_dirt_death_chance_by_stage` | object | Stage-based harsh-terrain death rates |
| Fauna | `pathfinding_cache_ttl` | 15 | Path reuse TTL in ticks, derived from an authored game-time duration |
| Fauna | `threat_cache_ttl` | 4 | Threat cache TTL in ticks, derived from an authored game-time duration |
| Fauna | `threat_scan_cooldown_ticks` | 2 | Delay between expensive threat rescans, derived from an authored game-time duration |
| Fauna | `animal_global_vision_multiplier` | 1.2 | Multiplier applied to every species base vision range |
| Fauna | `night_vision_reduction_factor` | 0.65 | Night vision reduction for non-nocturnal species |
| Fauna | `nocturnal_day_vision_factor` | 0.8 | Day vision reduction for nocturnal species |
| Fauna | `scavenge_decay_ticks` | 100 | Fresh-corpse window for scavenging, derived from an authored game-time duration |
| Fauna | `supervisor_enabled` | `true` | Enable the sampled consistency supervisor |
| Fauna | `supervisor_full_audit_interval_ticks` | `30` | Run a full supervisor audit every N ticks |
| Fauna | `supervisor_sample_limit` | `5` | Maximum number of logged samples per issue category per audit |
| Fauna | `supervisor_log_cooldown_ticks` | `120` | Minimum spacing between worker warnings when inconsistencies persist |
| Fauna | `initial_animal_counts` | `{RABBIT: 25, ...}` | Derived from `animalSpecies.js` |
| Fauna | `animal_species` | `{RABBIT: {...}, ...}` | Derived from `animalSpecies.js` |
| Flora | `plant_stage_ages` | `{1: [...], ...}` | Tick-based stage thresholds derived from `plantSpecies.js` |
| Flora | `plant_fruit_spoil_ages` | `{1: ..., ...}` | Tick-based fruit spoil thresholds derived from `plantSpecies.js` |

The supervisor is designed to stay off the hot path: it runs full audits on a sampled interval and records timing separately in profiling output as `supervisorMs`.
