/**
 * Flora system — plant lifecycle with loop-based processing.
 */
import { WATER, GRASS, DIRT } from './world.js';

// Plant types
export const P_NONE = 0;
export const P_GRASS = 1;        // Wild grass — asexual
export const P_STRAWBERRY = 2;   // Strawberry — hermaphrodite
export const P_BLUEBERRY = 3;    // Blueberry — hermaphrodite
export const P_APPLE_TREE = 4;   // Apple tree — hermaphrodite
export const P_MANGO_TREE = 5;   // Mango tree — hermaphrodite
export const P_CARROT = 6;       // Carrot — asexual

// All placeable plant types
export const ALL_PLANT_TYPES = [P_GRASS, P_STRAWBERRY, P_BLUEBERRY, P_APPLE_TREE, P_MANGO_TREE, P_CARROT];

// Plant sex/reproduction mode (display + seed spreading behavior)
export const PLANT_SEX = {
  [P_GRASS]: 'ASEXUAL',
  [P_STRAWBERRY]: 'HERMAPHRODITE',
  [P_BLUEBERRY]: 'HERMAPHRODITE',
  [P_APPLE_TREE]: 'HERMAPHRODITE',
  [P_MANGO_TREE]: 'HERMAPHRODITE',
  [P_CARROT]: 'ASEXUAL',
};

// Plant stages
export const S_NONE = 0;
export const S_SEED = 1;
export const S_SPROUT = 2;
export const S_MATURE = 3;
export const S_FRUITING = 4;
export const S_DEAD = 5;

// Growth thresholds per type: [seed→sprout, sprout→mature, mature→fruiting, fruiting→dead]
const STAGE_AGES = {
  [P_GRASS]:       [10, 40, 80, 300],
  [P_STRAWBERRY]:  [15, 60, 150, 500],
  [P_BLUEBERRY]:   [20, 80, 200, 700],
  [P_APPLE_TREE]:  [50, 200, 500, 2000],
  [P_MANGO_TREE]:  [60, 250, 600, 2200],
  [P_CARROT]:      [12, 50, 120, 400],
};

// Terrain growth multipliers: higher = faster effective aging
const TERRAIN_GROWTH_MULT = {
  [GRASS]: 1.0,   // grass terrain boosts growth by 20%
  [DIRT]:  0.5,   // dirt terrain slows growth by 30%
};

// Per-tick chance a plant on dirt dies prematurely (seeds/sprouts are more fragile)
const DIRT_DEATH_CHANCE = {
  [S_SEED]:     0.003,  // 0.3% per tick
  [S_SPROUT]:   0.002,  // 0.2% per tick
  [S_MATURE]:   0.0008, // 0.08% per tick
  [S_FRUITING]: 0.0005, // 0.05% per tick
};

/**
 * Scatter initial plants on eligible terrain tiles.
 */
export function seedInitialPlants(world) {
  const density = world.config.initial_plant_density ?? 0.15;
  const w = world.width, h = world.height;

  // Collect eligible indices
  const eligible = [];
  for (let i = 0; i < w * h; i++) {
    const t = world.terrain[i];
    if (t === GRASS || t === DIRT) eligible.push(i);
  }

  // Shuffle (Fisher-Yates) and take first n
  const nPlants = Math.floor(eligible.length * density);
  for (let i = eligible.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
  }

  for (let n = 0; n < nPlants && n < eligible.length; n++) {
    const idx = eligible[n];
    const wp = world.waterProximity[idx];

    // Weighted type selection based on water proximity
    let ptype;
    const r = Math.random();
    if (wp < 5) {
      // Near water: more berries and trees
      if (r < 0.15) ptype = P_GRASS;
      else if (r < 0.30) ptype = P_STRAWBERRY;
      else if (r < 0.45) ptype = P_BLUEBERRY;
      else if (r < 0.65) ptype = P_APPLE_TREE;
      else if (r < 0.85) ptype = P_MANGO_TREE;
      else ptype = P_CARROT;
    } else if (wp < 15) {
      // Medium distance: balanced
      if (r < 0.25) ptype = P_GRASS;
      else if (r < 0.40) ptype = P_STRAWBERRY;
      else if (r < 0.55) ptype = P_BLUEBERRY;
      else if (r < 0.70) ptype = P_APPLE_TREE;
      else if (r < 0.82) ptype = P_MANGO_TREE;
      else ptype = P_CARROT;
    } else {
      // Far from water: more grass and carrots
      if (r < 0.35) ptype = P_GRASS;
      else if (r < 0.45) ptype = P_STRAWBERRY;
      else if (r < 0.55) ptype = P_BLUEBERRY;
      else if (r < 0.65) ptype = P_APPLE_TREE;
      else if (r < 0.75) ptype = P_MANGO_TREE;
      else ptype = P_CARROT;
    }

    // Random initial stage
    const sr = Math.random();
    let stage, age;
    const ages = STAGE_AGES[ptype];
    if (sr < 0.33) {
      stage = S_SEED;
      age = Math.floor(Math.random() * ages[0]);
    } else if (sr < 0.66) {
      stage = S_SPROUT;
      age = ages[0] + Math.floor(Math.random() * (ages[1] - ages[0]));
    } else {
      stage = S_MATURE;
      age = ages[1] + Math.floor(Math.random() * (ages[2] - ages[1]));
    }

    world.plantType[idx] = ptype;
    world.plantStage[idx] = stage;
    world.plantAge[idx] = age;
    world.plantFruit[idx] = 0;
  }
}

