/**
 * Plant species library — canonical registry of all plant species.
 *
 * Each entry defines the plant's simulation parameters, display info,
 * growth thresholds, and rendering data. flora.js reads from here.
 */

const PLANT_SPECIES = {
  GRASS: {
    id: 'GRASS',
    typeId: 1,
    name: 'Grass',
    emoji: { seed: '🌱', youngSprout: '🌿', adultSprout: '🌾', adult: '🌾', fruit: '🌾' },
    fruitEmoji: '🌾',
    sex: 'ASEXUAL',
    reproduction: 'SEED',
    productionChance: 0.008,
    stageAges: [10, 40, 80, 300],
    fruitSpoilAge: 60,
    colors: {
      seed:        [130, 170, 80,  40],
      youngSprout: [90,  165, 60,  100],
      adultSprout: [55,  145, 35,  170],
      adult:       [80,  170, 45,  200],
      fruit:       [200, 210, 80,  200],
    },
    fruitColor: [200, 210, 80, 200],
    waterAffinity: 'low',
  },

  STRAWBERRY: {
    id: 'STRAWBERRY',
    typeId: 2,
    name: 'Strawberry',
    emoji: { seed: '🌱', youngSprout: '🌿', adultSprout: '☘️', adult: '☘️', fruit: '🍓' },
    fruitEmoji: '🍓',
    sex: 'HERMAPHRODITE',
    reproduction: 'FRUIT',
    productionChance: 0.005,
    stageAges: [15, 60, 150, 500],
    fruitSpoilAge: 80,
    colors: {
      seed:        [110, 160, 80,  45],
      youngSprout: [70,  150, 55,  110],
      adultSprout: [40,  130, 30,  190],
      adult:       [35,  140, 25,  220],
      fruit:       [240, 50,  60,  230],
    },
    fruitColor: [240, 50, 60, 230],
    waterAffinity: 'medium',
  },

  BLUEBERRY: {
    id: 'BLUEBERRY',
    typeId: 3,
    name: 'Blueberry',
    emoji: { seed: '🌱', youngSprout: '🌿', adultSprout: '☘️', adult: '☘️', fruit: '🫐' },
    fruitEmoji: '🫐',
    sex: 'HERMAPHRODITE',
    reproduction: 'FRUIT',
    productionChance: 0.005,
    stageAges: [20, 80, 200, 700],
    fruitSpoilAge: 90,
    colors: {
      seed:        [100, 140, 110, 45],
      youngSprout: [65,  130, 90,  110],
      adultSprout: [45,  110, 70,  190],
      adult:       [40,  120, 65,  220],
      fruit:       [100, 50,  210, 230],
    },
    fruitColor: [100, 50, 210, 230],
    waterAffinity: 'medium',
  },

  APPLE_TREE: {
    id: 'APPLE_TREE',
    typeId: 4,
    name: 'Apple Tree',
    emoji: { seed: '🌱', youngSprout: '🌿', adultSprout: '🌳', adult: '🌳', fruit: '🍎' },
    fruitEmoji: '🍎',
    sex: 'HERMAPHRODITE',
    reproduction: 'FRUIT',
    productionChance: 0.003,
    stageAges: [50, 200, 500, 2000],
    fruitSpoilAge: 100,
    colors: {
      seed:        [80,  110, 55,  35],
      youngSprout: [45,  100, 35,  100],
      adultSprout: [25,  85,  15,  210],
      adult:       [20,  90,  10,  230],
      fruit:       [210, 55,  45,  230],
    },
    fruitColor: [210, 55, 45, 230],
    waterAffinity: 'high',
  },

  MANGO_TREE: {
    id: 'MANGO_TREE',
    typeId: 5,
    name: 'Mango Tree',
    emoji: { seed: '🌱', youngSprout: '🌿', adultSprout: '🌳', adult: '🌳', fruit: '🥭' },
    fruitEmoji: '🥭',
    sex: 'HERMAPHRODITE',
    reproduction: 'FRUIT',
    productionChance: 0.003,
    stageAges: [60, 250, 600, 2200],
    fruitSpoilAge: 100,
    colors: {
      seed:        [85,  120, 50,  35],
      youngSprout: [50,  108, 30,  100],
      adultSprout: [30,  95,  18,  210],
      adult:       [25,  100, 14,  230],
      fruit:       [250, 190, 40,  230],
    },
    fruitColor: [250, 190, 40, 230],
    waterAffinity: 'high',
  },

  CARROT: {
    id: 'CARROT',
    typeId: 6,
    name: 'Carrot',
    emoji: { seed: '🌱', youngSprout: '🌿', adultSprout: '🥬', adult: '🥬', fruit: '🥕' },
    fruitEmoji: '🥕',
    sex: 'ASEXUAL',
    reproduction: 'SEED',
    productionChance: 0.006,
    stageAges: [12, 50, 120, 400],
    fruitSpoilAge: 120,
    colors: {
      seed:        [140, 150, 90,  40],
      youngSprout: [110, 145, 55,  105],
      adultSprout: [80,  130, 40,  185],
      adult:       [70,  140, 35,  210],
      fruit:       [245, 140, 30,  230],
    },
    fruitColor: [245, 140, 30, 230],
    waterAffinity: 'low',
  },
};

/** Ordered list of all plant species keys */
export const ALL_PLANT_IDS = Object.keys(PLANT_SPECIES);

/** Lookup by typeId → species object */
export function getPlantByTypeId(typeId) {
  return Object.values(PLANT_SPECIES).find(p => p.typeId === typeId) || null;
}

/**
 * Build the STAGE_AGES map indexed by typeId for flora.js.
 * Returns { 1: [10,40,80,300], 2: [15,60,150,500], ... }
 */
export function buildStageAges() {
  const map = {};
  for (const sp of Object.values(PLANT_SPECIES)) {
    map[sp.typeId] = sp.stageAges;
  }
  return map;
}

/**
 * Build the FRUIT_SPOIL_AGE map indexed by typeId for flora.js.
 * Returns { 1: 60, 2: 80, ... }
 */
export function buildFruitSpoilAges() {
  const map = {};
  for (const sp of Object.values(PLANT_SPECIES)) {
    map[sp.typeId] = sp.fruitSpoilAge;
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
export function buildProductionChances() {
  const map = {};
  for (const sp of Object.values(PLANT_SPECIES)) {
    map[sp.typeId] = sp.productionChance;
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

export default PLANT_SPECIES;
