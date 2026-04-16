import { AnimalState, Direction } from '../entities.js';
import { SUB_CELL_DIVISOR, SUB_CELL_STEP } from '../config.js';
import { benchmarkAdd, benchmarkAddKeyed, benchmarkEnd, benchmarkStart } from '../benchmarkProfiler.js';
import { aStar } from '../pathfinding.js';
import { MOUNTAIN, MUD, ROCK, SAND } from '../world.js';
import { shuffleInPlace } from '../helpers.js';
import { _applyEnergyCostWithModifier, _canFly, _idleRecover } from './utils.js';

const TERRAIN_SPEED_FACTOR = new Float32Array(9);
TERRAIN_SPEED_FACTOR[SAND] = 0.75;
TERRAIN_SPEED_FACTOR[MUD] = 0.5;
TERRAIN_SPEED_FACTOR[MOUNTAIN] = 0.5;
TERRAIN_SPEED_FACTOR[ROCK] = 0.75;

const TERRAIN_ENERGY_MULT = new Float32Array(9);
TERRAIN_ENERGY_MULT[SAND] = 1.3;
TERRAIN_ENERGY_MULT[MUD] = 1.5;
TERRAIN_ENERGY_MULT[MOUNTAIN] = 1.8;
TERRAIN_ENERGY_MULT[ROCK] = 1.3;

export function _terrainSteps(animal, world, baseSteps) {
  const tIdx = world.idx(animal.x, animal.y);
  const factor = TERRAIN_SPEED_FACTOR[world.terrain[tIdx]];
  return factor ? Math.max(1, Math.round(baseSteps * factor)) : baseSteps;
}

export function _terrainEnergyCost(world, tx, ty) {
  const mult = TERRAIN_ENERGY_MULT[world.terrain[world.idx(tx, ty)]];
  return mult || 1.0;
}

export function _pathCacheTtl(world) {
  return world.config.pathfinding_cache_ttl ?? 15;
}

export function _threatCacheTtl(world) {
  return world.config.threat_cache_ttl ?? 4;
}

export function _threatScanCooldown(world) {
  return world.config.threat_scan_cooldown_ticks ?? 2;
}

export function _effectiveSteps(baseSteps, world) {
  const subTicks = world.config.movement_sub_ticks ?? 1;
  return Math.max(1, Math.round(baseSteps / subTicks));
}

export function _hasValidPath(animal, tick, ttl) {
  return animal.path.length > 0 &&
    animal.pathIndex < animal.path.length &&
    (tick - animal._pathTick) < ttl;
}

export function _reusePathIfValid(animal, world, reason) {
  const collector = world._benchmarkCollector;
  const valid = _hasValidPath(animal, world.clock.tick, _pathCacheTtl(world));
  benchmarkAdd(collector, valid ? 'pathCacheHits' : 'pathCacheMisses', 1);
  benchmarkAddKeyed(collector, valid ? 'speciesPathCacheHits' : 'speciesPathCacheMisses', animal.species, 1);
  if (!valid) return false;
  benchmarkAddKeyed(collector, 'pathReuseReasons', reason, 1);
  _walkPath(animal, world);
  return true;
}

export function _computePath(animal, world, targetX, targetY, maxDist, reason) {
  const collector = world._benchmarkCollector;
  benchmarkAdd(collector, 'pathRequests', 1);
  benchmarkAddKeyed(collector, 'speciesPathRequests', animal.species, 1);
  benchmarkAddKeyed(collector, 'pathRequestReasons', reason, 1);
  const sx = animal.x | 0;
  const sy = animal.y | 0;
  const gx = targetX | 0;
  const gy = targetY | 0;
  const path = aStar(sx, sy, gx, gy, world, maxDist, animal._walkableSet);
  _setPath(animal, path, world.clock.tick);
  if (path.length > 0) {
    benchmarkAdd(collector, 'pathSuccesses', 1);
    benchmarkAddKeyed(collector, 'speciesPathSuccesses', animal.species, 1);
  } else {
    benchmarkAdd(collector, 'pathFailures', 1);
    benchmarkAddKeyed(collector, 'speciesPathFailures', animal.species, 1);
  }
}

