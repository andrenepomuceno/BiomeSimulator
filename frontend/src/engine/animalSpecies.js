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
  attack_cooldown: 3,
  defense_factor: 0.5,
  min_damage: 1,
  threat_attack_margin: 2,
};

const DEFAULT_HISTORY = {
  action_history_max_size: 100,
};

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
    diet: 'HERBIVORE',
    reproduction: 'SEXUAL',
    color: 0x66cc66,
    speed: 4,
    vision_range: 10,
    max_energy: 100,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 1400,
    mature_age: 80,
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
    mate_cooldown: 28,
    decision_interval: 2,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'FERTILE_SOIL', 'MUD'],
    edible_plants: ['GRASS', 'STRAWBERRY', 'CARROT', 'BLUEBERRY', 'POTATO'],
    prey_species: [],
    can_scavenge: false,
    reproduction_type: 'VIVIPAROUS',
    gestation_period: 30,
    clutch_size: [1, 1],
  },

  SQUIRREL: {
    id: 'SQUIRREL',
    name: 'Squirrel',
    emoji: '🐿️',
    diet: 'HERBIVORE',
    reproduction: 'SEXUAL',
    color: 0xcc8844,
    speed: 4,
    vision_range: 11,
    max_energy: 90,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 1300,
    mature_age: 70,
    life_stage_ages: [20, 45, 70],
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
    mate_cooldown: 32,
    decision_interval: 2,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'FERTILE_SOIL', 'MUD'],
    edible_plants: ['BLUEBERRY', 'APPLE_TREE', 'MANGO_TREE', 'OAK_TREE', 'COCONUT_PALM'],
    prey_species: [],
    can_scavenge: false,
    reproduction_type: 'VIVIPAROUS',
    gestation_period: 35,
    clutch_size: [1, 1],
  },

  BEETLE: {
    id: 'BEETLE',
    name: 'Beetle',
    emoji: '🪲',
    diet: 'HERBIVORE',
    reproduction: 'SEXUAL',
    color: 0x556633,
    speed: 4,
    vision_range: 7,
    max_energy: 70,
    max_hunger: 80,
    max_thirst: 80,
    max_age: 1000,
    mature_age: 50,
    life_stage_ages: [12, 30, 50],
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
    initial_count: 100,
    max_population: POP_INSECT,
    mate_cooldown: 22,
    decision_interval: 3,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'ROCK', 'FERTILE_SOIL', 'MUD'],
    edible_plants: ['GRASS', 'MUSHROOM', 'CARROT'],
    prey_species: [],
    can_scavenge: true,
    reproduction_type: 'OVIPAROUS',
    incubation_period: 20,
    clutch_size: [1, 2],
    egg_hp: 8,
  },

  GOAT: {
    id: 'GOAT',
    name: 'Goat',
    emoji: '🐐',
    diet: 'HERBIVORE',
    reproduction: 'SEXUAL',
    color: 0xbbbbbb,
    speed: 4,
    vision_range: 12,
    max_energy: 150,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 2200,
    mature_age: 150,
    life_stage_ages: [45, 90, 150],
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
    mate_cooldown: 70,
    decision_interval: 2,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'ROCK', 'FERTILE_SOIL', 'MOUNTAIN', 'MUD'],
    edible_plants: ['GRASS', 'CARROT', 'SUNFLOWER', 'CACTUS', 'POTATO', 'CHILI_PEPPER'],
    prey_species: [],
    can_scavenge: false,
    reproduction_type: 'VIVIPAROUS',
    gestation_period: 80,
    clutch_size: [1, 1],
  },

  DEER: {
    id: 'DEER',
    name: 'Deer',
    emoji: '🦌',
    diet: 'HERBIVORE',
    reproduction: 'SEXUAL',
    color: 0xcc9955,
    speed: 8,
    vision_range: 14,
    max_energy: 140,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 2000,
    mature_age: 120,
    life_stage_ages: [35, 75, 120],
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
    mate_cooldown: 55,
    decision_interval: 2,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'FERTILE_SOIL', 'MUD'],
    edible_plants: ['GRASS', 'STRAWBERRY', 'BLUEBERRY', 'APPLE_TREE', 'CARROT', 'POTATO', 'OLIVE_TREE'],
    prey_species: [],
    can_scavenge: false,
    reproduction_type: 'VIVIPAROUS',
    gestation_period: 70,
    clutch_size: [1, 1],
  },

  FOX: {
    id: 'FOX',
    name: 'Fox',
    emoji: '🦊',
    nocturnal: true,
    diet: 'CARNIVORE',
    reproduction: 'SEXUAL',
    color: 0xdd8833,
    speed: 8,
    vision_range: 14,
    max_energy: 130,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 1600,
    mature_age: 120,
    life_stage_ages: [35, 75, 120],
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
    mate_cooldown: 50,
    decision_interval: 2,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'FERTILE_SOIL', 'MUD'],
    edible_plants: ['STRAWBERRY', 'BLUEBERRY'],
    prey_species: ['RABBIT', 'SQUIRREL', 'BEETLE', 'CROW', 'MOSQUITO', 'CATERPILLAR', 'CRICKET', 'LIZARD'],
    can_scavenge: true,
    reproduction_type: 'VIVIPAROUS',
    gestation_period: 60,
    clutch_size: [1, 1],
  },

  WOLF: {
    id: 'WOLF',
    name: 'Wolf',
    emoji: '🐺',
    diet: 'CARNIVORE',
    reproduction: 'SEXUAL',
    color: 0xdd4444,
    speed: 8,
    vision_range: 16,
    max_energy: 160,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 1800,
    mature_age: 150,
    life_stage_ages: [45, 90, 150],
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
    mate_cooldown: 80,
    decision_interval: 2,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'ROCK', 'FERTILE_SOIL', 'MUD'],
    edible_plants: ['BLUEBERRY'],
    prey_species: ['RABBIT', 'SQUIRREL', 'DEER', 'GOAT', 'RACCOON', 'BOAR', 'FOX', 'SNAKE', 'HAWK', 'LIZARD'],
    can_scavenge: true,
    reproduction_type: 'VIVIPAROUS',
    gestation_period: 80,
    clutch_size: [1, 1],
  },

  BOAR: {
    id: 'BOAR',
    name: 'Boar',
    emoji: '🐗',
    diet: 'OMNIVORE',
    reproduction: 'SEXUAL',
    color: 0x885533,
    speed: 4,
    vision_range: 12,
    max_energy: 150,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 1800,
    mature_age: 130,
    life_stage_ages: [40, 80, 130],
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
    mate_cooldown: 75,
    decision_interval: 2,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'FERTILE_SOIL', 'MUD'],
    edible_plants: ['GRASS', 'STRAWBERRY', 'CARROT', 'MUSHROOM', 'OAK_TREE', 'CACTUS', 'COCONUT_PALM', 'POTATO', 'CHILI_PEPPER', 'OLIVE_TREE'],
    prey_species: ['BEETLE', 'CATERPILLAR', 'SNAKE', 'CRICKET', 'LIZARD'],
    can_scavenge: true,
    reproduction_type: 'VIVIPAROUS',
    gestation_period: 90,
    clutch_size: [1, 1],
  },

  BEAR: {
    id: 'BEAR',
    name: 'Bear',
    emoji: '🐻',
    nocturnal: true,
    diet: 'OMNIVORE',
    reproduction: 'SEXUAL',
    color: 0x8B4513,
    speed: 4,
    vision_range: 14,
    max_energy: 200,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 2500,
    mature_age: 220,
    life_stage_ages: [65, 140, 220],
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
    mate_cooldown: 130,
    decision_interval: 3,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'ROCK', 'FERTILE_SOIL', 'MOUNTAIN', 'MUD'],
    edible_plants: ['STRAWBERRY', 'BLUEBERRY', 'APPLE_TREE', 'MANGO_TREE', 'COCONUT_PALM', 'OLIVE_TREE'],
    prey_species: ['RABBIT', 'SQUIRREL', 'DEER', 'GOAT', 'BOAR', 'RACCOON', 'FOX', 'WOLF', 'SNAKE', 'HAWK', 'CROCODILE', 'LIZARD'],
    can_scavenge: true,
    reproduction_type: 'VIVIPAROUS',
    gestation_period: 120,
    clutch_size: [1, 1],
  },

  RACCOON: {
    id: 'RACCOON',
    name: 'Raccoon',
    emoji: '🦝',
    nocturnal: true,
    diet: 'OMNIVORE',
    reproduction: 'SEXUAL',
    color: 0x778899,
    speed: 4,
    vision_range: 11,
    max_energy: 100,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 1400,
    mature_age: 80,
    life_stage_ages: [25, 50, 80],
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
    mate_cooldown: 45,
    decision_interval: 2,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'FERTILE_SOIL', 'MUD'],
    edible_plants: ['STRAWBERRY', 'BLUEBERRY', 'CARROT', 'TOMATO', 'COCONUT_PALM', 'POTATO', 'CHILI_PEPPER'],
    prey_species: ['BEETLE', 'CATERPILLAR', 'MOSQUITO', 'CRICKET'],
    can_scavenge: true,
    reproduction_type: 'VIVIPAROUS',
    gestation_period: 50,
    clutch_size: [1, 1],
  },

  CROW: {
    id: 'CROW',
    name: 'Crow',
    emoji: '🐦‍⬛',
    nocturnal: true,
    can_fly: true,
    diet: 'OMNIVORE',
    reproduction: 'SEXUAL',
    color: 0x333344,
    speed: 8,
    vision_range: 16,
    max_energy: 80,
    max_hunger: 100,
    max_thirst: 100,
    max_age: 1200,
    mature_age: 60,
    life_stage_ages: [18, 38, 60],
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
    mate_cooldown: 38,
    decision_interval: 2,
    walkable_terrain: ['WATER', 'DEEP_WATER', 'SAND', 'DIRT', 'SOIL', 'ROCK', 'FERTILE_SOIL', 'MOUNTAIN', 'MUD'],
    edible_plants: ['SUNFLOWER', 'TOMATO', 'CARROT', 'COCONUT_PALM', 'CHILI_PEPPER', 'OLIVE_TREE'],
    prey_species: ['BEETLE', 'CATERPILLAR', 'MOSQUITO', 'CRICKET'],
    can_scavenge: true,
    reproduction_type: 'VIVIPAROUS',
    gestation_period: 30,
    clutch_size: [1, 1],
  },

  MOSQUITO: {
    id: 'MOSQUITO',
    name: 'Mosquito',
    emoji: '🦟',
    can_fly: true,
    diet: 'HERBIVORE',
    reproduction: 'SEXUAL',
    color: 0x556655,
    speed: 8,
    vision_range: 8,
    max_energy: 40,
    max_hunger: 60,
    max_thirst: 60,
    max_age: 600,
    mature_age: 30,
    life_stage_ages: [8, 18, 30],
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
    mate_cooldown: 12,
    decision_interval: 2,
    walkable_terrain: ['WATER', 'DEEP_WATER', 'SAND', 'DIRT', 'SOIL', 'FERTILE_SOIL', 'MUD'],
    edible_plants: ['GRASS', 'SUNFLOWER', 'STRAWBERRY', 'BLUEBERRY', 'CARROT', 'POTATO', 'CHILI_PEPPER'],
    prey_species: [],
    can_scavenge: false,
    reproduction_type: 'OVIPAROUS',
    incubation_period: 12,
    clutch_size: [1, 2],
    egg_hp: 5,
  },

  CATERPILLAR: {
    id: 'CATERPILLAR',
    name: 'Caterpillar',
    emoji: '🐛',
    diet: 'HERBIVORE',
    reproduction: 'SEXUAL',
    color: 0x88bb33,
    speed: 4,
    vision_range: 5,
    max_energy: 50,
    max_hunger: 70,
    max_thirst: 70,
    max_age: 800,
    mature_age: 40,
    life_stage_ages: [10, 25, 40],
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
    initial_count: 120,
    max_population: POP_INSECT,
    mate_cooldown: 15,
    decision_interval: 3,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'FERTILE_SOIL', 'MUD'],
    edible_plants: ['GRASS', 'STRAWBERRY', 'CARROT', 'TOMATO', 'SUNFLOWER', 'OAK_TREE', 'APPLE_TREE', 'POTATO', 'CHILI_PEPPER', 'OLIVE_TREE'],
    prey_species: [],
    can_scavenge: false,
    reproduction_type: 'METAMORPHOSIS',
    incubation_period: 20,
    clutch_size: [1, 2],
    egg_hp: 8,
    pupa_age: 30,
    pupa_duration: 60,
  },

  CRICKET: {
    id: 'CRICKET',
    name: 'Cricket',
    emoji: '🦗',
    diet: 'HERBIVORE',
    reproduction: 'SEXUAL',
    color: 0x6f9933,
    speed: 8,
    vision_range: 6,
    max_energy: 45,
    max_hunger: 70,
    max_thirst: 70,
    max_age: 700,
    mature_age: 35,
    life_stage_ages: [10, 22, 35],
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
    initial_count: 90,
    max_population: POP_INSECT,
    mate_cooldown: 14,
    decision_interval: 2,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'FERTILE_SOIL', 'MUD'],
    edible_plants: ['GRASS', 'SUNFLOWER', 'POTATO', 'CHILI_PEPPER'],
    prey_species: [],
    can_scavenge: false,
    reproduction_type: 'OVIPAROUS',
    incubation_period: 18,
    clutch_size: [1, 2],
    egg_hp: 8,
  },

  LIZARD: {
    id: 'LIZARD',
    name: 'Lizard',
    emoji: '🦎',
    diet: 'OMNIVORE',
    reproduction: 'SEXUAL',
    color: 0x5a8f4b,
    speed: 4,
    vision_range: 11,
    max_energy: 85,
    max_hunger: 90,
    max_thirst: 80,
    max_age: 1300,
    mature_age: 75,
    life_stage_ages: [22, 45, 75],
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
    mate_cooldown: 40,
    decision_interval: 2,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'ROCK', 'FERTILE_SOIL', 'MUD'],
    edible_plants: ['GRASS', 'BLUEBERRY', 'POTATO', 'CHILI_PEPPER', 'OLIVE_TREE'],
    prey_species: ['BEETLE', 'MOSQUITO', 'CATERPILLAR', 'CRICKET'],
    can_scavenge: true,
    reproduction_type: 'OVIPAROUS',
    incubation_period: 30,
    clutch_size: [1, 2],
    egg_hp: 10,
  },

  SNAKE: {
    id: 'SNAKE',
    name: 'Snake',
    emoji: '🐍',
    diet: 'CARNIVORE',
    reproduction: 'SEXUAL',
    color: 0x448844,
    speed: 4,
    vision_range: 12,
    max_energy: 120,
    max_hunger: 100,
    max_thirst: 80,
    max_age: 1600,
    mature_age: 100,
    life_stage_ages: [30, 60, 100],
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
    mate_cooldown: 60,
    decision_interval: 2,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'ROCK', 'FERTILE_SOIL', 'MUD'],
    edible_plants: [],
    prey_species: ['RABBIT', 'SQUIRREL', 'BEETLE', 'MOSQUITO', 'CATERPILLAR', 'CROW', 'CRICKET', 'LIZARD'],
    can_scavenge: false,
    reproduction_type: 'OVIPAROUS',
    incubation_period: 45,
    clutch_size: [1, 2],
    egg_hp: 15,
  },

  HAWK: {
    id: 'HAWK',
    name: 'Hawk',
    emoji: '🦅',
    can_fly: true,
    diet: 'CARNIVORE',
    reproduction: 'SEXUAL',
    color: 0xaa6622,
    speed: 12,
    vision_range: 20,
    max_energy: 110,
    max_hunger: 100,
    max_thirst: 80,
    max_age: 1800,
    mature_age: 110,
    life_stage_ages: [30, 65, 110],
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
    mate_cooldown: 65,
    decision_interval: 2,
    walkable_terrain: ['WATER', 'DEEP_WATER', 'SAND', 'DIRT', 'SOIL', 'ROCK', 'FERTILE_SOIL', 'MOUNTAIN', 'MUD'],
    edible_plants: [],
    prey_species: ['RABBIT', 'SQUIRREL', 'BEETLE', 'MOSQUITO', 'CATERPILLAR', 'SNAKE', 'CROW', 'CRICKET', 'LIZARD'],
    can_scavenge: false,
    reproduction_type: 'OVIPAROUS',
    incubation_period: 40,
    clutch_size: [1, 2],
    egg_hp: 20,
  },

  CROCODILE: {
    id: 'CROCODILE',
    name: 'Crocodile',
    emoji: '🐊',
    diet: 'CARNIVORE',
    reproduction: 'SEXUAL',
    color: 0x556b2f,
    speed: 4,
    vision_range: 12,
    max_energy: 180,
    max_hunger: 100,
    max_thirst: 60,
    max_age: 2400,
    mature_age: 160,
    life_stage_ages: [50, 100, 160],
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
    mate_cooldown: 100,
    decision_interval: 3,
    walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'FERTILE_SOIL', 'MUD'],
    edible_plants: [],
    prey_species: ['RABBIT', 'DEER', 'GOAT', 'BOAR', 'RACCOON', 'SNAKE', 'LIZARD'],
    can_scavenge: true,
    reproduction_type: 'OVIPAROUS',
    incubation_period: 70,
    clutch_size: [1, 2],
    egg_hp: 25,
  },
};

/** Sum of all species' base max_population (used to proportionally distribute global cap) */
export const BASE_POP_TOTAL = Object.values(ANIMAL_SPECIES)
  .reduce((sum, sp) => sum + (sp.max_population || 0), 0);

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
export const HERBIVORE_IDS = ALL_ANIMAL_IDS.filter(k => ANIMAL_SPECIES[k].diet === 'HERBIVORE');

/** Only carnivore keys */
export const CARNIVORE_IDS = ALL_ANIMAL_IDS.filter(k => ANIMAL_SPECIES[k].diet === 'CARNIVORE');

/** Only omnivore keys */
export const OMNIVORE_IDS = ALL_ANIMAL_IDS.filter(k => ANIMAL_SPECIES[k].diet === 'OMNIVORE');

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
export function buildAnimalSpeciesConfig() {
  const cfg = {};
  for (const [key, sp] of Object.entries(ANIMAL_SPECIES)) {
    const { id, name, color, initial_count, ...rawSimParams } = sp;
    const simParams = _mergeAnimalDefaults(rawSimParams);
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

export default ANIMAL_SPECIES;
