import { AnimalState, LifeStage } from '../entities.js';
import { DIET } from '../animalSpecies.js';
import { benchmarkAdd, benchmarkAddKeyed, benchmarkEnd, benchmarkStart } from '../benchmarkProfiler.js';
import { S_ADULT, S_SEED } from '../flora.js';
import { DEEP_WATER, WATER } from '../world.js';
import { _attack, _findNearestThreat, _isThreatValidFor, _shouldRetreatFromCarnivore } from './combat.js';
import { _eatPlantTile } from './eating.js';
import { _computePath, _fleeFrom, _randomWalk, _reusePathIfValid, _walkPath } from './movement.js';
import { _findMate, _doMate, giveBirth } from './reproduce.js';
import { _seekOmnivoreFood, _seekPlantFood, _seekPrey, _seekWater } from './seek.js';
import { _doDrink, _doEat, _doSleep } from './states.js';
import { _calculateEffectiveSleepThreshold, _canEatPlant, _decisionThresholds, _idleRecover, _isEdibleStage } from './utils.js';

export { giveBirth };

/**
 * Pre-computes per-tick decision context: effective vision, cached thresholds, and night flag.
 * Called once per non-staggered decision tick, after state continuations and stagger check.
 */
function _buildCtx(animal, world) {
  const isNight = world.clock.isNight;
  const nocturnal = animal._config.nocturnal;
  const globalVisionMultiplier = world.config.animal_global_vision_multiplier ?? 1;
  const nightVisionReduction = world.config.night_vision_reduction_factor ?? 0.65;
  const nocturnalDayVisionFactor = world.config.nocturnal_day_vision_factor ?? 0.8;
  const baseVision = Math.max(1, animal.visionRange || 1);
  const scaledBaseVision = Math.max(1, Math.floor(baseVision * globalVisionMultiplier));
  const vision = Math.max(1, nocturnal
    ? (isNight ? scaledBaseVision : Math.floor(scaledBaseVision * nocturnalDayVisionFactor))
    : (isNight ? Math.floor(scaledBaseVision * nightVisionReduction) : scaledBaseVision));
  return { vision, isNight, thresholds: _decisionThresholds(animal) };
}

/** Routes food-seeking to the correct function based on diet. */
function _seekFoodByDiet(animal, world, spatialHash, vision) {
  if (animal.diet === DIET.HERBIVORE) {
    _seekPlantFood(animal, world, vision);
  } else if (animal.diet === DIET.OMNIVORE) {
    _seekOmnivoreFood(animal, world, spatialHash, vision);
  } else {
    _seekPrey(animal, world, spatialHash, vision);
  }
}

