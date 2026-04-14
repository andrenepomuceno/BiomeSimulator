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
import { buildPlantColors } from '../engine/plantSpecies.js';
export const PLANT_COLORS = buildPlantColors();

// Plant type names — built from plantSpecies.js canonical registry
import { buildPlantTypeNames, buildPlantTypeSex } from '../engine/plantSpecies.js';
export const PLANT_TYPE_NAMES = buildPlantTypeNames();

// Plant sex/reproduction display names
export const PLANT_SEX_NAMES = {
  ASEXUAL: 'Asexual',
  HERMAPHRODITE: 'Hermaphrodite',
};

// Plant type → sex mapping — built from plantSpecies.js canonical registry
export const PLANT_TYPE_SEX = buildPlantTypeSex();

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

// Animal species colors — built from animalSpecies.js canonical registry
import { buildAnimalColors, buildAnimalHexColors, buildSpeciesInfo } from '../engine/animalSpecies.js';
export const ANIMAL_COLORS = buildAnimalColors();

export const ANIMAL_HEX_COLORS = buildAnimalHexColors();

// Species display info — built from animalSpecies.js canonical registry
export const SPECIES_INFO = buildSpeciesInfo();

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
  10: 'Flying',
};

// Animal life stage names
export const LIFE_STAGE_NAMES = {
  [-1]: '🥚 Ovo',
  0: '🍼 Filhote',
  1: '🌱 Jovem',
  2: '🌿 Adulto Jovem',
  3: '🌳 Adulto',
  4: '🐛 Pupa',
};