export function _setPath(animal, path, tick) {
  animal.path = path;
  animal.pathIndex = 0;
  animal._pathTick = tick;
}

export function _moveAnimal(animal, nx, ny, world) {
  const oldTx = animal.x | 0;
  const oldTy = animal.y | 0;
  const newTx = nx | 0;
  const newTy = ny | 0;
  if (oldTx !== newTx || oldTy !== newTy) {
    world.vacateAnimal(oldTx, oldTy);
    world.placeAnimal(newTx, newTy);
  }
  animal.x = nx;
  animal.y = ny;
}

export function _followPath(animal, world) {
  if (!animal.path.length || animal.pathIndex >= animal.path.length) {
    animal.path = [];
    animal.pathIndex = 0;
    return;
  }

  const [wx, wy] = animal.path[animal.pathIndex];
  const tx = wx + 0.5;
  const ty = wy + 0.5;
  const dx = tx - animal.x;
  const dy = ty - animal.y;

  if (Math.abs(dx) < 0.125 && Math.abs(dy) < 0.125) {
    animal.pathIndex++;
    if (animal.pathIndex >= animal.path.length) {
      animal.path = [];
      animal.pathIndex = 0;
    }
    return;
  }

  let nx;
  let ny;
  if (Math.abs(dx) >= Math.abs(dy)) {
    nx = animal.x + Math.sign(dx) * Math.min(SUB_CELL_STEP, Math.abs(dx));
    ny = animal.y;
  } else {
    nx = animal.x;
    ny = animal.y + Math.sign(dy) * Math.min(SUB_CELL_STEP, Math.abs(dy));
  }

  const oldTx = animal.x | 0;
  const oldTy = animal.y | 0;
  const newTx = nx | 0;
  const newTy = ny | 0;
  const crossedTile = newTx !== oldTx || newTy !== oldTy;

  if (crossedTile) {
    if (!world.isWalkableFor(newTx, newTy, animal._walkableSet) || world.isTileBlocked(newTx, newTy)) {
      animal.path = [];
      animal.pathIndex = 0;
      return;
    }
  }

  _moveAnimal(animal, nx, ny, world);
  animal.state = AnimalState.WALKING;
  // Update facing direction based on dominant axis
  if (Math.abs(dx) >= Math.abs(dy)) {
    animal.direction = dx > 0 ? Direction.RIGHT : Direction.LEFT;
  } else {
    animal.direction = dy > 0 ? Direction.DOWN : Direction.UP;
  }
  if (crossedTile) {
    const tMult = _terrainEnergyCost(world, newTx, newTy);
    const cost = animal.energyCost('WALK') * tMult;
    animal.energy = Math.max(0, Math.min(animal.maxEnergy, animal.energy - cost));
    animal._dirty = true;
  }
}

export function _walkPath(animal, world) {
  const jitter = (Math.random() * 3 | 0) - 1;
  const terrainAdjusted = _terrainSteps(animal, world, Math.max(1, animal.speed + jitter));
  const steps = _effectiveSteps(terrainAdjusted, world);
  for (let s = 0; s < steps; s++) {
    if (!animal.path.length || animal.pathIndex >= animal.path.length) break;
    _followPath(animal, world);
  }
}

export function _pursueTarget(animal, target, world, reason) {
  _computePath(animal, world, target.x, target.y, 30, reason);
  const fly = _canFly(animal);
  animal.state = fly ? AnimalState.FLYING : AnimalState.RUNNING;
  const jitter = (Math.random() * 3 | 0) - 1;
  const baseSteps = fly ? animal.speed + 1 : animal.speed;
  const terrainAdjusted = _terrainSteps(animal, world, Math.max(1, baseSteps + jitter));
  const steps = _effectiveSteps(terrainAdjusted, world);
  const startTx = animal.x | 0;
  const startTy = animal.y | 0;
  for (let s = 0; s < steps; s++) {
    _followPath(animal, world);
  }

  const tileDist = Math.abs((animal.x | 0) - startTx) + Math.abs((animal.y | 0) - startTy);
  if (tileDist > 0) {
    const action = fly ? 'FLY' : 'RUN';
    const baseCost = animal.energyCost(action) * tileDist;
    const tMult = _terrainEnergyCost(world, animal.x | 0, animal.y | 0);
    const nocturnal = animal._config.nocturnal || false;
    const isNight = world.clock.isNight;
    const pMult = (nocturnal && !isNight) || (!nocturnal && isNight)
      ? (world.config.activity_energy_penalty_wrong_period ?? 1.3)
      : 1.0;
    animal.energy = Math.max(0, Math.min(animal.maxEnergy, animal.energy - baseCost * tMult * pMult));
    animal._dirty = true;
  } else {
    animal.applyEnergyCost('IDLE');
  }
}

