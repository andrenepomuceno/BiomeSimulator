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
// Plant types: 0=none, 1=grass, 2=bush, 3=tree
// Plant stages: 0=none, 1=seed, 2=sprout, 3=mature, 4=fruiting, 5=dead
export const PLANT_COLORS = {
  // Grass
  '1_1': [120, 180, 80, 80],   // seed — light
  '1_2': [80, 160, 50, 140],   // sprout
  '1_3': [50, 140, 30, 200],   // mature
  '1_4': [200, 60, 60, 220],   // fruiting (red berries)
  // Bush
  '2_1': [100, 160, 70, 80],
  '2_2': [60, 140, 40, 160],
  '2_3': [30, 120, 20, 220],
  '2_4': [200, 100, 40, 230],  // fruiting (orange)
  // Tree
  '3_1': [80, 120, 60, 60],
  '3_2': [40, 100, 30, 140],
  '3_3': [20, 80, 10, 240],    // mature — dark green
  '3_4': [180, 50, 50, 250],   // fruiting — red
};

// Animal species colors
export const ANIMAL_COLORS = {
  HERBIVORE: 0x44bb44,  // green
  CARNIVORE: 0xdd4444,  // red
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
