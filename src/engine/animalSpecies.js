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
import { DEFAULT_TICKS_PER_GAME_MINUTE } from '../constants/simulation.js';
import { convertGameTimeFieldsToTicks, gameMinutesToTicks, scaleRateForTicks } from '../utils/gameTime.js';

/** Diet enum — canonical source for diet strings used across the codebase. */
export const DIET = Object.freeze({
  HERBIVORE: 'HERBIVORE',
  CARNIVORE: 'CARNIVORE',
  OMNIVORE: 'OMNIVORE',
});

/** Sound-group enum — maps to synthesis profiles in soundEvents.js. */
export const SOUND_GROUP = Object.freeze({
  INSECT: 'insect',
  BIRD: 'bird',
  SMALL_MAMMAL: 'smallMammal',
  LARGE_MAMMAL: 'largeMammal',
  REPTILE: 'reptile',
});

// Population caps by trophic level (food pyramid: prey > mid-predator > apex)
// Tuned for default global cap of 5000
const POP_INSECT = 400;       // Numerous small invertebrates (Beetle, Mosquito, Caterpillar, Cricket)
const POP_SMALL_HERB = 350;   // Fast-breeding small herbivores (Rabbit, Squirrel)
const POP_LARGE_HERB = 200;   // Slower large herbivores (Deer, Goat)
const POP_MID_PRED = 120;     // Mid-level predators (Fox, Snake, Hawk)
const POP_APEX = 60;          // Apex predators (Wolf, Crocodile)
const POP_OMNI_LARGE = 50;    // Large omnivores (Bear)
const POP_OMNI_MED = 200;     // Medium omnivores (Boar, Raccoon, Crow, Lizard)

const DEFAULT_DECISION_THRESHOLDS = {
  drink_opportunistic: 18,
  eat_opportunistic: 15,
  eat_seed_min_hunger: 50,
  eat_adult_plant_min_hunger: 35,
  critical_thirst: 45,
  critical_hunger: 38,
  moderate_hunger: 22,
  moderate_thirst: 25,
  sleep_energy_min: 20,
  mate_energy_min: 50,
  mate_search_radius_min: 10,
  desperate_hunger_hunt_min: 75,
  desperate_hunger_fallback_food_min: 50,
  desperate_seed_hunger_min: 60,
  expanded_plant_search_hunger: 65,
  // HP fraction above which the animal fights back when a predator is in melee range.
  // Set to 0 to disable fight-back entirely for a species.
  fight_back_hp_threshold: 0.40,
};

const DEFAULT_INITIAL_STATE = {
  energy_fraction: 0.8,
  hunger_range: [10, 30],
  thirst_range: [10, 30],
};

const DEFAULT_METABOLIC_MULTIPLIERS = {
  hunger: { BABY: 0.5, YOUNG: 0.75, YOUNG_ADULT: 1, ADULT: 1 },
  thirst: { BABY: 0.6, YOUNG: 0.8, YOUNG_ADULT: 1, ADULT: 1 },
};

const DEFAULT_HEALTH_PENALTY = {
  threshold_fraction: 0.7,
  max_penalty: 0.4,
};

const DEFAULT_RECOVERY = {
  idle_energy: 0.01,
  idle_hp: 0.01,
  sleep_hp: 0.8,
  sleep_exit_energy: 70,
  eat_hunger: 45,
  eat_energy: 5,
  eat_hp: 2,
  drink_thirst: 55,
};

const DEFAULT_COMBAT = {
  attack_cooldown: 17,
  defense_factor: 0.5,
  min_damage: 1,
  threat_attack_margin: 2,
};

const DEFAULT_HISTORY = {
  action_history_max_size: 100,
};

const GAME_TIME_FIELDS = ['max_age', 'mature_age', 'mate_cooldown', 'decision_interval', 'gestation_period', 'incubation_period', 'pupa_age', 'pupa_duration'];
const GAME_TIME_ARRAY_FIELDS = ['life_stage_ages'];
// Per-tick rates tuned at the default tick rate; scale inversely with ticksPerGameMinute.
const GAME_RATE_FIELDS = ['hunger_rate', 'thirst_rate'];
const RECOVERY_RATE_FIELDS = ['idle_energy', 'idle_hp', 'sleep_hp'];

function _convertAnimalGameTimeToTicks(simParams, ticksPerGameMinute = DEFAULT_TICKS_PER_GAME_MINUTE) {
  let converted = convertGameTimeFieldsToTicks(simParams, {
    fields: GAME_TIME_FIELDS,
    arrayFields: GAME_TIME_ARRAY_FIELDS,
    nestedFields: { combat: ['attack_cooldown'] },
  }, ticksPerGameMinute);

  // Scale per-tick metabolic rates so they are invariant to ticks_per_day.
  for (const field of GAME_RATE_FIELDS) {
    if (converted[field] != null) {
      converted[field] = scaleRateForTicks(converted[field], ticksPerGameMinute);
    }
  }
  if (converted.recovery) {
    converted = { ...converted, recovery: { ...converted.recovery } };
    for (const field of RECOVERY_RATE_FIELDS) {
      if (converted.recovery[field] != null) {
        converted.recovery[field] = scaleRateForTicks(converted.recovery[field], ticksPerGameMinute);
      }
    }
  }

  return converted;
}