export function decideAndAct(animal, world, spatialHash) {
  const collector = world._benchmarkCollector;
  const startedAt = benchmarkStart(collector);
  try {
    benchmarkAddKeyed(collector, 'speciesDecisions', animal.species, 1);
    if (!animal.alive) return;

    const previousLifeStage = animal.lifeStage;
    animal.tickNeeds(world.hungerMultiplier, world.thirstMultiplier);
    if (animal.lifeStage !== previousLifeStage) {
      animal.logAction(world.clock.tick, 'LIFE_STAGE', { from: previousLifeStage, to: animal.lifeStage });
      // Egg just hatched — place the baby on the tile grid
      if (previousLifeStage === LifeStage.EGG) {
        world.vacateEgg(animal.x, animal.y);
        world.placeAnimal(animal.x, animal.y);
      }
    }

    if (animal.pregnant && animal.gestationTimer <= 0) {
      giveBirth(animal, world);
    }

    if (animal.lifeStage === LifeStage.PUPA || animal.lifeStage === LifeStage.EGG) {
      animal.state = AnimalState.IDLE;
      return;
    }

    if (animal.age > animal.maxAge || animal.hp <= 0) {
      world.markEntityDead(animal);
      animal.logAction(world.clock.tick, 'DIED', {
        cause: animal.age > animal.maxAge ? 'old_age' : 'hp_depleted',
      });
      return;
    }

    if (animal.energy <= 0) {
      const terrain = world.terrain[world.idx(animal.x, animal.y)];
      if (terrain !== WATER && terrain !== DEEP_WATER) {
        if (animal.state !== AnimalState.SLEEPING) {
          animal.logAction(world.clock.tick, 'FELL_ASLEEP', { energy: Math.round(animal.energy), cause: 'exhausted' });
        }
        animal.state = AnimalState.SLEEPING;
        _doSleep(animal, world);
        return;
      }
    }

    if (animal.state === AnimalState.SLEEPING) {
      const terrain = world.terrain[world.idx(animal.x, animal.y)];
      if (terrain === WATER || terrain === DEEP_WATER) {
        animal.state = AnimalState.IDLE;
      } else {
        // Herbivores/omnivores can be startled awake by a nearby predator
        let startled = false;
        if (animal.diet === DIET.HERBIVORE || animal.diet === DIET.OMNIVORE) {
          const wakeRadius = animal._config.wake_threat_radius ?? 3;
          const nearby = spatialHash.queryRadius(animal.x, animal.y, wakeRadius);
          startled = nearby.some(e =>
            e.alive && e.id !== animal.id && e.diet === DIET.CARNIVORE &&
            (e._preySpecies.size === 0 || e._preySpecies.has(animal.species))
          );
        }
        if (startled) {
          animal.state = AnimalState.IDLE;
          // Fall through to decision tree — flee logic will run
        } else {
          _doSleep(animal, world);
          return;
        }
      }
    }

    if (animal.state === AnimalState.EATING) {
      _doEat(animal);
      return;
    }
    if (animal.state === AnimalState.DRINKING) {
      _doDrink(animal, world);
      return;
    }

    const interval = Math.max(1, animal._config.decision_interval || 2);
    if (animal.id % interval !== world.clock.tick % interval) {
      benchmarkAdd(collector, 'decisionStaggerSkips', 1);
      benchmarkAddKeyed(collector, 'speciesDecisionStaggerSkips', animal.species, 1);
      // Don't reuse an old path while a flee episode is active — it may lead toward the threat
      const fleeActive = world.clock.tick < animal._fleeLockUntilTick && animal._cachedThreat?.alive;
      if (!fleeActive && animal.path.length && animal.pathIndex < animal.path.length) {
        if (!_reusePathIfValid(animal, world, 'stagger')) {
          animal.applyEnergyCost('IDLE');
          _idleRecover(animal);
        }
      } else {
        animal.applyEnergyCost('IDLE');
        _idleRecover(animal);
      }
      return;
    }

    const { vision, isNight, thresholds } = _buildCtx(animal, world);

    if (animal.thirst > (thresholds.drink_opportunistic ?? 25) && world.isWaterAdjacent(animal.x, animal.y)) {
      animal.state = AnimalState.DRINKING;
      animal.applyEnergyCost('DRINK');
      return;
    }

    if (animal.hunger > (thresholds.eat_opportunistic ?? 20) && (animal.diet === DIET.HERBIVORE || animal.diet === DIET.OMNIVORE)) {
      const idx = world.idx(animal.x, animal.y);
      const ptype = world.plantType[idx];
      const stage = world.plantStage[idx];
      if (ptype > 0 && _isEdibleStage(ptype, stage) && _canEatPlant(animal, ptype)) {
        const minHunger = stage === S_SEED
          ? (thresholds.eat_seed_min_hunger ?? 50)
          : stage === S_ADULT
            ? (thresholds.eat_adult_plant_min_hunger ?? 35)
            : (thresholds.eat_opportunistic ?? 20);
        if (animal.hunger > minHunger) {
          _eatPlantTile(animal, world, idx);
          return;
        }
      }
    }

    if (animal.thirst > (thresholds.critical_thirst ?? 55)) {
      _seekWater(animal, world, vision);
      return;
    }

    if (animal.diet === DIET.HERBIVORE || animal.diet === DIET.OMNIVORE) {
      const tick = world.clock.tick;
      const fleeLockTicks = animal._config.flee_lock_ticks ?? world.config.flee_lock_ticks ?? 5;
      let threat = null;
      if (tick < animal._fleeLockUntilTick && _isThreatValidFor(animal, animal._cachedThreat, vision)) {
        // Still within flee episode — skip spatial scan
        threat = animal._cachedThreat;
      } else {
        threat = _findNearestThreat(animal, world, spatialHash, vision);
      }
      if (threat) {
        const fightBackThreshold = thresholds.fight_back_hp_threshold ?? 0.40;
        const dist = Math.abs(threat.x - animal.x) + Math.abs(threat.y - animal.y);
        // Only herbivores fight back defensively; omnivores use the carnivore retreat block below
        const canFightBack = animal.diet === DIET.HERBIVORE
          && fightBackThreshold > 0
          && animal.attackCooldown <= 0
          && dist <= 1.5
          && animal.hp >= animal.maxHp * fightBackThreshold;
        if (canFightBack) {
          // Predator is in melee range and animal is healthy enough — fight back
          if (threat.id !== animal._fleeTargetId) {
            animal.logAction(tick, 'FOUGHT_BACK', { attacker: threat.species, attackerId: threat.id });
            animal._fleeTargetId = threat.id;
          }
          animal._fleeLockUntilTick = tick + fleeLockTicks;
          _attack(animal, threat, world);
          return;
        }
        if (threat.id !== animal._fleeTargetId) {
          // New flee episode — log once
          animal.logAction(tick, 'FLED', { from: threat.species, threatId: threat.id });
          animal._fleeTargetId = threat.id;
        }
        animal._fleeLockUntilTick = tick + fleeLockTicks;
        _fleeFrom(animal, threat, world);
        return;
      }
      // No threat — clear flee episode and enter alert state
      const alertTicks = world.config.alert_ticks_after_flee ?? 30;
      if (animal._fleeTargetId != null && alertTicks > 0) {
        animal._alertUntilTick = tick + alertTicks;
      }
      animal._fleeTargetId = null;
      animal._fleeLockUntilTick = 0;
    }

    // Carnivore/omnivore retreat: flee from a stronger predator when badly wounded
    if (animal.diet === DIET.CARNIVORE || animal.diet === DIET.OMNIVORE) {
      const tick = world.clock.tick;
      const fleeLockTicks = animal._config.flee_lock_ticks ?? world.config.flee_lock_ticks ?? 5;
      let retreatThreat = null;
      if (tick < animal._fleeLockUntilTick && _isThreatValidFor(animal, animal._cachedThreat, vision)
          && _shouldRetreatFromCarnivore(animal, animal._cachedThreat, world)) {
        retreatThreat = animal._cachedThreat;
      } else {
        const candidate = _findNearestThreat(animal, world, spatialHash, vision);
        if (candidate && _shouldRetreatFromCarnivore(animal, candidate, world)) {
          retreatThreat = candidate;
        }
      }
      if (retreatThreat) {
        if (retreatThreat.id !== animal._fleeTargetId) {
          animal.logAction(tick, 'FLED', { from: retreatThreat.species, threatId: retreatThreat.id });
          animal._fleeTargetId = retreatThreat.id;
        }
        animal._fleeLockUntilTick = tick + fleeLockTicks;
        _fleeFrom(animal, retreatThreat, world);
        return;
      }
    }

    if (animal.hunger > (thresholds.critical_hunger ?? 45)) {
      _seekFoodByDiet(animal, world, spatialHash, vision);
      return;
    }

    if (animal.energy < _calculateEffectiveSleepThreshold(animal, isNight, world.config)) {
      const terrain = world.terrain[world.idx(animal.x, animal.y)];
      if (terrain !== WATER && terrain !== DEEP_WATER) {
        // Don't sleep during combat: threat nearby, recently attacked, or HP below full
        const inCombat = animal.attackCooldown > 0
          || (world.clock.tick < animal._fleeLockUntilTick && animal._cachedThreat?.alive)
          || animal.hp < animal.maxHp * (world.config.sleep_block_hp_threshold ?? 0.85);
        if (!inCombat) {
          animal.logAction(world.clock.tick, 'FELL_ASLEEP', { energy: Math.round(animal.energy) });
          animal.state = AnimalState.SLEEPING;
          return;
        }
      }
    }

    if (animal.lifeStage === LifeStage.ADULT && animal.mateCooldown <= 0 && !animal.pregnant && animal.energy > (thresholds.mate_energy_min ?? 50)) {
      const mate = _findMate(animal, spatialHash, Math.max(vision, thresholds.mate_search_radius_min ?? 10));
      if (mate) {
        const dist = Math.abs(mate.x - animal.x) + Math.abs(mate.y - animal.y);
        if (dist <= 2) {
          _doMate(animal, mate, world);
        } else {
          _computePath(animal, world, mate.x, mate.y, 40, 'mate');
          if (animal.path.length) {
            _walkPath(animal, world);
          } else {
            _randomWalk(animal, world);
          }
        }
        return;
      }
    }

    if (animal.hunger > (thresholds.moderate_hunger ?? 30)) {
      _seekFoodByDiet(animal, world, spatialHash, vision);
      return;
    }

    if (animal.thirst > (thresholds.moderate_thirst ?? 35)) {
      _seekWater(animal, world, vision);
      return;
    }

    {
      const tx = animal.x | 0;
      const ty = animal.y | 0;
      let occupied = 0;
      for (let ndx = -1; ndx <= 1; ndx++) {
        for (let ndy = -1; ndy <= 1; ndy++) {
          if (ndx === 0 && ndy === 0) continue;
          if (world.isTileBlocked(tx + ndx, ty + ndy)) occupied++;
        }
      }
      if (occupied >= 4) {
        _randomWalk(animal, world);
        return;
      }
    }

    if (animal.path.length && animal.pathIndex < animal.path.length) {
      _walkPath(animal, world);
    } else if (Math.random() < (animal._config.random_walk_chance ?? 0.3)) {
      _randomWalk(animal, world);
    } else {
      animal.state = AnimalState.IDLE;
      animal.applyEnergyCost('IDLE');
      _idleRecover(animal);
    }
  } finally {
    benchmarkEnd(collector, 'decideAndAct', startedAt);
  }
}