export function _fleeFrom(animal, threat, world) {
  const fly = _canFly(animal);
  const effectiveSpeed = Math.max(1, Math.ceil(animal.speed / SUB_CELL_DIVISOR));
  const baseBursts = fly ? effectiveSpeed + 1 : effectiveSpeed;
  const bursts = _effectiveSteps(baseBursts, world);
  const ws = animal._walkableSet;

  for (let burst = 0; burst < bursts; burst++) {
    const cx = animal.x - threat.x;
    const cy = animal.y - threat.y;
    const cd = Math.max(1, Math.abs(cx) + Math.abs(cy));
    let moved = false;

    const baseTx = animal.x | 0;
    const baseTy = animal.y | 0;

    for (let step = 3; step >= 1; step--) {
      const ftx = baseTx + Math.round(cx / cd * step);
      const fty = baseTy + Math.round(cy / cd * step);
      const fx = Math.max(0, Math.min(world.width - 1, ftx)) + 0.5;
      const fy = Math.max(0, Math.min(world.height - 1, fty)) + 0.5;
      const tileFx = fx | 0;
      const tileFy = fy | 0;
      if (tileFx === baseTx && tileFy === baseTy) continue;
      if (world.isWalkableFor(tileFx, tileFy, ws) && !world.isTileBlocked(tileFx, tileFy)) {
        _moveAnimal(animal, fx, fy, world);
        moved = true;
        break;
      }
    }

    if (!moved) {
      const curDist = Math.abs(animal.x - threat.x) + Math.abs(animal.y - threat.y);
      let bestNx = -1;
      let bestNy = -1;
      let bestGain = -Infinity;
      let fallbackNx = -1;
      let fallbackNy = -1;
      let fallbackGain = -Infinity;
      for (let ndx = -1; ndx <= 1; ndx++) {
        for (let ndy = -1; ndy <= 1; ndy++) {
          if (ndx === 0 && ndy === 0) continue;
          const ntx = baseTx + ndx;
          const nty = baseTy + ndy;
          if (!world.isWalkableFor(ntx, nty, ws)) continue;
          const nx = ntx + 0.5;
          const ny = nty + 0.5;
          const gain = (Math.abs(nx - threat.x) + Math.abs(ny - threat.y)) - curDist;
          if (!world.isTileBlocked(ntx, nty)) {
            if (gain > bestGain) {
              bestGain = gain;
              bestNx = nx;
              bestNy = ny;
            }
          } else if (gain > fallbackGain) {
            fallbackGain = gain;
            fallbackNx = nx;
            fallbackNy = ny;
          }
        }
      }
      if (bestNx >= 0) {
        _moveAnimal(animal, bestNx, bestNy, world);
        moved = true;
      } else if (fallbackNx >= 0 && fallbackGain > 0) {
        _moveAnimal(animal, fallbackNx, fallbackNy, world);
        moved = true;
      }
    }

    if (!moved) break;
  }

  animal.state = fly ? AnimalState.FLYING : AnimalState.FLEEING;
  // Update facing direction away from threat
  const flx = animal.x - threat.x;
  const fly2 = animal.y - threat.y;
  if (Math.abs(flx) >= Math.abs(fly2)) {
    animal.direction = flx > 0 ? Direction.RIGHT : Direction.LEFT;
  } else {
    animal.direction = fly2 > 0 ? Direction.DOWN : Direction.UP;
  }
  _applyEnergyCostWithModifier(animal, fly ? 'FLY' : 'FLEE', world.clock.isNight, world.config);
}

