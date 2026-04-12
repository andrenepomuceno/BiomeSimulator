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
    emoji: { seed: '🌱', sprout: '🌿', mature: '🌾', fruiting: '🌾' },
    fruitEmoji: '🌾',
    sex: 'ASEXUAL',
    stageAges: [10, 40, 80, 300],
    fruitSpoilAge: 60,
    colors: {
      seed:     [130, 170, 80,  40],
      sprout:   [90,  165, 60,  100],
      mature:   [55,  145, 35,  170],
      fruiting: [180, 200, 60,  200],
    },
    fruitColor: [200, 210, 80, 200],
    waterAffinity: 'low',
  },

  STRAWBERRY: {
    id: 'STRAWBERRY',
    typeId: 2,
    name: 'Strawberry',
    emoji: { seed: '🌱', sprout: '🌿', mature: '☘️', fruiting: '🍓' },
    fruitEmoji: '🍓',
    sex: 'HERMAPHRODITE',
    stageAges: [15, 60, 150, 500],
    fruitSpoilAge: 80,
    colors: {
      seed:     [110, 160, 80,  45],
      sprout:   [70,  150, 55,  110],
      mature:   [40,  130, 30,  190],
      fruiting: [230, 40,  55,  240],
    },
    fruitColor: [240, 50, 60, 230],
    waterAffinity: 'medium',
  },

  BLUEBERRY: {
    id: 'BLUEBERRY',
    typeId: 3,
    name: 'Blueberry',
    emoji: { seed: '🌱', sprout: '🌿', mature: '☘️', fruiting: '🫐' },
    fruitEmoji: '🫐',
    sex: 'HERMAPHRODITE',
    stageAges: [20, 80, 200, 700],
    fruitSpoilAge: 90,
    colors: {
      seed:     [100, 140, 110, 45],
      sprout:   [65,  130, 90,  110],
      mature:   [45,  110, 70,  190],
      fruiting: [90,  45,  200, 240],
    },
    fruitColor: [100, 50, 210, 230],
    waterAffinity: 'medium',
  },

  APPLE_TREE: {
    id: 'APPLE_TREE',
    typeId: 4,
    name: 'Apple Tree',
    emoji: { seed: '🌱', sprout: '🌿', mature: '🌳', fruiting: '🍎' },
    fruitEmoji: '🍎',
    sex: 'HERMAPHRODITE',
    stageAges: [50, 200, 500, 2000],
    fruitSpoilAge: 100,
    colors: {
      seed:     [80,  110, 55,  35],
      sprout:   [45,  100, 35,  100],
      mature:   [25,  85,  15,  210],
      fruiting: [200, 45,  40,  250],
    },
    fruitColor: [210, 55, 45, 230],
    waterAffinity: 'high',
  },

  MANGO_TREE: {
    id: 'MANGO_TREE',
    typeId: 5,
    name: 'Mango Tree',
    emoji: { seed: '🌱', sprout: '🌿', mature: '🌳', fruiting: '🥭' },
    fruitEmoji: '🥭',
    sex: 'HERMAPHRODITE',
    stageAges: [60, 250, 600, 2200],
    fruitSpoilAge: 100,
    colors: {
      seed:     [85,  120, 50,  35],
      sprout:   [50,  108, 30,  100],
      mature:   [30,  95,  18,  210],
      fruiting: [240, 180, 35,  250],
    },
    fruitColor: [250, 190, 40, 230],
    waterAffinity: 'high',
  },

  CARROT: {
    id: 'CARROT',
    typeId: 6,
    name: 'Carrot',
    emoji: { seed: '🌱', sprout: '🌿', mature: '🥬', fruiting: '🥕' },
    fruitEmoji: '🥕',
    sex: 'ASEXUAL',
    stageAges: [12, 50, 120, 400],
    fruitSpoilAge: 120,
    colors: {
      seed:     [140, 150, 90,  40],
      sprout:   [110, 145, 55,  105],
      mature:   [80,  130, 40,  185],
      fruiting: [240, 130, 25,  235],
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
 * Returns { "1_1": [r,g,b,a], "1_2": ..., "2_4": ..., ... }
 */
export function buildPlantColors() {
  const stageNames = ['seed', 'sprout', 'mature', 'fruiting'];
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
 * Returns { "1_1": "🌱", "1_4": "🌾", "2_4": "🍓", ... }
 */
export function buildPlantEmojiMap() {
  const stageNames = ['seed', 'sprout', 'mature', 'fruiting'];
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

export default PLANT_SPECIES;
