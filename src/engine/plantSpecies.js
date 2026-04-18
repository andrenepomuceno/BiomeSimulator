/**
 * Plant species library — canonical registry of all plant species.
 *
 * Each entry defines the plant's simulation parameters, display info,
 * growth thresholds, and rendering data. flora.js reads from here.
 *
 */
import { TERRAIN_IDS } from './world.js';
import { DEFAULT_TICKS_PER_GAME_MINUTE } from '../constants/simulation.js';
import { gameMinuteArrayToTicks, gameMinutesToTicks, scaleRateForTicks } from '../utils/gameTime.js';

const PLANT_SPECIES = {
  GRASS: {
    id: 'GRASS',
    typeId: 1,
    name: 'Grass',
    emoji: { seed: '🌱', youngSprout: '🌿', adultSprout: '🌾', adult: '🌾', fruit: '🌾' },
    fruitEmoji: '🌾',
    sex: 'ASEXUAL',
    reproduction: 'SEED',
    productionChance: 0.038,
    stageAges: [24, 84, 160, 1050],
    fruitSpoilAge: 443,    edibleStages: [1, 4],    colors: {
      seed:        [130, 170, 80,  40],
      youngSprout: [90,  165, 60,  100],
      adultSprout: [55,  145, 35,  170],
      adult:       [80,  170, 45,  200],
      fruit:       [200, 210, 80,  200],
    },
    fruitColor: [200, 210, 80, 200],
    waterAffinity: 'low',
    terrainGrowth: { SOIL: 1.05, DIRT: 1.0, FERTILE_SOIL: 1.5, ROCK: 0.8, MOUNTAIN: 0.7, MUD: 0.2 },
    swayStages: [2, 3, 4],  // youngSprout, adultSprout, adult sway; seed & fruit static
  },

  STRAWBERRY: {
    id: 'STRAWBERRY',
    itemKey: 'STRAWBERRY',
    typeId: 2,
    name: 'Strawberry',
    emoji: { seed: '🌱', youngSprout: '🌿', adultSprout: '☘️', adult: '☘️', fruit: '🍓' },
    fruitEmoji: '🍓',
    sex: 'HERMAPHRODITE',
    reproduction: 'FRUIT',
    productionChance: 0.018,
    stageAges: [55, 222, 554, 2215],
    fruitSpoilAge: 554,
    edibleStages: [1, 5],
    colors: {
      seed:        [110, 160, 80,  45],
      youngSprout: [70,  150, 55,  110],
      adultSprout: [40,  130, 30,  190],
      adult:       [35,  140, 25,  220],
      fruit:       [240, 50,  60,  230],
    },
    fruitColor: [240, 50, 60, 230],
    waterAffinity: 'medium',
    terrainGrowth: { SOIL: 1.0, DIRT: 0.0, FERTILE_SOIL: 1.6, ROCK: 0.0, MOUNTAIN: 0.0, MUD: 0.0 },
    swayStages: [2, 3, 4],
  },

  BLUEBERRY: {
    id: 'BLUEBERRY',
    itemKey: 'BLUEBERRY',
    typeId: 3,
    name: 'Blueberry',
    emoji: { seed: '🌱', youngSprout: '🌿', adultSprout: '☘️', adult: '☘️', fruit: '🫐' },
    fruitEmoji: '🫐',
    sex: 'HERMAPHRODITE',
    reproduction: 'FRUIT',
    productionChance: 0.016,
    stageAges: [83, 305, 775, 3046],
    fruitSpoilAge: 609,
    edibleStages: [1, 5],
    colors: {
      seed:        [100, 140, 110, 45],
      youngSprout: [65,  130, 90,  110],
      adultSprout: [45,  110, 70,  190],
      adult:       [40,  120, 65,  220],
      fruit:       [100, 50,  210, 230],
    },
    fruitColor: [100, 50, 210, 230],
    waterAffinity: 'medium',
    terrainGrowth: { SOIL: 1.0, DIRT: 0.0, FERTILE_SOIL: 1.5, ROCK: 0.0, MOUNTAIN: 0.0, MUD: 0.0 },
    swayStages: [2, 3, 4],
  },

  APPLE_TREE: {
    id: 'APPLE_TREE',
    itemKey: 'APPLE',
    typeId: 4,
    name: 'Apple Tree',
    emoji: { seed: '🌱', youngSprout: '🌿', adultSprout: '🌳', adult: '🌳', fruit: '🍎' },
    fruitEmoji: '🍎',
    sex: 'HERMAPHRODITE',
    reproduction: 'FRUIT',
    productionChance: 0.012,
    stageAges: [194, 775, 1938, 8862],
    fruitSpoilAge: 665,
    edibleStages: [],
    dropProfile: { itemType: 'FRUIT', countRange: [1, 3], seedGerminationTicks: 500 },
    colors: {
      seed:        [80,  110, 55,  35],
      youngSprout: [45,  100, 35,  100],
      adultSprout: [25,  85,  15,  210],
      adult:       [20,  90,  10,  230],
      fruit:       [210, 55,  45,  230],
    },
    fruitColor: [210, 55, 45, 230],
    waterAffinity: 'high',
    terrainGrowth: { SOIL: 1.0, DIRT: 0.5, FERTILE_SOIL: 1.6, ROCK: 0.0, MOUNTAIN: 0.0, MUD: 0.0 },
    swayStages: [2, 3, 4],
  },

  MANGO_TREE: {
    id: 'MANGO_TREE',
    itemKey: 'MANGO',
    typeId: 5,
    name: 'Mango Tree',
    emoji: { seed: '🌱', youngSprout: '🌿', adultSprout: '🌳', adult: '🌳', fruit: '🥭' },
    fruitEmoji: '🥭',
    sex: 'HERMAPHRODITE',
    reproduction: 'FRUIT',
    productionChance: 0.012,
    stageAges: [222, 997, 2326, 9969],
    fruitSpoilAge: 665,
    edibleStages: [],
    dropProfile: { itemType: 'FRUIT', countRange: [1, 3], seedGerminationTicks: 600 },
    colors: {
      seed:        [85,  120, 50,  35],
      youngSprout: [50,  108, 30,  100],
      adultSprout: [30,  95,  18,  210],
      adult:       [25,  100, 14,  230],
      fruit:       [250, 190, 40,  230],
    },
    fruitColor: [250, 190, 40, 230],
    waterAffinity: 'high',
    terrainGrowth: { SOIL: 1.1, DIRT: 0.5, FERTILE_SOIL: 1.6, ROCK: 0.0, MOUNTAIN: 0.0, MUD: 0.0 },
    swayStages: [2, 3, 4],
  },

  CARROT: {
    id: 'CARROT',
    typeId: 6,
    name: 'Carrot',
    emoji: { seed: '🌱', youngSprout: '🌿', adultSprout: '🥬', adult: '🥬', fruit: '🥕' },
    fruitEmoji: '🥕',
    sex: 'ASEXUAL',
    reproduction: 'SEED',
    productionChance: 0.02,
    stageAges: [44, 194, 443, 1938],
    fruitSpoilAge: 775,
    edibleStages: [1, 4],
    colors: {
      seed:        [140, 150, 90,  40],
      youngSprout: [110, 145, 55,  105],
      adultSprout: [80,  130, 40,  185],
      adult:       [70,  140, 35,  210],
      fruit:       [245, 140, 30,  230],
    },
    fruitColor: [245, 140, 30, 230],
    waterAffinity: 'low',
    terrainGrowth: { SOIL: 0.9, DIRT: 1.3, FERTILE_SOIL: 1.5, ROCK: 0.0, MOUNTAIN: 0.0, MUD: 0.8 },
    swayStages: [2, 3, 4],
  },

  SUNFLOWER: {
    id: 'SUNFLOWER',
    typeId: 7,
    name: 'Sunflower',
    emoji: { seed: '🌱', youngSprout: '🌿', adultSprout: '🌼', adult: '🌻', fruit: '🌻' },
    fruitEmoji: '🌻',
    sex: 'HERMAPHRODITE',
    reproduction: 'SEED',
    productionChance: 0.015,
    stageAges: [44, 210, 554, 2769],
    fruitSpoilAge: 554,
    edibleStages: [1, 4],
    colors: {
      seed:        [150, 160, 70,  40],
      youngSprout: [100, 155, 55,  100],
      adultSprout: [180, 170, 30,  170],
      adult:       [220, 190, 20,  220],
      fruit:       [230, 200, 30,  230],
    },
    fruitColor: [230, 200, 30, 230],
    waterAffinity: 'medium',
    terrainGrowth: { SOIL: 1.3, DIRT: 0.7, FERTILE_SOIL: 1.4, ROCK: 0.0, MOUNTAIN: 0.0, MUD: 0.0 },
    swayStages: [2, 3, 4, 5],  // sunflowers sway even at fruit
  },

  TOMATO: {
    id: 'TOMATO',
    typeId: 8,
    name: 'Tomato',
    emoji: { seed: '🌱', youngSprout: '🌿', adultSprout: '🪴', adult: '🪴', fruit: '🍅' },
    fruitEmoji: '🍅',
    sex: 'HERMAPHRODITE',
    reproduction: 'FRUIT',
    productionChance: 0.014,
    stageAges: [55, 249, 665, 2492],
    fruitSpoilAge: 498,
    edibleStages: [1, 5],
    colors: {
      seed:        [120, 155, 80,  45],
      youngSprout: [75,  145, 50,  110],
      adultSprout: [50,  125, 35,  190],
      adult:       [40,  135, 30,  220],
      fruit:       [230, 45,  35,  240],
    },
    fruitColor: [230, 45, 35, 240],
    waterAffinity: 'high',
    terrainGrowth: { SOIL: 1.1, DIRT: 0.5, FERTILE_SOIL: 1.7, ROCK: 0.3, MOUNTAIN: 0.2, MUD: 0.5 },
    swayStages: [2, 3, 4],
  },

  MUSHROOM: {
    id: 'MUSHROOM',
    typeId: 9,
    name: 'Mushroom',
    emoji: { seed: '🌱', youngSprout: '🌿', adultSprout: '🍄', adult: '🍄', fruit: '🍄' },
    fruitEmoji: '🍄',
    sex: 'ASEXUAL',
    reproduction: 'SEED',
    productionChance: 0.022,
    stageAges: [33, 122, 277, 1218],
    fruitSpoilAge: 388,
    edibleStages: [1, 4],
    colors: {
      seed:        [160, 130, 100, 35],
      youngSprout: [140, 110, 85,  90],
      adultSprout: [180, 100, 70,  170],
      adult:       [190, 90,  60,  210],
      fruit:       [200, 80,  50,  230],
    },
    fruitColor: [200, 80, 50, 230],
    waterAffinity: 'low',
    terrainGrowth: { SOIL: 0.8, DIRT: 1.2, FERTILE_SOIL: 1.0, ROCK: 1.0, MOUNTAIN: 0.7, MUD: 1.4 },
    swayStages: [],  // mushrooms are rigid — no sway
  },

  OAK_TREE: {
    id: 'OAK_TREE',
    typeId: 10,
    name: 'Oak Tree',
    emoji: { seed: '🌱', youngSprout: '🌿', adultSprout: '🌳', adult: '🌳', fruit: '🌰' },
    fruitEmoji: '🌰',
    sex: 'HERMAPHRODITE',
    reproduction: 'SEED',
    productionChance: 0.008,
    stageAges: [277, 1218, 2769, 13846],
    fruitSpoilAge: 831,
    edibleStages: [],
    dropProfile: { itemType: 'SEED', countRange: [1, 3], seedGerminationTicks: 400 },
    colors: {
      seed:        [75,  105, 50,  35],
      youngSprout: [40,  95,  30,  100],
      adultSprout: [20,  80,  12,  200],
      adult:       [15,  75,  8,   235],
      fruit:       [140, 100, 40,  230],
    },
    fruitColor: [140, 100, 40, 230],
    waterAffinity: 'high',
    terrainGrowth: { SOIL: 1.2, DIRT: 0.5, FERTILE_SOIL: 1.6, ROCK: 0.0, MOUNTAIN: 1.0, MUD: 0.0 },
    swayStages: [2, 3, 4],
  },

  CACTUS: {
    id: 'CACTUS',
    typeId: 11,
    name: 'Cactus',
    emoji: { seed: '🌱', youngSprout: '🌿', adultSprout: '🌵', adult: '🌵', fruit: '🌵' },
    fruitEmoji: '🌵',
    sex: 'HERMAPHRODITE',
    reproduction: 'SEED',
    productionChance: 0.004,
    stageAges: [166, 665, 1662, 8862],
    fruitSpoilAge: 1108,
    edibleStages: [1],
    colors: {
      seed:        [130, 160, 80,  35],
      youngSprout: [80,  140, 55,  100],
      adultSprout: [50,  120, 40,  190],
      adult:       [40,  110, 35,  220],
      fruit:       [60,  130, 45,  230],
    },
    fruitColor: [60, 130, 45, 230],
    waterAffinity: 'none',
    terrainGrowth: { SOIL: 0.2, DIRT: 0.8, SAND: 1.5, FERTILE_SOIL: 0.3, ROCK: 0.5, MOUNTAIN: 0.0, MUD: 0.0 },
    swayStages: [],  // cacti are rigid — no sway
  },

  COCONUT_PALM: {
    id: 'COCONUT_PALM',
    itemKey: 'COCONUT',
    typeId: 12,
    name: 'Coconut Palm',
    emoji: { seed: '🌱', youngSprout: '🌿', adultSprout: '🌴', adult: '🌴', fruit: '🥥' },
    fruitEmoji: '🥥',
    sex: 'HERMAPHRODITE',
    reproduction: 'FRUIT',
    productionChance: 0.005,
    stageAges: [332, 1440, 3212, 13292],
    fruitSpoilAge: 886,
    edibleStages: [],
    dropProfile: { itemType: 'FRUIT', countRange: [1, 2], seedGerminationTicks: 800 },
    colors: {
      seed:        [90,  120, 55,  35],
      youngSprout: [55,  110, 35,  100],
      adultSprout: [35,  95,  20,  210],
      adult:       [30,  100, 18,  230],
      fruit:       [160, 120, 60,  230],
    },
    fruitColor: [160, 120, 60, 230],
    waterAffinity: 'high',
    terrainGrowth: { SOIL: 0.6, DIRT: 0.3, SAND: 1.4, FERTILE_SOIL: 1.0, ROCK: 0.0, MOUNTAIN: 0.0, MUD: 0.4 },
    swayStages: [2, 3, 4],  // palm fronds sway; coconut fruit static
  },

  POTATO: {
    id: 'POTATO',
    typeId: 13,
    name: 'Potato',
    emoji: { seed: '🌱', youngSprout: '🌿', adultSprout: '🥬', adult: '🥬', fruit: '🥔' },
    fruitEmoji: '🥔',
    sex: 'ASEXUAL',
    reproduction: 'SEED',
    productionChance: 0.019,
    stageAges: [66, 233, 526, 2326],
    fruitSpoilAge: 720,
    edibleStages: [1, 4],
    colors: {
      seed:        [125, 150, 90,  40],
      youngSprout: [90,  140, 60,  105],
      adultSprout: [65,  120, 45,  185],
      adult:       [55,  130, 40,  215],
      fruit:       [185, 145, 85,  230],
    },
    fruitColor: [185, 145, 85, 230],
    waterAffinity: 'low',
    terrainGrowth: { SOIL: 1.0, DIRT: 1.1, FERTILE_SOIL: 1.6, ROCK: 0.0, MOUNTAIN: 0.6, MUD: 0.9 },
    swayStages: [2, 3, 4],
  },

  CHILI_PEPPER: {
    id: 'CHILI_PEPPER',
    typeId: 14,
    name: 'Chili Pepper',
    emoji: { seed: '🌱', youngSprout: '🌿', adultSprout: '🪴', adult: '🪴', fruit: '🌶️' },
    fruitEmoji: '🌶️',
    sex: 'HERMAPHRODITE',
    reproduction: 'FRUIT',
    productionChance: 0.013,
    stageAges: [61, 255, 692, 2769],
    fruitSpoilAge: 526,
    edibleStages: [1, 5],
    colors: {
      seed:        [130, 150, 80,  40],
      youngSprout: [85,  140, 50,  110],
      adultSprout: [55,  120, 35,  190],
      adult:       [45,  130, 30,  220],
      fruit:       [220, 55,  45,  235],
    },
    fruitColor: [220, 55, 45, 235],
    waterAffinity: 'medium',
    terrainGrowth: { SOIL: 1.0, DIRT: 0.7, SAND: 0.8, FERTILE_SOIL: 1.7, ROCK: 0.2, MOUNTAIN: 0.0, MUD: 0.4 },
    swayStages: [2, 3, 4],
  },

  OLIVE_TREE: {
    id: 'OLIVE_TREE',
    itemKey: 'OLIVE',
    typeId: 15,
    name: 'Olive Tree',
    emoji: { seed: '🌱', youngSprout: '🌿', adultSprout: '🌳', adult: '🌳', fruit: '🫒' },
    fruitEmoji: '🫒',
    sex: 'HERMAPHRODITE',
    reproduction: 'FRUIT',
    productionChance: 0.007,
    stageAges: [305, 1329, 3102, 14400],
    fruitSpoilAge: 858,
    edibleStages: [],
    dropProfile: { itemType: 'FRUIT', countRange: [1, 3], seedGerminationTicks: 450 },
    colors: {
      seed:        [90,  115, 60,  35],
      youngSprout: [55,  105, 38,  100],
      adultSprout: [35,  90,  22,  210],
      adult:       [30,  95,  20,  230],
      fruit:       [115, 150, 55,  230],
    },
    fruitColor: [115, 150, 55, 230],
    waterAffinity: 'medium',
    terrainGrowth: { SOIL: 1.1, DIRT: 0.6, SAND: 0.7, FERTILE_SOIL: 1.5, ROCK: 0.0, MOUNTAIN: 0.0, MUD: 0.2 },
    swayStages: [2, 3, 4],
  },
};

