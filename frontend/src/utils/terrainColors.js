/**
 * Terrain enum → RGBA color mapping.
 */

/**
 * Deterministic hash for per-tile color variation.
 * Returns a value in [0, 1).
 */
export function tileHash(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}

// Terrain types (must match backend)
export const WATER = 0;
export const SAND = 1;
export const DIRT = 2;
export const SOIL = 3;
export const ROCK = 4;
export const FERTILE_SOIL = 5;
export const DEEP_WATER = 6;
export const MOUNTAIN = 7;
export const MUD = 8;

export const TERRAIN_COLORS = {
  [WATER]: [30, 100, 180, 255],
  [SAND]: [210, 190, 130, 255],
  [DIRT]: [140, 100, 60, 255],
  [SOIL]: [60, 150, 60, 255],
  [ROCK]: [120, 120, 130, 255],
  [FERTILE_SOIL]: [85, 60, 30, 255],
  [DEEP_WATER]: [15, 55, 130, 255],
  [MOUNTAIN]: [170, 165, 160, 255],
  [MUD]: [100, 80, 50, 255],
};

export const TERRAIN_NAMES = {
  [WATER]: 'Water',
  [SAND]: 'Sand',
  [DIRT]: 'Dirt',
  [SOIL]: 'Soil',
  [ROCK]: 'Rock',
  [FERTILE_SOIL]: 'Fertile Soil',
  [DEEP_WATER]: 'Deep Water',
  [MOUNTAIN]: 'Mountain',
  [MUD]: 'Mud',
};

// Plant stage colors — built from plantSpecies.js canonical registry
import { buildPlantColors } from '../engine/plantSpecies';
export const PLANT_COLORS = buildPlantColors();

// Plant type names (keys match flora.js constants)
export const PLANT_TYPE_NAMES = {
  0: 'None',
  1: 'Grass',
  2: 'Strawberry',
  3: 'Blueberry',
  4: 'Apple Tree',
  5: 'Mango Tree',
  6: 'Carrot',
  7: 'Sunflower',
  8: 'Tomato',
  9: 'Mushroom',
  10: 'Oak Tree',
  11: 'Cactus',
  12: 'Coconut Palm',
  13: 'Potato',
  14: 'Chili Pepper',
  15: 'Olive Tree',
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
  7: 'HERMAPHRODITE',  // Sunflower
  8: 'HERMAPHRODITE',  // Tomato
  9: 'ASEXUAL',        // Mushroom
  10: 'HERMAPHRODITE', // Oak Tree
  11: 'HERMAPHRODITE', // Cactus
  12: 'HERMAPHRODITE', // Coconut Palm
  13: 'ASEXUAL',       // Potato
  14: 'HERMAPHRODITE', // Chili Pepper
  15: 'HERMAPHRODITE', // Olive Tree
};

// Plant stage names
export const PLANT_STAGE_NAMES = {
  0: 'None',
  1: 'Seed',
  2: 'Young Sprout',
  3: 'Adult Sprout',
  4: 'Adult',
  5: 'Fruit',
  6: 'Dead',
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
  BOAR:     0x885533,  // brown
  BEAR:     0x8B4513,  // saddle brown
  RACCOON:  0x778899,  // slate gray
  CROW:     0x333344,  // dark blue-gray
  MOSQUITO:    0x556655,  // muted green
  CATERPILLAR: 0x88bb33,  // lime green
  CRICKET:     0x6f9933,  // olive green
  LIZARD:      0x5a8f4b,  // leaf green
  SNAKE:       0x448844,  // forest green
  HAWK:        0xaa6622,  // bronze
  CROCODILE:   0x556b2f,  // dark olive green
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
  BOAR:     { emoji: '🐗', name: 'Boar',     diet: 'Omnivore' },
  BEAR:     { emoji: '🐻', name: 'Bear',     diet: 'Omnivore' },
  RACCOON:  { emoji: '🦝', name: 'Raccoon',  diet: 'Omnivore' },
  CROW:     { emoji: '🐦‍⬛', name: 'Crow',     diet: 'Omnivore' },
  MOSQUITO:    { emoji: '🦟', name: 'Mosquito',    diet: 'Herbivore' },
  CATERPILLAR: { emoji: '🐛', name: 'Caterpillar', diet: 'Herbivore' },
  CRICKET:     { emoji: '🦗', name: 'Cricket',     diet: 'Herbivore' },
  LIZARD:      { emoji: '🦎', name: 'Lizard',      diet: 'Omnivore' },
  SNAKE:       { emoji: '🐍', name: 'Snake',       diet: 'Carnivore' },
  HAWK:        { emoji: '🦅', name: 'Hawk',        diet: 'Carnivore' },
  CROCODILE:   { emoji: '🐊', name: 'Crocodile',   diet: 'Carnivore' },
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

// Animal life stage names
export const LIFE_STAGE_NAMES = {
  0: '🍼 Filhote',
  1: '🌱 Jovem',
  2: '🌿 Adulto Jovem',
  3: '🌳 Adulto',
};