function _mergeAnimalDefaults(simParams) {
  return {
    ...simParams,
    random_walk_chance: simParams.random_walk_chance ?? 0.3,
    decision_thresholds: {
      ...DEFAULT_DECISION_THRESHOLDS,
      ...(simParams.decision_thresholds || {}),
    },
    initial_state: {
      ...DEFAULT_INITIAL_STATE,
      ...(simParams.initial_state || {}),
    },
    metabolic_multipliers: {
      hunger: {
        ...DEFAULT_METABOLIC_MULTIPLIERS.hunger,
        ...(simParams.metabolic_multipliers?.hunger || {}),
      },
      thirst: {
        ...DEFAULT_METABOLIC_MULTIPLIERS.thirst,
        ...(simParams.metabolic_multipliers?.thirst || {}),
      },
    },
    health_penalty: {
      ...DEFAULT_HEALTH_PENALTY,
      ...(simParams.health_penalty || {}),
    },
    recovery: {
      ...DEFAULT_RECOVERY,
      ...(simParams.recovery || {}),
    },
    combat: {
      ...DEFAULT_COMBAT,
      ...(simParams.combat || {}),
    },
    ...DEFAULT_HISTORY,
    ...(simParams.action_history_max_size != null ? { action_history_max_size: simParams.action_history_max_size } : {}),
  };
}

