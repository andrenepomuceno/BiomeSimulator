import { benchmarkAdd, benchmarkEnd, benchmarkStart } from '../benchmarkProfiler.js';
import { idxToXY, shuffleInPlace } from '../helpers.js';
import { DIRT, MOUNTAIN, MUD, ROCK } from '../world.js';
import { P_NONE, S_ADULT, S_FRUIT, S_SEED } from './constants.js';
import { _canPlantGrow, _countAdjacentPlants } from './helpers.js';
import { PRODUCTION_CHANCES, REPRODUCTION_MODES, SPECIES_TERRAIN_GROWTH, TREE_TYPES } from './lookups.js';
import { _seasonReproMult, getSeason } from './modifiers.js';
import { ITEM_TYPE } from '../items.js';
import { buildTreeDropProfiles } from '../plantSpecies.js';

const TREE_DROP_PROFILES = buildTreeDropProfiles();

const DIRECTIONS = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];

export function produceOffspring(world) {
  const collector = world._benchmarkCollector;
  const startedAt = benchmarkStart(collector);
  const width = world.width;
  const height = world.height;

  const season = getSeason(world);
  const seasonRepro = _seasonReproMult(world)[season] ?? 1;

  const adults = [];
  for (const idx of world.activePlantTiles) {
    if (world.plantStage[idx] === S_ADULT) adults.push(idx);
  }

  const coverage = world.activePlantTiles.size / (width * height);
  const baseCap = world.config.plant_reproduction_base_cap ?? 800;
  const highCoverageThreshold = world.config.plant_reproduction_high_coverage_threshold ?? 0.6;
  const mediumCoverageThreshold = world.config.plant_reproduction_medium_coverage_threshold ?? 0.4;
  const highCoverageFactor = world.config.plant_reproduction_high_coverage_factor ?? 0.25;
  const mediumCoverageFactor = world.config.plant_reproduction_medium_coverage_factor ?? 0.5;
  const dynamicCap = coverage > highCoverageThreshold
    ? Math.floor(baseCap * highCoverageFactor)
    : coverage > mediumCoverageThreshold
      ? Math.floor(baseCap * mediumCoverageFactor)
      : baseCap;

  shuffleInPlace(adults);
  const maxAttempts = Math.min(adults.length, dynamicCap);
  let births = 0;

  const suppressThreshold = world.config.plant_density_suppress_threshold ?? 0.7;
  const reduceThreshold = world.config.plant_density_reduce_threshold ?? 0.5;

  for (let n = 0; n < maxAttempts; n++) {
    const idx = adults[n];
    const ptype = world.plantType[idx];
    const terrain = world.terrain[idx];
    const speciesGrowth = SPECIES_TERRAIN_GROWTH[ptype];
    const terrainRepro = (speciesGrowth && speciesGrowth[terrain]) || 1.0;
    const chance = (world.config.plant_production_chances?.[ptype] ?? PRODUCTION_CHANCES[ptype] ?? 0.005) * seasonRepro * terrainRepro;
    if (Math.random() > chance) continue;

    const neighbors = _countAdjacentPlants(world, idx, width, height);
    const density = neighbors / 8;
    if (density >= suppressThreshold) continue;
    if (density >= reduceThreshold && Math.random() > (world.config.plant_density_reduce_success_chance ?? 0.5)) continue;

    const [x, y] = idxToXY(idx, width);
    const mode = REPRODUCTION_MODES[ptype] || 'SEED';

    const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    const maxSpread = world.config.plant_offspring_max_spread ?? 3;
    const spread = 1 + Math.floor(Math.random() * maxSpread);
    const nx = x + dir[0] * spread;
    const ny = y + dir[1] * spread;
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;

    const ni = ny * width + nx;
    if (world.plantType[ni] !== P_NONE) continue;
    const destTerrain = world.terrain[ni];
    if (!_canPlantGrow(destTerrain, ptype)) continue;

    const harshRootChance = world.config.plant_offspring_harsh_root_chance ?? 0.4;
    const mountainRootChance = world.config.plant_offspring_mountain_root_chance ?? 0.25;
    if ((destTerrain === DIRT || destTerrain === ROCK || destTerrain === MUD) && Math.random() > harshRootChance) continue;
    if (destTerrain === MOUNTAIN && Math.random() > mountainRootChance) continue;

    const offspringStage = mode === 'FRUIT' ? S_FRUIT : S_SEED;

    if (TREE_TYPES.has(ptype)) {
      // Trees drop fruit/seed items instead of creating a plant tile
      const profile = TREE_DROP_PROFILES[ptype];
      if (profile) {
        const [dropMin, dropMax] = profile.countRange;
        const dropCount = dropMin + Math.floor(Math.random() * (dropMax - dropMin + 1));
        const itemType = profile.itemType === 'SEED' ? ITEM_TYPE.SEED : ITEM_TYPE.FRUIT;
        const radius = world.config.item_drop_radius_plant ?? 2;
        for (let d = 0; d < dropCount; d++) {
          world.spawnItem(x, y, itemType, ptype, radius);
        }
        births++;
      }
      continue;
    }

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