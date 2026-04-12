/**
 * Terrain enum → RGBA color mapping.
 */

// Terrain types (must match backend)
export const WATER = 0;
export const SAND = 1;
export const DIRT = 2;
export const GRASS = 3;
export const ROCK = 4;

export const TERRAIN_COLORS = {
  [WATER]: [30, 100, 180, 255],
  [SAND]: [210, 190, 130, 255],
  [DIRT]: [140, 100, 60, 255],
  [GRASS]: [60, 150, 60, 255],
  [ROCK]: [120, 120, 130, 255],
};

export const TERRAIN_NAMES = {
  [WATER]: 'Water',
  [SAND]: 'Sand',
  [DIRT]: 'Dirt',
  [GRASS]: 'Grass',
  [ROCK]: 'Rock',
};

// Plant stage colors (type, stage) → RGBA
// Plant types: 0=none, 1=grass, 2=strawberry, 3=blueberry, 4=apple_tree, 5=mango_tree, 6=carrot
// Plant stages: 0=none, 1=seed, 2=sprout, 3=mature, 4=fruiting, 5=dead
export const PLANT_COLORS = {
  // Grass
  '1_1': [120, 180, 80, 80],
  '1_2': [80, 160, 50, 140],
  '1_3': [50, 140, 30, 200],
  '1_4': [200, 60, 60, 220],
  // Strawberry
  '2_1': [100, 160, 70, 80],
  '2_2': [60, 140, 40, 160],
  '2_3': [30, 120, 20, 220],
  '2_4': [220, 40, 60, 230],   // red strawberries
  // Blueberry
  '3_1': [90, 140, 100, 80],
  '3_2': [60, 120, 80, 160],
  '3_3': [40, 100, 60, 220],
  '3_4': [80, 50, 180, 230],   // purple blueberries
  // Apple Tree
  '4_1': [80, 120, 60, 60],
  '4_2': [40, 100, 30, 140],
  '4_3': [20, 80, 10, 240],
  '4_4': [180, 50, 50, 250],   // red apples
  // Mango Tree
  '5_1': [90, 130, 50, 60],
  '5_2': [50, 110, 25, 140],
  '5_3': [30, 90, 15, 240],
  '5_4': [220, 160, 40, 250],  // yellow mangoes
  // Carrot
  '6_1': [140, 160, 80, 70],
  '6_2': [120, 140, 50, 140],
  '6_3': [100, 120, 30, 200],
  '6_4': [230, 120, 30, 220],  // orange carrots
};

// Plant type names (keys match flora.js constants)
export const PLANT_TYPE_NAMES = {
  0: 'None',
  1: 'Grass',
  2: 'Strawberry',
  3: 'Blueberry',
  4: 'Apple Tree',
  5: 'Mango Tree',
  6: 'Carrot',
};

// Plant sex/reproduction display names
export const PLANT_SEX_NAMES = {
  ASEXUAL: 'Asexual',
  HERMAPHRODITE: 'Hermaphrodite',
};

// Plant type → sex mapping
export const PLANT_TYPE_SEX = {
  1: 'ASEXUAL',        // Grass
  2: 'HERMAPHRODITE',  // Strawberry
  3: 'HERMAPHRODITE',  // Blueberry
  4: 'HERMAPHRODITE',  // Apple Tree
  5: 'HERMAPHRODITE',  // Mango Tree
  6: 'ASEXUAL',        // Carrot
};

// Plant stage names
export const PLANT_STAGE_NAMES = {
  0: 'None',
  1: 'Seed',
  2: 'Sprout',
  3: 'Mature',
  4: 'Fruiting',
  5: 'Dead',
};

// Animal species colors
export const ANIMAL_COLORS = {
  RABBIT:   0x66cc66,  // green
  SQUIRREL: 0xcc8844,  // brown
  BEETLE:   0x556633,  // dark olive
  GOAT:     0xbbbbbb,  // gray
  DEER:     0xcc9955,  // tan
  FOX:      0xdd8833,  // orange
  WOLF:     0xdd4444,  // red
};

// Species display info
export const SPECIES_INFO = {
  RABBIT:   { emoji: '🐰', name: 'Rabbit',   diet: 'Herbivore' },
  SQUIRREL: { emoji: '🐿️', name: 'Squirrel', diet: 'Herbivore' },
  BEETLE:   { emoji: '🪲', name: 'Beetle',   diet: 'Herbivore' },
  GOAT:     { emoji: '🐐', name: 'Goat',     diet: 'Herbivore' },
  DEER:     { emoji: '🦌', name: 'Deer',     diet: 'Herbivore' },
  FOX:      { emoji: '🦊', name: 'Fox',      diet: 'Carnivore' },
  WOLF:     { emoji: '🐺', name: 'Wolf',     diet: 'Carnivore' },
};

// Sex display names
export const SEX_NAMES = {
  MALE: '♂ Male',
  FEMALE: '♀ Female',
  ASEXUAL: '⚬ Asexual',
  HERMAPHRODITE: '⚥ Hermaphrodite',
};

// Animal state names
export const STATE_NAMES = {
  0: 'Idle',
  1: 'Walking',
  2: 'Running',
  3: 'Eating',
  4: 'Drinking',
  5: 'Sleeping',
  6: 'Attacking',
  7: 'Fleeing',
  8: 'Mating',
  9: 'Dead',
};
