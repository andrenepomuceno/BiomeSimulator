import { AnimalState, LifeStage } from '../entities.js';
import { benchmarkAddKeyed } from '../benchmarkProfiler.js';
import { _computePath, _walkPath } from './movement.js';

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
    animal.hunger = Math.max(0, animal.hunger - 60);
    animal.energy = Math.min(animal.maxEnergy, animal.energy + 15);
    animal.hp = Math.min(animal.maxHp, animal.hp + 8);
    animal.state = AnimalState.EATING;
    animal.applyEnergyCost('EAT');
    animal.logAction(world.clock.tick, 'SCAVENGED', { corpse: target.species, corpseId: target.id });
    target.consumed = true;
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
    target.alive = false;
    target.state = AnimalState.DEAD;
    target._deathTick = world.clock.tick;
    animal.hunger = Math.max(0, animal.hunger - 20);
    animal.energy = Math.min(animal.maxEnergy, animal.energy + 8);
    animal.state = AnimalState.EATING;
    animal.applyEnergyCost('EAT');
    animal.logAction(world.clock.tick, 'ATE_EGG', { species: target.species, eggId: target.id });
    return true;
  }

  _computePath(animal, world, target.x, target.y, 30, 'egg');
  if (animal.path.length) {
    _walkPath(animal, world);
    return true;
  }
  return false;
}