/** Ordered list of all plant species keys */
export const ALL_PLANT_IDS = Object.keys(PLANT_SPECIES);

/** String→number lookup for plant types (used by animalSpecies config builder). */
export const PLANT_IDS = Object.fromEntries(
  Object.values(PLANT_SPECIES).map(sp => [sp.id, sp.typeId])
);

// Chart / UI presentation data per species.  Keyed by species id.
// chartColor = hex color for Chart.js datasets.
// chartEmoji = single representative emoji for UI labels.
const PLANT_UI_DATA = {
  GRASS:        { chartColor: '#7fbb5c', chartEmoji: '🌱' },
  STRAWBERRY:   { chartColor: '#ff6b6b', chartEmoji: '🍓' },
  BLUEBERRY:    { chartColor: '#6b6bff', chartEmoji: '🫐' },
  APPLE_TREE:   { chartColor: '#66aa44', chartEmoji: '🍎' },
  MANGO_TREE:   { chartColor: '#ffaa33', chartEmoji: '🥭' },
  CARROT:       { chartColor: '#ff8844', chartEmoji: '🥕' },
  SUNFLOWER:    { chartColor: '#ffdd44', chartEmoji: '🌻' },
  TOMATO:       { chartColor: '#ff4444', chartEmoji: '🍅' },
  MUSHROOM:     { chartColor: '#aa8866', chartEmoji: '🍄' },
  OAK_TREE:     { chartColor: '#8B6914', chartEmoji: '🌳' },
  CACTUS:       { chartColor: '#88cc88', chartEmoji: '🌵' },
  COCONUT_PALM: { chartColor: '#44bb88', chartEmoji: '🌴' },
  POTATO:       { chartColor: '#b08b57', chartEmoji: '🥔' },
  CHILI_PEPPER: { chartColor: '#dd4b39', chartEmoji: '🌶️' },
  OLIVE_TREE:   { chartColor: '#7da34e', chartEmoji: '🫒' },
};

