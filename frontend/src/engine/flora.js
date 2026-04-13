/**
 * Flora system — plant lifecycle with loop-based processing.
 *
 * Stages: SEED → YOUNG_SPROUT → ADULT_SPROUT → ADULT → DEAD
 * Adult plants produce offspring in adjacent cells:
 *   - Fruit producers place S_FRUIT (edible, decays to S_SEED)
 *   - Seed producers place S_SEED directly
 */
import { WATER, SAND, SOIL, DIRT, ROCK, FERTILE_SOIL, DEEP_WATER, MOUNTAIN, MUD } from './world.js';
import { buildStageAges, buildFruitSpoilAges, buildProductionChances, buildReproductionModes, buildTerrainGrowthMap, buildWaterAffinityMap } from './plantSpecies.js';

// Plant types
export const P_NONE = 0;
export const P_GRASS = 1;        // Wild grass — asexual
export const P_STRAWBERRY = 2;   // Strawberry — hermaphrodite
export const P_BLUEBERRY = 3;    // Blueberry — hermaphrodite
export const P_APPLE_TREE = 4;   // Apple tree — hermaphrodite
export const P_MANGO_TREE = 5;   // Mango tree — hermaphrodite
export const P_CARROT = 6;       // Carrot — asexual
export const P_SUNFLOWER = 7;   // Sunflower — hermaphrodite
export const P_TOMATO = 8;      // Tomato — hermaphrodite
export const P_MUSHROOM = 9;    // Mushroom — asexual
export const P_OAK_TREE = 10;   // Oak tree — hermaphrodite
export const P_CACTUS = 11;     // Cactus — hermaphrodite
export const P_COCONUT_PALM = 12; // Coconut palm — hermaphrodite

// All placeable plant types
export const ALL_PLANT_TYPES = [P_GRASS, P_STRAWBERRY, P_BLUEBERRY, P_APPLE_TREE, P_MANGO_TREE, P_CARROT, P_SUNFLOWER, P_TOMATO, P_MUSHROOM, P_OAK_TREE, P_CACTUS, P_COCONUT_PALM];

// Plant sex/reproduction mode (display + seed spreading behavior)
export const PLANT_SEX = {
  [P_GRASS]: 'ASEXUAL',
  [P_STRAWBERRY]: 'HERMAPHRODITE',
  [P_BLUEBERRY]: 'HERMAPHRODITE',
  [P_APPLE_TREE]: 'HERMAPHRODITE',
  [P_MANGO_TREE]: 'HERMAPHRODITE',
  [P_CARROT]: 'ASEXUAL',
  [P_SUNFLOWER]: 'HERMAPHRODITE',
  [P_TOMATO]: 'HERMAPHRODITE',
  [P_MUSHROOM]: 'ASEXUAL',
  [P_OAK_TREE]: 'HERMAPHRODITE',
  [P_CACTUS]: 'HERMAPHRODITE',
  [P_COCONUT_PALM]: 'HERMAPHRODITE',
};

// Plant stages
export const S_NONE = 0;
export const S_SEED = 1;
export const S_YOUNG_SPROUT = 2;
export const S_ADULT_SPROUT = 3;
export const S_ADULT = 4;
export const S_FRUIT = 5;
export const S_DEAD = 6;

// Growth thresholds per type: [seed→youngSprout, youngSprout→adultSprout, adultSprout→adult, adult→dead]
const STAGE_AGES = buildStageAges();

// Fruit spoil ages per type (ticks before S_FRUIT decays to S_SEED)
const FRUIT_SPOIL_AGES = buildFruitSpoilAges();

// Production chance per type (per-tick probability for adult to produce offspring)
const PRODUCTION_CHANCES = buildProductionChances();

// Reproduction mode per type: 'FRUIT' or 'SEED'
const REPRODUCTION_MODES = buildReproductionModes();

// Per-species terrain growth multipliers (built from plantSpecies.js)
const SPECIES_TERRAIN_GROWTH = buildTerrainGrowthMap();

