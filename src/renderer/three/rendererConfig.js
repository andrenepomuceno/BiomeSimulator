export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 200;
export const ANIMAL_SPRITE_SCALE_BOOST = 1.22;
export const ANIMAL_MODEL_SCALE_BOOST = 1.28;
export const ORBIT_TREE_SCALE_BOOST = 1.65;
export const ORBIT_ENTITY_SPRITE_BOOST = 1.55;
export const ORBIT_ENTITY_MODEL_BOOST = 1.8;
export const MAX_VISIBLE_PLANT_POINTS = 30000;
export const MAX_VISIBLE_ENTITY_POINTS = 10000;
export const MAX_VISIBLE_ITEM_POINTS = 5000;
export const MAX_VISIBLE_PLANT_SPRITES = 12000;
export const MAX_VISIBLE_ITEM_SPRITES = 5000;
export const ENTITY_SPRITE_ZOOM_THRESHOLD = 6;
export const MAX_PARTICLES = 1200;

// ---------------------------------------------------------------------------
// Orbit-mode LOD distance threshold (in world/tile units, from the orbit
// controls look-at target). Single value shared by plants and animals so
// the visible "detail bubble" is consistent.
//
// The effective distance shrinks as the camera pulls further away, forcing
// an earlier model→point transition at high altitudes (big-picture views
// only need the colored point overlay; detail models would be a waste).
// ---------------------------------------------------------------------------
export const LOD_DETAIL_DIST = 90;
export const LOD_DETAIL_DIST_SQ = LOD_DETAIL_DIST * LOD_DETAIL_DIST;

// Particle spawn configs by type
export const PARTICLE_DEFS = {
  attack: { count: 10, color: 0xff4444, speed: 0.016, maxLife: 48, size: 3.5, gravity: 0 },
  birth:  { count: 10, color: 0x88ff88, speed: 0.012, maxLife: 56, size: 3,   gravity: 0 },
  death:  { count: 12, color: 0x888888, speed: 0.014, maxLife: 62, size: 3,   gravity: 0.0007 },
  fruit:  { count:  5, color: 0xffee44, speed: 0.008, maxLife: 50, size: 2.5, gravity: -0.003 },
  mate:   { count:  7, color: 0xff4488, speed: 0.007, maxLife: 60, size: 3.5, gravity: -0.001 },
  eat:    { count:  5, color: 0x99cc55, speed: 0.014, maxLife: 38, size: 2.5, gravity: 0.0008 },
  drink:  { count:  5, color: 0x44aaff, speed: 0.009, maxLife: 38, size: 2.5, gravity: 0.0005 },
  flee:   { count:  6, color: 0xffaa22, speed: 0.018, maxLife: 34, size: 2.5, gravity: 0 },
  sleep:  { count:  3, color: 0xbbaaff, speed: 0.004, maxLife: 60, size: 3,   gravity: -0.002 },
};

export const PLANT_SPRITE_ZOOM_THRESHOLD = 6;
export const ITEM_SPRITE_ZOOM_THRESHOLD = 6;

export const ITEM_EMOJIS = {
  1: '🥩',
  2: '🍎',
  3: '🌱',
};

export const ITEM_COLORS = {
  1: 0xcc4444,
  2: 0xffaa33,
  3: 0xaa8833,
};

export const TREE_MODEL_URLS = {
  4: '/model-assets/nature/tree_oak.glb',
  5: '/model-assets/nature/tree_detailed.glb',
  10: '/model-assets/nature/tree_oak_dark.glb',
  12: '/model-assets/nature/tree_palm.glb',
  15: '/model-assets/nature/tree_default.glb',
};