const ANIMAL_SPECIES = {
  RABBIT: {
    id: 'RABBIT',
    name: 'Rabbit',
    emoji: '🐰',
    diet: DIET.HERBIVORE,
    reproduction: 'SEXUAL',
    color: 0x66cc66,
    visualScale: 0.7,
    mass_kg: 2,
    audioScale: 0.211,
    soundGroup: SOUND_GROUP.SMALL_MAMMAL,
    speed: 4,
    vision_range: 13,
    max_energy: 100,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 7754,
    mature_age: 443,
    max_hp: 50,
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
    mate_cooldown: 155,
    decision_interval: 11,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'FERTILE_SOIL', 'MUD'],
    edible_plants: ['GRASS', 'STRAWBERRY', 'CARROT', 'BLUEBERRY', 'POTATO'],
    prey_species: [],
    can_scavenge: false,
    reproduction_type: 'VIVIPAROUS',
    gestation_period: 166,
    clutch_size: [1, 1],
  },

  SQUIRREL: {
    id: 'SQUIRREL',
    name: 'Squirrel',
    emoji: '🐿️',
    diet: DIET.HERBIVORE,
    reproduction: 'SEXUAL',
    color: 0xcc8844,
    visualScale: 0.7,
    mass_kg: 0.5,
    audioScale: 0.158,
    soundGroup: SOUND_GROUP.SMALL_MAMMAL,
    speed: 4,
    vision_range: 14,
    max_energy: 90,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 7200,
    mature_age: 388,
    life_stage_ages: [111, 249, 388],
    max_hp: 40,
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
    mate_cooldown: 177,
    decision_interval: 11,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'FERTILE_SOIL', 'MUD'],
    edible_plants: ['BLUEBERRY', 'APPLE_TREE', 'MANGO_TREE', 'OAK_TREE', 'COCONUT_PALM'],
    prey_species: [],
    can_scavenge: false,
    reproduction_type: 'VIVIPAROUS',
    gestation_period: 194,
    clutch_size: [1, 1],
  },

  BEETLE: {
    id: 'BEETLE',
    name: 'Beetle',
    emoji: '🪲',
    diet: DIET.HERBIVORE,
    reproduction: 'SEXUAL',
    color: 0x556633,
    visualScale: 0.55,
    mass_kg: 0.03,
    audioScale: 0.053,
    soundGroup: SOUND_GROUP.INSECT,
    speed: 4,
    vision_range: 9,
    max_energy: 70,
    max_hunger: 80,
    max_thirst: 80,
    max_age: 5538,
    mature_age: 277,
    life_stage_ages: [66, 166, 277],
    max_hp: 20,
    attack_power: 1,
    defense: 4,
    energy_costs: {
      IDLE: 0.005, WALK: 0.03, RUN: 0.1,
      EAT: 0.01, DRINK: 0.01, SLEEP: -2.5,
      ATTACK: 0.3, MATE: 0.5, FLEE: 0.12,
    },
    hunger_rate: 0.065,
    thirst_rate: 0.045,
    initial_count: 80,
    max_population: POP_INSECT,
    mate_cooldown: 150,
    decision_interval: 17,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'ROCK', 'FERTILE_SOIL', 'MUD'],
    edible_plants: ['GRASS', 'MUSHROOM', 'CARROT'],
    prey_species: [],
    can_scavenge: true,
    reproduction_type: 'OVIPAROUS',
    incubation_period: 138,
    clutch_size: [1, 2],
    egg_hp: 8,
  },

  GOAT: {
    id: 'GOAT',
    name: 'Goat',
    emoji: '🐐',
    diet: DIET.HERBIVORE,
    reproduction: 'SEXUAL',
    color: 0xbbbbbb,
    visualScale: 0.95,
    mass_kg: 80,
    audioScale: 0.368,
    soundGroup: SOUND_GROUP.LARGE_MAMMAL,
    speed: 4,
    vision_range: 15,
    max_energy: 150,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 12185,
    mature_age: 831,
    life_stage_ages: [249, 498, 831],
    max_hp: 80,
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
    mate_cooldown: 388,
    decision_interval: 11,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'ROCK', 'FERTILE_SOIL', 'MOUNTAIN', 'MUD'],
    edible_plants: ['GRASS', 'CARROT', 'SUNFLOWER', 'CACTUS', 'POTATO', 'CHILI_PEPPER'],
    prey_species: [],
    can_scavenge: false,
    reproduction_type: 'VIVIPAROUS',
    gestation_period: 443,
    clutch_size: [1, 1],
  },

  DEER: {
    id: 'DEER',
    name: 'Deer',
    emoji: '🦌',
    diet: DIET.HERBIVORE,
    reproduction: 'SEXUAL',
    color: 0xcc9955,
    visualScale: 0.95,
    mass_kg: 150,
    audioScale: 0.316,
    soundGroup: SOUND_GROUP.LARGE_MAMMAL,
    speed: 8,
    vision_range: 18,
    max_energy: 140,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 11077,
    mature_age: 665,
    life_stage_ages: [194, 415, 665],
    max_hp: 70,
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
    mate_cooldown: 305,
    decision_interval: 11,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'FERTILE_SOIL', 'MUD'],
    edible_plants: ['GRASS', 'STRAWBERRY', 'BLUEBERRY', 'APPLE_TREE', 'CARROT', 'POTATO', 'OLIVE_TREE'],
    prey_species: [],
    can_scavenge: false,
    reproduction_type: 'VIVIPAROUS',
    gestation_period: 388,
    clutch_size: [1, 1],
  },

  FOX: {
    id: 'FOX',
    name: 'Fox',
    emoji: '🦊',
    nocturnal: true,
    diet: DIET.CARNIVORE,
    reproduction: 'SEXUAL',
    color: 0xdd8833,
    visualScale: 0.85,
    mass_kg: 6,
    audioScale: 0.263,
    soundGroup: SOUND_GROUP.SMALL_MAMMAL,
    speed: 8,
    vision_range: 18,
    max_energy: 130,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 8862,
    mature_age: 665,
    life_stage_ages: [194, 415, 665],
    max_hp: 60,
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
    mate_cooldown: 277,
    decision_interval: 11,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'FERTILE_SOIL', 'MUD'],
    edible_plants: ['STRAWBERRY', 'BLUEBERRY'],
    prey_species: ['RABBIT', 'SQUIRREL', 'BEETLE', 'CROW', 'MOSQUITO', 'CATERPILLAR', 'CRICKET', 'LIZARD'],
    can_scavenge: true,
    reproduction_type: 'VIVIPAROUS',
    gestation_period: 332,
    clutch_size: [1, 1],
  },

  WOLF: {
    id: 'WOLF',
    name: 'Wolf',
    emoji: '🐺',
    diet: DIET.CARNIVORE,
    reproduction: 'SEXUAL',
    color: 0xdd4444,
    visualScale: 1.1,
    mass_kg: 85,
    audioScale: 0.579,
    soundGroup: SOUND_GROUP.LARGE_MAMMAL,
    speed: 8,
    vision_range: 20,
    max_energy: 160,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 9969,
    mature_age: 831,
    life_stage_ages: [249, 498, 831],
    max_hp: 120,
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
    mate_cooldown: 443,
    decision_interval: 11,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'ROCK', 'FERTILE_SOIL', 'MUD'],
    edible_plants: ['BLUEBERRY'],
    prey_species: ['RABBIT', 'SQUIRREL', 'DEER', 'GOAT', 'RACCOON', 'BOAR', 'FOX', 'SNAKE', 'HAWK', 'LIZARD'],
    can_scavenge: true,
    reproduction_type: 'VIVIPAROUS',
    gestation_period: 443,
    clutch_size: [1, 1],
  },

  BOAR: {
    id: 'BOAR',
    name: 'Boar',
    emoji: '🐗',
    diet: DIET.OMNIVORE,
    reproduction: 'SEXUAL',
    color: 0x885533,
    visualScale: 0.95,
    mass_kg: 120,
    audioScale: 0.474,
    soundGroup: SOUND_GROUP.LARGE_MAMMAL,
    speed: 4,
    vision_range: 15,
    max_energy: 150,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 9969,
    mature_age: 720,
    life_stage_ages: [222, 443, 720],
    max_hp: 100,
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
    mate_cooldown: 415,
    decision_interval: 11,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'FERTILE_SOIL', 'MUD'],
    edible_plants: ['GRASS', 'STRAWBERRY', 'CARROT', 'MUSHROOM', 'OAK_TREE', 'CACTUS', 'COCONUT_PALM', 'POTATO', 'CHILI_PEPPER', 'OLIVE_TREE'],
    prey_species: ['BEETLE', 'CATERPILLAR', 'SNAKE', 'CRICKET', 'LIZARD'],
    can_scavenge: true,
    reproduction_type: 'VIVIPAROUS',
    gestation_period: 498,
    clutch_size: [1, 1],
  },

  BEAR: {
    id: 'BEAR',
    name: 'Bear',
    emoji: '🐻',
    nocturnal: true,
    diet: DIET.OMNIVORE,
    reproduction: 'SEXUAL',
    color: 0x8B4513,
    visualScale: 1.1,
    mass_kg: 250,
    audioScale: 1.0,
    soundGroup: SOUND_GROUP.LARGE_MAMMAL,
    speed: 4,
    vision_range: 18,
    max_energy: 200,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 13846,
    mature_age: 1218,
    life_stage_ages: [360, 775, 1218],
    max_hp: 200,
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
    mate_cooldown: 720,
    decision_interval: 17,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'ROCK', 'FERTILE_SOIL', 'MOUNTAIN', 'MUD'],
    edible_plants: ['STRAWBERRY', 'BLUEBERRY', 'APPLE_TREE', 'MANGO_TREE', 'COCONUT_PALM', 'OLIVE_TREE'],
    prey_species: ['RABBIT', 'SQUIRREL', 'DEER', 'GOAT', 'BOAR', 'RACCOON', 'FOX', 'WOLF', 'SNAKE', 'HAWK', 'CROCODILE', 'LIZARD'],
    can_scavenge: true,
    reproduction_type: 'VIVIPAROUS',
    gestation_period: 665,
    clutch_size: [1, 1],
  },

  RACCOON: {
    id: 'RACCOON',
    name: 'Raccoon',
    emoji: '🦝',
    nocturnal: true,
    diet: DIET.OMNIVORE,
    reproduction: 'SEXUAL',
    color: 0x778899,
    visualScale: 0.85,
    mass_kg: 8,
    audioScale: 0.211,
    soundGroup: SOUND_GROUP.SMALL_MAMMAL,
    speed: 4,
    vision_range: 14,
    max_energy: 100,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 7754,
    mature_age: 443,
    life_stage_ages: [138, 277, 443],
    max_hp: 50,
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
    mate_cooldown: 249,
    decision_interval: 11,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'FERTILE_SOIL', 'MUD'],
    edible_plants: ['STRAWBERRY', 'BLUEBERRY', 'CARROT', 'TOMATO', 'COCONUT_PALM', 'POTATO', 'CHILI_PEPPER'],
    prey_species: ['BEETLE', 'CATERPILLAR', 'MOSQUITO', 'CRICKET'],
    can_scavenge: true,
    reproduction_type: 'VIVIPAROUS',
    gestation_period: 277,
    clutch_size: [1, 1],
  },

  CROW: {
    id: 'CROW',
    name: 'Crow',
    emoji: '🐦‍⬛',
    nocturnal: true,
    can_fly: true,
    diet: DIET.OMNIVORE,
    reproduction: 'SEXUAL',
    color: 0x333344,
    visualScale: 0.7,
    mass_kg: 0.5,
    audioScale: 0.105,
    soundGroup: SOUND_GROUP.BIRD,
    speed: 8,
    vision_range: 20,
    max_energy: 80,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 6646,
    mature_age: 332,
    life_stage_ages: [100, 210, 332],
    max_hp: 30,
    attack_power: 2,
    defense: 1,
    energy_costs: {
      IDLE: 0.01, WALK: 0.04, RUN: 0.15, FLY: 0.20,
      EAT: 0.02, DRINK: 0.02, SLEEP: -3.0,
      ATTACK: 0.4, MATE: 0.8, FLEE: 0.15,
    },
    hunger_rate: 0.06,
    thirst_rate: 0.055,
    initial_count: 40,
    max_population: POP_OMNI_MED,
    mate_cooldown: 210,
    decision_interval: 11,
    walkable_terrain: ['WATER', 'DEEP_WATER', 'SAND', 'DIRT', 'SOIL', 'ROCK', 'FERTILE_SOIL', 'MOUNTAIN', 'MUD'],
    edible_plants: ['SUNFLOWER', 'TOMATO', 'CARROT', 'COCONUT_PALM', 'CHILI_PEPPER', 'OLIVE_TREE'],
    prey_species: ['BEETLE', 'CATERPILLAR', 'MOSQUITO', 'CRICKET'],
    can_scavenge: true,
    reproduction_type: 'VIVIPAROUS',
    gestation_period: 166,
    clutch_size: [1, 1],
  },

  MOSQUITO: {
    id: 'MOSQUITO',
    name: 'Mosquito',
    emoji: '🦟',
    can_fly: true,
    diet: DIET.HERBIVORE,
    reproduction: 'SEXUAL',
    color: 0x556655,
    visualScale: 0.55,
    mass_kg: 0.003,
    audioScale: 0.0,
    soundGroup: SOUND_GROUP.INSECT,
    speed: 8,
    vision_range: 10,
    max_energy: 40,
    max_hunger: 60,
    max_thirst: 60,
    max_age: 3323,
    mature_age: 166,
    life_stage_ages: [44, 100, 166],
    max_hp: 10,
    attack_power: 1,
    defense: 0,
    energy_costs: {
      IDLE: 0.005, WALK: 0.02, RUN: 0.08, FLY: 0.12,
      EAT: 0.01, DRINK: 0.01, SLEEP: -2.0,
      ATTACK: 0.2, MATE: 0.4, FLEE: 0.08,
    },
    hunger_rate: 0.08,
    thirst_rate: 0.09,
    initial_count: 120,
    max_population: POP_INSECT,
    mate_cooldown: 66,
    decision_interval: 11,
    walkable_terrain: ['WATER', 'DEEP_WATER', 'SAND', 'DIRT', 'SOIL', 'FERTILE_SOIL', 'MUD'],
    edible_plants: ['GRASS', 'SUNFLOWER', 'STRAWBERRY', 'BLUEBERRY', 'CARROT', 'POTATO', 'CHILI_PEPPER'],
    prey_species: [],
    can_scavenge: false,
    reproduction_type: 'OVIPAROUS',
    incubation_period: 66,
    clutch_size: [2, 3],
    egg_hp: 5,
  },

  CATERPILLAR: {
    id: 'CATERPILLAR',
    name: 'Caterpillar',
    emoji: '🐛',
    diet: DIET.HERBIVORE,
    reproduction: 'SEXUAL',
    color: 0x88bb33,
    visualScale: 0.55,
    mass_kg: 0.01,
    audioScale: 0.026,
    soundGroup: SOUND_GROUP.INSECT,
    speed: 4,
    vision_range: 6,
    max_energy: 50,
    max_hunger: 70,
    max_thirst: 70,
    max_age: 4431,
    mature_age: 222,
    life_stage_ages: [55, 138, 222],
    max_hp: 15,
    attack_power: 0,
    defense: 1,
    energy_costs: {
      IDLE: 0.005, WALK: 0.02, RUN: 0.06,
      EAT: 0.01, DRINK: 0.01, SLEEP: -2.0,
      ATTACK: 0.1, MATE: 0.3, FLEE: 0.06,
    },
    hunger_rate: 0.07,
    thirst_rate: 0.06,
    initial_count: 150,
    max_population: POP_INSECT,
    mate_cooldown: 83,
    decision_interval: 17,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'FERTILE_SOIL', 'MUD'],
    edible_plants: ['GRASS', 'STRAWBERRY', 'CARROT', 'TOMATO', 'SUNFLOWER', 'OAK_TREE', 'APPLE_TREE', 'POTATO', 'CHILI_PEPPER', 'OLIVE_TREE'],
    prey_species: [],
    can_scavenge: false,
    reproduction_type: 'METAMORPHOSIS',
    incubation_period: 83,
    clutch_size: [2, 4],
    egg_hp: 8,
    pupa_age: 166,
    pupa_duration: 332,
  },

  CRICKET: {
    id: 'CRICKET',
    name: 'Cricket',
    emoji: '🦗',
    diet: DIET.HERBIVORE,
    reproduction: 'SEXUAL',
    color: 0x6f9933,
    visualScale: 0.55,
    mass_kg: 0.005,
    audioScale: 0.026,
    soundGroup: SOUND_GROUP.INSECT,
    speed: 8,
    vision_range: 8,
    max_energy: 45,
    max_hunger: 70,
    max_thirst: 70,
    max_age: 3877,
    mature_age: 194,
    life_stage_ages: [55, 122, 194],
    max_hp: 15,
    attack_power: 0,
    defense: 0,
    energy_costs: {
      IDLE: 0.005, WALK: 0.022, RUN: 0.075,
      EAT: 0.01, DRINK: 0.01, SLEEP: -2.2,
      ATTACK: 0.08, MATE: 0.32, FLEE: 0.08,
    },
    hunger_rate: 0.075,
    thirst_rate: 0.07,
    initial_count: 120,
    max_population: POP_INSECT,
    mate_cooldown: 78,
    decision_interval: 11,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'FERTILE_SOIL', 'MUD'],
    edible_plants: ['GRASS', 'SUNFLOWER', 'POTATO', 'CHILI_PEPPER', 'STRAWBERRY', 'BLUEBERRY'],
    prey_species: [],
    can_scavenge: false,
    reproduction_type: 'OVIPAROUS',
    incubation_period: 72,
    clutch_size: [2, 4],
    egg_hp: 8,
  },

  LIZARD: {
    id: 'LIZARD',
    name: 'Lizard',
    emoji: '🦎',
    diet: DIET.OMNIVORE,
    reproduction: 'SEXUAL',
    color: 0x5a8f4b,
    visualScale: 0.7,
    mass_kg: 0.3,
    audioScale: 0.184,
    soundGroup: SOUND_GROUP.REPTILE,
    speed: 4,
    vision_range: 14,
    max_energy: 85,
    max_hunger: 90,
    max_thirst: 80,
    max_age: 7200,
    mature_age: 415,
    life_stage_ages: [122, 249, 415],
    max_hp: 45,
    attack_power: 3,
    defense: 2,
    energy_costs: {
      IDLE: 0.01, WALK: 0.045, RUN: 0.16,
      EAT: 0.02, DRINK: 0.02, SLEEP: -3.2,
      ATTACK: 0.5, MATE: 0.9, FLEE: 0.16,
    },
    hunger_rate: 0.06,
    thirst_rate: 0.055,
    initial_count: 35,
    max_population: POP_OMNI_MED,
    mate_cooldown: 222,
    decision_interval: 11,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'ROCK', 'FERTILE_SOIL', 'MUD'],
    edible_plants: ['GRASS', 'BLUEBERRY', 'POTATO', 'CHILI_PEPPER', 'OLIVE_TREE'],
    prey_species: ['BEETLE', 'MOSQUITO', 'CATERPILLAR', 'CRICKET'],
    can_scavenge: true,
    reproduction_type: 'OVIPAROUS',
    incubation_period: 44,
    clutch_size: [2, 4],
    egg_hp: 10,
  },

  SNAKE: {
    id: 'SNAKE',
    name: 'Snake',
    emoji: '🐍',
    diet: DIET.CARNIVORE,
    reproduction: 'SEXUAL',
    color: 0x448844,
    visualScale: 0.85,
    mass_kg: 5,
    audioScale: 0.158,
    soundGroup: SOUND_GROUP.REPTILE,
    speed: 4,
    vision_range: 15,
    max_energy: 120,
    max_hunger: 100,
    max_thirst: 80,
    max_age: 8862,
    mature_age: 554,
    life_stage_ages: [166, 332, 554],
    max_hp: 40,
    attack_power: 5,
    defense: 3,
    energy_costs: {
      IDLE: 0.01, WALK: 0.04, RUN: 0.15,
      EAT: 0.02, DRINK: 0.02, SLEEP: -3.5,
      ATTACK: 0.8, MATE: 1.0, FLEE: 0.18,
    },
    hunger_rate: 0.060,
    thirst_rate: 0.035,
    initial_count: 20,
    max_population: POP_MID_PRED,
    mate_cooldown: 332,
    decision_interval: 11,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'ROCK', 'FERTILE_SOIL', 'MUD'],
    edible_plants: [],
    prey_species: ['RABBIT', 'SQUIRREL', 'BEETLE', 'MOSQUITO', 'CATERPILLAR', 'CROW', 'CRICKET', 'LIZARD'],
    can_scavenge: false,
    reproduction_type: 'OVIPAROUS',
    incubation_period: 249,
    clutch_size: [1, 2],
    egg_hp: 15,
  },

  HAWK: {
    id: 'HAWK',
    name: 'Hawk',
    emoji: '🦅',
    can_fly: true,
    diet: DIET.CARNIVORE,
    reproduction: 'SEXUAL',
    color: 0xaa6622,
    visualScale: 0.85,
    mass_kg: 5,
    audioScale: 0.184,
    soundGroup: SOUND_GROUP.BIRD,
    speed: 12,
    vision_range: 25,
    max_energy: 110,
    max_hunger: 100,
    max_thirst: 80,
    max_age: 9969,
    mature_age: 609,
    life_stage_ages: [166, 360, 609],
    max_hp: 45,
    attack_power: 7,
    defense: 3,
    energy_costs: {
      IDLE: 0.012, WALK: 0.05, RUN: 0.22, FLY: 0.30,
      EAT: 0.02, DRINK: 0.02, SLEEP: -3.5,
      ATTACK: 0.9, MATE: 1.2, FLEE: 0.2,
    },
    hunger_rate: 0.075,
    thirst_rate: 0.05,
    initial_count: 15,
    max_population: POP_MID_PRED,
    mate_cooldown: 360,
    decision_interval: 11,
    walkable_terrain: ['WATER', 'DEEP_WATER', 'SAND', 'DIRT', 'SOIL', 'ROCK', 'FERTILE_SOIL', 'MOUNTAIN', 'MUD'],
    edible_plants: [],
    prey_species: ['RABBIT', 'SQUIRREL', 'BEETLE', 'MOSQUITO', 'CATERPILLAR', 'SNAKE', 'CROW', 'CRICKET', 'LIZARD'],
    can_scavenge: false,
    reproduction_type: 'OVIPAROUS',
    incubation_period: 222,
    clutch_size: [1, 2],
    egg_hp: 20,
  },

  CROCODILE: {
    id: 'CROCODILE',
    name: 'Crocodile',
    emoji: '🐊',
    diet: DIET.CARNIVORE,
    reproduction: 'SEXUAL',
    color: 0x556b2f,
    visualScale: 1.1,
    mass_kg: 400,
    audioScale: 0.895,
    soundGroup: SOUND_GROUP.REPTILE,
    speed: 4,
    vision_range: 15,
    max_energy: 180,
    max_hunger: 100,
    max_thirst: 60,
    max_age: 13292,
    mature_age: 886,
    life_stage_ages: [277, 554, 886],
    max_hp: 180,
    attack_power: 9,
    defense: 8,
    energy_costs: {
      IDLE: 0.01, WALK: 0.06, RUN: 0.25,
      EAT: 0.03, DRINK: 0.02, SLEEP: -4.0,
      ATTACK: 1.2, MATE: 1.5, FLEE: 0.3,
    },
    hunger_rate: 0.060,
    thirst_rate: 0.025,
    initial_count: 10,
    max_population: POP_APEX,
    mate_cooldown: 554,
    decision_interval: 17,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'FERTILE_SOIL', 'MUD'],
    edible_plants: [],
    prey_species: ['RABBIT', 'DEER', 'GOAT', 'BOAR', 'RACCOON', 'SNAKE', 'LIZARD'],
    can_scavenge: true,
    reproduction_type: 'OVIPAROUS',
    incubation_period: 388,
    clutch_size: [1, 2],
    egg_hp: 25,
  },
};