const TREE_PLANTS = ['APPLE_TREE', 'MANGO_TREE', 'OAK_TREE', 'COCONUT_PALM', 'OLIVE_TREE'];
const LOW_PLANTS = ['GRASS', 'MUSHROOM', 'CARROT', 'POTATO'];
const DESERT_PLANTS = ['CACTUS', 'COCONUT_PALM', 'CHILI_PEPPER'];

const SPAWN_WEIGHTS = {
  GRASS: { near: 8, mid: 14, far: 20 },
  STRAWBERRY: { near: 7, mid: 6, far: 5 },
  BLUEBERRY: { near: 7, mid: 6, far: 5 },
  APPLE_TREE: { near: 8, mid: 8, far: 4 },
  MANGO_TREE: { near: 8, mid: 7, far: 4 },
  CARROT: { near: 5, mid: 7, far: 8 },
  SUNFLOWER: { near: 7, mid: 8, far: 9 },
  TOMATO: { near: 8, mid: 8, far: 5 },
  MUSHROOM: { near: 6, mid: 8, far: 11 },
  OAK_TREE: { near: 8, mid: 7, far: 8 },
  POTATO: { near: 6, mid: 7, far: 9 },
  CHILI_PEPPER: { near: 5, mid: 5, far: 6 },
  CACTUS: { near: 5, mid: 4, far: 5 },
  COCONUT_PALM: { near: 8, mid: 3, far: 2 },
  OLIVE_TREE: { near: 5, mid: 2, far: 1 },
};

