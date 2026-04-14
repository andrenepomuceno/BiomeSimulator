import { AnimalState } from '../entities.js';
import { S_FRUIT, S_SEED } from '../flora.js';
import { benchmarkAddKeyed, benchmarkEnd, benchmarkStart } from '../benchmarkProfiler.js';
import { _attack } from './combat.js';
import { _eatPlantTile } from './eating.js';
import { _computePath, _pursueTarget, _randomWalk, _reusePathIfValid, _walkPath } from './movement.js';
import { _tryEatEgg, _tryScavenge } from './scavenge.js';
import { _canEatPlant, _canHunt, _decisionThresholds, _isEdibleStage } from './utils.js';

function _findNearestHuntableTarget(animal, spatialHash, vision) {
  const nearby = spatialHash.queryRadius(animal.x, animal.y, vision);
  let target = null;
  let bestDist = Infinity;
  for (const entity of nearby) {
    if (!entity.alive || entity.id === animal.id || !_canHunt(animal, entity)) continue;
    const dist = Math.abs(entity.x - animal.x) + Math.abs(entity.y - animal.y);
    if (dist < bestDist) {
      bestDist = dist;
      target = entity;
    }
  }
  return { target, bestDist };
}

export function _seekWater(animal, world, vision) {
  const collector = world._benchmarkCollector;
  const startedAt = benchmarkStart(collector);
  try {
    benchmarkAddKeyed(collector, 'speciesSeekWater', animal.species, 1);
    if (world.isWaterAdjacent(animal.x, animal.y)) {
      animal.state = AnimalState.DRINKING;
      animal.applyEnergyCost('DRINK');
      return;
    }

    if (_reusePathIfValid(animal, world, 'water')) return;

    const desperate = animal.thirst > ((_decisionThresholds(animal).critical_thirst ?? 55) + 20);
    const searchR = desperate ? Math.min(vision * 3, 30) : vision * 2;
    const candidates = [];
    let bestDist = Infinity;

    for (let dy = -searchR; dy <= searchR; dy++) {
      for (let dx = -searchR; dx <= searchR; dx++) {
        const nx = (animal.x | 0) + dx;
        const ny = (animal.y | 0) + dy;
        if (!world.isInBounds(nx, ny)) continue;
        if (!world.isWalkableFor(nx, ny, animal._walkableSet)) continue;
        if (!world.isWaterAdjacent(nx, ny)) continue;
        const d = Math.abs(dx) + Math.abs(dy);
        if (d <= bestDist + 4) {
          if (d < bestDist) bestDist = d;
          candidates.push([nx, ny, d]);
        }
      }
    }

    if (candidates.length) {
      const cutoff = bestDist + 4;
      const viable = candidates.filter(candidate => candidate[2] <= cutoff);
      const unoccupied = viable.filter(candidate => !world.isTileOccupied(candidate[0], candidate[1]));
      const pool = unoccupied.length > 0 ? unoccupied : viable;
      const pick = pool[(Math.random() * pool.length) | 0];
      const pathLimit = desperate ? 80 : 50;
      _computePath(animal, world, pick[0], pick[1], pathLimit, 'water');
    }

    if (animal.path.length) {
      _walkPath(animal, world);
    } else {
      _randomWalk(animal, world);
    }
  } finally {
    benchmarkEnd(collector, 'seekWater', startedAt);
  }
}

