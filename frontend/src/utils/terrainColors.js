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