const PLANT_POPULATION_MAX_FACTOR = 4;

function _basePlantPopulationWeight(spawnWeights) {
  const near = spawnWeights?.near ?? 0;
  const mid = spawnWeights?.mid ?? 0;
  const far = spawnWeights?.far ?? 0;
  return near + mid + far;
}

/** Lookup by typeId → species object */
export function getPlantByTypeId(typeId) {
  return Object.values(PLANT_SPECIES).find(p => p.typeId === typeId) || null;
}

/**
 * Build the STAGE_AGES map indexed by typeId for flora.js.
 * Returns { 1: [10,40,80,300], 2: [15,60,150,500], ... }
 */
export function buildStageAges(ticksPerGameMinute = DEFAULT_TICKS_PER_GAME_MINUTE) {
  const map = {};
  for (const sp of Object.values(PLANT_SPECIES)) {
    map[sp.typeId] = gameMinuteArrayToTicks(sp.stageAges, ticksPerGameMinute);
  }
  return map;
}

/**
 * Build a typeId → display name map (includes 0: 'None').
 * Returns { 0: 'None', 1: 'Grass', 2: 'Strawberry', ... }
 */
export function buildPlantTypeNames() {
  const map = { 0: 'None' };
  for (const sp of Object.values(PLANT_SPECIES)) {
    map[sp.typeId] = sp.name;
  }
  return map;
}

