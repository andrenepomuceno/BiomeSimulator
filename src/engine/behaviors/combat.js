import { AnimalState } from '../entities.js';
import { DIET } from '../animalSpecies.js';
import { benchmarkAdd, benchmarkAddKeyed, benchmarkEnd, benchmarkStart } from '../benchmarkProfiler.js';
import { _threatCacheTtl, _threatScanCooldown } from './movement.js';
import { _combatConfig } from './utils.js';

export function _attack(attacker, defender, world) {
  const combat = _combatConfig(attacker);
  attacker.state = AnimalState.ATTACKING;
  attacker.applyEnergyCost('ATTACK');
  attacker.attackCooldown = combat.attack_cooldown ?? 3;

  const dodgeBase = combat.dodge_base ?? 0.05;
  const dodgePerSpeed = combat.dodge_per_speed ?? 0.04;
  const speedDiff = (defender._config.speed ?? 1) - (attacker._config.speed ?? 1);
  const dodgeChance = Math.max(0, Math.min(0.45, dodgeBase + speedDiff * dodgePerSpeed));
  if (Math.random() < dodgeChance) {
    attacker.logAction(world.clock.tick, 'ATTACK_MISS', { target: defender.species, targetId: defender.id });
    defender.logAction(world.clock.tick, 'DODGED', { attacker: attacker.species, attackerId: attacker.id });
    return;
  }

  let baseDamage = attacker._config.attack_power - defender._config.defense * (combat.defense_factor ?? 0.5);
  if (baseDamage < (combat.min_damage ?? 1)) baseDamage = combat.min_damage ?? 1;

  const variance = combat.damage_variance ?? 0.3;
  const roll = 1 - variance + Math.random() * variance * 2;
  let damage = baseDamage * roll;

  let isCrit = false;
  const critChance = combat.crit_chance ?? 0.10;
  const critMultiplier = combat.crit_multiplier ?? 2.0;
  if (Math.random() < critChance) {
    damage *= critMultiplier;
    isCrit = true;
  }

  if (damage < (combat.min_damage ?? 1)) damage = combat.min_damage ?? 1;
  defender.hp -= damage;
  defender._lastAttackerSpecies = attacker.species;
  defender._lastAttackerId = attacker.id;

  attacker.logAction(world.clock.tick, 'ATTACK', {
    target: defender.species,
    targetId: defender.id,
    damage: Math.round(damage * 10) / 10,
    crit: isCrit,
  });
  defender.logAction(world.clock.tick, 'DEFENDED', {
    attacker: attacker.species,
    attackerId: attacker.id,
    damage: Math.round(damage * 10) / 10,
    crit: isCrit,
  });

  if (defender.hp <= 0) {
    world.markEntityDead(defender);
    defender.logAction(world.clock.tick, 'KILLED_BY', {
      attacker: attacker.species,
      attackerId: attacker.id,
      x: Math.round(defender.x),
      y: Math.round(defender.y),
    });
    attacker.logAction(world.clock.tick, 'KILLED', { target: defender.species, targetId: defender.id });
  }
}

export function _isThreatValidFor(animal, threat, vision) {
  if (!threat || !threat.alive || threat.id === animal.id) return false;
  const dist = Math.abs(threat.x - animal.x) + Math.abs(threat.y - animal.y);
  if (dist > vision + 2) return false;
  if (threat._preySpecies.size > 0 && !threat._preySpecies.has(animal.species)) return false;
  if (threat.diet === DIET.CARNIVORE) return true;
  if (animal.diet === DIET.OMNIVORE && threat.diet === DIET.OMNIVORE) {
    return threat._config.attack_power > animal._config.attack_power + (_combatConfig(animal).threat_attack_margin ?? 2);
  }
  return false;
}

export function _shouldRetreatFromCarnivore(animal, threat, world) {
  if (!threat || !threat.alive || threat.id === animal.id) return false;
  const desperate = animal.hunger > (world.config.carnivore_retreat_desperate_hunger ?? 45)
    || animal.thirst > (world.config.carnivore_retreat_desperate_thirst ?? 55);
  const hpThreshold = desperate
    ? (world.config.carnivore_retreat_hp_desperate_threshold ?? 0.40)
    : (world.config.carnivore_retreat_hp_normal_threshold ?? 0.30);
  if (animal.hp >= animal.maxHp * hpThreshold) return false;
  const powerMargin = world.config.carnivore_retreat_power_margin ?? 3;
  return threat._config.attack_power > animal._config.attack_power + powerMargin;
}

export function _findNearestThreat(animal, world, spatialHash, vision) {
  const collector = spatialHash._benchmarkCollector;
  const startedAt = benchmarkStart(collector);
  try {
    benchmarkAddKeyed(collector, 'speciesThreatChecks', animal.species, 1);
    const tick = world.clock.tick;
    if (animal._cachedThreat && (tick - animal._cachedThreatTick) <= _threatCacheTtl(world) && _isThreatValidFor(animal, animal._cachedThreat, vision)) {
      benchmarkAdd(collector, 'threatCacheHits', 1);
      benchmarkAddKeyed(collector, 'speciesThreatCacheHits', animal.species, 1);
      return animal._cachedThreat;
    }

    if (tick < animal._nextThreatCheckTick && tick >= (animal._alertUntilTick ?? 0)) {
      benchmarkAdd(collector, 'threatCheckCooldownSkips', 1);
      benchmarkAddKeyed(collector, 'speciesThreatCooldownSkips', animal.species, 1);
      return null;
    }

    benchmarkAdd(collector, 'threatCacheMisses', 1);
    benchmarkAddKeyed(collector, 'speciesThreatCacheMisses', animal.species, 1);
    const nearby = spatialHash.queryRadius(animal.x, animal.y, vision);
    let threat = null;
    let bestDist = Infinity;
    for (const entity of nearby) {
      if (!entity.alive || entity.id === animal.id) continue;
      if (entity._preySpecies.size > 0 && !entity._preySpecies.has(animal.species)) continue;
      const isThreat = entity.diet === DIET.CARNIVORE ||
        (animal.diet === DIET.OMNIVORE && entity.diet === DIET.OMNIVORE && entity._config.attack_power > animal._config.attack_power + 2);
      if (!isThreat) continue;
      const distCandidate = Math.abs(entity.x - animal.x) + Math.abs(entity.y - animal.y);
      if (distCandidate < bestDist) {
        bestDist = distCandidate;
        threat = entity;
      }
    }

    if (!threat) {
      animal._cachedThreat = null;
      animal._cachedThreatTick = tick;
      animal._nextThreatCheckTick = tick + _threatScanCooldown(world);
      return null;
    }

    animal._cachedThreat = threat;
    animal._cachedThreatTick = tick;
    animal._nextThreatCheckTick = tick + 1;
    return threat;
  } finally {
    benchmarkEnd(collector, 'findNearestThreat', startedAt);
  }
}