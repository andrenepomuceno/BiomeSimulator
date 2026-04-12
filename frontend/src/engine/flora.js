/**
 * Flora system — plant lifecycle with loop-based processing.
 */
import { WATER, GRASS, DIRT } from './world.js';

// Plant types
export const P_NONE = 0;
export const P_GRASS = 1;
export const P_BUSH = 2;
export const P_TREE = 3;

// Plant stages
export const S_NONE = 0;
export const S_SEED = 1;
export const S_SPROUT = 2;
export const S_MATURE = 3;
export const S_FRUITING = 4;
export const S_DEAD = 5;

// Growth thresholds per type: [seed→sprout, sprout→mature, mature→fruiting, fruiting→dead]
const STAGE_AGES = {
  [P_GRASS]: [10, 40, 80, 300],
  [P_BUSH]: [20, 80, 200, 800],
  [P_TREE]: [50, 200, 500, 2000],
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
      ptype = r < 0.3 ? P_GRASS : r < 0.65 ? P_BUSH : P_TREE;
    } else if (wp < 15) {
      ptype = r < 0.5 ? P_GRASS : r < 0.8 ? P_BUSH : P_TREE;
    } else {
      ptype = r < 0.7 ? P_GRASS : r < 0.9 ? P_BUSH : P_TREE;
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

    // Effective age with water proximity bonus
    const effectiveAge = world.waterProximity[i] < wpThreshold
      ? Math.floor(world.plantAge[i] * 1.3)
      : world.plantAge[i];

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

  // Collect fruiting plants (capped at 500 for performance)
  const fruiting = [];
  for (let i = 0; i < w * h; i++) {
    if (world.plantStage[i] === S_FRUITING) fruiting.push(i);
    if (fruiting.length >= 2000) break; // collect a pool
  }

  // Shuffle and cap attempts
  for (let i = fruiting.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [fruiting[i], fruiting[j]] = [fruiting[j], fruiting[i]];
  }
  const maxAttempts = Math.min(fruiting.length, 500);

  for (let n = 0; n < maxAttempts; n++) {
    if (Math.random() > 0.02) continue; // 2% chance
    const idx = fruiting[n];
    const x = idx % w, y = Math.floor(idx / w);
    const ptype = world.plantType[idx];

    const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    const nx = x + dir[0], ny = y + dir[1];
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;

    const ni = ny * w + nx;
    if (world.plantType[ni] !== P_NONE) continue;
    const terrain = world.terrain[ni];
    if (terrain !== GRASS && terrain !== DIRT) continue;

    world.plantType[ni] = ptype;
    world.plantStage[ni] = S_SEED;
    world.plantAge[ni] = 0;
    world.plantFruit[ni] = 0;
    world.plantChanges.push([nx, ny, ptype, S_SEED]);
  }
}