export function _randomWalk(animal, world) {
  const collector = world._benchmarkCollector;
  const startedAt = benchmarkStart(collector);
  try {
    let moved = false;
    let lastDdx = 0;
    let lastDdy = 0;
    let tileCrossings = 0;
    const jitter = (Math.random() * 3 | 0) - 1;
    const terrainAdjusted = _terrainSteps(animal, world, Math.max(1, animal.speed + jitter));
    const steps = _effectiveSteps(terrainAdjusted, world);

    for (let s = 0; s < steps; s++) {
      const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

      if (lastDdx | lastDdy) {
        if (Math.random() < 0.5) {
          for (let i = 0; i < dirs.length; i++) {
            if (dirs[i][0] === lastDdx && dirs[i][1] === lastDdy) {
              const tmp = dirs[0];
              dirs[0] = dirs[i];
              dirs[i] = tmp;
              break;
            }
          }
        }
      }

      const homeDist = Math.abs(animal.x - animal.homeX) + Math.abs(animal.y - animal.homeY);
      if (homeDist > 30 && Math.random() < 0.3) {
        const hdx = Math.sign(animal.homeX - animal.x);
        const hdy = Math.sign(animal.homeY - animal.y);
        dirs.sort((a, b) => {
          const sa = (a[0] === hdx ? -1 : 0) + (a[1] === hdy ? -1 : 0);
          const sb = (b[0] === hdx ? -1 : 0) + (b[1] === hdy ? -1 : 0);
          return sa - sb;
        });
      } else if (homeDist > 40) {
        animal.homeX += (animal.x - animal.homeX) * 0.1;
        animal.homeY += (animal.y - animal.homeY) * 0.1;
        shuffleInPlace(dirs);
      } else if (!(lastDdx | lastDdy) || Math.random() >= 0.5) {
        shuffleInPlace(dirs);
      }

      let stepMoved = false;
      for (const [ddx, ddy] of dirs) {
        const nx = animal.x + ddx * SUB_CELL_STEP;
        const ny = animal.y + ddy * SUB_CELL_STEP;

        if (nx < 0 || ny < 0 || nx >= world.width || ny >= world.height) continue;

        const oldTx = animal.x | 0;
        const oldTy = animal.y | 0;
        const newTx = nx | 0;
        const newTy = ny | 0;
        const crossedTile = newTx !== oldTx || newTy !== oldTy;

        if (crossedTile) {
          if (!world.isWalkableFor(newTx, newTy, animal._walkableSet) || world.isTileBlocked(newTx, newTy)) {
            continue;
          }
        }

        _moveAnimal(animal, nx, ny, world);
        moved = true;
        stepMoved = true;
        lastDdx = ddx;
        lastDdy = ddy;
        // Update facing direction
        if (Math.abs(ddx) >= Math.abs(ddy)) {
          animal.direction = ddx > 0 ? Direction.RIGHT : Direction.LEFT;
        } else {
          animal.direction = ddy > 0 ? Direction.DOWN : Direction.UP;
        }
        if (crossedTile) tileCrossings++;
        break;
      }

      if (!stepMoved) break;
    }

    if (moved) {
      animal.state = AnimalState.WALKING;
      const baseCost = animal.energyCost('WALK');
      const tMult = _terrainEnergyCost(world, animal.x | 0, animal.y | 0);
      const cost = baseCost * Math.max(1, tileCrossings) * tMult;
      const nocturnal = animal._config.nocturnal || false;
      const isNight = world.clock.isNight;
      const penaltyMult = (nocturnal && !isNight) || (!nocturnal && isNight)
        ? (world.config.activity_energy_penalty_wrong_period ?? 1.3)
        : 1.0;
      animal.energy = Math.max(0, Math.min(animal.maxEnergy, animal.energy - cost * penaltyMult));
      animal._dirty = true;
    } else {
      animal.state = AnimalState.IDLE;
      animal.applyEnergyCost('IDLE');
      _idleRecover(animal);
    }
  } finally {
    benchmarkEnd(collector, 'randomWalk', startedAt);
  }
}