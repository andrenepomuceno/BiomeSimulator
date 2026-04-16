import { AnimalState } from '../entities.js';
import { S_FRUIT, S_SEED } from '../flora.js';
import { ITEM_TYPE } from '../items.js';
import { benchmarkAddKeyed, benchmarkEnd, benchmarkStart } from '../benchmarkProfiler.js';
import { _attack } from './combat.js';
import { _eatGroundItem, _eatPlantTile } from './eating.js';
import { _computePath, _pursueTarget, _randomWalk, _reusePathIfValid, _walkPath } from './movement.js';
import { _tryEatEgg, _tryEatMeatItem, _tryScavenge } from './scavenge.js';
import { _canEatPlant, _canHunt, _decisionThresholds, _isEdibleStage } from './utils.js';

/**
 * Try to find and eat a FRUIT or SEED ground item within vision.
 * Eligible for herbivores and omnivores.
 */
function _tryEatFruitItem(animal, world, vision) {
  if (!world._itemSpatialHash) return false;
  const nearby = world._itemSpatialHash.queryRadius(animal.x, animal.y, vision);
  let target = null;
  let bestDist = Infinity;
  for (const item of nearby) {
    if (item.consumed || (item.type !== ITEM_TYPE.FRUIT && item.type !== ITEM_TYPE.SEED)) continue;
    const dist = Math.abs(item.x + 0.5 - animal.x) + Math.abs(item.y + 0.5 - animal.y);
    if (dist < bestDist) {
      bestDist = dist;
      target = item;
    }
  }
  if (!target) return false;

  if (bestDist <= 1.5) {
    _eatGroundItem(animal, world, target);
    return true;
  }

  _computePath(animal, world, target.x, target.y, 30, 'fruit_item');
  if (animal.path.length) {
    _walkPath(animal, world);
    return true;
  }
  return false;
}

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
      // Arrived — clear water lock
      animal._waterLockUntilTick = 0;
      animal._waterTargetX = null;
      animal._waterTargetY = null;
      animal.state = AnimalState.DRINKING;
      animal.applyEnergyCost('DRINK');
      return;
    }

    if (_reusePathIfValid(animal, world, 'water')) return;

    const desperate = animal.thirst > ((_decisionThresholds(animal).critical_thirst ?? 55) + 20);

    // Water destination lock: skip expensive grid scan if we already have a valid target
    const tick = world.clock.tick;
    const waterLockTicks = world.config.water_lock_ticks ?? 30;
    if (tick < animal._waterLockUntilTick && animal._waterTargetX != null
        && world.isInBounds(animal._waterTargetX, animal._waterTargetY)
        && world.isWaterAdjacent(animal._waterTargetX, animal._waterTargetY)) {
      const pathLimit = desperate ? 80 : 50;
      _computePath(animal, world, animal._waterTargetX, animal._waterTargetY, pathLimit, 'water');
      if (animal.path.length) {
        _walkPath(animal, world);
        return;
      }
      // Path failed — clear lock and fall through to full scan
      animal._waterLockUntilTick = 0;
    }

    // Full grid scan
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
      const unoccupied = viable.filter(candidate => !world.isTileBlocked(candidate[0], candidate[1]));
      const pool = unoccupied.length > 0 ? unoccupied : viable;
      const pick = pool[(Math.random() * pool.length) | 0];
      const pathLimit = desperate ? 80 : 50;
      // Lock onto this destination
      animal._waterTargetX = pick[0];
      animal._waterTargetY = pick[1];
      animal._waterLockUntilTick = tick + waterLockTicks;
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

    // Plant destination lock: skip expensive ring scan if we have a valid target
    const tick = world.clock.tick;
    const plantLockTicks = world.config.plant_lock_ticks ?? 20;
    if (tick < animal._plantLockUntilTick && animal._plantTargetX != null) {
      const tx = animal._plantTargetX;
      const ty = animal._plantTargetY;
      if (world.isInBounds(tx, ty)) {
        const ni = world.idx(tx, ty);
        const ntype = world.plantType[ni];
        const nstage = world.plantStage[ni];
        if (ntype > 0 && _isEdibleStage(ntype, nstage) && _canEatPlant(animal, ntype)) {
          const pathLimit = nstage === S_FRUIT ? 40 : 60;
          _computePath(animal, world, tx, ty, pathLimit, nstage === S_FRUIT ? 'fruit' : 'plant');
          if (animal.path.length) {
            _walkPath(animal, world);
            return;
          }
        }
      }
      // Target gone or unreachable — clear lock and fall through to scan
      animal._plantLockUntilTick = 0;
      animal._plantTargetX = null;
      animal._plantTargetY = null;
    }

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
      // Lock onto this plant destination
      animal._plantTargetX = target[0];
      animal._plantTargetY = target[1];
      animal._plantLockUntilTick = tick + plantLockTicks;
      const pathLimit = target === bestFruit ? 40 : 60;
      _computePath(animal, world, target[0], target[1], pathLimit, target === bestFruit ? 'fruit' : 'plant');
      if (animal.path.length) {
        _walkPath(animal, world);
        return;
      }
    }

    // Fallback: try ground fruit/seed items if no plant tile reachable
    if (_tryEatFruitItem(animal, world, vision)) return;

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

    // Priority rule: if there is food nearby, eat first; hunt only when no food is found in vision.
    if (animal._config.can_scavenge && _tryScavenge(animal, world, spatialHash, vision)) {
      animal._chaseTarget = null;
      animal._chaseLockUntilTick = 0;
      return;
    }
    if (_tryEatMeatItem(animal, world, vision)) {
      animal._chaseTarget = null;
      animal._chaseLockUntilTick = 0;
      return;
    }
    if (_tryEatEgg(animal, world, spatialHash, vision)) {
      animal._chaseTarget = null;
      animal._chaseLockUntilTick = 0;
      return;
    }

    const tick = world.clock.tick;
    const chaseLockTicks = animal._config.chase_lock_ticks ?? world.config.chase_lock_ticks ?? 5;
    let target = null;
    let bestDist = Infinity;
    if (tick < animal._chaseLockUntilTick && animal._chaseTarget?.alive) {
      const locked = animal._chaseTarget;
      const d = Math.abs(locked.x - animal.x) + Math.abs(locked.y - animal.y);
      if (d <= vision + 2) {
        target = locked;
        bestDist = d;
      }
    }
    if (!target) {
      ({ target, bestDist } = _findNearestHuntableTarget(animal, spatialHash, vision));
    }
    if (target) {
      animal._chaseTarget = target;
      animal._chaseLockUntilTick = tick + chaseLockTicks;
      if (bestDist <= 1 && animal.attackCooldown <= 0) {
        _attack(animal, target, world);
      } else {
        _pursueTarget(animal, target, world, 'prey');
      }
      return;
    }
    animal._chaseTarget = null;
    animal._chaseLockUntilTick = 0;

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

    // Priority rule: if there is food nearby, eat first; hunt only when no food is found in vision.
    if (_tryEatFruitItem(animal, world, vision)) return;
    if (animal._config.can_scavenge && _tryScavenge(animal, world, spatialHash, vision)) return;
    if (_tryEatMeatItem(animal, world, vision)) return;
    if (_tryEatEgg(animal, world, spatialHash, vision)) return;

    if (animal.hunger > (_decisionThresholds(animal).desperate_hunger_hunt_min ?? 75)) {
      const tick = world.clock.tick;
      const chaseLockTicks = animal._config.chase_lock_ticks ?? world.config.chase_lock_ticks ?? 5;
      let target = null;
      let bestDist = Infinity;
      if (tick < animal._chaseLockUntilTick && animal._chaseTarget?.alive) {
        const locked = animal._chaseTarget;
        const d = Math.abs(locked.x - animal.x) + Math.abs(locked.y - animal.y);
        if (d <= vision + 2) {
          target = locked;
          bestDist = d;
        }
      }
      if (!target) {
        ({ target, bestDist } = _findNearestHuntableTarget(animal, spatialHash, vision));
      }
      if (target) {
        animal._chaseTarget = target;
        animal._chaseLockUntilTick = tick + chaseLockTicks;
        if (bestDist <= 1 && animal.attackCooldown <= 0) {
          _attack(animal, target, world);
        } else {
          _pursueTarget(animal, target, world, 'omnivore-prey');
        }
        return;
      }
      animal._chaseTarget = null;
      animal._chaseLockUntilTick = 0;
    }

    _seekPlantFood(animal, world, vision);
  } finally {
    benchmarkEnd(collector, 'seekOmnivoreFood', startedAt);
  }
}