export const PLANT_MODEL_URLS = {
  1: '/model-assets/nature/grass_leafs.glb',
  2: '/model-assets/nature/plant_bushSmall.glb',
  3: '/model-assets/nature/plant_bushDetailed.glb',
  4: '/model-assets/nature/tree_oak.glb',
  5: '/model-assets/nature/tree_detailed.glb',
  6: '/model-assets/nature/crop_carrot.glb',
  7: '/model-assets/nature/flower_yellowC.glb',
  8: '/model-assets/nature/tomato.glb',
  9: '/model-assets/nature/mushroom_red.glb',
  10: '/model-assets/nature/tree_oak_dark.glb',
  11: '/model-assets/nature/cactus_tall.glb',
  12: '/model-assets/nature/tree_palm.glb',
  13: '/model-assets/nature/crops_leafsStageA.glb',
  14: '/model-assets/nature/pepper.glb',
  15: '/model-assets/nature/tree_default.glb',
  16: '/model-assets/nature/flower_purpleB.glb',
};

export const PLANT_MODEL_SCALE_MULTIPLIERS = {
  1: 0.9,
  2: 0.74,
  3: 0.78,
  6: 0.85,
  7: 0.96,
  8: 0.72,
  9: 0.9,
  11: 1.2,
  13: 0.86,
  14: 0.74,
  16: 0.92,
};

export const DEAD_TREE_MODEL_URL = '/model-assets/nature/stump_round.glb';

// ---------------------------------------------------------------------------
// Item 3D models (kenney_food-kit, CC0)
// Keys match ITEM_TYPE constants from engine/items.js (MEAT=1, FRUIT=2, SEED=3).
// Models face +Y forward, +Z up. Scale multipliers adjust to ~0.4–0.6 tile units.
// ---------------------------------------------------------------------------

export const ITEM_MODEL_URLS = {
  1: '/model-assets/items/meat-cooked.glb',    // MEAT
  2: '/model-assets/items/apple.glb',           // FRUIT
  3: '/model-assets/items/pumpkin-basic.glb',   // SEED
};

export const ITEM_MODEL_SCALE_MULTIPLIERS = {
  1: 0.45,   // meat – small slab on ground
  2: 0.40,   // apple – small sphere
  3: 0.35,   // seed/pumpkin – tiny on ground
};

// ---------------------------------------------------------------------------
// Entity (animal) 3D models (kenney_cube-pets, CC0)
// Keys match species IDs from ANIMAL_SPECIES.
// Kenney cube-pets face +Y forward, +Z up; the engine's Direction enum
// maps to yaw rotations in DIRECTION_YAW (entityLayer.js).
// ---------------------------------------------------------------------------

export const ENTITY_MODEL_URLS = {
  RABBIT: '/model-assets/animals/animal-bunny.glb',
  SQUIRREL: '/model-assets/animals/animal-beaver.glb',
  BEETLE: '/model-assets/animals/animal-bee.glb',
  GOAT: '/model-assets/animals/animal-cow.glb',
  DEER: '/model-assets/animals/animal-deer.glb',
  FOX: '/model-assets/animals/animal-fox.glb',
  WOLF: '/model-assets/animals/animal-dog.glb',
  BOAR: '/model-assets/animals/animal-hog.glb',
  BEAR: '/model-assets/animals/animal-polar.glb',
  RACCOON: '/model-assets/animals/animal-cat.glb',
  CROW: '/model-assets/animals/animal-parrot.glb',
  MOSQUITO: '/model-assets/animals/animal-bee.glb',
  CATERPILLAR: '/model-assets/animals/animal-caterpillar.glb',
  CRICKET: '/model-assets/animals/animal-bee.glb',
  LIZARD: '/model-assets/animals/animal-caterpillar.glb',
  SNAKE: '/model-assets/animals/animal-caterpillar.glb',
  HAWK: '/model-assets/animals/animal-parrot.glb',
  CROCODILE: '/model-assets/animals/animal-hog.glb',
};

export const ENTITY_MODEL_SCALE_MULTIPLIERS = {
  MOSQUITO: 1.85,
  CRICKET: 1.55,
  BEETLE: 1.35,
  CATERPILLAR: 1.45,
  LIZARD: 1.3,
  SNAKE: 1.5,
  HAWK: 1.25,
  CROW: 1.2,
  CROCODILE: 1.25,
};

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
