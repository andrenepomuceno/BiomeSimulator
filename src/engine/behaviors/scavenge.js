import { AnimalState, LifeStage } from '../entities.js';
import { benchmarkAddKeyed } from '../benchmarkProfiler.js';
import { ITEM_TYPE } from '../items.js';
import { _eatGroundItem } from './eating.js';
import { _computePath, _walkPath } from './movement.js';

function _findEggApproachTile(animal, target, world) {
  const baseTx = target.x | 0;
  const baseTy = target.y | 0;
  let best = null;
  let bestDist = Infinity;

  for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const tx = baseTx + dx;
    const ty = baseTy + dy;
    if (!world.isWalkableFor(tx, ty, animal._walkableSet)) continue;
    if (world.isTileBlocked(tx, ty)) continue;
    const dist = Math.abs((tx + 0.5) - animal.x) + Math.abs((ty + 0.5) - animal.y);
    if (dist < bestDist) {
      bestDist = dist;
      best = [tx, ty];
    }
  }

  return best;
}

export function _tryScavenge(animal, world, spatialHash, vision) {
  const collector = world._benchmarkCollector;
  benchmarkAddKeyed(collector, 'speciesTryScavenge', animal.species, 1);
  const tick = world.clock.tick;
  const nearby = spatialHash.queryRadius(animal.x, animal.y, vision);
  let target = null;
  let bestDist = Infinity;
  for (const entity of nearby) {
    if (entity.alive || entity.consumed || entity._deathTick == null || (tick - entity._deathTick) >= (world.config.scavenge_decay_ticks ?? 100)) continue;
    const distCandidate = Math.abs(entity.x - animal.x) + Math.abs(entity.y - animal.y);
    if (distCandidate < bestDist) {
      bestDist = distCandidate;
      target = entity;
    }
  }
  if (!target) return false;

  const dist = Math.abs(target.x - animal.x) + Math.abs(target.y - animal.y);
  if (dist <= 1) {
    animal.hunger = Math.max(0, animal.hunger - (world.config.scavenge_corpse_hunger_restore ?? 60));
    animal.energy = Math.min(animal.maxEnergy, animal.energy + (world.config.scavenge_corpse_energy_restore ?? 15));
    animal.hp = Math.min(animal.maxHp, animal.hp + (world.config.scavenge_corpse_hp_restore ?? 8));
    animal.state = AnimalState.EATING;
    animal.applyEnergyCost('EAT');
    animal.logAction(world.clock.tick, 'SCAVENGED', { corpse: target.species, corpseId: target.id });
    target.consumed = true;
    target._dirty = true;
    return true;
  }

  _computePath(animal, world, target.x, target.y, 30, 'scavenge');
  if (animal.path.length) {
    _walkPath(animal, world);
    return true;
  }
  return false;
}

export function _tryEatEgg(animal, world, spatialHash, vision) {
  if (animal.diet === 'HERBIVORE') return false;
  const nearby = spatialHash.queryRadius(animal.x, animal.y, vision);
  let target = null;
  let bestDist = Infinity;
  for (const entity of nearby) {
    if (!entity.alive || entity.lifeStage !== LifeStage.EGG) continue;
    if (entity.species === animal.species) continue;
    const dist = Math.abs(entity.x - animal.x) + Math.abs(entity.y - animal.y);
    if (dist < bestDist) {
      bestDist = dist;
      target = entity;
    }
  }
  if (!target) return false;

  if (bestDist <= 1.5) {
    target.hp = 0;
    world.markEntityDead(target);
    target.consumed = true;
    target._dirty = true;
    animal.hunger = Math.max(0, animal.hunger - (world.config.scavenge_egg_hunger_restore ?? 20));
    animal.energy = Math.min(animal.maxEnergy, animal.energy + (world.config.scavenge_egg_energy_restore ?? 10));
    animal.state = AnimalState.EATING;
    animal.applyEnergyCost('EAT');
    animal.logAction(world.clock.tick, 'ATE_EGG', { species: target.species, eggId: target.id });
    return true;
  }

  const approachTile = _findEggApproachTile(animal, target, world);
  if (!approachTile) return false;

  _computePath(animal, world, approachTile[0], approachTile[1], 30, 'egg');
  if (animal.path.length) {
    _walkPath(animal, world);
    return true;
  }
  return false;
}

/**
 * Try to find and eat a MEAT ground item within vision.
 * Eligible for carnivores, omnivores, and scavengers.
 */
export function _tryEatMeatItem(animal, world, vision) {
  if (!world._itemSpatialHash) return false;
  const nearby = world._itemSpatialHash.queryRadius(animal.x, animal.y, vision);
  let target = null;
  let bestDist = Infinity;
  for (const item of nearby) {
    if (item.consumed || item.type !== ITEM_TYPE.MEAT) continue;
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

  _computePath(animal, world, target.x, target.y, 30, 'meat_item');
  if (animal.path.length) {
    _walkPath(animal, world);
    return true;
  }
  return false;
}