/** Sum of all species' base max_population (used to proportionally distribute global cap) */
export const BASE_POP_TOTAL = Object.values(ANIMAL_SPECIES)
  .reduce((sum, sp) => sum + (sp.max_population || 0), 0);

/** Sum of all species' base initial_count (used as proportion weights) */
export const BASE_INITIAL_TOTAL = Object.values(ANIMAL_SPECIES)
  .reduce((sum, sp) => sum + (sp.initial_count || 0), 0);

function normalizeCountValue(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function scaleCountSubset(counts, keys, budget) {
  const scaled = {};
  for (const key of keys) scaled[key] = 0;
  if (budget <= 0 || !keys.length) return scaled;

  const total = keys.reduce((sum, key) => sum + normalizeCountValue(counts[key]), 0);
  if (total <= budget) {
    for (const key of keys) scaled[key] = normalizeCountValue(counts[key]);
    return scaled;
  }

  const fractions = [];
  let assigned = 0;
  for (const key of keys) {
    const requested = normalizeCountValue(counts[key]);
    const raw = (requested * budget) / total;
    const floor = Math.floor(raw);
    scaled[key] = floor;
    fractions.push([key, raw - floor]);
    assigned += floor;
  }

  fractions.sort((a, b) => b[1] - a[1]);
  for (let i = 0; i < budget - assigned && i < fractions.length; i++) {
    const [key] = fractions[i];
    scaled[key] += 1;
  }

  return scaled;
}

export const MAX_ANIMAL_ENERGY = Object.values(ANIMAL_SPECIES)
  .reduce((maxEnergy, sp) => Math.max(maxEnergy, sp.max_energy || 0), 0);

/** Ordered list of all species keys */
export const ALL_ANIMAL_IDS = Object.keys(ANIMAL_SPECIES);

/** Only herbivore keys */
export const HERBIVORE_IDS = ALL_ANIMAL_IDS.filter(k => ANIMAL_SPECIES[k].diet === DIET.HERBIVORE);

/** Only carnivore keys */
export const CARNIVORE_IDS = ALL_ANIMAL_IDS.filter(k => ANIMAL_SPECIES[k].diet === DIET.CARNIVORE);

/** Only omnivore keys */
export const OMNIVORE_IDS = ALL_ANIMAL_IDS.filter(k => ANIMAL_SPECIES[k].diet === DIET.OMNIVORE);

export function getEffectiveAnimalPopulationCap(speciesId, globalBudget = 0) {
  const baseCap = ANIMAL_SPECIES[speciesId]?.max_population || 0;
  if (!baseCap) return 0;
  if (!(globalBudget > 0)) return baseCap;
  return Math.max(2, Math.round(baseCap * globalBudget / BASE_POP_TOTAL));
}

export function normalizeAnimalCountsToBudget(counts = {}, globalBudget = 0, options = {}) {
  const lockedSpecies = Array.isArray(options.lockedSpecies) ? options.lockedSpecies : [];
  const lockedSet = new Set(lockedSpecies.filter(speciesId => ALL_ANIMAL_IDS.includes(speciesId)));
  const normalized = {};

  for (const speciesId of ALL_ANIMAL_IDS) {
    const requested = normalizeCountValue(counts[speciesId]);
    const cap = getEffectiveAnimalPopulationCap(speciesId, globalBudget);
    normalized[speciesId] = cap > 0 ? Math.min(requested, cap) : requested;
  }

  if (!(globalBudget > 0)) return normalized;

  const currentTotal = ALL_ANIMAL_IDS.reduce((sum, speciesId) => sum + normalized[speciesId], 0);
  if (currentTotal <= globalBudget) return normalized;

  const result = Object.fromEntries(ALL_ANIMAL_IDS.map(speciesId => [speciesId, 0]));
  let remainingBudget = globalBudget;

  for (const speciesId of lockedSpecies) {
    if (!lockedSet.has(speciesId) || remainingBudget <= 0) continue;
    const assigned = Math.min(normalized[speciesId], remainingBudget);
    result[speciesId] = assigned;
    remainingBudget -= assigned;
  }

  if (remainingBudget <= 0) return result;

  const unlockedIds = ALL_ANIMAL_IDS.filter(speciesId => !lockedSet.has(speciesId));
  const unlockedTotal = unlockedIds.reduce((sum, speciesId) => sum + normalized[speciesId], 0);

  if (unlockedTotal <= remainingBudget) {
    for (const speciesId of unlockedIds) {
      result[speciesId] = normalized[speciesId];
    }
    return result;
  }

  const scaledUnlocked = scaleCountSubset(normalized, unlockedIds, remainingBudget);
  for (const speciesId of unlockedIds) {
    result[speciesId] = scaledUnlocked[speciesId];
  }

  return result;
}

/**
 * Build the `animal_species` config object (without display-only fields).
 */
export function buildAnimalSpeciesConfig(ticksPerGameMinute = DEFAULT_TICKS_PER_GAME_MINUTE) {
  const cfg = {};
  for (const [key, sp] of Object.entries(ANIMAL_SPECIES)) {
    const { id, name, color, emoji, visualScale, audioScale, soundGroup, initial_count, ...rawSimParams } = sp;
    const simParams = _convertAnimalGameTimeToTicks(_mergeAnimalDefaults(rawSimParams), ticksPerGameMinute);
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
export function buildDecisionIntervals(ticksPerGameMinute = DEFAULT_TICKS_PER_GAME_MINUTE) {
  const intervals = {};
  for (const [key, sp] of Object.entries(ANIMAL_SPECIES)) {
    intervals[key] = gameMinutesToTicks(sp.decision_interval ?? 11, ticksPerGameMinute);
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

/**
 * Build proportional animal counts for a given total population.
 * Each species gets `totalPopulation * (sp.initial_count / BASE_INITIAL_TOTAL)`,
 * clamped to its effective cap under `globalBudget`.
 */
export function buildProportionalAnimalCounts(totalPopulation, globalBudget = 0) {
  if (!(totalPopulation > 0)) {
    return Object.fromEntries(ALL_ANIMAL_IDS.map(id => [id, 0]));
  }
  const counts = {};
  for (const [key, sp] of Object.entries(ANIMAL_SPECIES)) {
    const weight = sp.initial_count || 0;
    const raw = Math.round(totalPopulation * weight / BASE_INITIAL_TOTAL);
    const cap = getEffectiveAnimalPopulationCap(key, globalBudget);
    counts[key] = cap > 0 ? Math.min(raw, cap) : raw;
  }
  return normalizeAnimalCountsToBudget(counts, globalBudget);
}

/** Build a species-name → hex-color lookup for pixel-overlay rendering. */
export function buildAnimalColorMap() {
  const map = {};
  for (const [key, sp] of Object.entries(ANIMAL_SPECIES)) {
    map[key] = sp.color;
  }
  return map;
}

/** Return a Set of species keys that have `can_fly: true`. */
export function buildCanFlySet() {
  const set = new Set();
  for (const [key, sp] of Object.entries(ANIMAL_SPECIES)) {
    if (sp.can_fly) set.add(key);
  }
  return set;
}

// ---------------------------------------------------------------------------
// Derived lookup builders — single source of truth for consumer layers
// ---------------------------------------------------------------------------

/** Build species display info map: { RABBIT: { emoji, name, diet }, ... } */
export function buildSpeciesInfo() {
  const map = {};
  for (const [key, sp] of Object.entries(ANIMAL_SPECIES)) {
    const dietLabel = sp.diet.charAt(0) + sp.diet.slice(1).toLowerCase();
    map[key] = { emoji: sp.emoji, name: sp.name, diet: dietLabel };
  }
  return map;
}

/** Build species hex-color map for rendering: { RABBIT: 0x66cc66, ... } */
export function buildAnimalColors() {
  const map = {};
  for (const [key, sp] of Object.entries(ANIMAL_SPECIES)) {
    map[key] = sp.color;
  }
  return map;
}

/** Build hex-string color map: { RABBIT: '#66cc66', ... } */
export function buildAnimalHexColors() {
  const map = {};
  for (const [key, sp] of Object.entries(ANIMAL_SPECIES)) {
    map[key] = `#${sp.color.toString(16).padStart(6, '0')}`;
  }
  return map;
}

/** Build diet groups: { Herbivore: ['RABBIT', ...], Carnivore: [...], Omnivore: [...] } */
export function buildDietGroups() {
  const groups = { Herbivore: [], Carnivore: [], Omnivore: [] };
  for (const [key, sp] of Object.entries(ANIMAL_SPECIES)) {
    const label = sp.diet.charAt(0) + sp.diet.slice(1).toLowerCase();
    if (groups[label]) groups[label].push(key);
  }
  return groups;
}

/** Build per-species visual scale map: { RABBIT: 0.7, ... } */
export function buildSpeciesVisualScale() {
  const map = {};
  for (const [key, sp] of Object.entries(ANIMAL_SPECIES)) {
    map[key] = sp.visualScale ?? 1.0;
  }
  return map;
}

/** Build per-species audio scale map (display-name keys): { Rabbit: 0.211, ... } */
export function buildSpeciesAudioScale() {
  const map = {};
  for (const [, sp] of Object.entries(ANIMAL_SPECIES)) {
    map[sp.name] = sp.audioScale ?? 0;
  }
  return map;
}

/** Build per-species sound group map (display-name keys): { Rabbit: 'smallMammal', ... } */
export function buildSpeciesSoundGroup() {
  const map = {};
  for (const [, sp] of Object.entries(ANIMAL_SPECIES)) {
    map[sp.name] = sp.soundGroup ?? SOUND_GROUP.SMALL_MAMMAL;
  }
  return map;
}

/**
 * Classify a numeric mass_kg into a size category.
 * Thresholds: < 5 kg → 'small', 5–80 kg → 'medium', ≥ 80 kg → 'large'.
 * @param {number} mass_kg
 * @returns {'small'|'medium'|'large'}
 */
export function massCategory(mass_kg) {
  if (mass_kg >= 80) return 'large';
  if (mass_kg >= 5)  return 'medium';
  return 'small';
}

/**
 * Build species → { mass_kg, category, dropRange } lookup for meat drops on death.
 */
export function buildMassDropMap() {
  const map = {};
  for (const [key, sp] of Object.entries(ANIMAL_SPECIES)) {
    const mass_kg = sp.mass_kg ?? 1;
    const category = massCategory(mass_kg);
    const dropRange = category === 'large' ? [0, 3] : category === 'medium' ? [0, 2] : [0, 1];
    map[key] = { mass_kg, category, dropRange };
  }
  return map;
}

export default ANIMAL_SPECIES;
