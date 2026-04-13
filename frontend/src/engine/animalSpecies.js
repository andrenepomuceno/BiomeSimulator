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
    vision_range: 10,
    max_energy: 100,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 1400,
    mature_age: 80,
    attack_power: 1,
    defense: 2,
    energy_costs: {
      IDLE: 0.01, WALK: 0.05, RUN: 0.18,
      EAT: 0.02, DRINK: 0.02, SLEEP: -4.0,
      ATTACK: 0.5, MATE: 1.0, FLEE: 0.2,
    },
    hunger_rate: 0.06,
    thirst_rate: 0.07,
    initial_count: 100,
    max_population: 2000,
    mate_cooldown: 40,
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
    vision_range: 11,
    max_energy: 90,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 1300,
    mature_age: 70,
    life_stage_ages: [20, 45, 70],
    attack_power: 1,
    defense: 1,
    energy_costs: {
      IDLE: 0.01, WALK: 0.05, RUN: 0.2,
      EAT: 0.02, DRINK: 0.02, SLEEP: -3.5,
      ATTACK: 0.4, MATE: 1.0, FLEE: 0.2,
    },
    hunger_rate: 0.065,
    thirst_rate: 0.065,
    initial_count: 60,
    max_population: 2000,
    mate_cooldown: 40,
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
    vision_range: 7,
    max_energy: 70,
    max_hunger: 80,
    max_thirst: 80,
    max_age: 1000,
    mature_age: 50,
    life_stage_ages: [12, 30, 50],
    attack_power: 1,
    defense: 4,
    energy_costs: {
      IDLE: 0.005, WALK: 0.03, RUN: 0.1,
      EAT: 0.01, DRINK: 0.01, SLEEP: -2.5,
      ATTACK: 0.3, MATE: 0.5, FLEE: 0.12,
    },
    hunger_rate: 0.04,
    thirst_rate: 0.045,
    initial_count: 80,
    max_population: 2000,
    mate_cooldown: 35,
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
    vision_range: 12,
    max_energy: 150,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 2200,
    mature_age: 150,
    life_stage_ages: [45, 90, 150],
    attack_power: 3,
    defense: 5,
    energy_costs: {
      IDLE: 0.015, WALK: 0.07, RUN: 0.25,
      EAT: 0.04, DRINK: 0.04, SLEEP: -4.5,
      ATTACK: 1.0, MATE: 1.2, FLEE: 0.28,
    },
    hunger_rate: 0.075,
    thirst_rate: 0.06,
    initial_count: 35,
    max_population: 1500,
    mate_cooldown: 80,
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
    vision_range: 14,
    max_energy: 140,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 2000,
    mature_age: 120,
    life_stage_ages: [35, 75, 120],
    attack_power: 2,
    defense: 3,
    energy_costs: {
      IDLE: 0.015, WALK: 0.06, RUN: 0.22,
      EAT: 0.03, DRINK: 0.03, SLEEP: -4.0,
      ATTACK: 0.8, MATE: 1.2, FLEE: 0.22,
    },
    hunger_rate: 0.07,
    thirst_rate: 0.065,
    initial_count: 35,
    max_population: 1500,
    mate_cooldown: 70,
    decision_interval: 2,
  },

  FOX: {
    id: 'FOX',
    name: 'Fox',
    emoji: '🦊',
    nocturnal: true,
    diet: 'CARNIVORE',
    reproduction: 'SEXUAL',
    color: 0xdd8833,
    speed: 2,
    vision_range: 14,
    max_energy: 130,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 1600,
    mature_age: 120,
    life_stage_ages: [35, 75, 120],
    attack_power: 6,
    defense: 4,
    energy_costs: {
      IDLE: 0.015, WALK: 0.07, RUN: 0.28,
      EAT: 0.03, DRINK: 0.03, SLEEP: -4.0,
      ATTACK: 1.0, MATE: 1.2, FLEE: 0.28,
    },
    hunger_rate: 0.06,
    thirst_rate: 0.06,
    initial_count: 28,
    max_population: 1500,
    mate_cooldown: 60,
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
    vision_range: 16,
    max_energy: 160,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 1800,
    mature_age: 150,
    life_stage_ages: [45, 90, 150],
    attack_power: 9,
    defense: 6,
    energy_costs: {
      IDLE: 0.02, WALK: 0.08, RUN: 0.3,
      EAT: 0.04, DRINK: 0.04, SLEEP: -4.5,
      ATTACK: 1.3, MATE: 1.5, FLEE: 0.35,
    },
    hunger_rate: 0.065,
    thirst_rate: 0.06,
    initial_count: 20,
    max_population: 1200,
    mate_cooldown: 80,
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
    vision_range: 12,
    max_energy: 150,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 1800,
    mature_age: 130,
    life_stage_ages: [40, 80, 130],
    attack_power: 5,
    defense: 5,
    energy_costs: {
      IDLE: 0.015, WALK: 0.07, RUN: 0.25,
      EAT: 0.04, DRINK: 0.04, SLEEP: -4.0,
      ATTACK: 1.0, MATE: 1.2, FLEE: 0.28,
    },
    hunger_rate: 0.065,
    thirst_rate: 0.055,
    initial_count: 30,
    max_population: 1500,
    mate_cooldown: 65,
    decision_interval: 2,
  },

  BEAR: {
    id: 'BEAR',
    name: 'Bear',
    emoji: '🐻',
    nocturnal: true,
    diet: 'OMNIVORE',
    reproduction: 'SEXUAL',
    color: 0x8B4513,
    speed: 1,
    vision_range: 14,
    max_energy: 200,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 2500,
    mature_age: 180,
    life_stage_ages: [55, 110, 180],
    attack_power: 10,
    defense: 8,
    energy_costs: {
      IDLE: 0.02, WALK: 0.08, RUN: 0.32,
      EAT: 0.05, DRINK: 0.05, SLEEP: -5.0,
      ATTACK: 1.5, MATE: 1.8, FLEE: 0.4,
    },
    hunger_rate: 0.075,
    thirst_rate: 0.05,
    initial_count: 12,
    max_population: 800,
    mate_cooldown: 90,
    decision_interval: 3,
  },

  RACCOON: {
    id: 'RACCOON',
    name: 'Raccoon',
    emoji: '🦝',
    nocturnal: true,
    diet: 'OMNIVORE',
    reproduction: 'SEXUAL',
    color: 0x778899,
    speed: 1,
    vision_range: 11,
    max_energy: 100,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 1400,
    mature_age: 80,
    life_stage_ages: [25, 50, 80],
    attack_power: 3,
    defense: 3,
    energy_costs: {
      IDLE: 0.01, WALK: 0.05, RUN: 0.18,
      EAT: 0.02, DRINK: 0.02, SLEEP: -3.5,
      ATTACK: 0.6, MATE: 1.0, FLEE: 0.2,
    },
    hunger_rate: 0.065,
    thirst_rate: 0.06,
    initial_count: 25,
    max_population: 1500,
    mate_cooldown: 50,
    decision_interval: 2,
  },

  CROW: {
    id: 'CROW',
    name: 'Crow',
    emoji: '🐦‍⬛',
    nocturnal: true,
    diet: 'OMNIVORE',
    reproduction: 'SEXUAL',
    color: 0x333344,
    speed: 2,
    vision_range: 16,
    max_energy: 80,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 1200,
    mature_age: 60,
    life_stage_ages: [18, 38, 60],
    attack_power: 2,
    defense: 1,
    energy_costs: {
      IDLE: 0.01, WALK: 0.04, RUN: 0.15,
      EAT: 0.02, DRINK: 0.02, SLEEP: -3.0,
      ATTACK: 0.4, MATE: 0.8, FLEE: 0.15,
    },
    hunger_rate: 0.06,
    thirst_rate: 0.055,
    initial_count: 35,
    max_population: 1500,
    mate_cooldown: 45,
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