/**
 * Build a typeId → sex/reproduction string map.
 * Returns { 1: 'ASEXUAL', 2: 'HERMAPHRODITE', ... }
 */
export function buildPlantTypeSex() {
  const map = {};
  for (const sp of Object.values(PLANT_SPECIES)) {
    map[sp.typeId] = sp.sex;
  }
  return map;
}

/**
 * Build the FRUIT_SPOIL_AGE map indexed by typeId for flora.js.
 * Returns { 1: 60, 2: 80, ... }
 */
export function buildFruitSpoilAges(ticksPerGameMinute = DEFAULT_TICKS_PER_GAME_MINUTE) {
  const map = {};
  for (const sp of Object.values(PLANT_SPECIES)) {
    map[sp.typeId] = gameMinutesToTicks(sp.fruitSpoilAge, ticksPerGameMinute);
  }
  return map;
}

/**
 * Build the PLANT_COLORS map indexed by "typeId_stageNum" for terrainColors.js.
 * Stages: 1=seed, 2=youngSprout, 3=adultSprout, 4=adult, 5=fruit
 * Returns { "1_1": [r,g,b,a], "1_2": ..., "1_5": ..., ... }
 */
export function buildPlantColors() {
  const stageNames = ['seed', 'youngSprout', 'adultSprout', 'adult', 'fruit'];
  const map = {};
  for (const sp of Object.values(PLANT_SPECIES)) {
    stageNames.forEach((name, i) => {
      map[`${sp.typeId}_${i + 1}`] = sp.colors[name];
    });
    // Stage 6 (dead) uses a shared desaturated palette for all species.
    map[`${sp.typeId}_6`] = [138, 122, 85, 170];
  }
  return map;
}