// Per-tick chance a plant on dirt dies prematurely (seeds/sprouts are more fragile)
const DIRT_DEATH_CHANCE = {
  [S_SEED]:          0.003,  // 0.3% per tick
  [S_YOUNG_SPROUT]:  0.002,  // 0.2% per tick
  [S_ADULT_SPROUT]:  0.001,  // 0.1% per tick
  [S_ADULT]:         0.0005, // 0.05% per tick
  [S_FRUIT]:         0.002,  // 0.2% per tick (fruit on dirt rots faster)
};

// Tree types (cannot grow on rock or mountain)
const TREE_TYPES = new Set([P_APPLE_TREE, P_MANGO_TREE, P_OAK_TREE, P_COCONUT_PALM]);

// Low plants (can grow on mountain)
const LOW_PLANT_TYPES = new Set([P_GRASS, P_MUSHROOM, P_CARROT]);

// Desert plants (can grow on sand)
const DESERT_PLANT_TYPES = new Set([P_CACTUS, P_COCONUT_PALM]);

function _isTree(ptype) { return TREE_TYPES.has(ptype); }
function _isLowPlant(ptype) { return LOW_PLANT_TYPES.has(ptype); }

// Water affinity per species (0=none, 1=low, 2=medium, 3=high)
const WATER_AFFINITY = buildWaterAffinityMap();

// Season definitions: 0=Spring, 1=Summer, 2=Autumn, 3=Winter
export const SEASONS = ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER'];
const SEASON_GROWTH_MULT = [1.2, 1.0, 0.8, 0.5];
const SEASON_REPRO_MULT = [1.5, 1.0, 0.7, 0.2];
const SEASON_DEATH_MULT = [0.8, 1.0, 1.2, 2.0];

/** Get current season index (0=Spring, 1=Summer, 2=Autumn, 3=Winter). */
export function getSeason(world) {
  const ticksPerDay = world.config.ticks_per_day || 200;
  const seasonLengthDays = world.config.season_length_days || 30;
  const totalDays = Math.floor(world.clock.tick / ticksPerDay);
  return Math.floor(totalDays / seasonLengthDays) % 4;
}

/** Count plants in the 8 immediately adjacent tiles. */
function _countAdjacentPlants(world, idx, w, h) {
  const x = idx % w, y = Math.floor(idx / w);
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && world.plantType[ny * w + nx] !== P_NONE) count++;
    }
  }
  return count;
}

/**
 * Check whether a terrain tile can support a given plant type.
 */
