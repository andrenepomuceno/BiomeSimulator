/**
 * Default simulation configuration.
 */
import { buildAnimalSpeciesConfig, buildProportionalAnimalCounts, normalizeAnimalCountsToBudget } from './animalSpecies.js';
import { buildFruitSpoilAges, buildInitialPlantCounts, buildProductionChances, buildStageAges } from './plantSpecies.js';
import { DEFAULT_TICKS_PER_DAY } from '../constants/simulation.js';
import { gameMinutesToTicks, resolveTicksPerGameMinute, scaleRateForTicks } from '../utils/gameTime.js';

// Sex types
export const SEX_MALE = 'MALE';
export const SEX_FEMALE = 'FEMALE';
export const SEX_ASEXUAL = 'ASEXUAL';
export const SEX_HERMAPHRODITE = 'HERMAPHRODITE';

// Reproduction modes
export const REPRO_SEXUAL = 'SEXUAL';         // requires male + female
export const REPRO_ASEXUAL = 'ASEXUAL';       // reproduces alone
export const REPRO_HERMAPHRODITE = 'HERMAPHRODITE'; // any two can mate

// Sub-cell movement: animals move in 1/4-tile increments
export const SUB_CELL_DIVISOR = 4;
export const SUB_CELL_STEP = 1 / SUB_CELL_DIVISOR;  // 0.25

const PATHFINDING_CACHE_TTL = 83;
const THREAT_CACHE_TTL = 22;
const THREAT_SCAN_COOLDOWN = 11;
const SCAVENGE_DECAY_WINDOW = 554;
const SUPERVISOR_FULL_AUDIT_INTERVAL = 166;
const SUPERVISOR_LOG_COOLDOWN = 665;
// Item lifecycle durations in game-minutes (invariant to ticks_per_day).
// Derived by back-converting the original tick values at DEFAULT_TICKS_PER_DAY=500.
const ITEM_MEAT_DECAY        = 864;  // 300 ticks @ 500tpd ≈ 0.6 game-days
const ITEM_FRUIT_TO_SEED     = 576;  // 200 ticks @ 500tpd ≈ 0.4 game-days
const ITEM_SEED_GERMINATION  = 1152; // 400 ticks @ 500tpd ≈ 0.8 game-days
// Behaviour lock durations in game-minutes.
const FLEE_LOCK_MINUTES  = 14; //  5 ticks @ 500tpd
const CHASE_LOCK_MINUTES = 14; //  5 ticks @ 500tpd
const WATER_LOCK_MINUTES = 86; // 30 ticks @ 500tpd
const PLANT_LOCK_MINUTES = 58; // 20 ticks @ 500tpd