export function _seekPlantFood(animal, world, vision) {
  const collector = world._benchmarkCollector;
  const startedAt = benchmarkStart(collector);
  try {
    benchmarkAddKeyed(collector, 'speciesSeekPlantFood', animal.species, 1);
    const idx = world.idx(animal.x, animal.y);
    const ptype = world.plantType[idx];
    const stage = world.plantStage[idx];
    if (ptype > 0 && _isEdibleStage(ptype, stage) && _canEatPlant(animal, ptype)) {
      _eatPlantTile(animal, world, idx);
      return;
    }

    if (_reusePathIfValid(animal, world, 'plant')) return;

    const r = vision;
    const maxR = animal.hunger > (_decisionThresholds(animal).expanded_plant_search_hunger ?? 65) ? Math.min(vision * 3, 25) : r;
    let bestFruit = null;
    let bestPlant = null;
    let bestSeed = null;

    for (let ring = 1; ring <= maxR; ring++) {
      for (let dx = -ring; dx <= ring; dx++) {
        const absdy = ring - Math.abs(dx);
        const dys = absdy === 0 ? [0] : [-absdy, absdy];
        for (const dy of dys) {
          const nx = animal.x + dx;
          const ny = animal.y + dy;
          if (!world.isInBounds(nx, ny)) continue;
          const ni = world.idx(nx, ny);
          const ntype = world.plantType[ni];
          const nstage = world.plantStage[ni];
          if (ntype > 0 && _isEdibleStage(ntype, nstage) && _canEatPlant(animal, ntype)) {
            if (nstage === S_FRUIT) {
              bestFruit = [nx, ny];
              break;
            }
            if (nstage === S_SEED) {
              if (!bestSeed) bestSeed = [nx, ny];
            } else if (!bestPlant) {
              bestPlant = [nx, ny];
            }
          }
        }
        if (bestFruit) break;
      }
      if (bestFruit) break;
      if ((bestPlant || bestSeed) && ring >= r) break;
    }

    const target = bestFruit || bestPlant || (animal.hunger > (_decisionThresholds(animal).desperate_seed_hunger_min ?? 60) ? bestSeed : null);
    if (target) {
      const pathLimit = target === bestFruit ? 40 : 60;
      _computePath(animal, world, target[0], target[1], pathLimit, target === bestFruit ? 'fruit' : 'plant');
      if (animal.path.length) {
        _walkPath(animal, world);
        return;
      }
    }

    _randomWalk(animal, world);
  } finally {
    benchmarkEnd(collector, 'seekPlantFood', startedAt);
  }
}

export function _seekPrey(animal, world, spatialHash, vision) {
  const collector = world._benchmarkCollector;
  const startedAt = benchmarkStart(collector);
  try {
    benchmarkAddKeyed(collector, 'speciesSeekPrey', animal.species, 1);
    const { target, bestDist } = _findNearestHuntableTarget(animal, spatialHash, vision);
    if (target) {
      if (bestDist <= 1) {
        _attack(animal, target, world);
      } else {
        _pursueTarget(animal, target, world, 'prey');
      }
      return;
    }

    if (animal._config.can_scavenge && _tryScavenge(animal, world, spatialHash, vision)) return;
    if (_tryEatEgg(animal, world, spatialHash, vision)) return;

    if (animal.hunger > (_decisionThresholds(animal).desperate_hunger_fallback_food_min ?? 50) && animal._ediblePlants.size > 0) {
      const idx = world.idx(animal.x, animal.y);
      const ptype = world.plantType[idx];
      const stage = world.plantStage[idx];
      if (ptype > 0 && _isEdibleStage(ptype, stage) && _canEatPlant(animal, ptype)) {
        _eatPlantTile(animal, world, idx);
        return;
      }
      _seekPlantFood(animal, world, vision);
      return;
    }

    _randomWalk(animal, world);
  } finally {
    benchmarkEnd(collector, 'seekPrey', startedAt);
  }
}

export function _seekOmnivoreFood(animal, world, spatialHash, vision) {
  const collector = world._benchmarkCollector;
  const startedAt = benchmarkStart(collector);
  try {
    benchmarkAddKeyed(collector, 'speciesSeekOmnivoreFood', animal.species, 1);
    const idx = world.idx(animal.x, animal.y);
    const ptype = world.plantType[idx];
    const stage = world.plantStage[idx];
    if (ptype > 0 && _isEdibleStage(ptype, stage) && _canEatPlant(animal, ptype)) {
      _eatPlantTile(animal, world, idx);
      return;
    }

    if (animal.hunger > (_decisionThresholds(animal).desperate_hunger_hunt_min ?? 75)) {
      const { target, bestDist } = _findNearestHuntableTarget(animal, spatialHash, vision);
      if (target) {
        if (bestDist <= 1) {
          _attack(animal, target, world);
        } else {
          _pursueTarget(animal, target, world, 'omnivore-prey');
        }
        return;
      }

      if (animal._config.can_scavenge && _tryScavenge(animal, world, spatialHash, vision)) return;
      if (_tryEatEgg(animal, world, spatialHash, vision)) return;
    }

    _seekPlantFood(animal, world, vision);
  } finally {
    benchmarkEnd(collector, 'seekOmnivoreFood', startedAt);
  }
}