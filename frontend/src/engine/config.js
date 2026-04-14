/**
 * Default simulation configuration.
 */
import { buildAnimalSpeciesConfig, buildInitialAnimalCounts } from './animalSpecies.js';
import { buildInitialPlantCounts } from './plantSpecies.js';

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

export const DEFAULT_CONFIG = {
  // Map generation
  map_width: 500,
  map_height: 500,
  sea_level: 0.38,
  island_count: 5,
  island_size_factor: 0.3,
  seed: null, // null = random

  // Simulation
  ticks_per_second: 20,
  ticks_per_day: 260,
  day_fraction: 0.6,
  pathfinding_cache_ttl: 15,
  threat_cache_ttl: 4,
  threat_scan_cooldown_ticks: 2,
  animal_global_vision_multiplier: 1.2,
  night_vision_reduction_factor: 0.65,
  nocturnal_day_vision_factor: 0.8,
  sleep_threshold_offset_wrong_period: 10,  // Additional energy threshold during wrong time of day (diurnal at night, nocturnal at day)
  activity_energy_penalty_wrong_period: 1.3, // Multiplier for energy costs during wrong time of day
  scavenge_decay_ticks: 100,

  // Flora
  initial_plant_density: 0.10,
  initial_plant_counts: buildInitialPlantCounts(),
  water_proximity_threshold: 10,
  plant_spawn_water_thresholds: { near: 5, mid: 15 },
  initial_plant_stage_distribution: [0.25, 0.25, 0.25, 0.25],
  initial_plant_adult_age_fraction: 0.3,
  plant_tick_phases: 4,
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
  season_length_days: 30,
  season_growth_multiplier: [1.2, 1.0, 0.8, 0.5],
  season_reproduction_multiplier: [1.5, 1.0, 0.7, 0.2],
  season_death_multiplier: [0.8, 1.0, 1.2, 2.0],

  // Fauna — global population budget distributed proportionally per species (0 = use base caps)
  max_animal_population: 5000,
  hunger_multiplier: 1.6,
  thirst_multiplier: 1.6,
  supervisor_enabled: true,
  supervisor_full_audit_interval_ticks: 30,
  supervisor_sample_limit: 5,
  supervisor_log_cooldown_ticks: 120,

  // Fauna — derived from animalSpecies.js
  initial_animal_counts: buildInitialAnimalCounts(),
  animal_species: buildAnimalSpeciesConfig(),
};