function _canPlantGrow(terrain, ptype) {
  if (terrain === DEEP_WATER) return false;
  // Desert plants can grow on sand; everything else cannot
  if (terrain === SAND && !DESERT_PLANT_TYPES.has(ptype)) return false;
  if (terrain === WATER) return false;
  // Trees cannot grow on rock or mountain
  if (_isTree(ptype) && (terrain === ROCK || terrain === MOUNTAIN)) return false;
  // Mountain only supports low plants
  if (terrain === MOUNTAIN && !_isLowPlant(ptype)) return false;
  return true;
}

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
    if (t === SOIL || t === DIRT || t === FERTILE_SOIL || t === ROCK || t === MOUNTAIN || t === MUD || t === SAND) eligible.push(i);
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
      // Near water: more berries, trees, tomatoes, coconut palms
      if (r < 0.08) ptype = P_GRASS;
      else if (r < 0.16) ptype = P_STRAWBERRY;
      else if (r < 0.24) ptype = P_BLUEBERRY;
      else if (r < 0.34) ptype = P_APPLE_TREE;
      else if (r < 0.44) ptype = P_MANGO_TREE;
      else if (r < 0.49) ptype = P_CARROT;
      else if (r < 0.56) ptype = P_SUNFLOWER;
      else if (r < 0.66) ptype = P_TOMATO;
      else if (r < 0.72) ptype = P_MUSHROOM;
      else if (r < 0.82) ptype = P_OAK_TREE;
      else if (r < 0.86) ptype = P_CACTUS;
      else if (r < 0.94) ptype = P_COCONUT_PALM;
      else ptype = P_GRASS;
    } else if (wp < 15) {
      // Medium distance: balanced
      if (r < 0.17) ptype = P_GRASS;
      else if (r < 0.24) ptype = P_STRAWBERRY;
      else if (r < 0.31) ptype = P_BLUEBERRY;
      else if (r < 0.40) ptype = P_APPLE_TREE;
      else if (r < 0.47) ptype = P_MANGO_TREE;
      else if (r < 0.55) ptype = P_CARROT;
      else if (r < 0.64) ptype = P_SUNFLOWER;
      else if (r < 0.72) ptype = P_TOMATO;
      else if (r < 0.81) ptype = P_MUSHROOM;
      else if (r < 0.90) ptype = P_OAK_TREE;
      else if (r < 0.95) ptype = P_CACTUS;
      else ptype = P_COCONUT_PALM;
    } else {
      // Far from water: more grass, carrots, sunflowers, mushrooms, cactus
      if (r < 0.20) ptype = P_GRASS;
      else if (r < 0.25) ptype = P_STRAWBERRY;
      else if (r < 0.30) ptype = P_BLUEBERRY;
      else if (r < 0.35) ptype = P_APPLE_TREE;
      else if (r < 0.39) ptype = P_MANGO_TREE;
      else if (r < 0.48) ptype = P_CARROT;
      else if (r < 0.58) ptype = P_SUNFLOWER;
      else if (r < 0.64) ptype = P_TOMATO;
      else if (r < 0.76) ptype = P_MUSHROOM;
      else if (r < 0.85) ptype = P_OAK_TREE;
      else if (r < 0.93) ptype = P_CACTUS;
      else ptype = P_COCONUT_PALM;
    }

    // Terrain restrictions: no trees on rock/mountain; only low plants on mountain
    const terrain = world.terrain[idx];
    if (_isTree(ptype) && (terrain === ROCK || terrain === MOUNTAIN)) continue;
    if (terrain === MOUNTAIN && !_isLowPlant(ptype)) continue;

    // Random initial stage
    const sr = Math.random();
    let stage, age;
    const ages = STAGE_AGES[ptype];
    if (sr < 0.25) {
      stage = S_SEED;
      age = Math.floor(Math.random() * ages[0]);
    } else if (sr < 0.50) {
      stage = S_YOUNG_SPROUT;
      age = ages[0] + Math.floor(Math.random() * (ages[1] - ages[0]));
    } else if (sr < 0.75) {
      stage = S_ADULT_SPROUT;
      age = ages[1] + Math.floor(Math.random() * (ages[2] - ages[1]));
    } else {
      stage = S_ADULT;
      age = ages[2] + Math.floor(Math.random() * (ages[3] - ages[2]) * 0.3);
    }

    world.plantType[idx] = ptype;
    world.plantStage[idx] = stage;
    world.plantAge[idx] = age;
    world.activePlantTiles.add(idx);
    world.clearPlantLog(idx);
    world.logPlantEvent(idx, 'PLANTED', { stage });
  }
}

/**
 * Process one tick of the plant lifecycle.
 * Uses active-tile tracking and 4-phase staggering to reduce per-tick cost.
 */
const PLANT_TICK_PHASES = 4;

