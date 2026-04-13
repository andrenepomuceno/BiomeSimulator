/**
 * Default simulation configuration.
 */
import { buildAnimalSpeciesConfig, buildInitialAnimalCounts } from './animalSpecies.js';

// Sex types
export const SEX_MALE = 'MALE';
export const SEX_FEMALE = 'FEMALE';
export const SEX_ASEXUAL = 'ASEXUAL';
export const SEX_HERMAPHRODITE = 'HERMAPHRODITE';

// Reproduction modes
export const REPRO_SEXUAL = 'SEXUAL';         // requires male + female
export const REPRO_ASEXUAL = 'ASEXUAL';       // reproduces alone
export const REPRO_HERMAPHRODITE = 'HERMAPHRODITE'; // any two can mate

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
  ticks_per_day: 200,
  day_fraction: 0.6,

  // Flora
  initial_plant_density: 0.10,
  water_proximity_threshold: 10,

  // Flora — local density competition
  plant_crowding_growth_penalty: 0.7,
  plant_density_suppress_threshold: 0.7,
  plant_density_reduce_threshold: 0.5,

  // Flora — water stress
  water_stress_threshold: 20,
  water_stress_severe_threshold: 30,
  water_stress_death_rate: 0.001,

  // Flora — seasons
  season_length_days: 30,

  // Fauna — global population budget distributed proportionally per species (0 = use base caps)
  max_animal_population: 5000,

  // Fauna — derived from animalSpecies.js
  initial_animal_counts: buildInitialAnimalCounts(),
  animal_species: buildAnimalSpeciesConfig(),
};