/**
 * Process one tick of the plant lifecycle.
 */
export function processPlants(world) {
  const w = world.width, h = world.height;
  const size = w * h;
  const wpThreshold = world.config.water_proximity_threshold ?? 10;
  world.plantChanges = [];

  // --- Age alive plants and process stage transitions ---
  for (let i = 0; i < size; i++) {
    const ptype = world.plantType[i];
    const stage = world.plantStage[i];
    if (ptype === P_NONE || stage === S_NONE || stage >= S_DEAD) continue;

    // Age
    world.plantAge[i]++;

    const terrain = world.terrain[i];
    const terrainMult = TERRAIN_GROWTH_MULT[terrain] || 1.0;

    // Dirt terrain: random chance to kill the plant each tick
    if (terrain === DIRT) {
      const deathChance = DIRT_DEATH_CHANCE[stage] || 0;
      if (deathChance > 0 && Math.random() < deathChance) {
        world.plantStage[i] = S_DEAD;
        world.plantFruit[i] = 0;
        const x = i % w, y = Math.floor(i / w);
        world.plantChanges.push([x, y, ptype, S_DEAD]);
        continue;
      }
    }

    // Effective age with water proximity bonus and terrain modifier
    const waterMult = world.waterProximity[i] < wpThreshold ? 1.3 : 1.0;
    const effectiveAge = Math.floor(world.plantAge[i] * waterMult * terrainMult);

    const ages = STAGE_AGES[ptype];
    let newStage = stage;

    if (stage === S_SEED && effectiveAge >= ages[0]) {
      newStage = S_SPROUT;
    } else if (stage === S_SPROUT && effectiveAge >= ages[1]) {
      newStage = S_MATURE;
    } else if (stage === S_MATURE && effectiveAge >= ages[2]) {
      newStage = S_FRUITING;
      world.plantFruit[i] = 1;
    } else if (stage === S_FRUITING && effectiveAge >= ages[3]) {
      newStage = S_DEAD;
      world.plantFruit[i] = 0;
    }

    if (newStage !== stage) {
      world.plantStage[i] = newStage;
      const x = i % w, y = Math.floor(i / w);
      world.plantChanges.push([x, y, ptype, newStage]);
    }
  }

  // --- Dead plants decompose ---
  for (let i = 0; i < size; i++) {
    if (world.plantStage[i] === S_DEAD) {
      const x = i % w, y = Math.floor(i / w);
      world.plantType[i] = P_NONE;
      world.plantStage[i] = S_NONE;
      world.plantAge[i] = 0;
      world.plantFruit[i] = 0;
      world.plantChanges.push([x, y, P_NONE, S_NONE]);
    }
  }

  // --- Seed spreading from fruiting plants ---
  spreadSeeds(world);
}

const DIRECTIONS = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];

function spreadSeeds(world) {
  const w = world.width, h = world.height;

  // Collect all fruiting plants (no cap — avoids top-of-map bias)
  const fruiting = [];
  for (let i = 0; i < w * h; i++) {
    if (world.plantStage[i] === S_FRUITING) fruiting.push(i);
  }

  // Shuffle and cap attempts
  for (let i = fruiting.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [fruiting[i], fruiting[j]] = [fruiting[j], fruiting[i]];
  }
  const maxAttempts = Math.min(fruiting.length, 800);

  for (let n = 0; n < maxAttempts; n++) {
    if (Math.random() > 0.06) continue; // 6% chance per fruiting plant
    const idx = fruiting[n];
    const x = idx % w, y = Math.floor(idx / w);
    const ptype = world.plantType[idx];

    const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    const spread = 1 + Math.floor(Math.random() * 3); // 1-3 tiles
    const nx = x + dir[0] * spread, ny = y + dir[1] * spread;
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;

    const ni = ny * w + nx;
    if (world.plantType[ni] !== P_NONE) continue;
    const terrain = world.terrain[ni];
    if (terrain !== GRASS && terrain !== DIRT) continue;

    // Seeds are less likely to take root on dirt
    if (terrain === DIRT && Math.random() > 0.4) continue;

    world.plantType[ni] = ptype;
    world.plantStage[ni] = S_SEED;
    world.plantAge[ni] = 0;
    world.plantFruit[ni] = 0;
    world.plantChanges.push([nx, ny, ptype, S_SEED]);
  }
}