export function processPlants(world) {
  const w = world.width, h = world.height;
  const wpThreshold = world.config.water_proximity_threshold ?? 10;
  const currentPhase = world.clock.tick % PLANT_TICK_PHASES;
  world.plantChanges = [];

  // Seasonal modifiers
  const season = getSeason(world);
  world.currentSeason = season;
  const seasonGrowth = SEASON_GROWTH_MULT[season];
  const seasonDeath = SEASON_DEATH_MULT[season];

  // --- Age alive plants and process stage transitions (staggered) ---
  for (const i of world.activePlantTiles) {
    // Stagger: only process tiles whose index matches current phase
    if (i % PLANT_TICK_PHASES !== currentPhase) continue;

    const ptype = world.plantType[i];
    const stage = world.plantStage[i];
    if (ptype === P_NONE || stage === S_NONE || stage >= S_DEAD) {
      world.activePlantTiles.delete(i);
      continue;
    }

    // Age by PLANT_TICK_PHASES to compensate for staggering
    world.plantAge[i] += PLANT_TICK_PHASES;

    const terrain = world.terrain[i];
    const speciesGrowth = SPECIES_TERRAIN_GROWTH[ptype];
    const terrainMult = (speciesGrowth && speciesGrowth[terrain]) || 1.0;

    // Harsh terrain: random chance to kill the plant each tick
    if (terrain === DIRT || terrain === ROCK || terrain === MOUNTAIN || terrain === MUD) {
      const deathChance = DIRT_DEATH_CHANCE[stage] || 0;
      const harshMult = terrain === MOUNTAIN ? 2.0 : terrain === ROCK ? 1.5 : 1.0;
      if (deathChance > 0 && Math.random() < deathChance * PLANT_TICK_PHASES * harshMult * seasonDeath) {
        world.plantStage[i] = S_DEAD;
        world.plantEvents.deaths_terrain[ptype] = (world.plantEvents.deaths_terrain[ptype] || 0) + 1;
        world.logPlantEvent(i, 'DIED', { cause: 'harsh_terrain' });
        const x = i % w, y = Math.floor(i / w);
        world.plantChanges.push([x, y, ptype, S_DEAD]);
        continue;
      }
    }

    // Compute water proximity and species water affinity
    const wp = world.waterProximity[i];
    const affinity = WATER_AFFINITY[ptype];

    // Fruit stage: age and check spoil → decay to seed
    if (stage === S_FRUIT) {
      const spoilAge = FRUIT_SPOIL_AGES[ptype] || 80;
      if (world.plantAge[i] >= spoilAge) {
        world.plantStage[i] = S_SEED;
        world.plantAge[i] = 0;
        world.logPlantEvent(i, 'SPOILED', {});
        const x = i % w, y = Math.floor(i / w);
        world.plantChanges.push([x, y, ptype, S_SEED]);
      }
      continue;
    }

    // Water stress: plants with medium/high water needs can die when far from water
    if (affinity >= 2 && wp > (world.config.water_stress_threshold ?? 20)) {
      const stressRate = world.config.water_stress_death_rate ?? 0.001;
      const severeMult = wp > (world.config.water_stress_severe_threshold ?? 30) ? 2.0 : 1.0;
      const affinityMult = affinity === 3 ? 1.5 : 1.0;
      if (Math.random() < stressRate * PLANT_TICK_PHASES * severeMult * affinityMult * seasonDeath) {
        world.plantStage[i] = S_DEAD;
        world.plantEvents.deaths_water[ptype] = (world.plantEvents.deaths_water[ptype] || 0) + 1;
        world.logPlantEvent(i, 'DIED', { cause: 'water_stress' });
        const x = i % w, y = Math.floor(i / w);
        world.plantChanges.push([x, y, ptype, S_DEAD]);
        continue;
      }
    }

    // Water proximity growth modifier (bonus near water, penalty when far for water-needy species)
    let waterMult;
    if (wp < wpThreshold) {
      waterMult = 1.3;
    } else if (affinity <= 1) {
      waterMult = 1.0; // low/no water need — unaffected
    } else if (wp < 25) {
      waterMult = 0.8;
    } else {
      waterMult = affinity === 3 ? 0.5 : 0.7;
    }

    // Crowding penalty: dense neighborhoods slow growth
    const crowding = _countAdjacentPlants(world, i, w, h);
    const crowdingMult = crowding >= 5 ? (world.config.plant_crowding_growth_penalty ?? 0.7) : 1.0;

    const effectiveAge = Math.floor(world.plantAge[i] * waterMult * terrainMult * seasonGrowth * crowdingMult);

    const ages = STAGE_AGES[ptype];
    let newStage = stage;

    if (stage === S_SEED && effectiveAge >= ages[0]) {
      newStage = S_YOUNG_SPROUT;
    } else if (stage === S_YOUNG_SPROUT && effectiveAge >= ages[1]) {
      newStage = S_ADULT_SPROUT;
    } else if (stage === S_ADULT_SPROUT && effectiveAge >= ages[2]) {
      newStage = S_ADULT;
    } else if (stage === S_ADULT && effectiveAge >= ages[3]) {
      newStage = S_DEAD;
    }

    if (newStage !== stage) {
      world.plantStage[i] = newStage;
      if (newStage === S_DEAD) {
        world.plantEvents.deaths_age[ptype] = (world.plantEvents.deaths_age[ptype] || 0) + 1;
        world.logPlantEvent(i, 'DIED', { cause: 'old_age' });
      } else if (newStage === S_ADULT) {
        world.plantEvents.matured[ptype] = (world.plantEvents.matured[ptype] || 0) + 1;
        world.logPlantEvent(i, 'MATURED', {});
      } else {
        world.logPlantEvent(i, 'GREW', { from: stage, to: newStage });
      }
      const x = i % w, y = Math.floor(i / w);
      world.plantChanges.push([x, y, ptype, newStage]);
    }
  }

  // --- Dead plants decompose ---
  const toRemove = [];
  for (const i of world.activePlantTiles) {
    if (world.plantStage[i] === S_DEAD) {
      const x = i % w, y = Math.floor(i / w);
      world.plantType[i] = P_NONE;
      world.plantStage[i] = S_NONE;
      world.plantAge[i] = 0;
      world.plantChanges.push([x, y, P_NONE, S_NONE]);
      world.clearPlantLog(i);
      toRemove.push(i);
    }
  }
  for (const i of toRemove) {
    world.activePlantTiles.delete(i);
  }

  // --- Adult plants produce offspring ---
  produceOffspring(world);
}

