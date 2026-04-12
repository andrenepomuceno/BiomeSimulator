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
      vision_range: 6,
      max_energy: 80,
      max_hunger: 100,
      max_thirst: 100,
      max_age: 1000,
      mature_age: 120,
      attack_power: 1,
      defense: 2,
      energy_costs: {
        IDLE: 0.04, WALK: 0.2, RUN: 0.6,
        EAT: 0.1, DRINK: 0.1, SLEEP: -2.0,
        ATTACK: 1.0, MATE: 2.0, FLEE: 0.6,
      },
      hunger_rate: 0.18,
      thirst_rate: 0.22,
    },
    SQUIRREL: {
      diet: 'HERBIVORE',
      reproduction: REPRO_SEXUAL,
      emoji: '🐿️',
      speed: 1,
      vision_range: 7,
      max_energy: 70,
      max_hunger: 100,
      max_thirst: 100,
      max_age: 900,
      mature_age: 100,
      attack_power: 1,
      defense: 1,
      energy_costs: {
        IDLE: 0.04, WALK: 0.2, RUN: 0.65,
        EAT: 0.1, DRINK: 0.1, SLEEP: -1.8,
        ATTACK: 0.8, MATE: 2.0, FLEE: 0.6,
      },
      hunger_rate: 0.2,
      thirst_rate: 0.2,
    },
    BEETLE: {
      diet: 'HERBIVORE',
      reproduction: REPRO_SEXUAL,
      emoji: '🪲',
      speed: 1,
      vision_range: 4,
      max_energy: 50,
      max_hunger: 80,
      max_thirst: 80,
      max_age: 600,
      mature_age: 80,
      attack_power: 1,
      defense: 4,
      energy_costs: {
        IDLE: 0.02, WALK: 0.12, RUN: 0.35,
        EAT: 0.05, DRINK: 0.05, SLEEP: -1.5,
        ATTACK: 0.5, MATE: 1.2, FLEE: 0.3,
      },
      hunger_rate: 0.1,
      thirst_rate: 0.12,
    },
    GOAT: {
      diet: 'HERBIVORE',
      reproduction: REPRO_SEXUAL,
      emoji: '🐐',
      speed: 1,
      vision_range: 8,
      max_energy: 120,
      max_hunger: 100,
      max_thirst: 100,
      max_age: 1800,
      mature_age: 250,
      attack_power: 3,
      defense: 5,
      energy_costs: {
        IDLE: 0.06, WALK: 0.28, RUN: 0.8,
        EAT: 0.15, DRINK: 0.15, SLEEP: -2.2,
        ATTACK: 2.0, MATE: 3.0, FLEE: 0.8,
      },
      hunger_rate: 0.15,
      thirst_rate: 0.18,
    },
    DEER: {
      diet: 'HERBIVORE',
      reproduction: REPRO_SEXUAL,
      emoji: '🦌',
      speed: 2,
      vision_range: 10,
      max_energy: 110,
      max_hunger: 100,
      max_thirst: 100,
      max_age: 1500,
      mature_age: 200,
      attack_power: 2,
      defense: 3,
      energy_costs: {
        IDLE: 0.05, WALK: 0.25, RUN: 0.7,
        EAT: 0.12, DRINK: 0.12, SLEEP: -2.0,
        ATTACK: 1.5, MATE: 2.5, FLEE: 0.7,
      },
      hunger_rate: 0.16,
      thirst_rate: 0.2,
    },
    FOX: {
      diet: 'CARNIVORE',
      reproduction: REPRO_SEXUAL,
      emoji: '🦊',
      speed: 2,
      vision_range: 10,
      max_energy: 100,
      max_hunger: 100,
      max_thirst: 100,
      max_age: 1200,
      mature_age: 200,
      attack_power: 6,
      defense: 4,
      energy_costs: {
        IDLE: 0.06, WALK: 0.28, RUN: 0.9,
        EAT: 0.12, DRINK: 0.12, SLEEP: -2.2,
        ATTACK: 2.0, MATE: 2.5, FLEE: 0.9,
      },
      hunger_rate: 0.22,
      thirst_rate: 0.18,
    },
    WOLF: {
      diet: 'CARNIVORE',
      reproduction: REPRO_SEXUAL,
      emoji: '🐺',
      speed: 2,
      vision_range: 12,
      max_energy: 130,
      max_hunger: 100,
      max_thirst: 100,
      max_age: 1400,
      mature_age: 250,
      attack_power: 9,
      defense: 6,
      energy_costs: {
        IDLE: 0.08, WALK: 0.3, RUN: 1.0,
        EAT: 0.15, DRINK: 0.15, SLEEP: -2.5,
        ATTACK: 2.5, MATE: 3.0, FLEE: 1.0,
      },
      hunger_rate: 0.25,
      thirst_rate: 0.18,
    },
  },
};
