import { AnimalState, LifeStage } from '../entities.js';
import { DIET } from '../animalSpecies.js';
import { benchmarkAdd, benchmarkAddKeyed, benchmarkEnd, benchmarkStart } from '../benchmarkProfiler.js';
import { S_ADULT, S_SEED } from '../flora.js';
import { DEEP_WATER, WATER } from '../world.js';
import { _findNearestThreat } from './combat.js';
import { _eatPlantTile } from './eating.js';
import { _computePath, _fleeFrom, _randomWalk, _reusePathIfValid, _walkPath } from './movement.js';
import { _findMate, _doMate, giveBirth } from './reproduce.js';
import { _seekOmnivoreFood, _seekPlantFood, _seekPrey, _seekWater } from './seek.js';
import { _doDrink, _doEat, _doSleep } from './states.js';
import { DECISION_INTERVALS, _calculateEffectiveSleepThreshold, _canEatPlant, _decisionThresholds, _idleRecover, _isEdibleStage } from './utils.js';

export { giveBirth };

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
        _doSleep(animal, world);
        return;
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

    const interval = DECISION_INTERVALS[animal.species] || 2;
    if (animal.id % interval !== world.clock.tick % interval) {
      benchmarkAdd(collector, 'decisionStaggerSkips', 1);
      benchmarkAddKeyed(collector, 'speciesDecisionStaggerSkips', animal.species, 1);
      if (animal.path.length && animal.pathIndex < animal.path.length) {
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

    if (animal.thirst > (_decisionThresholds(animal).drink_opportunistic ?? 25) && world.isWaterAdjacent(animal.x, animal.y)) {
      animal.state = AnimalState.DRINKING;
      animal.applyEnergyCost('DRINK');
      return;
    }

    if (animal.hunger > (_decisionThresholds(animal).eat_opportunistic ?? 20) && (animal.diet === DIET.HERBIVORE || animal.diet === DIET.OMNIVORE)) {
      const idx = world.idx(animal.x, animal.y);
      const ptype = world.plantType[idx];
      const stage = world.plantStage[idx];
      if (ptype > 0 && _isEdibleStage(ptype, stage) && _canEatPlant(animal, ptype)) {
        const thresholds = _decisionThresholds(animal);
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

    if (animal.thirst > (_decisionThresholds(animal).critical_thirst ?? 55)) {
      _seekWater(animal, world, vision);
      return;
    }

    if (animal.diet === DIET.HERBIVORE || animal.diet === DIET.OMNIVORE) {
      const threat = _findNearestThreat(animal, world, spatialHash, vision);
      if (threat) {
        _fleeFrom(animal, threat, world);
        return;
      }
    }

    if (animal.hunger > (_decisionThresholds(animal).critical_hunger ?? 45)) {
      if (animal.diet === DIET.HERBIVORE) {
        _seekPlantFood(animal, world, vision);
      } else if (animal.diet === DIET.OMNIVORE) {
        _seekOmnivoreFood(animal, world, spatialHash, vision);
      } else {
        _seekPrey(animal, world, spatialHash, vision);
      }
      return;
    }

    if (animal.energy < _calculateEffectiveSleepThreshold(animal, isNight, world.config)) {
      const terrain = world.terrain[world.idx(animal.x, animal.y)];
      if (terrain !== WATER && terrain !== DEEP_WATER) {
        animal.logAction(world.clock.tick, 'FELL_ASLEEP', { energy: Math.round(animal.energy) });
        animal.state = AnimalState.SLEEPING;
        return;
      }
    }

    if (animal.lifeStage === LifeStage.ADULT && animal.mateCooldown <= 0 && !animal.pregnant && animal.energy > (_decisionThresholds(animal).mate_energy_min ?? 50)) {
      const mate = _findMate(animal, spatialHash, Math.max(vision, _decisionThresholds(animal).mate_search_radius_min ?? 10));
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

    if (animal.hunger > (_decisionThresholds(animal).moderate_hunger ?? 30)) {
      if (animal.diet === DIET.HERBIVORE) {
        _seekPlantFood(animal, world, vision);
      } else if (animal.diet === DIET.OMNIVORE) {
        _seekOmnivoreFood(animal, world, spatialHash, vision);
      } else {
        _seekPrey(animal, world, spatialHash, vision);
      }
      return;
    }

    if (animal.thirst > (_decisionThresholds(animal).moderate_thirst ?? 35)) {
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