const DIRECTIONS = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];

/**
 * Adult plants produce fruits or seeds in adjacent empty tiles.
 */
function produceOffspring(world) {
  const w = world.width, h = world.height;

  // Seasonal reproduction modifier
  const season = getSeason(world);
  const seasonRepro = SEASON_REPRO_MULT[season];

  // Collect all adult plants from active tiles only
  const adults = [];
  for (const i of world.activePlantTiles) {
    if (world.plantStage[i] === S_ADULT) adults.push(i);
  }

  // Dynamic cap — reduce attempts when plant coverage is high
  const coverage = world.activePlantTiles.size / (w * h);
  const baseCap = 800;
  const dynamicCap = coverage > 0.6 ? Math.floor(baseCap * 0.25)
    : coverage > 0.4 ? Math.floor(baseCap * 0.5)
    : baseCap;

  // Shuffle to avoid positional bias
  for (let i = adults.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [adults[i], adults[j]] = [adults[j], adults[i]];
  }
  const maxAttempts = Math.min(adults.length, dynamicCap);

  // Local density thresholds
  const suppressThreshold = world.config.plant_density_suppress_threshold ?? 0.7;
  const reduceThreshold = world.config.plant_density_reduce_threshold ?? 0.5;

  for (let n = 0; n < maxAttempts; n++) {
    const idx = adults[n];
    const ptype = world.plantType[idx];
    const chance = (PRODUCTION_CHANCES[ptype] || 0.005) * seasonRepro;
    if (Math.random() > chance) continue;

    // Local density suppression: block reproduction in crowded areas
    const neighbors = _countAdjacentPlants(world, idx, w, h);
    const density = neighbors / 8;
    if (density >= suppressThreshold) continue;
    if (density >= reduceThreshold && Math.random() > 0.5) continue;

    const x = idx % w, y = Math.floor(idx / w);
    const mode = REPRODUCTION_MODES[ptype] || 'SEED';

    const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    const spread = 1 + Math.floor(Math.random() * 3); // 1-3 tiles
    const nx = x + dir[0] * spread, ny = y + dir[1] * spread;
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;

    const ni = ny * w + nx;
    if (world.plantType[ni] !== P_NONE) continue;
    const terrain = world.terrain[ni];
    if (!_canPlantGrow(terrain, ptype)) continue;

    // Seeds are less likely to take root on poor terrain
    if ((terrain === DIRT || terrain === ROCK || terrain === MUD) && Math.random() > 0.4) continue;
    if (terrain === MOUNTAIN && Math.random() > 0.25) continue;

    const offspringStage = mode === 'FRUIT' ? S_FRUIT : S_SEED;
    world.plantType[ni] = ptype;
    world.plantStage[ni] = offspringStage;
    world.plantAge[ni] = 0;
    world.activePlantTiles.add(ni);
    world.plantChanges.push([nx, ny, ptype, offspringStage]);
    world.plantEvents.births[ptype] = (world.plantEvents.births[ptype] || 0) + 1;
    world.clearPlantLog(ni);
    world.logPlantEvent(ni, 'BORN', { parentX: x, parentY: y, stage: offspringStage });
  }
}