/**
 * Build the FRUIT_COLORS map indexed by typeId for terrainColors.js / FruitLayer.
 * Returns { 1: [r,g,b,a], 2: [r,g,b,a], ... }
 */
export function buildFruitColors() {
  const map = {};
  for (const sp of Object.values(PLANT_SPECIES)) {
    map[sp.typeId] = sp.fruitColor;
  }
  return map;
}

/**
 * Build the PLANT_EMOJI_MAP indexed by "typeId_stageNum" for emojiTextures.js.
 * Stages: 1=seed, 2=youngSprout, 3=adultSprout, 4=adult, 5=fruit
 * Returns { "1_1": "🌱", "1_4": "🌾", "1_5": "🌾", ... }
 */
export function buildPlantEmojiMap() {
  const stageNames = ['seed', 'youngSprout', 'adultSprout', 'adult', 'fruit'];
  const map = {};
  for (const sp of Object.values(PLANT_SPECIES)) {
    stageNames.forEach((name, i) => {
      map[`${sp.typeId}_${i + 1}`] = sp.emoji[name];
    });
  }
  return map;
}

/**
 * Build the SWAY_STAGES map indexed by typeId.
 * Returns { 1: Set{2,3,4}, 9: Set{}, 11: Set{}, ... }
 * Stages in the set get wind sway animation; others are static.
 */
