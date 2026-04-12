/**
 * Animal species library — canonical registry of all animal species.
 *
 * Each entry defines the species' simulation parameters, display info,
 * and default initial count. config.js derives its fauna config from here.
 */

const ANIMAL_SPECIES = {
  RABBIT: {
    id: 'RABBIT',
    name: 'Rabbit',
    emoji: '🐰',
    diet: 'HERBIVORE',
    reproduction: 'SEXUAL',
    color: 0x66cc66,
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
    initial_count: 100,
    max_population: 5000,
    decision_interval: 2,
  },

  SQUIRREL: {
    id: 'SQUIRREL',
    name: 'Squirrel',
    emoji: '🐿️',
    diet: 'HERBIVORE',
    reproduction: 'SEXUAL',
    color: 0xcc8844,
    speed: 1,
    vision_range: 9,
    max_energy: 80,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 1100,
    mature_age: 80,
    life_stage_ages: [25, 50, 80],
    attack_power: 1,
    defense: 1,
    energy_costs: {
      IDLE: 0.02, WALK: 0.1, RUN: 0.4,
      EAT: 0.05, DRINK: 0.05, SLEEP: -2.8,
      ATTACK: 0.6, MATE: 1.5, FLEE: 0.35,
    },
    hunger_rate: 0.13,
    thirst_rate: 0.13,
    initial_count: 60,
    max_population: 5000,
    decision_interval: 2,
  },

  BEETLE: {
    id: 'BEETLE',
    name: 'Beetle',
    emoji: '🪲',
    diet: 'HERBIVORE',
    reproduction: 'SEXUAL',
    color: 0x556633,
    speed: 1,
    vision_range: 5,
    max_energy: 60,
    max_hunger: 80,
    max_thirst: 80,
    max_age: 800,
    mature_age: 60,
    life_stage_ages: [15, 35, 60],
    attack_power: 1,
    defense: 4,
    energy_costs: {
      IDLE: 0.01, WALK: 0.06, RUN: 0.2,
      EAT: 0.03, DRINK: 0.03, SLEEP: -2.0,
      ATTACK: 0.4, MATE: 0.8, FLEE: 0.2,
    },
    hunger_rate: 0.07,
    thirst_rate: 0.08,
    initial_count: 80,
    max_population: 5000,
    decision_interval: 3,
  },

  GOAT: {
    id: 'GOAT',
    name: 'Goat',
    emoji: '🐐',
    diet: 'HERBIVORE',
    reproduction: 'SEXUAL',
    color: 0xbbbbbb,
    speed: 1,
    vision_range: 10,
    max_energy: 140,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 2000,
    mature_age: 200,
    life_stage_ages: [60, 120, 200],
    attack_power: 3,
    defense: 5,
    energy_costs: {
      IDLE: 0.03, WALK: 0.14, RUN: 0.45,
      EAT: 0.08, DRINK: 0.08, SLEEP: -3.5,
      ATTACK: 1.5, MATE: 2.0, FLEE: 0.5,
    },
    hunger_rate: 0.10,
    thirst_rate: 0.12,
    initial_count: 40,
    max_population: 5000,
    decision_interval: 2,
  },

  DEER: {
    id: 'DEER',
    name: 'Deer',
    emoji: '🦌',
    diet: 'HERBIVORE',
    reproduction: 'SEXUAL',
    color: 0xcc9955,
    speed: 2,
    vision_range: 12,
    max_energy: 130,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 1800,
    mature_age: 160,
    life_stage_ages: [50, 100, 160],
    attack_power: 2,
    defense: 3,
    energy_costs: {
      IDLE: 0.03, WALK: 0.12, RUN: 0.4,
      EAT: 0.06, DRINK: 0.06, SLEEP: -3.0,
      ATTACK: 1.2, MATE: 2.0, FLEE: 0.4,
    },
    hunger_rate: 0.11,
    thirst_rate: 0.13,
    initial_count: 40,
    max_population: 5000,
    decision_interval: 2,
  },

  FOX: {
    id: 'FOX',
    name: 'Fox',
    emoji: '🦊',
    diet: 'CARNIVORE',
    reproduction: 'SEXUAL',
    color: 0xdd8833,
    speed: 2,
    vision_range: 12,
    max_energy: 120,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 1400,
    mature_age: 160,
    life_stage_ages: [50, 100, 160],
    attack_power: 6,
    defense: 4,
    energy_costs: {
      IDLE: 0.03, WALK: 0.14, RUN: 0.5,
      EAT: 0.06, DRINK: 0.06, SLEEP: -3.0,
      ATTACK: 1.5, MATE: 2.0, FLEE: 0.5,
    },
    hunger_rate: 0.14,
    thirst_rate: 0.12,
    initial_count: 32,
    max_population: 5000,
    decision_interval: 2,
  },

  WOLF: {
    id: 'WOLF',
    name: 'Wolf',
    emoji: '🐺',
    diet: 'CARNIVORE',
    reproduction: 'SEXUAL',
    color: 0xdd4444,
    speed: 2,
    vision_range: 14,
    max_energy: 150,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 1600,
    mature_age: 200,
    life_stage_ages: [60, 120, 200],
    attack_power: 9,
    defense: 6,
    energy_costs: {
      IDLE: 0.04, WALK: 0.15, RUN: 0.55,
      EAT: 0.08, DRINK: 0.08, SLEEP: -3.5,
      ATTACK: 2.0, MATE: 2.5, FLEE: 0.6,
    },
    hunger_rate: 0.16,
    thirst_rate: 0.12,
    initial_count: 20,
    max_population: 5000,
    decision_interval: 2,
  },

  BOAR: {
    id: 'BOAR',
    name: 'Boar',
    emoji: '🐗',
    diet: 'OMNIVORE',
    reproduction: 'SEXUAL',
    color: 0x885533,
    speed: 1,
    vision_range: 10,
    max_energy: 140,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 1600,
    mature_age: 180,
    life_stage_ages: [55, 110, 180],
    attack_power: 5,
    defense: 5,
    energy_costs: {
      IDLE: 0.03, WALK: 0.13, RUN: 0.45,
      EAT: 0.07, DRINK: 0.07, SLEEP: -3.2,
      ATTACK: 1.5, MATE: 2.0, FLEE: 0.5,
    },
    hunger_rate: 0.13,
    thirst_rate: 0.11,
    initial_count: 30,
    max_population: 5000,
    decision_interval: 2,
  },

  BEAR: {
    id: 'BEAR',
    name: 'Bear',
    emoji: '🐻',
    diet: 'OMNIVORE',
    reproduction: 'SEXUAL',
    color: 0x8B4513,
    speed: 1,
    vision_range: 12,
    max_energy: 180,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 2200,
    mature_age: 250,
    life_stage_ages: [75, 150, 250],
    attack_power: 10,
    defense: 8,
    energy_costs: {
      IDLE: 0.04, WALK: 0.16, RUN: 0.6,
      EAT: 0.10, DRINK: 0.10, SLEEP: -4.0,
      ATTACK: 2.5, MATE: 3.0, FLEE: 0.7,
    },
    hunger_rate: 0.15,
    thirst_rate: 0.10,
    initial_count: 12,
    max_population: 5000,
    decision_interval: 3,
  },

  RACCOON: {
    id: 'RACCOON',
    name: 'Raccoon',
    emoji: '🦝',
    diet: 'OMNIVORE',
    reproduction: 'SEXUAL',
    color: 0x778899,
    speed: 1,
    vision_range: 9,
    max_energy: 90,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 1200,
    mature_age: 100,
    life_stage_ages: [30, 60, 100],
    attack_power: 3,
    defense: 3,
    energy_costs: {
      IDLE: 0.02, WALK: 0.10, RUN: 0.35,
      EAT: 0.05, DRINK: 0.05, SLEEP: -2.8,
      ATTACK: 0.9, MATE: 1.5, FLEE: 0.35,
    },
    hunger_rate: 0.13,
    thirst_rate: 0.12,
    initial_count: 25,
    max_population: 5000,
    decision_interval: 2,
  },

  CROW: {
    id: 'CROW',
    name: 'Crow',
    emoji: '🐦‍⬛',
    diet: 'OMNIVORE',
    reproduction: 'SEXUAL',
    color: 0x333344,
    speed: 2,
    vision_range: 14,
    max_energy: 70,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 1000,
    mature_age: 80,
    life_stage_ages: [25, 50, 80],
    attack_power: 2,
    defense: 1,
    energy_costs: {
      IDLE: 0.02, WALK: 0.08, RUN: 0.3,
      EAT: 0.04, DRINK: 0.04, SLEEP: -2.5,
      ATTACK: 0.6, MATE: 1.2, FLEE: 0.25,
    },
    hunger_rate: 0.12,
    thirst_rate: 0.11,
    initial_count: 35,
    max_population: 5000,
    decision_interval: 2,
  },
};

