/**
 * Animal species library — canonical registry of all animal species.
 *
 * Each entry defines the species' simulation parameters, display info,
 * and default initial count. config.js derives its fauna config from here.
 *
 * Terrain types: WATER=0, SAND=1, DIRT=2, SOIL=3, ROCK=4,
 *   FERTILE_SOIL=5, DEEP_WATER=6, MOUNTAIN=7, MUD=8
 */
import { TERRAIN_IDS } from './world.js';
import { PLANT_IDS } from './plantSpecies.js';

// Population caps by trophic level (food pyramid: prey > mid-predator > apex)
// Tuned for default global cap of 5000 — sum of all species maxes ≈ 5600
const POP_INSECT = 800;       // Numerous small invertebrates (Beetle, Mosquito, Caterpillar)
const POP_SMALL_HERB = 500;   // Fast-breeding small herbivores (Rabbit, Squirrel)
const POP_LARGE_HERB = 300;   // Slower large herbivores (Deer, Goat)
const POP_MID_PRED = 150;     // Mid-level predators (Fox, Snake, Hawk)
const POP_APEX = 80;          // Apex predators (Wolf, Crocodile)
const POP_OMNI_LARGE = 80;    // Large omnivores (Bear)
const POP_OMNI_MED = 300;     // Medium omnivores (Boar, Raccoon, Crow)

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
    max_population: POP_SMALL_HERB,
    mate_cooldown: 28,
    decision_interval: 2,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'FERTILE_SOIL', 'MUD'],
    edible_plants: ['GRASS', 'STRAWBERRY', 'CARROT', 'BLUEBERRY'],
    prey_species: [],
    can_scavenge: false,
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
    max_population: POP_SMALL_HERB,
    mate_cooldown: 32,
    decision_interval: 2,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'FERTILE_SOIL', 'MUD'],
    edible_plants: ['BLUEBERRY', 'APPLE_TREE', 'MANGO_TREE', 'OAK_TREE', 'COCONUT_PALM'],
    prey_species: [],
    can_scavenge: false,
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
    initial_count: 100,
    max_population: POP_INSECT,
    mate_cooldown: 22,
    decision_interval: 3,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'ROCK', 'FERTILE_SOIL', 'MUD'],
    edible_plants: ['GRASS', 'MUSHROOM', 'CARROT'],
    prey_species: [],
    can_scavenge: true,
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
    max_population: POP_LARGE_HERB,
    mate_cooldown: 70,
    decision_interval: 2,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'ROCK', 'FERTILE_SOIL', 'MOUNTAIN', 'MUD'],
    edible_plants: ['GRASS', 'CARROT', 'SUNFLOWER', 'CACTUS'],
    prey_species: [],
    can_scavenge: false,
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
    initial_count: 50,
    max_population: POP_LARGE_HERB,
    mate_cooldown: 55,
    decision_interval: 2,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'FERTILE_SOIL', 'MUD'],
    edible_plants: ['GRASS', 'STRAWBERRY', 'BLUEBERRY', 'APPLE_TREE', 'CARROT'],
    prey_species: [],
    can_scavenge: false,
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
    max_population: POP_MID_PRED,
    mate_cooldown: 50,
    decision_interval: 2,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'FERTILE_SOIL', 'MUD'],
    edible_plants: ['STRAWBERRY', 'BLUEBERRY'],
    prey_species: ['RABBIT', 'SQUIRREL', 'BEETLE', 'CROW', 'MOSQUITO', 'CATERPILLAR'],
    can_scavenge: true,
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
    max_population: POP_APEX,
    mate_cooldown: 80,
    decision_interval: 2,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'ROCK', 'FERTILE_SOIL', 'MUD'],
    edible_plants: ['BLUEBERRY'],
    prey_species: ['RABBIT', 'SQUIRREL', 'DEER', 'GOAT', 'RACCOON', 'BOAR', 'FOX', 'SNAKE', 'HAWK'],
    can_scavenge: true,
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
    hunger_rate: 0.07,
    thirst_rate: 0.055,
    initial_count: 30,
    max_population: POP_OMNI_MED,
    mate_cooldown: 75,
    decision_interval: 2,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'FERTILE_SOIL', 'MUD'],
    edible_plants: ['GRASS', 'STRAWBERRY', 'CARROT', 'MUSHROOM', 'OAK_TREE', 'CACTUS', 'COCONUT_PALM'],
    prey_species: ['BEETLE', 'CATERPILLAR', 'SNAKE'],
    can_scavenge: true,
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
    mature_age: 220,
    life_stage_ages: [65, 140, 220],
    attack_power: 10,
    defense: 8,
    energy_costs: {
      IDLE: 0.025, WALK: 0.12, RUN: 0.40,
      EAT: 0.05, DRINK: 0.05, SLEEP: -5.0,
      ATTACK: 1.5, MATE: 2.0, FLEE: 0.45,
    },
    hunger_rate: 0.085,
    thirst_rate: 0.05,
    initial_count: 12,
    max_population: POP_OMNI_LARGE,
    mate_cooldown: 130,
    decision_interval: 3,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'ROCK', 'FERTILE_SOIL', 'MOUNTAIN', 'MUD'],
    edible_plants: ['STRAWBERRY', 'BLUEBERRY', 'APPLE_TREE', 'MANGO_TREE', 'COCONUT_PALM'],
    prey_species: ['RABBIT', 'SQUIRREL', 'DEER', 'GOAT', 'BOAR', 'RACCOON', 'FOX', 'WOLF', 'SNAKE', 'HAWK', 'CROCODILE'],
    can_scavenge: true,
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
    max_population: POP_OMNI_MED,
    mate_cooldown: 45,
    decision_interval: 2,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'FERTILE_SOIL', 'MUD'],
    edible_plants: ['STRAWBERRY', 'BLUEBERRY', 'CARROT', 'TOMATO', 'COCONUT_PALM'],
    prey_species: ['BEETLE', 'CATERPILLAR', 'MOSQUITO'],
    can_scavenge: true,
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
    initial_count: 40,
    max_population: POP_OMNI_MED,
    mate_cooldown: 38,
    decision_interval: 2,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'ROCK', 'FERTILE_SOIL', 'MOUNTAIN', 'MUD'],
    edible_plants: ['SUNFLOWER', 'TOMATO', 'CARROT', 'COCONUT_PALM'],
    prey_species: ['BEETLE', 'CATERPILLAR', 'MOSQUITO'],
    can_scavenge: true,
  },

  MOSQUITO: {
    id: 'MOSQUITO',
    name: 'Mosquito',
    emoji: '🦟',
    diet: 'HERBIVORE',
    reproduction: 'SEXUAL',
    color: 0x556655,
    speed: 2,
    vision_range: 8,
    max_energy: 40,
    max_hunger: 60,
    max_thirst: 60,
    max_age: 600,
    mature_age: 30,
    life_stage_ages: [8, 18, 30],
    attack_power: 1,
    defense: 0,
    energy_costs: {
      IDLE: 0.005, WALK: 0.02, RUN: 0.08,
      EAT: 0.01, DRINK: 0.01, SLEEP: -2.0,
      ATTACK: 0.2, MATE: 0.4, FLEE: 0.08,
    },
    hunger_rate: 0.08,
    thirst_rate: 0.09,
    initial_count: 120,
    max_population: POP_INSECT,
    mate_cooldown: 12,
    decision_interval: 2,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'FERTILE_SOIL', 'MUD'],
    edible_plants: ['SUNFLOWER', 'STRAWBERRY', 'BLUEBERRY'],
    prey_species: [],
    can_scavenge: false,
  },

  CATERPILLAR: {
    id: 'CATERPILLAR',
    name: 'Caterpillar',
    emoji: '🐛',
    diet: 'HERBIVORE',
    reproduction: 'SEXUAL',
    color: 0x88bb33,
    speed: 1,
    vision_range: 5,
    max_energy: 50,
    max_hunger: 70,
    max_thirst: 70,
    max_age: 800,
    mature_age: 40,
    life_stage_ages: [10, 25, 40],
    attack_power: 0,
    defense: 1,
    energy_costs: {
      IDLE: 0.005, WALK: 0.02, RUN: 0.06,
      EAT: 0.01, DRINK: 0.01, SLEEP: -2.0,
      ATTACK: 0.1, MATE: 0.3, FLEE: 0.06,
    },
    hunger_rate: 0.07,
    thirst_rate: 0.06,
    initial_count: 120,
    max_population: POP_INSECT,
    mate_cooldown: 15,
    decision_interval: 3,
    walkable_terrain: ['DIRT', 'SOIL', 'FERTILE_SOIL', 'MUD'],
    edible_plants: ['GRASS', 'STRAWBERRY', 'CARROT', 'TOMATO', 'SUNFLOWER', 'OAK_TREE', 'APPLE_TREE'],
    prey_species: [],
    can_scavenge: false,
  },

  SNAKE: {
    id: 'SNAKE',
    name: 'Snake',
    emoji: '🐍',
    diet: 'CARNIVORE',
    reproduction: 'SEXUAL',
    color: 0x448844,
    speed: 1,
    vision_range: 12,
    max_energy: 120,
    max_hunger: 100,
    max_thirst: 80,
    max_age: 1600,
    mature_age: 100,
    life_stage_ages: [30, 60, 100],
    attack_power: 5,
    defense: 3,
    energy_costs: {
      IDLE: 0.01, WALK: 0.04, RUN: 0.15,
      EAT: 0.02, DRINK: 0.02, SLEEP: -3.5,
      ATTACK: 0.8, MATE: 1.0, FLEE: 0.18,
    },
    hunger_rate: 0.04,
    thirst_rate: 0.035,
    initial_count: 20,
    max_population: POP_MID_PRED,
    mate_cooldown: 60,
    decision_interval: 2,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'ROCK', 'FERTILE_SOIL', 'MUD'],
    edible_plants: [],
    prey_species: ['RABBIT', 'SQUIRREL', 'BEETLE', 'MOSQUITO', 'CATERPILLAR', 'CROW'],
    can_scavenge: false,
  },

  HAWK: {
    id: 'HAWK',
    name: 'Hawk',
    emoji: '🦅',
    diet: 'CARNIVORE',
    reproduction: 'SEXUAL',
    color: 0xaa6622,
    speed: 3,
    vision_range: 20,
    max_energy: 110,
    max_hunger: 100,
    max_thirst: 80,
    max_age: 1800,
    mature_age: 110,
    life_stage_ages: [30, 65, 110],
    attack_power: 7,
    defense: 3,
    energy_costs: {
      IDLE: 0.012, WALK: 0.05, RUN: 0.22,
      EAT: 0.02, DRINK: 0.02, SLEEP: -3.5,
      ATTACK: 0.9, MATE: 1.2, FLEE: 0.2,
    },
    hunger_rate: 0.055,
    thirst_rate: 0.05,
    initial_count: 15,
    max_population: POP_MID_PRED,
    mate_cooldown: 65,
    decision_interval: 2,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'ROCK', 'FERTILE_SOIL', 'MOUNTAIN', 'MUD'],
    edible_plants: [],
    prey_species: ['RABBIT', 'SQUIRREL', 'BEETLE', 'MOSQUITO', 'CATERPILLAR', 'SNAKE', 'CROW'],
    can_scavenge: false,
  },

  CROCODILE: {
    id: 'CROCODILE',
    name: 'Crocodile',
    emoji: '🐊',
    diet: 'CARNIVORE',
    reproduction: 'SEXUAL',
    color: 0x556b2f,
    speed: 1,
    vision_range: 12,
    max_energy: 180,
    max_hunger: 100,
    max_thirst: 60,
    max_age: 2400,
    mature_age: 160,
    life_stage_ages: [50, 100, 160],
    attack_power: 9,
    defense: 8,
    energy_costs: {
      IDLE: 0.01, WALK: 0.06, RUN: 0.25,
      EAT: 0.03, DRINK: 0.02, SLEEP: -4.0,
      ATTACK: 1.2, MATE: 1.5, FLEE: 0.3,
    },
    hunger_rate: 0.035,
    thirst_rate: 0.025,
    initial_count: 10,
    max_population: POP_APEX,
    mate_cooldown: 100,
    decision_interval: 3,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'FERTILE_SOIL', 'MUD'],
    edible_plants: [],
    prey_species: ['RABBIT', 'DEER', 'GOAT', 'BOAR', 'RACCOON', 'SNAKE'],
    can_scavenge: true,
  },
};

/** Sum of all species' base max_population (used to proportionally distribute global cap) */
export const BASE_POP_TOTAL = Object.values(ANIMAL_SPECIES)
  .reduce((sum, sp) => sum + (sp.max_population || 0), 0);

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
    if (simParams.walkable_terrain)
      simParams.walkable_terrain = simParams.walkable_terrain.map(t => TERRAIN_IDS[t]);
    if (simParams.edible_plants)
      simParams.edible_plants = simParams.edible_plants.map(p => PLANT_IDS[p]);
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