export function buildSwayStages() {
  const map = {};
  for (const sp of Object.values(PLANT_SPECIES)) {
    map[sp.typeId] = new Set(sp.swayStages || []);
  }
  return map;
}

/**
 * Build the FRUIT_EMOJI_MAP indexed by typeId.
 * Returns { 1: "🌾", 2: "🍓", ... }
 */
export function buildFruitEmojiMap() {
  const map = {};
  for (const sp of Object.values(PLANT_SPECIES)) {
    map[sp.typeId] = sp.fruitEmoji;
  }
  return map;
}

/**
 * Build the PRODUCTION_CHANCE map indexed by typeId.
 * Returns { 1: 0.008, 2: 0.005, ... }
 */
export function buildProductionChances(ticksPerGameMinute = DEFAULT_TICKS_PER_GAME_MINUTE) {
  const map = {};
  for (const sp of Object.values(PLANT_SPECIES)) {
    map[sp.typeId] = scaleRateForTicks(sp.productionChance, ticksPerGameMinute);
  }
  return map;
}

/**
 * Build the TERRAIN_GROWTH map indexed by typeId.
 * Returns { 1: { 3: 1.3, 2: 0.8, ... }, 2: { ... }, ... }
 */
export function buildTerrainGrowthMap() {
  const map = {};
  for (const sp of Object.values(PLANT_SPECIES)) {
    const tg = sp.terrainGrowth || {};
    const resolved = {};
    for (const [name, mult] of Object.entries(tg)) {
      resolved[TERRAIN_IDS[name]] = mult;
    }
    map[sp.typeId] = resolved;
  }
  return map;
}

/**
 * Build the REPRODUCTION_MODE map indexed by typeId.
 * Returns { 1: 'SEED', 2: 'FRUIT', ... }
 */
export function buildReproductionModes() {
  const map = {};
  for (const sp of Object.values(PLANT_SPECIES)) {
    map[sp.typeId] = sp.reproduction;
  }
  return map;
}

/**
 * Build the WATER_AFFINITY map indexed by typeId.
 * Returns { 1: 1, 2: 2, ... } where 0=none, 1=low, 2=medium, 3=high
 */
const AFFINITY_LEVELS = { none: 0, low: 1, medium: 2, high: 3 };
export function buildWaterAffinityMap() {
  const map = {};
  for (const sp of Object.values(PLANT_SPECIES)) {
    map[sp.typeId] = AFFINITY_LEVELS[sp.waterAffinity] ?? 1;
  }
  return map;
}

/**
 * Build the EDIBLE_STAGES map indexed by typeId.
 * Returns { 1: Set([1, 4]), 2: Set([1, 5]), ... }
 */
export function buildEdibleStagesMap() {
  const map = {};
  for (const sp of Object.values(PLANT_SPECIES)) {
    map[sp.typeId] = new Set(sp.edibleStages || []);
  }
  return map;
}

export function buildTreeTypes() {
  return new Set(TREE_PLANTS.map(id => PLANT_IDS[id]).filter(Boolean));
}

export function buildLowPlantTypes() {
  return new Set(LOW_PLANTS.map(id => PLANT_IDS[id]).filter(Boolean));
}

