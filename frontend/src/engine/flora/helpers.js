import { idxToXY } from '../helpers.js';
import { DEEP_WATER, MOUNTAIN, ROCK, SAND, WATER } from '../world.js';
import { ALL_PLANT_TYPES, P_GRASS, P_NONE, S_ADULT, S_ADULT_SPROUT, S_SEED, S_YOUNG_SPROUT } from './constants.js';
import { DESERT_PLANT_TYPES, LOW_PLANT_TYPES, SPAWN_WEIGHT_MAP, TREE_TYPES } from './lookups.js';

export function _isTree(ptype) {
  return TREE_TYPES.has(ptype);
}

export function _isLowPlant(ptype) {
  return LOW_PLANT_TYPES.has(ptype);
}

export function _countAdjacentPlants(world, idx, width, height) {
  const [x, y] = idxToXY(idx, width);
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < width && ny < height && world.plantType[ny * width + nx] !== P_NONE) {
        count++;
      }
    }
  }
  return count;
}

export function _canPlantGrow(terrain, ptype) {
  if (terrain === DEEP_WATER) return false;
  if (terrain === SAND && !DESERT_PLANT_TYPES.has(ptype)) return false;
  if (terrain === WATER) return false;
  if (_isTree(ptype) && (terrain === ROCK || terrain === MOUNTAIN)) return false;
  if (terrain === MOUNTAIN && !_isLowPlant(ptype)) return false;
  return true;
}

export function _pickPlantTypeByWaterProximity(wp, world) {
  const thresholds = world.config.plant_spawn_water_thresholds || { near: 5, mid: 15 };
  const zone = wp < thresholds.near ? 'near' : wp < thresholds.mid ? 'mid' : 'far';
  const weighted = [];
  let total = 0;
  for (const ptype of ALL_PLANT_TYPES) {
    const weight = SPAWN_WEIGHT_MAP[ptype]?.[zone] ?? 0;
    if (weight <= 0) continue;
    total += weight;
    weighted.push([ptype, total]);
  }
  if (total <= 0) return P_GRASS;
  const roll = Math.random() * total;
  for (const [ptype, cumulative] of weighted) {
    if (roll < cumulative) return ptype;
  }
  return weighted[weighted.length - 1][0];
}

export function _pickInitialStageAndAge(ages, world) {
  const stageDist = world.config.initial_plant_stage_distribution || [0.25, 0.25, 0.25, 0.25];
  const adultAgeFraction = world.config.initial_plant_adult_age_fraction ?? 0.3;
  const roll = Math.random();
  const c1 = stageDist[0] ?? 0.25;
  const c2 = c1 + (stageDist[1] ?? 0.25);
  const c3 = c2 + (stageDist[2] ?? 0.25);
  if (roll < c1) {
    return { stage: S_SEED, age: Math.floor(Math.random() * ages[0]) };
  }
  if (roll < c2) {
    return { stage: S_YOUNG_SPROUT, age: ages[0] + Math.floor(Math.random() * (ages[1] - ages[0])) };
  }
  if (roll < c3) {
    return { stage: S_ADULT_SPROUT, age: ages[1] + Math.floor(Math.random() * (ages[2] - ages[1])) };
  }
  return {
    stage: S_ADULT,
    age: ages[2] + Math.floor(Math.random() * (ages[3] - ages[2]) * adultAgeFraction),
  };
}