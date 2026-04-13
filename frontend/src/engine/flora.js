/**
 * Flora system — plant lifecycle with loop-based processing.
 *
 * Stages: SEED → YOUNG_SPROUT → ADULT_SPROUT → ADULT → DEAD
 * Adult plants produce offspring in adjacent cells:
 *   - Fruit producers place S_FRUIT (edible, decays to S_SEED)
 *   - Seed producers place S_SEED directly
 */
import { WATER, SAND, SOIL, DIRT, ROCK, FERTILE_SOIL, DEEP_WATER, MOUNTAIN, MUD } from './world.js';
import {
  buildStageAges,
  buildFruitSpoilAges,
  buildProductionChances,
  buildReproductionModes,
  buildTerrainGrowthMap,
  buildWaterAffinityMap,
  buildTreeTypes,
  buildLowPlantTypes,
  buildDesertPlantTypes,
  buildSpawnWeightMap,
  PLANT_IDS,
} from './plantSpecies.js';
import { benchmarkAdd, benchmarkEnd, benchmarkStart } from './benchmarkProfiler.js';
import { DEFAULT_SEASON_LENGTH_DAYS, DEFAULT_TICKS_PER_DAY } from '../constants/simulation.js';

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
export const P_POTATO = 13;     // Potato — asexual
export const P_CHILI_PEPPER = 14; // Chili pepper — hermaphrodite
export const P_OLIVE_TREE = 15; // Olive tree — hermaphrodite

// All placeable plant types
export const ALL_PLANT_TYPES = [P_GRASS, P_STRAWBERRY, P_BLUEBERRY, P_APPLE_TREE, P_MANGO_TREE, P_CARROT, P_SUNFLOWER, P_TOMATO, P_MUSHROOM, P_OAK_TREE, P_CACTUS, P_COCONUT_PALM, P_POTATO, P_CHILI_PEPPER, P_OLIVE_TREE];

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
  [P_POTATO]: 'ASEXUAL',
  [P_CHILI_PEPPER]: 'HERMAPHRODITE',
  [P_OLIVE_TREE]: 'HERMAPHRODITE',
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

// Tree types (cannot grow on rock or mountain)
const TREE_TYPES = buildTreeTypes();

// Low plants (can grow on mountain)
const LOW_PLANT_TYPES = buildLowPlantTypes();

// Desert plants (can grow on sand)
const DESERT_PLANT_TYPES = buildDesertPlantTypes();

const SPAWN_WEIGHT_MAP = buildSpawnWeightMap();

function _isTree(ptype) { return TREE_TYPES.has(ptype); }
function _isLowPlant(ptype) { return LOW_PLANT_TYPES.has(ptype); }

// Water affinity per species (0=none, 1=low, 2=medium, 3=high)
const WATER_AFFINITY = buildWaterAffinityMap();

// Season definitions: 0=Spring, 1=Summer, 2=Autumn, 3=Winter
export const SEASONS = ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER'];

function _seasonGrowthMult(world) {
  return world.config.season_growth_multiplier || [1.2, 1.0, 0.8, 0.5];
}

function _seasonReproMult(world) {
  return world.config.season_reproduction_multiplier || [1.5, 1.0, 0.7, 0.2];
}

function _seasonDeathMult(world) {
  return world.config.season_death_multiplier || [0.8, 1.0, 1.2, 2.0];
}

function _dirtDeathChance(world) {
  return world.config.plant_dirt_death_chance_by_stage || {
    [S_SEED]: 0.003,
    [S_YOUNG_SPROUT]: 0.002,
    [S_ADULT_SPROUT]: 0.001,
    [S_ADULT]: 0.0005,
    [S_FRUIT]: 0.002,
  };
}

function _pickPlantTypeByWaterProximity(wp, world) {
  const thresholds = world.config.plant_spawn_water_thresholds || { near: 5, mid: 15 };
  const zone = wp < thresholds.near ? 'near' : wp < thresholds.mid ? 'mid' : 'far';
  const weighted = [];
  let total = 0;
  for (const ptype of ALL_PLANT_TYPES) {
    const w = SPAWN_WEIGHT_MAP[ptype]?.[zone] ?? 0;
    if (w <= 0) continue;
    total += w;
    weighted.push([ptype, total]);
  }
  if (total <= 0) return P_GRASS;
  const roll = Math.random() * total;
  for (const [ptype, cumulative] of weighted) {
    if (roll < cumulative) return ptype;
  }
  return weighted[weighted.length - 1][0];
}