export function buildDesertPlantTypes() {
  return new Set(DESERT_PLANTS.map(id => PLANT_IDS[id]).filter(Boolean));
}

export function buildSpawnWeightMap() {
  const map = {};
  for (const [id, weights] of Object.entries(SPAWN_WEIGHTS)) {
    const typeId = PLANT_IDS[id];
    if (typeId == null) continue;
    map[typeId] = {
      near: weights.near ?? 0,
      mid: weights.mid ?? 0,
      far: weights.far ?? 0,
    };
  }
  return map;
}

/**
 * Build `initial_plant_counts` used by world generation.
 * Values are relative seed targets and are normalized against map capacity.
 */
export function buildInitialPlantCounts() {
  const counts = {};
  for (const [id, sp] of Object.entries(PLANT_SPECIES)) {
    const weight = _basePlantPopulationWeight(SPAWN_WEIGHTS[id]);
    counts[id] = sp.initial_count ?? Math.max(20, Math.round(weight * 12));
  }
  return counts;
}

/**
 * Build per-species maximum sliders for plant customization UI.
 */
export function buildPlantMaxCounts() {
  const max = {};
  const initial = buildInitialPlantCounts();
  for (const [id, value] of Object.entries(initial)) {
    const speciesMax = PLANT_SPECIES[id]?.max_population;
    max[id] = speciesMax ?? Math.max(80, Math.round(value * PLANT_POPULATION_MAX_FACTOR));
  }
  return max;
}

/**
 * Build a typeId → chart hex-color map for Chart.js datasets.
 * Returns { 1: '#7fbb5c', 2: '#ff6b6b', ... }
 */
export function buildPlantChartColors() {
  const map = {};
  for (const [id, sp] of Object.entries(PLANT_SPECIES)) {
    map[sp.typeId] = PLANT_UI_DATA[id]?.chartColor ?? '#888888';
  }
  return map;
}

/**
 * Build a typeId → single representative emoji for chart labels.
 * Returns { 1: '🌱', 2: '🍓', ... }
 */
export function buildPlantChartEmojis() {
  const map = {};
  for (const [id, sp] of Object.entries(PLANT_SPECIES)) {
    map[sp.typeId] = PLANT_UI_DATA[id]?.chartEmoji ?? '🌱';
  }
  return map;
}

/**
 * Build the plant placement list for the terrain editor UI.
 * Returns [{ key: 'GRASS_PLANT', emoji: '🌱', label: 'Grass' }, ...]
 */
export function buildPlantPlaceTypes() {
  return Object.entries(PLANT_SPECIES).map(([id, sp]) => {
    const uiKey = id === 'GRASS' ? 'GRASS_PLANT' : id;
    return { key: uiKey, emoji: PLANT_UI_DATA[id]?.chartEmoji ?? '🌱', label: sp.name };
  });
}

export function buildTreeDropProfiles() {
  const map = {};
  for (const sp of Object.values(PLANT_SPECIES)) {
    if (sp.dropProfile) {
      map[sp.typeId] = {
        itemType: sp.dropProfile.itemType,
        countRange: sp.dropProfile.countRange,
        seedGerminationTicks: sp.dropProfile.seedGerminationTicks ?? 400,
      };
    }
  }
  return map;
}

/**
 * Build { [typeId]: 'FRUIT_${itemKey}_0' } for all plant species that produce
 * droppable fruit items. Used by ItemLayer to map item.source → texture key.
 */
export function buildFruitKeysBySource() {
  const map = {};
  for (const sp of Object.values(PLANT_SPECIES)) {
    if (sp.itemKey) map[sp.typeId] = `FRUIT_${sp.itemKey}_0`;
  }
  return map;
}

/**
 * Build { [typeId]: 'SEED_${itemKey}_0' } for all plant species that produce
 * droppable seed items. Used by ItemLayer to map item.source → texture key.
 */
export function buildSeedKeysBySource() {
  const map = {};
  for (const sp of Object.values(PLANT_SPECIES)) {
    if (sp.itemKey) map[sp.typeId] = `SEED_${sp.itemKey}_0`;
  }
  return map;
}

export default PLANT_SPECIES;
