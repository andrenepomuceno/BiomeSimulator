# Configuration

Navigation: [Documentation Home](../README.md) > [Engine](README.md) > [Current Document](config.md)
Return to [Documentation Home](../README.md).

`config.js` exports the `DEFAULT_CONFIG` object, a `createSimulationConfig()` factory, and a set of named constants used throughout the engine.

`createSimulationConfig(overrides)` merges the provided overrides with `BASE_CONFIG` and then computes a set of **derived timing parameters** (e.g. `pathfinding_cache_ttl`, `threat_cache_ttl`, `scavenge_decay_ticks`) by converting game-minute constants to ticks based on the resolved `ticks_per_day`. These derived values can be overridden explicitly if needed. `ticks_per_game_minute` is always derived as `ticks_per_day / 1440`.

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

Parameters marked **(derived)** are not in `BASE_CONFIG` directly — they are computed from game-minute constants by `createSimulationConfig()` and will vary if `ticks_per_day` is changed. The tick values shown assume the default `ticks_per_day = 260`.

| Category | Parameter | Default | Description |
|----------|-----------|---------|-------------|
| Map | `map_width` | 500 | Grid width in tiles |
| Map | `map_height` | 500 | Grid height in tiles |
| Map | `sea_level` | 0.46 | Maximum height threshold for water (0.0–1.0); may be clamped downward by `min_land_ratio` |
| Map | `island_count` | 8 | Number of island blobs |
| Map | `island_size_factor` | 0.24 | Relative island radius |
| Map | `min_land_ratio` | 0.35 | Minimum fraction of tiles that must be land; the effective sea level is clamped downward until this ratio is met (0 = disabled) |
| Map | `river_count` | 4 | Number of rivers carved from mountain/rock sources toward existing water (0 disables river carving) |
| Map | `seed` | null | Random seed (null = random) |
| Clock | `ticks_per_second` | 10 | Target simulation speed (ticks advanced per real second) |
| Clock | `ticks_per_day` | 260 | Ticks in one full day/night cycle |
| Clock | `ticks_per_game_minute` | `ticks_per_day / 1440` | **(derived)** Conversion factor between game minutes and engine ticks |
| Clock | `day_fraction` | 0.6 | Fraction of each day that is daylight (0.6 = 60% day, 40% night) |
| Fauna — Population | `max_animal_population` | 10000 | Global animal population budget; per-species caps are scaled proportionally (`0` = use raw per-species base caps) |
| Fauna — Population | `initial_population_fraction` | 0.1 | Fraction of `max_animal_population` to spawn at world start |
| Fauna — Population | `hunger_multiplier` | 1.6 | Global multiplier applied to every species' `hunger_rate` |
| Fauna — Population | `thirst_multiplier` | 1.6 | Global multiplier applied to every species' `thirst_rate` |
| Fauna — Vision | `animal_global_vision_multiplier` | 1.2 | Multiplier applied to every species' base vision range |
| Fauna — Vision | `night_vision_reduction_factor` | 0.65 | Vision multiplier for non-nocturnal species during night |
| Fauna — Vision | `nocturnal_day_vision_factor` | 0.8 | Vision multiplier for nocturnal species during day |
| Fauna — Activity | `sleep_threshold_offset_wrong_period` | 10 | Added to the sleep energy threshold when an animal is active in its wrong period (e.g. a nocturnal animal during the day) |
| Fauna — Activity | `activity_energy_penalty_wrong_period` | 1.3 | Energy cost multiplier for movement when active during wrong period |
| Fauna — Activity | `sleep_block_hp_threshold` | 0.85 | An animal with HP above this fraction of `maxHp` will not voluntarily sleep (prioritises other needs instead) |
| Fauna — Movement | `movement_sub_ticks` | 5 | Sub-tick movement iterations per engine tick |
| Fauna — Locking | `flee_lock_ticks` | 5 | Ticks to commit to fleeing the current threat before re-evaluating; overridable per species |
| Fauna — Locking | `chase_lock_ticks` | 5 | Ticks to commit to chasing the current prey before re-evaluating; overridable per species |
| Fauna — Locking | `water_lock_ticks` | 30 | Ticks to commit to a water destination before rescanning |
| Fauna — Locking | `plant_lock_ticks` | 20 | Ticks to commit to a plant target before rescanning |
| Fauna — Retreat | `carnivore_retreat_hp_normal_threshold` | 0.30 | Carnivore/omnivore retreats from a stronger predator when HP < 30% of max (normal mode) |
| Fauna — Retreat | `carnivore_retreat_hp_desperate_threshold` | 0.40 | HP flee threshold rises to 40% when the animal is hungry or thirsty |
| Fauna — Retreat | `carnivore_retreat_power_margin` | 3 | Retreat only if `threat.attack_power > animal.attack_power + margin` |
| Fauna — Retreat | `carnivore_retreat_desperate_hunger` | 45 | Hunger value that activates desperate mode |
| Fauna — Retreat | `carnivore_retreat_desperate_thirst` | 55 | Thirst value that activates desperate mode |
| Fauna — Caching | `pathfinding_cache_ttl` | ~15 | **(derived)** Path reuse TTL in ticks (from 83 game minutes) |
| Fauna — Caching | `threat_cache_ttl` | 10 | Ticks to reuse a found threat result before rescanning |
| Fauna — Caching | `threat_scan_cooldown_ticks` | 8 | Ticks to skip a scan after returning "no threat found" |
| Fauna — Scavenging | `scavenge_decay_ticks` | ~100 | **(derived)** Fresh-corpse window for scavenging (from 554 game minutes) |
| Fauna — Scavenging | `scavenge_corpse_hunger_restore` | 35 | Hunger reduced when an animal scavenges a corpse (lower than meat item to avoid double nutrition) |
| Fauna — Scavenging | `scavenge_corpse_energy_restore` | 8 | Energy gained from corpse scavenging |
| Fauna — Scavenging | `scavenge_corpse_hp_restore` | 4 | HP gained from corpse scavenging |
| Fauna — Scavenging | `scavenge_egg_hunger_restore` | 20 | Hunger reduced when eating a rival egg |
| Fauna — Scavenging | `scavenge_egg_energy_restore` | 10 | Energy gained from eating an egg |
| Fauna — Supervisor | `supervisor_enabled` | `true` | Enable the sampled consistency supervisor |
| Fauna — Supervisor | `supervisor_full_audit_interval_ticks` | ~30 | **(derived)** Full audit interval (from 166 game minutes) |
| Fauna — Supervisor | `supervisor_sample_limit` | 5 | Max logged samples per issue category per audit |
| Fauna — Supervisor | `supervisor_log_cooldown_ticks` | ~120 | **(derived)** Min ticks between worker warnings (from 665 game minutes) |
| Fauna — Derived | `initial_animal_counts` | `{RABBIT: N, ...}` | Proportionally normalized counts built from `animalSpecies.js` and `max_animal_population` |
| Fauna — Derived | `animal_species` | `{RABBIT: {...}, ...}` | **(derived)** Full tick-converted species config from `buildAnimalSpeciesConfig()` |
| Flora | `initial_plant_density` | 0.10 | Fraction of eligible tiles seeded at world start |
| Flora | `water_proximity_threshold` | 10 | Tile distance from water that grants a growth bonus |
| Flora | `plant_spawn_water_thresholds` | `{near: 5, mid: 15}` | Distance bands for weighted plant spawn distribution |
| Flora | `plant_tick_phases` | 4 | Number of processing phases that stagger plant updates across ticks |
| Flora — Seasons | `season_length_days` | 30 | Game days per season (4 seasons per year) |
| Flora — Seasons | `season_growth_multiplier` | `[1.2, 1.0, 0.8, 0.5]` | Per-season growth rate multipliers (Spring, Summer, Autumn, Winter) |
| Flora — Seasons | `season_reproduction_multiplier` | `[1.5, 1.0, 0.7, 0.2]` | Per-season plant reproduction rate multipliers |
| Flora — Seasons | `season_death_multiplier` | `[0.8, 1.0, 1.2, 2.0]` | Per-season plant death rate multipliers |
| Flora — Crowding | `plant_crowding_growth_penalty` | 0.7 | Growth multiplier applied when neighbor count exceeds the crowding threshold |
| Flora — Crowding | `plant_crowding_neighbor_threshold` | 5 | Number of neighboring plants that triggers crowding growth penalty |
| Flora — Water Stress | `water_stress_threshold` | 20 | Water proximity below this triggers stress for high-affinity plants |
| Flora — Water Stress | `water_stress_severe_threshold` | 30 | Water proximity at this level triggers severe stress and higher death rate |
| Flora — Spread | `plant_offspring_max_spread` | 3 | Max tile radius for seed/fruit offspring placement |
| Flora — Derived | `plant_stage_ages` | `{1: [...], ...}` | **(derived)** Tick-based stage thresholds per typeId from `plantSpecies.js` |
| Flora — Derived | `plant_fruit_spoil_ages` | `{1: N, ...}` | **(derived)** Tick-based fruit decay thresholds per typeId from `plantSpecies.js` |
| Ground Items | `item_meat_decay_ticks` | 300 | Ticks before a dropped meat item decays and is removed |
| Ground Items | `item_fruit_to_seed_ticks` | 200 | Ticks for a fruit item to decay into a seed item |
| Ground Items | `item_seed_germination_ticks` | 400 | Fallback ticks before a seed item attempts germination (overridden per species) |
| Ground Items | `item_seed_germination_chance` | 0.20 | Probability (0–1) that a seed item germinates into a plant tile when it expires |
| Ground Items | `item_drop_radius_animal` | 2 | Tile search radius when placing a dropped item near an animal death position |
| Ground Items | `item_drop_radius_plant` | 2 | Tile search radius when placing a fruit/seed item from a plant |
| Ground Items | `item_max_changes_per_tick` | 2000 | Maximum item change events collected per tick before further changes are dropped |

The supervisor is designed to stay off the hot path: it runs full audits on a configurable interval and records timing separately in profiling output as `supervisorMs`.