function _pickInitialStageAndAge(ages, world) {
  const stageDist = world.config.initial_plant_stage_distribution || [0.25, 0.25, 0.25, 0.25];
  const adultAgeFraction = world.config.initial_plant_adult_age_fraction ?? 0.3;
  const sr = Math.random();
  const c1 = stageDist[0] ?? 0.25;
  const c2 = c1 + (stageDist[1] ?? 0.25);
  const c3 = c2 + (stageDist[2] ?? 0.25);
  if (sr < c1) {
    return { stage: S_SEED, age: Math.floor(Math.random() * ages[0]) };
  }
  if (sr < c2) {
    return { stage: S_YOUNG_SPROUT, age: ages[0] + Math.floor(Math.random() * (ages[1] - ages[0])) };
  }
  if (sr < c3) {
    return { stage: S_ADULT_SPROUT, age: ages[1] + Math.floor(Math.random() * (ages[2] - ages[1])) };
  }
  return {
    stage: S_ADULT,
    age: ages[2] + Math.floor(Math.random() * (ages[3] - ages[2]) * adultAgeFraction),
  };
}

/** Get current season index (0=Spring, 1=Summer, 2=Autumn, 3=Winter). */
export function getSeason(world) {
  const ticksPerDay = world.config.ticks_per_day || DEFAULT_TICKS_PER_DAY;
  const seasonLengthDays = world.config.season_length_days || DEFAULT_SEASON_LENGTH_DAYS;
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

  const seedPlantAt = (idx, ptype) => {
    const ages = STAGE_AGES[ptype];
    const { stage, age } = _pickInitialStageAndAge(ages, world);

    world.plantType[idx] = ptype;
    world.plantStage[idx] = stage;
    world.plantAge[idx] = age;
    world.activePlantTiles.add(idx);
    world.clearPlantLog(idx);
    world.logPlantEvent(idx, 'PLANTED', { stage });
  };

  const configuredCounts = world.config.initial_plant_counts || null;
  const hasConfiguredPlantCounts = configuredCounts && Object.values(configuredCounts).some(v => (v || 0) > 0);

  if (hasConfiguredPlantCounts && nPlants > 0) {
    const validEntries = Object.entries(configuredCounts)
      .map(([id, count]) => [PLANT_IDS[id], Math.max(0, Math.round(Number(count) || 0))])
      .filter(([ptype, count]) => ptype != null && count > 0);

    if (validEntries.length > 0) {
      const requestedTotal = validEntries.reduce((sum, [, count]) => sum + count, 0);
      const scale = requestedTotal > nPlants ? (nPlants / requestedTotal) : 1;

      const normalized = validEntries.map(([ptype, count]) => {
        const scaled = count * scale;
        return { ptype, floor: Math.floor(scaled), frac: scaled - Math.floor(scaled) };
      });

      let assigned = normalized.reduce((sum, entry) => sum + entry.floor, 0);
      const slotsLeft = Math.max(0, nPlants - assigned);
      normalized.sort((a, b) => b.frac - a.frac);
      for (let i = 0; i < slotsLeft && i < normalized.length; i++) {
        normalized[i].floor += 1;
      }

      const terrainBuckets = {};
      for (const idx of eligible) {
        const terrain = world.terrain[idx];
        for (const entry of normalized) {
          if (_canPlantGrow(terrain, entry.ptype)) {
            if (!terrainBuckets[entry.ptype]) terrainBuckets[entry.ptype] = [];
            terrainBuckets[entry.ptype].push(idx);
          }
        }
      }

      for (const ptypeKey of Object.keys(terrainBuckets)) {
        const bucket = terrainBuckets[ptypeKey];
        for (let i = bucket.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [bucket[i], bucket[j]] = [bucket[j], bucket[i]];
        }
      }

      const used = new Set();
      let seeded = 0;
      for (const entry of normalized) {
        const bucket = terrainBuckets[entry.ptype] || [];
        let placedForType = 0;
        while (placedForType < entry.floor && bucket.length > 0 && seeded < nPlants) {
          const idx = bucket.pop();
          if (used.has(idx)) continue;
          used.add(idx);
          seedPlantAt(idx, entry.ptype);
          placedForType += 1;
          seeded += 1;
        }
      }

      // Backfill remaining slots with water-proximity weighted species selection.
      for (const idx of eligible) {
        if (seeded >= nPlants) break;
        if (used.has(idx)) continue;

        const wp = world.waterProximity[idx];
        const ptype = _pickPlantTypeByWaterProximity(wp, world);
        if (!_canPlantGrow(world.terrain[idx], ptype)) continue;

        used.add(idx);
        seedPlantAt(idx, ptype);
        seeded += 1;
      }

      return;
    }
  }

  for (let n = 0; n < nPlants && n < eligible.length; n++) {
    const idx = eligible[n];
    const wp = world.waterProximity[idx];

    const ptype = _pickPlantTypeByWaterProximity(wp, world);

    if (!_canPlantGrow(world.terrain[idx], ptype)) continue;
    seedPlantAt(idx, ptype);
  }
}

