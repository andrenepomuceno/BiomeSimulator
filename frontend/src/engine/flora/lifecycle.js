import { benchmarkAdd, benchmarkEnd, benchmarkStart } from '../benchmarkProfiler.js';
import { idxToXY } from '../helpers.js';
import { DIRT, MOUNTAIN, MUD, ROCK } from '../world.js';
import { P_NONE, S_ADULT, S_ADULT_SPROUT, S_DEAD, S_FRUIT, S_NONE, S_SEED, S_YOUNG_SPROUT } from './constants.js';
import { _canPlantGrow, _countAdjacentPlants } from './helpers.js';
import { FRUIT_SPOIL_AGES, SPECIES_TERRAIN_GROWTH, STAGE_AGES, WATER_AFFINITY } from './lookups.js';
import { _dirtDeathChance, _seasonDeathMult, _seasonGrowthMult, getSeason } from './modifiers.js';
import { produceOffspring } from './reproduction.js';

export function processPlants(world) {
  const collector = world._benchmarkCollector;
  const startedAt = benchmarkStart(collector);
  const width = world.width;
  const height = world.height;
  const wpThreshold = world.config.water_proximity_threshold ?? 10;
  const plantTickPhases = world.config.plant_tick_phases ?? 4;
  const currentPhase = world.clock.tick % plantTickPhases;
  world.plantChanges = [];

  const season = getSeason(world);
  world.currentSeason = season;
  const seasonGrowth = _seasonGrowthMult(world)[season] ?? 1;
  const seasonDeath = _seasonDeathMult(world)[season] ?? 1;
  const dirtDeathChanceByStage = _dirtDeathChance(world);

  const activePlantCount = world.activePlantTiles.size;
  for (const idx of world.activePlantTiles) {
    if (idx % plantTickPhases !== currentPhase) continue;

    const ptype = world.plantType[idx];
    const stage = world.plantStage[idx];
    if (ptype === P_NONE || stage === S_NONE || stage >= S_DEAD) {
      world.activePlantTiles.delete(idx);
      continue;
    }

    world.plantAge[idx] += plantTickPhases;

    const terrain = world.terrain[idx];
    const speciesGrowth = SPECIES_TERRAIN_GROWTH[ptype];
    const terrainMult = (speciesGrowth && speciesGrowth[terrain]) || 1.0;

    if (terrain === DIRT || terrain === ROCK || terrain === MOUNTAIN || terrain === MUD) {
      const deathChance = dirtDeathChanceByStage[stage] || 0;
      const harshTerrainMult = world.config.plant_harsh_terrain_death_multiplier || {};
      const harshMult = terrain === MOUNTAIN
        ? (harshTerrainMult.mountain ?? 2.0)
        : terrain === ROCK
          ? (harshTerrainMult.rock ?? 1.5)
          : (harshTerrainMult.default ?? 1.0);
      if (deathChance > 0 && Math.random() < deathChance * plantTickPhases * harshMult * seasonDeath) {
        world.plantStage[idx] = S_DEAD;
        world.plantEvents.deaths_terrain[ptype] = (world.plantEvents.deaths_terrain[ptype] || 0) + 1;
        world.logPlantEvent(idx, 'DIED', { cause: 'harsh_terrain' });
        const [x, y] = idxToXY(idx, width);
        world.plantChanges.push([x, y, ptype, S_DEAD]);
        continue;
      }
    }

    const wp = world.waterProximity[idx];
    const affinity = WATER_AFFINITY[ptype];

    if (stage === S_FRUIT) {
      const spoilAge = FRUIT_SPOIL_AGES[ptype] || 80;
      if (world.plantAge[idx] >= spoilAge) {
        world.plantStage[idx] = S_SEED;
        world.plantAge[idx] = 0;
        world.logPlantEvent(idx, 'SPOILED', {});
        const x = idx % width;
        const y = Math.floor(idx / width);
        world.plantChanges.push([x, y, ptype, S_SEED]);
      }
      continue;
    }

    if (affinity >= 2 && wp > (world.config.water_stress_threshold ?? 20)) {
      const stressRate = world.config.water_stress_death_rate ?? 0.001;
      const severeMult = wp > (world.config.water_stress_severe_threshold ?? 30)
        ? (world.config.water_stress_severe_multiplier ?? 2.0)
        : 1.0;
      const affinityMult = affinity === 3 ? (world.config.water_stress_high_affinity_multiplier ?? 1.5) : 1.0;
      if (Math.random() < stressRate * plantTickPhases * severeMult * affinityMult * seasonDeath) {
        world.plantStage[idx] = S_DEAD;
        world.plantEvents.deaths_water[ptype] = (world.plantEvents.deaths_water[ptype] || 0) + 1;
        world.logPlantEvent(idx, 'DIED', { cause: 'water_stress' });
        const [x, y] = idxToXY(idx, width);
        world.plantChanges.push([x, y, ptype, S_DEAD]);
        continue;
      }
    }

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

    const crowding = _countAdjacentPlants(world, idx, width, height);
    const crowdingThreshold = world.config.plant_crowding_neighbor_threshold ?? 5;
    const crowdingMult = crowding >= crowdingThreshold ? (world.config.plant_crowding_growth_penalty ?? 0.7) : 1.0;

    const effectiveAge = Math.floor(world.plantAge[idx] * waterMult * terrainMult * seasonGrowth * crowdingMult);
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
      world.plantStage[idx] = newStage;
      if (newStage === S_DEAD) {
        world.plantEvents.deaths_age[ptype] = (world.plantEvents.deaths_age[ptype] || 0) + 1;
        world.logPlantEvent(idx, 'DIED', { cause: 'old_age' });
      } else if (newStage === S_ADULT) {
        world.plantEvents.matured[ptype] = (world.plantEvents.matured[ptype] || 0) + 1;
        world.logPlantEvent(idx, 'MATURED', {});
      } else {
        world.logPlantEvent(idx, 'GREW', { from: stage, to: newStage });
      }
      const [x, y] = idxToXY(idx, width);
      world.plantChanges.push([x, y, ptype, newStage]);
    }
  }

  const toRemove = [];
  for (const idx of world.activePlantTiles) {
    if (world.plantStage[idx] === S_DEAD) {
      const [x, y] = idxToXY(idx, width);
      world.plantType[idx] = P_NONE;
      world.plantStage[idx] = S_NONE;
      world.plantAge[idx] = 0;
      world.plantChanges.push([x, y, P_NONE, S_NONE]);
      world.clearPlantLog(idx);
      toRemove.push(idx);
    }
  }
  for (const idx of toRemove) {
    world.activePlantTiles.delete(idx);
  }

  produceOffspring(world);
  benchmarkAdd(collector, 'activePlantsScanned', activePlantCount);
  benchmarkEnd(collector, 'processPlants', startedAt);
}