const BASE_CONFIG = {
  // Map generation
  map_width: 500,
  map_height: 500,
  sea_level: 0.46,
  island_count: 8,
  island_size_factor: 0.24,
  min_land_ratio: 0.35, // adaptive sea_level clamp: guarantees at least this fraction of tiles are land
  river_count: 4,      // number of rivers carved from highlands to water
  seed: null, // null = random

  // Simulation
  ticks_per_second: 10,
  ticks_per_day: DEFAULT_TICKS_PER_DAY,
  day_fraction: 0.6,
  animal_global_vision_multiplier: 1.2,
  night_vision_reduction_factor: 0.65,
  nocturnal_day_vision_factor: 0.8,
  sleep_threshold_offset_wrong_period: 10,
  activity_energy_penalty_wrong_period: 1.3,
  movement_sub_ticks: 5,
  scavenge_corpse_hunger_restore: 35,  // hunger reduced when eating a corpse (less than item; stacks with drops)
  scavenge_corpse_energy_restore: 8,   // energy gained when eating a corpse
  scavenge_corpse_hp_restore: 4,       // hp gained when eating a corpse
  scavenge_egg_hunger_restore: 20,     // hunger reduced when eating an egg
  scavenge_egg_energy_restore: 10,     // energy gained when eating an egg
  item_seed_germination_chance: 0.20,  // probability a SEED item spawns a plant when it expires
  // flee_lock_ticks / chase_lock_ticks: computed in createSimulationConfig from game-minute constants
  carnivore_retreat_hp_normal_threshold: 0.30,     // flee if hp < 30% (normal)
  carnivore_retreat_hp_desperate_threshold: 0.40,  // flee if hp < 40% when hungry/thirsty
  carnivore_retreat_power_margin: 3,               // flee only if threat.attack > animal.attack + margin
  carnivore_retreat_desperate_hunger: 45,          // hunger level that triggers desperate mode
  carnivore_retreat_desperate_thirst: 55,          // thirst level that triggers desperate mode
  sleep_block_hp_threshold: 0.85,                  // don't sleep voluntarily if hp < this fraction of maxHp
  alert_ticks_after_flee: 30,                      // ticks of heightened threat vigilance after a flee episode ends
  injured_speed_hp_threshold: 0.40,                // hp fraction below which movement speed is penalized
  injured_speed_factor: 0.70,                      // speed multiplier when hp is below the injured threshold
  threat_cache_ttl: 10,                            // ticks to reuse a found threat before rescanning (was 4)
  threat_scan_cooldown_ticks: 8,                   // ticks to skip scan after "no threat found" (was 2)
  // water_lock_ticks / plant_lock_ticks: computed in createSimulationConfig from game-minute constants

  // Flora
  initial_plant_density: 0.10,
  initial_plant_counts: buildInitialPlantCounts(),
  water_proximity_threshold: 10,
  plant_spawn_water_thresholds: { near: 5, mid: 15 },
  initial_plant_stage_distribution: [0.25, 0.25, 0.25, 0.25],
  initial_plant_adult_age_fraction: 0.3,
  plant_tick_phases: 4,
  plant_dead_stage_duration_ticks: 100,
  plant_dirt_death_chance_by_stage: {
    1: 0.003,
    2: 0.002,
    3: 0.001,
    4: 0.0005,
    5: 0.002,
  },

  // Flora — local density competition
  plant_crowding_growth_penalty: 0.7,
  plant_crowding_neighbor_threshold: 5,
  plant_density_suppress_threshold: 0.7,
  plant_density_reduce_threshold: 0.5,
  plant_density_reduce_success_chance: 0.5,
  plant_reproduction_base_cap: 800,
  plant_reproduction_high_coverage_threshold: 0.6,
  plant_reproduction_medium_coverage_threshold: 0.4,
  plant_reproduction_high_coverage_factor: 0.25,
  plant_reproduction_medium_coverage_factor: 0.5,
  plant_offspring_max_spread: 3,
  plant_offspring_harsh_root_chance: 0.4,
  plant_offspring_mountain_root_chance: 0.25,

  // Flora — water stress
  water_stress_threshold: 20,
  water_stress_severe_threshold: 30,
  water_stress_death_rate: 0.001,
  water_stress_severe_multiplier: 2.0,
  water_stress_high_affinity_multiplier: 1.5,
  plant_water_far_threshold: 25,
  plant_water_growth_modifiers: {
    near: 1.3,
    lowAffinity: 1.0,
    mid: 0.8,
    farHighAffinity: 0.5,
    farMediumAffinity: 0.7,
  },
  plant_harsh_terrain_death_multiplier: {
    default: 1.0,
    rock: 1.5,
    mountain: 2.0,
  },

  // Flora — seasons
  season_length_days: 14,
  season_growth_multiplier: [1.2, 1.0, 0.8, 0.5],
  season_reproduction_multiplier: [1.5, 1.0, 0.7, 0.2],
  season_death_multiplier: [0.8, 1.0, 1.2, 2.0],

  // Climate — temperature model (sazonal + ciclo diário determinístico)
  // Base temperature (°C) per season: [Spring, Summer, Autumn, Winter]
  temperature_base: [15, 25, 12, 0],
  // Daily amplitude (°C) per season — peak at solar noon, trough around dawn
  temperature_amplitude: [8, 10, 7, 5],
  // Range within which plants grow at full efficiency
  temperature_optimal_min: 10,   // °C
  temperature_optimal_max: 30,   // °C
  // Outer bounds — beyond these, growth efficiency ramps toward a minimum
  temperature_growth_min: 2,     // °C — cold penalty starts below this
  temperature_growth_max: 40,    // °C — heat penalty starts above this
  // Death rate boost thresholds
  temperature_death_cold_threshold: 4,  // °C — frost mortality starts below this
  temperature_death_heat_threshold: 35, // °C — heat mortality starts above this

  // Ground items — decay durations computed in createSimulationConfig from game-minute constants
  item_drop_radius_animal: 2,         // tile radius for radial meat scatter on death
  item_drop_radius_plant: 2,          // tile radius for radial fruit/seed scatter on reproduction
  item_max_changes_per_tick: 2000,    // cap for itemChanges delta array per tick

  // Fauna — global population budget distributed proportionally per species (0 = use base caps)
  max_animal_population: 10000,
  initial_population_fraction: 0.1,
  hunger_multiplier: 1.6,
  thirst_multiplier: 1.6,
  supervisor_enabled: true,
  supervisor_sample_limit: 5,

  // Fauna — derived from animalSpecies.js
  initial_animal_counts: normalizeAnimalCountsToBudget(
    buildProportionalAnimalCounts(0.1 * 10000, 10000),
    10000,
  ),
};