/**
 * Process one tick of the plant lifecycle.
 * Uses active-tile tracking and 4-phase staggering to reduce per-tick cost.
 */
export function processPlants(world) {
  const collector = world._benchmarkCollector;
  const startedAt = benchmarkStart(collector);
  const w = world.width, h = world.height;
  const wpThreshold = world.config.water_proximity_threshold ?? 10;
  const plantTickPhases = world.config.plant_tick_phases ?? 4;
  const currentPhase = world.clock.tick % plantTickPhases;
  world.plantChanges = [];

  // Seasonal modifiers
  const season = getSeason(world);
  world.currentSeason = season;
  const seasonGrowth = _seasonGrowthMult(world)[season] ?? 1;
  const seasonDeath = _seasonDeathMult(world)[season] ?? 1;
  const dirtDeathChanceByStage = _dirtDeathChance(world);

  // --- Age alive plants and process stage transitions (staggered) ---
  const activePlantCount = world.activePlantTiles.size;
  for (const i of world.activePlantTiles) {
    // Stagger: only process tiles whose index matches current phase
    if (i % plantTickPhases !== currentPhase) continue;

    const ptype = world.plantType[i];
    const stage = world.plantStage[i];
    if (ptype === P_NONE || stage === S_NONE || stage >= S_DEAD) {
      world.activePlantTiles.delete(i);
      continue;
    }

    // Age by configured phase count to compensate for staggering
    world.plantAge[i] += plantTickPhases;

    const terrain = world.terrain[i];
    const speciesGrowth = SPECIES_TERRAIN_GROWTH[ptype];
    const terrainMult = (speciesGrowth && speciesGrowth[terrain]) || 1.0;

    // Harsh terrain: random chance to kill the plant each tick
    if (terrain === DIRT || terrain === ROCK || terrain === MOUNTAIN || terrain === MUD) {
      const deathChance = dirtDeathChanceByStage[stage] || 0;
      const harshTerrainMult = world.config.plant_harsh_terrain_death_multiplier || {};
      const harshMult = terrain === MOUNTAIN
        ? (harshTerrainMult.mountain ?? 2.0)
        : terrain === ROCK
          ? (harshTerrainMult.rock ?? 1.5)
          : (harshTerrainMult.default ?? 1.0);
      if (deathChance > 0 && Math.random() < deathChance * plantTickPhases * harshMult * seasonDeath) {
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
      const severeMult = wp > (world.config.water_stress_severe_threshold ?? 30)
        ? (world.config.water_stress_severe_multiplier ?? 2.0)
        : 1.0;
      const affinityMult = affinity === 3 ? (world.config.water_stress_high_affinity_multiplier ?? 1.5) : 1.0;
      if (Math.random() < stressRate * plantTickPhases * severeMult * affinityMult * seasonDeath) {
        world.plantStage[i] = S_DEAD;
        world.plantEvents.deaths_water[ptype] = (world.plantEvents.deaths_water[ptype] || 0) + 1;
        world.logPlantEvent(i, 'DIED', { cause: 'water_stress' });
        const x = i % w, y = Math.floor(i / w);
        world.plantChanges.push([x, y, ptype, S_DEAD]);
        continue;
      }
    }

    // Water proximity growth modifier (bonus near water, penalty when far for water-needy species)
    const waterGrowth = world.config.plant_water_growth_modifiers || {};
    const farThreshold = world.config.plant_water_far_threshold ?? 25;
    let waterMult;
    if (wp < wpThreshold) {
      waterMult = waterGrowth.near ?? 1.3;
    } else if (affinity <= 1) {
      waterMult = waterGrowth.lowAffinity ?? 1.0;
    } else if (wp < farThreshold) {
      waterMult = waterGrowth.mid ?? 0.8;
    } else {
      waterMult = affinity === 3 ? (waterGrowth.farHighAffinity ?? 0.5) : (waterGrowth.farMediumAffinity ?? 0.7);
    }

    // Crowding penalty: dense neighborhoods slow growth
    const crowding = _countAdjacentPlants(world, i, w, h);
    const crowdingThreshold = world.config.plant_crowding_neighbor_threshold ?? 5;
    const crowdingMult = crowding >= crowdingThreshold ? (world.config.plant_crowding_growth_penalty ?? 0.7) : 1.0;

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
  benchmarkAdd(collector, 'activePlantsScanned', activePlantCount);
  benchmarkEnd(collector, 'processPlants', startedAt);
}

const DIRECTIONS = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];

/**
 * Adult plants produce fruits or seeds in adjacent empty tiles.
 */
function produceOffspring(world) {
  const collector = world._benchmarkCollector;
  const startedAt = benchmarkStart(collector);
  const w = world.width, h = world.height;

  // Seasonal reproduction modifier
  const season = getSeason(world);
  const seasonRepro = _seasonReproMult(world)[season] ?? 1;

  // Collect all adult plants from active tiles only
  const adults = [];
  for (const i of world.activePlantTiles) {
    if (world.plantStage[i] === S_ADULT) adults.push(i);
  }

  // Dynamic cap — reduce attempts when plant coverage is high
  const coverage = world.activePlantTiles.size / (w * h);
  const baseCap = world.config.plant_reproduction_base_cap ?? 800;
  const highCoverageThreshold = world.config.plant_reproduction_high_coverage_threshold ?? 0.6;
  const mediumCoverageThreshold = world.config.plant_reproduction_medium_coverage_threshold ?? 0.4;
  const highCoverageFactor = world.config.plant_reproduction_high_coverage_factor ?? 0.25;
  const mediumCoverageFactor = world.config.plant_reproduction_medium_coverage_factor ?? 0.5;
  const dynamicCap = coverage > highCoverageThreshold ? Math.floor(baseCap * highCoverageFactor)
    : coverage > mediumCoverageThreshold ? Math.floor(baseCap * mediumCoverageFactor)
    : baseCap;

  // Shuffle to avoid positional bias
  for (let i = adults.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [adults[i], adults[j]] = [adults[j], adults[i]];
  }
  const maxAttempts = Math.min(adults.length, dynamicCap);
  let births = 0;

  // Local density thresholds
  const suppressThreshold = world.config.plant_density_suppress_threshold ?? 0.7;
  const reduceThreshold = world.config.plant_density_reduce_threshold ?? 0.5;

  for (let n = 0; n < maxAttempts; n++) {
    const idx = adults[n];
    const ptype = world.plantType[idx];
    const terrain = world.terrain[idx];
    // Terrain fertility bonus: plants on better terrain reproduce more
    const speciesGrowth = SPECIES_TERRAIN_GROWTH[ptype];
    const terrainRepro = (speciesGrowth && speciesGrowth[terrain]) || 1.0;
    const chance = (PRODUCTION_CHANCES[ptype] || 0.005) * seasonRepro * terrainRepro;
    if (Math.random() > chance) continue;

    // Local density suppression: block reproduction in crowded areas
    const neighbors = _countAdjacentPlants(world, idx, w, h);
    const density = neighbors / 8;
    if (density >= suppressThreshold) continue;
    if (density >= reduceThreshold && Math.random() > (world.config.plant_density_reduce_success_chance ?? 0.5)) continue;

    const x = idx % w, y = Math.floor(idx / w);
    const mode = REPRODUCTION_MODES[ptype] || 'SEED';

    const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    const maxSpread = world.config.plant_offspring_max_spread ?? 3;
    const spread = 1 + Math.floor(Math.random() * maxSpread);
    const nx = x + dir[0] * spread, ny = y + dir[1] * spread;
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;

    const ni = ny * w + nx;
    if (world.plantType[ni] !== P_NONE) continue;
    const destTerrain = world.terrain[ni];
    if (!_canPlantGrow(destTerrain, ptype)) continue;

    // Seeds are less likely to take root on poor terrain
    const harshRootChance = world.config.plant_offspring_harsh_root_chance ?? 0.4;
    const mountainRootChance = world.config.plant_offspring_mountain_root_chance ?? 0.25;
    if ((destTerrain === DIRT || destTerrain === ROCK || destTerrain === MUD) && Math.random() > harshRootChance) continue;
    if (destTerrain === MOUNTAIN && Math.random() > mountainRootChance) continue;

    const offspringStage = mode === 'FRUIT' ? S_FRUIT : S_SEED;
    world.plantType[ni] = ptype;
    world.plantStage[ni] = offspringStage;
    world.plantAge[ni] = 0;
    world.activePlantTiles.add(ni);
    world.plantChanges.push([nx, ny, ptype, offspringStage]);
    world.plantEvents.births[ptype] = (world.plantEvents.births[ptype] || 0) + 1;
    world.clearPlantLog(ni);
    world.logPlantEvent(ni, 'BORN', { parentX: x, parentY: y, stage: offspringStage });
    births++;
  }
  benchmarkAdd(collector, 'adultPlantsConsidered', adults.length);
  benchmarkAdd(collector, 'offspringAttempts', maxAttempts);
  benchmarkAdd(collector, 'offspringBirths', births);
  benchmarkEnd(collector, 'produceOffspring', startedAt);
}
