/**
 * Terrain enum → RGBA color mapping, per-channel noise amplitudes,
 * transition LUT, and coastal helpers.
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
  [DIRT]: [155, 115, 75, 255],
  [SOIL]: [70, 140, 65, 255],
  [ROCK]: [120, 120, 130, 255],
  [FERTILE_SOIL]: [55, 110, 50, 255],
  [DEEP_WATER]: [15, 55, 130, 255],
  [MOUNTAIN]: [170, 165, 160, 255],
  [MUD]: [90, 80, 60, 255],
};

/**
 * Per-channel variation amplitude [R, G, B] for each terrain type.
 * Used by multi-octave per-tile noise. Higher values = more visual texture.
 */
export const TERRAIN_VAR_RGB = [
  [4,  6,  8],   // 0 WATER        — slight blue-green shift
  [14, 12, 6],   // 1 SAND         — warm red-yellow dominant
  [14, 12, 8],   // 2 DIRT         — increased variation for lighter tone
  [8,  16, 8],   // 3 SOIL         — enhanced green variation
  [15, 15, 16],  // 4 ROCK         — balanced, high variation
  [8, 14, 7],    // 5 FERTILE_SOIL — enhanced for darker green tone
  [3,  4,  7],   // 6 DEEP_WATER   — subtle blue shift
  [16, 15, 14],  // 7 MOUNTAIN     — balanced, high variation
  [14, 12, 10],  // 8 MUD          — increased variation for cooler gray tone
];

/**
 * Elevation-based terrain priority (lower = lower elevation).
 * Used for transition ordering — blending passes through intermediate types.
 */
export const TERRAIN_ELEVATION_ORDER = [
  /*0 WATER*/        1,
  /*1 SAND*/         3,
  /*2 DIRT*/         5,
  /*3 SOIL*/         6,
  /*4 ROCK*/         8,
  /*5 FERTILE_SOIL*/ 7,
  /*6 DEEP_WATER*/   0,
  /*7 MOUNTAIN*/     9,
  /*8 MUD*/          4,
];

/**
 * Transition tint LUT: TRANSITION_TINT[fromType][toType] → [r, g, b]
 * Gives the intermediate color that should appear at terrain boundaries
 * instead of a direct color mix. Only populated for visually important pairs.
 */
const _T = {};
function _pair(a, b, color) { _T[a * 16 + b] = color; _T[b * 16 + a] = color; }
// Water ↔ Sand: wet-sand/shore foam
_pair(WATER, SAND,         [120, 160, 170]);
_pair(DEEP_WATER, WATER,   [22,  78,  155]);
// Sand ↔ Dirt: dry transition
_pair(SAND, DIRT,          [175, 145, 95]);
// Sand ↔ Soil: slightly sandy green
_pair(SAND, SOIL,          [135, 170, 95]);
// Dirt ↔ Soil: earthy green
_pair(DIRT, SOIL,          [112, 130, 70]);
// Dirt ↔ Fertile: transitional toward fertile green
_pair(DIRT, FERTILE_SOIL,  [105, 82,  62]);
// Soil ↔ Fertile: dark fertile green
_pair(SOIL, FERTILE_SOIL,  [62,  125, 57]);
// Rock ↔ Mountain: gray gradient
_pair(ROCK, MOUNTAIN,      [145, 142, 145]);
// Soil ↔ Rock: grassy rock
_pair(SOIL, ROCK,          [90,  135, 95]);
// Dirt ↔ Rock: dry rock
_pair(DIRT, ROCK,          [140, 118, 100]);
// Water ↔ Mud: swampy edge
_pair(WATER, MUD,          [65,  90,  115]);
// Sand ↔ Mud: wet sand
_pair(SAND, MUD,           [155, 135, 90]);
// Mud ↔ Soil: transitional
_pair(MUD, SOIL,           [80,  110, 62]);
// Mud ↔ Dirt: transitional
_pair(MUD, DIRT,           [122, 98,  60]);
export const TRANSITION_TINT = _T;

/**
 * Look up a transition tint between two terrain types.
 * Returns [r, g, b] or null if no special tint is defined (use direct mix).
 */
export function getTransitionTint(fromType, toType) {
  return _T[fromType * 16 + toType] || null;
}

/**
 * Coastal color adjustments: shallow water near land gets lighter/cyan,
 * sand near water gets lighter/white.
 */
export const COASTAL_SHALLOW_WATER = [55, 140, 200]; // Lighter cyan for shore water
export const COASTAL_WET_SAND      = [225, 215, 180]; // Whitish wet sand

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
  [-1]: '🥚 Egg',
  0: '🍼 Baby',
  1: '🌱 Young',
  2: '🌿 Young Adult',
  3: '🌳 Adult',
  4: '🐛 Pupa',
};