export function createSimulationConfig(overrides = {}) {
  const merged = { ...BASE_CONFIG, ...overrides };
  const ticksPerDay = Number.isFinite(merged.ticks_per_day) && merged.ticks_per_day > 0
    ? merged.ticks_per_day
    : DEFAULT_TICKS_PER_DAY;
  const ticksPerGameMinute = resolveTicksPerGameMinute(ticksPerDay);

  return {
    ...merged,
    ticks_per_day: ticksPerDay,
    ticks_per_game_minute: ticksPerGameMinute,
    pathfinding_cache_ttl: merged.pathfinding_cache_ttl ?? gameMinutesToTicks(PATHFINDING_CACHE_TTL, ticksPerGameMinute),
    threat_cache_ttl: merged.threat_cache_ttl ?? gameMinutesToTicks(THREAT_CACHE_TTL, ticksPerGameMinute),
    threat_scan_cooldown_ticks: merged.threat_scan_cooldown_ticks ?? gameMinutesToTicks(THREAT_SCAN_COOLDOWN, ticksPerGameMinute),
    scavenge_decay_ticks: merged.scavenge_decay_ticks ?? gameMinutesToTicks(SCAVENGE_DECAY_WINDOW, ticksPerGameMinute),
    supervisor_full_audit_interval_ticks: merged.supervisor_full_audit_interval_ticks ?? gameMinutesToTicks(SUPERVISOR_FULL_AUDIT_INTERVAL, ticksPerGameMinute),
    supervisor_log_cooldown_ticks: merged.supervisor_log_cooldown_ticks ?? gameMinutesToTicks(SUPERVISOR_LOG_COOLDOWN, ticksPerGameMinute),
    flee_lock_ticks: merged.flee_lock_ticks ?? gameMinutesToTicks(FLEE_LOCK_MINUTES, ticksPerGameMinute),
    chase_lock_ticks: merged.chase_lock_ticks ?? gameMinutesToTicks(CHASE_LOCK_MINUTES, ticksPerGameMinute),
    water_lock_ticks: merged.water_lock_ticks ?? gameMinutesToTicks(WATER_LOCK_MINUTES, ticksPerGameMinute),
    plant_lock_ticks: merged.plant_lock_ticks ?? gameMinutesToTicks(PLANT_LOCK_MINUTES, ticksPerGameMinute),
    item_meat_decay_ticks: merged.item_meat_decay_ticks ?? gameMinutesToTicks(ITEM_MEAT_DECAY, ticksPerGameMinute),
    item_fruit_to_seed_ticks: merged.item_fruit_to_seed_ticks ?? gameMinutesToTicks(ITEM_FRUIT_TO_SEED, ticksPerGameMinute),
    item_seed_germination_ticks: merged.item_seed_germination_ticks ?? gameMinutesToTicks(ITEM_SEED_GERMINATION, ticksPerGameMinute),
    animal_species: merged.animal_species ?? buildAnimalSpeciesConfig(ticksPerGameMinute),
    plant_stage_ages: merged.plant_stage_ages ?? buildStageAges(ticksPerGameMinute),
    plant_fruit_spoil_ages: merged.plant_fruit_spoil_ages ?? buildFruitSpoilAges(ticksPerGameMinute),
    plant_production_chances: merged.plant_production_chances ?? buildProductionChances(ticksPerGameMinute),
    plant_dirt_death_chance_by_stage: merged.plant_dirt_death_chance_by_stage
      ? Object.fromEntries(Object.entries(merged.plant_dirt_death_chance_by_stage).map(([k, v]) => [k, scaleRateForTicks(v, ticksPerGameMinute)]))
      : Object.fromEntries(Object.entries(BASE_CONFIG.plant_dirt_death_chance_by_stage).map(([k, v]) => [k, scaleRateForTicks(v, ticksPerGameMinute)])),
    water_stress_death_rate: scaleRateForTicks(merged.water_stress_death_rate ?? BASE_CONFIG.water_stress_death_rate, ticksPerGameMinute),
  };
}

export const DEFAULT_CONFIG = createSimulationConfig();

/**
 * Renderer configuration (separate from simulation to keep engine worker-safe).
 */
export const RENDERER_CONFIG = {
  // Set to true to use GPU-shader terrain rendering (Phase 2).
  // Falls back to CPU pixel buffer when false or when WebGL2 is unavailable.
  useGPUTerrain: true,
  // When true, the GPU terrain shader is rendered once to an offscreen texture
  // and displayed as a static sprite.  This eliminates per-frame shader cost
  // for large worlds.  Water animation uses periodic re-renders instead of
  // per-frame shader updates.  Set to false if terrain changes frequently.
  cacheStaticTerrain: true,
  // Pixels per tile for the cached terrain texture.
  // Higher = richer sub-tile textures but larger VRAM usage.
  // 8 is a good balance; capped automatically if the result exceeds GPU limits.
  cacheResolution: 8,
  // Interval (in render frames) between water-animation re-renders when
  // cacheStaticTerrain is active.  Lower = smoother water, higher = cheaper.
  // Only used when cacheStaticTerrain is true.  0 = disable water animation.
  cachedWaterAnimInterval: 30,
};
