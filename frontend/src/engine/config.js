/**
 * Default simulation configuration.
 */
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

  // Fauna
  initial_herbivore_count: 50,
  initial_carnivore_count: 15,
  animal_species: {
    HERBIVORE: {
      speed: 1,
      vision_range: 8,
      max_energy: 100,
      max_hunger: 100,
      max_thirst: 100,
      max_age: 1500,
      mature_age: 200,
      attack_power: 2,
      defense: 3,
      energy_costs: {
        IDLE: 0.05, WALK: 0.25, RUN: 0.75,
        EAT: 0.15, DRINK: 0.15, SLEEP: -2.0,
        ATTACK: 1.5, MATE: 2.5, FLEE: 0.75,
      },
      hunger_rate: 0.15,
      thirst_rate: 0.2,
    },
    CARNIVORE: {
      speed: 2,
      vision_range: 12,
      max_energy: 120,
      max_hunger: 100,
      max_thirst: 100,
      max_age: 1200,
      mature_age: 250,
      attack_power: 8,
      defense: 5,
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
