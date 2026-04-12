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
  // Grass — subtle green, low-profile ground cover
  '1_1': [130, 170, 80,  40],     // seed: faint yellow-green
  '1_2': [90,  165, 60,  100],    // sprout: light green
  '1_3': [55,  145, 35,  170],    // mature: rich green
  '1_4': [180, 200, 60,  200],    // fruiting: bright lime with seeds

  // Strawberry — green to vivid red
  '2_1': [110, 160, 80,  45],     // seed: faint green
  '2_2': [70,  150, 55,  110],    // sprout: medium green
  '2_3': [40,  130, 30,  190],    // mature: deep green leaves
  '2_4': [230, 40,  55,  240],    // fruiting: vivid red strawberries

  // Blueberry — green to deep purple-blue
  '3_1': [100, 140, 110, 45],     // seed: faint blue-green
  '3_2': [65,  130, 90,  110],    // sprout: teal-green
  '3_3': [45,  110, 70,  190],    // mature: dark green bush
  '3_4': [90,  45,  200, 240],    // fruiting: vibrant purple

  // Apple Tree — green to bright red
  '4_1': [80,  110, 55,  35],     // seed: dim green
  '4_2': [45,  100, 35,  100],    // sprout: small green
  '4_3': [25,  85,  15,  210],    // mature: deep forest green (tree canopy)
  '4_4': [200, 45,  40,  250],    // fruiting: bright red apples

  // Mango Tree — green to golden yellow
  '5_1': [85,  120, 50,  35],     // seed: dim green
  '5_2': [50,  108, 30,  100],    // sprout: small green
  '5_3': [30,  95,  18,  210],    // mature: deep green (tree canopy)
  '5_4': [240, 180, 35,  250],    // fruiting: golden mangoes

  // Carrot — green tops to bright orange
  '6_1': [140, 150, 90,  40],     // seed: faint tan
  '6_2': [110, 145, 55,  105],    // sprout: green shoots
  '6_3': [80,  130, 40,  185],    // mature: green tops
  '6_4': [240, 130, 25,  235],    // fruiting: bright orange carrots
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
