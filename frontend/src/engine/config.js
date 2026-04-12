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

  // Fauna — derived from animalSpecies.js
  initial_animal_counts: buildInitialAnimalCounts(),
  animal_species: buildAnimalSpeciesConfig(),
};