/** Ordered list of all species keys */
export const ALL_ANIMAL_IDS = Object.keys(ANIMAL_SPECIES);

/** Only herbivore keys */
export const HERBIVORE_IDS = ALL_ANIMAL_IDS.filter(k => ANIMAL_SPECIES[k].diet === 'HERBIVORE');

/** Only carnivore keys */
export const CARNIVORE_IDS = ALL_ANIMAL_IDS.filter(k => ANIMAL_SPECIES[k].diet === 'CARNIVORE');

/** Only omnivore keys */
export const OMNIVORE_IDS = ALL_ANIMAL_IDS.filter(k => ANIMAL_SPECIES[k].diet === 'OMNIVORE');

/**
 * Build the `animal_species` config object (without display-only fields).
 */
export function buildAnimalSpeciesConfig() {
  const cfg = {};
  for (const [key, sp] of Object.entries(ANIMAL_SPECIES)) {
    const { id, name, color, initial_count, ...simParams } = sp;
    cfg[key] = simParams;
  }
  return cfg;
}

/**
 * Build `decision_intervals` map: species → ticks between full AI evaluations.
 */
export function buildDecisionIntervals() {
  const intervals = {};
  for (const [key, sp] of Object.entries(ANIMAL_SPECIES)) {
    intervals[key] = sp.decision_interval || 2;
  }
  return intervals;
}

/**
 * Build `initial_animal_counts` from each species' default.
 */
export function buildInitialAnimalCounts() {
  const counts = {};
  for (const [key, sp] of Object.entries(ANIMAL_SPECIES)) {
    counts[key] = sp.initial_count;
  }
  return counts;
}

export default ANIMAL_SPECIES;
