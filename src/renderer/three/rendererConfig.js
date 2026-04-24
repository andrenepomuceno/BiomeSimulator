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
export const MAX_VISIBLE_PLANT_SPRITES = 20000;
export const MAX_VISIBLE_ITEM_SPRITES = 5000;
export const ENTITY_SPRITE_ZOOM_THRESHOLD = 6;
// Zoom at which sprites transition to full 3D GLB models. Below this zoom
// (and when not in orbit mode) entities/plants/items render as simple sprites
// to keep a high object density affordable. Orbit mode still uses its own
// LOD radius (LOD_DETAIL_DIST) so far-away orbit views naturally degrade to
// points even though the apparent zoom may exceed this threshold at the
// focal point.
export const MODEL_ZOOM_THRESHOLD = 10;
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

// ---------------------------------------------------------------------------
// Terrain elevation (3D volume)
// ---------------------------------------------------------------------------
// Maximum vertical displacement (in world/tile units) applied to the terrain
// mesh from the normalized [0,1] heightmap. Higher = more dramatic relief.
// Land height is computed as `heightmap[i] * TERRAIN_HEIGHT_SCALE`, with
// water tiles flattened to TERRAIN_WATER_BASE_Z so lakes/oceans stay level.
export const TERRAIN_HEIGHT_SCALE = 30;
export const TERRAIN_WATER_BASE_Z = 0;

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

function assetUrl(assetPath) {
  const base = import.meta?.env?.BASE_URL || '/';
  const withLeading = base.startsWith('/') ? base : `/${base}`;
  const normalizedBase = withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
  return `${normalizedBase}${assetPath.replace(/^\/+/, '')}`;
}

export const TREE_MODEL_URLS = {
  4: assetUrl('model-assets/nature/tree_oak.glb'),
  5: assetUrl('model-assets/nature/tree_detailed.glb'),
  10: assetUrl('model-assets/nature/tree_oak_dark.glb'),
  12: assetUrl('model-assets/nature/tree_palm.glb'),
  15: assetUrl('model-assets/nature/tree_default.glb'),
};

export const PLANT_MODEL_URLS = {
  1: assetUrl('model-assets/nature/grass_leafs.glb'),
  2: assetUrl('model-assets/nature/plant_bushSmall.glb'),
  3: assetUrl('model-assets/nature/plant_bushDetailed.glb'),
  4: assetUrl('model-assets/nature/tree_oak.glb'),
  5: assetUrl('model-assets/nature/tree_detailed.glb'),
  6: assetUrl('model-assets/nature/crop_carrot.glb'),
  7: assetUrl('model-assets/nature/flower_yellowC.glb'),
  8: assetUrl('model-assets/nature/tomato.glb'),
  9: assetUrl('model-assets/nature/mushroom_red.glb'),
  10: assetUrl('model-assets/nature/tree_oak_dark.glb'),
  11: assetUrl('model-assets/nature/cactus_tall.glb'),
  12: assetUrl('model-assets/nature/tree_palm.glb'),
  13: assetUrl('model-assets/nature/crops_leafsStageA.glb'),
  14: assetUrl('model-assets/nature/pepper.glb'),
  15: assetUrl('model-assets/nature/tree_default.glb'),
  16: assetUrl('model-assets/nature/flower_purpleB.glb'),
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

export const DEAD_TREE_MODEL_URL = assetUrl('model-assets/nature/stump_round.glb');

// Dead non-tree plants (bushes, grass, flowers, crops). Small weathered stump
// stands in as a generic dried/dead plant marker since the asset kit has no
// "dead grass / dead bush" variants.
export const DEAD_PLANT_MODEL_URL = assetUrl('model-assets/nature/stump_old.glb');

// Dead animals — no grave/skull/bones models are available in the kit, so a
// tall stone doubles as a tombstone/grave marker for all species.
export const DEAD_ANIMAL_MODEL_URL = assetUrl('model-assets/nature/stone_tallA.glb');

// ---------------------------------------------------------------------------
// Item 3D models (kenney_food-kit, CC0)
// Keys match ITEM_TYPE constants from engine/items.js (MEAT=1, FRUIT=2, SEED=3).
// Models face +Y forward, +Z up. Scale multipliers adjust to ~0.4–0.6 tile units.
// ---------------------------------------------------------------------------

export const ITEM_MODEL_URLS = {
  1: assetUrl('model-assets/items/meat-cooked.glb'),    // MEAT
  2: assetUrl('model-assets/items/apple.glb'),           // FRUIT
  3: assetUrl('model-assets/items/pumpkin-basic.glb'),   // SEED
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
  RABBIT: assetUrl('model-assets/animals/animal-bunny.glb'),
  SQUIRREL: assetUrl('model-assets/animals/animal-beaver.glb'),
  BEETLE: assetUrl('model-assets/animals/animal-bee.glb'),
  GOAT: assetUrl('model-assets/animals/animal-cow.glb'),
  DEER: assetUrl('model-assets/animals/animal-deer.glb'),
  FOX: assetUrl('model-assets/animals/animal-fox.glb'),
  WOLF: assetUrl('model-assets/animals/animal-dog.glb'),
  BOAR: assetUrl('model-assets/animals/animal-hog.glb'),
  BEAR: assetUrl('model-assets/animals/animal-polar.glb'),
  RACCOON: assetUrl('model-assets/animals/animal-cat.glb'),
  CROW: assetUrl('model-assets/animals/animal-parrot.glb'),
  MOSQUITO: assetUrl('model-assets/animals/animal-bee.glb'),
  CATERPILLAR: assetUrl('model-assets/animals/animal-caterpillar.glb'),
  CRICKET: assetUrl('model-assets/animals/animal-bee.glb'),
  LIZARD: assetUrl('model-assets/animals/animal-caterpillar.glb'),
  SNAKE: assetUrl('model-assets/animals/animal-caterpillar.glb'),
  HAWK: assetUrl('model-assets/animals/animal-parrot.glb'),
  CROCODILE: assetUrl('model-assets/animals/animal-hog.glb'),
};

export const ANIMAL_CRAB_MODEL_URL = assetUrl('model-assets/animals/animal-crab.glb');

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
