/**
 * Default simulation configuration.
 */

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
  ticks_per_second: 10,
  ticks_per_day: 200,
  day_fraction: 0.6,

  // Flora
  initial_plant_density: 0.15,
  water_proximity_threshold: 10,

  // Fauna — per-species initial counts
  initial_animal_counts: {
    RABBIT: 25,
    SQUIRREL: 15,
    BEETLE: 20,
    GOAT: 10,
    DEER: 10,
    FOX: 8,
    WOLF: 5,
  },

  animal_species: {
    RABBIT: {
      diet: 'HERBIVORE',
      reproduction: REPRO_SEXUAL,
      emoji: '🐰',
      speed: 1,
      vision_range: 8,
      max_energy: 90,
      max_hunger: 100,
      max_thirst: 100,
      max_age: 1200,
      mature_age: 100,
      attack_power: 1,
      defense: 2,
      energy_costs: {
        IDLE: 0.02, WALK: 0.1, RUN: 0.35,
        EAT: 0.05, DRINK: 0.05, SLEEP: -3.0,
        ATTACK: 0.8, MATE: 1.5, FLEE: 0.35,
      },
      hunger_rate: 0.12,
      thirst_rate: 0.14,
    },
    SQUIRREL: {
      diet: 'HERBIVORE',
      reproduction: REPRO_SEXUAL,
      emoji: '🐿️',
      speed: 1,
      vision_range: 9,
      max_energy: 80,
      max_hunger: 100,
      max_thirst: 100,
      max_age: 1100,
      mature_age: 80,
      attack_power: 1,
      defense: 1,
      energy_costs: {
        IDLE: 0.02, WALK: 0.1, RUN: 0.4,
        EAT: 0.05, DRINK: 0.05, SLEEP: -2.8,
        ATTACK: 0.6, MATE: 1.5, FLEE: 0.35,
      },
      hunger_rate: 0.13,
      thirst_rate: 0.13,
    },
    BEETLE: {
      diet: 'HERBIVORE',
      reproduction: REPRO_SEXUAL,
      emoji: '🪲',
      speed: 1,
      vision_range: 5,
      max_energy: 60,
      max_hunger: 80,
      max_thirst: 80,
      max_age: 800,
      mature_age: 60,
      attack_power: 1,
      defense: 4,
      energy_costs: {
        IDLE: 0.01, WALK: 0.06, RUN: 0.2,
        EAT: 0.03, DRINK: 0.03, SLEEP: -2.0,
        ATTACK: 0.4, MATE: 0.8, FLEE: 0.2,
      },
      hunger_rate: 0.07,
      thirst_rate: 0.08,
    },
    GOAT: {
      diet: 'HERBIVORE',
      reproduction: REPRO_SEXUAL,
      emoji: '🐐',
      speed: 1,
      vision_range: 10,
      max_energy: 140,
      max_hunger: 100,
      max_thirst: 100,
      max_age: 2000,
      mature_age: 200,
      attack_power: 3,
      defense: 5,
      energy_costs: {
        IDLE: 0.03, WALK: 0.14, RUN: 0.45,
        EAT: 0.08, DRINK: 0.08, SLEEP: -3.5,
        ATTACK: 1.5, MATE: 2.0, FLEE: 0.5,
      },
      hunger_rate: 0.10,
      thirst_rate: 0.12,
    },
    DEER: {
      diet: 'HERBIVORE',
      reproduction: REPRO_SEXUAL,
      emoji: '🦌',
      speed: 2,
      vision_range: 12,
      max_energy: 130,
      max_hunger: 100,
      max_thirst: 100,
      max_age: 1800,
      mature_age: 160,
      attack_power: 2,
      defense: 3,
      energy_costs: {
        IDLE: 0.03, WALK: 0.12, RUN: 0.4,
        EAT: 0.06, DRINK: 0.06, SLEEP: -3.0,
        ATTACK: 1.2, MATE: 2.0, FLEE: 0.4,
      },
      hunger_rate: 0.11,
      thirst_rate: 0.13,
    },
    FOX: {
      diet: 'CARNIVORE',
      reproduction: REPRO_SEXUAL,
      emoji: '🦊',
      speed: 2,
      vision_range: 12,
      max_energy: 120,
      max_hunger: 100,
      max_thirst: 100,
      max_age: 1400,
      mature_age: 160,
      attack_power: 6,
      defense: 4,
      energy_costs: {
        IDLE: 0.03, WALK: 0.14, RUN: 0.5,
        EAT: 0.06, DRINK: 0.06, SLEEP: -3.0,
        ATTACK: 1.5, MATE: 2.0, FLEE: 0.5,
      },
      hunger_rate: 0.14,
      thirst_rate: 0.12,
    },
    WOLF: {
      diet: 'CARNIVORE',
      reproduction: REPRO_SEXUAL,
      emoji: '🐺',
      speed: 2,
      vision_range: 14,
      max_energy: 150,
      max_hunger: 100,
      max_thirst: 100,
      max_age: 1600,
      mature_age: 200,
      attack_power: 9,
      defense: 6,
      energy_costs: {
        IDLE: 0.04, WALK: 0.15, RUN: 0.55,
        EAT: 0.08, DRINK: 0.08, SLEEP: -3.5,
        ATTACK: 2.0, MATE: 2.5, FLEE: 0.6,
      },
      hunger_rate: 0.16,
      thirst_rate: 0.12,
    },
  },
};
