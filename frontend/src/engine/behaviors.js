/**
 * Animal AI — state machine and decision logic.
 */
import { Animal, AnimalState, LifeStage } from './entities.js';
import { WATER, DEEP_WATER } from './world.js';
import { aStar } from './pathfinding.js';
import { SEX_MALE, SEX_FEMALE, SEX_HERMAPHRODITE, SEX_ASEXUAL, REPRO_SEXUAL, REPRO_HERMAPHRODITE } from './config.js';
import { S_FRUIT, S_ADULT, S_ADULT_SPROUT, S_SEED, S_NONE, P_NONE, SEASONS, getSeason } from './flora.js';
import { buildDecisionIntervals, BASE_POP_TOTAL } from './animalSpecies.js';
import { buildEdibleStagesMap } from './plantSpecies.js';
import { benchmarkAdd, benchmarkAddKeyed, benchmarkEnd, benchmarkStart } from './benchmarkProfiler.js';

// Decision interval per species (ticks between full AI evaluations)
const DECISION_INTERVALS = buildDecisionIntervals();

/** Check if this animal can eat the given plant type. */
function _canEatPlant(animal, plantType) {
  return animal._ediblePlants.size === 0 || animal._ediblePlants.has(plantType);
}

/** Check if this animal can hunt the given target species. */
function _canHunt(animal, target) {
  return animal._preySpecies.size === 0 || animal._preySpecies.has(target.species);
}

/** Check if this animal can fly (higher speed burst, different energy cost). */
function _canFly(animal) {
  return !!animal._config.can_fly;
}

/** Diet-based efficiency for plant nutrition (herbivores best, omnivores moderate, carnivores worst). */
function _plantHungerReduction(animal, base) {
  if (animal.diet === 'CARNIVORE') return Math.round(base * 0.45);
  return animal.diet === 'OMNIVORE' ? Math.round(base * 0.55) : base;
}
function _plantEnergyGain(animal, base) {
  if (animal.diet === 'CARNIVORE') return Math.round(base * 0.4);
  return animal.diet === 'OMNIVORE' ? Math.round(base * 0.5) : base;
}

// Edible stage lookup per plant type (built from plantSpecies.js)
const EDIBLE_STAGES = buildEdibleStagesMap();

// Nutrition values by plant stage when eaten
const STAGE_NUTRITION = {
  [S_SEED]:  { hunger: 15, energy: 2 },
  [S_ADULT]: { hunger: 35, energy: 4 },
  [S_FRUIT]: { hunger: 55, energy: 8 },
};

// Plant stage names for logs
const STAGE_LOG_NAMES = { 1: 'seed', 2: 'sprout', 3: 'bush', 4: 'adult', 5: 'fruit' };

function _decisionThresholds(animal) {
  return animal._config.decision_thresholds || {};
}

function _recoveryConfig(animal) {
  return animal._config.recovery || {};
}

function _combatConfig(animal) {
  return animal._config.combat || {};
}

function _idleRecover(animal) {
  const recovery = _recoveryConfig(animal);
  animal.energy = Math.min(animal.maxEnergy, animal.energy + (recovery.idle_energy ?? 0.01));
  animal.hp = Math.min(animal.maxHp, animal.hp + (recovery.idle_hp ?? 0.01));
}

/** Check if a plant type + stage combination is edible. */
function _isEdibleStage(plantType, stage) {
  const stages = EDIBLE_STAGES[plantType];
  return stages != null && stages.has(stage);
}

/** Consume a plant tile entirely — removes the plant and applies nutrition. */
function _eatPlantTile(animal, world, idx) {
  const ptype = world.plantType[idx];
  const stage = world.plantStage[idx];
  const nutr = STAGE_NUTRITION[stage] || { hunger: 20, energy: 3 };
  animal.hunger = Math.max(0, animal.hunger - _plantHungerReduction(animal, nutr.hunger));
  animal.energy = Math.min(animal.maxEnergy, animal.energy + _plantEnergyGain(animal, nutr.energy));
  // HP recovery from eating plants
  const hpGain = stage === S_SEED ? 3 : stage === S_ADULT ? 5 : 10;
  animal.hp = Math.min(animal.maxHp, animal.hp + hpGain);
  animal.state = AnimalState.EATING;
  animal.applyEnergyCost('EAT');
  const x = idx % world.width, y = Math.floor(idx / world.width);
  animal.logAction(world.clock.tick, 'EAT_PLANT', { plantType: ptype, stage: STAGE_LOG_NAMES[stage] || stage, x, y });
  world.logPlantEvent(idx, 'EATEN', { by: animal.species });
  world.plantType[idx] = P_NONE;
  world.plantStage[idx] = S_NONE;
  world.plantAge[idx] = 0;
  world.activePlantTiles.delete(idx);
  world.plantChanges.push([x, y, P_NONE, S_NONE]);
  world.plantEvents.deaths_eaten[ptype] = (world.plantEvents.deaths_eaten[ptype] || 0) + 1;
}

/**
 * Process one tick for an animal: decide action, execute it.
 */
export function decideAndAct(animal, world, spatialHash) {
  const collector = world._benchmarkCollector;
  const startedAt = benchmarkStart(collector);
  try {
  benchmarkAddKeyed(collector, 'speciesDecisions', animal.species, 1);
  if (!animal.alive) return;

  animal.tickNeeds(world.hungerMultiplier, world.thirstMultiplier);

  // Die of old age or zero HP
  if (animal.age > animal.maxAge || animal.hp <= 0) {
    animal.alive = false;
    animal.state = AnimalState.DEAD;
    animal._deathTick = world.clock.tick;
    animal.logAction(world.clock.tick, 'DIED', {
      cause: animal.age > animal.maxAge ? 'old_age' : 'hp_depleted'
    });
    return;
  }

  // Zero energy — force sleep (cannot do anything else)
  // Animals cannot sleep on water — keep them idle so they attempt to move to land
  if (animal.energy <= 0) {
    const t = world.terrain[world.idx(animal.x, animal.y)];
    if (t !== WATER && t !== DEEP_WATER) {
      animal.state = AnimalState.SLEEPING;
      _doSleep(animal);
      return;
    }
  }

  // Ongoing states always process
  if (animal.state === AnimalState.SLEEPING) {
    const t = world.terrain[world.idx(animal.x, animal.y)];
    if (t === WATER || t === DEEP_WATER) { animal.state = AnimalState.IDLE; }
    else { _doSleep(animal); return; }
  }
  if (animal.state === AnimalState.EATING)   { _doEat(animal, world); return; }
  if (animal.state === AnimalState.DRINKING) { _doDrink(animal, world); return; }

  // Compute effective vision based on day/night and nocturnal trait
  const isNight = world.clock.isNight;
  const nocturnal = animal._config.nocturnal;
  const nightVisionReduction = world.config.night_vision_reduction_factor ?? 0.65;
  const nocturnalDayVisionFactor = world.config.nocturnal_day_vision_factor ?? 0.8;
  const vision = nocturnal
    ? (isNight ? animal.visionRange : Math.floor(animal.visionRange * nocturnalDayVisionFactor))
    : (isNight ? Math.floor(animal.visionRange * nightVisionReduction) : animal.visionRange);

  // Stagger: between decision ticks, just continue current action
  const interval = DECISION_INTERVALS[animal.species] || 2;
  if (animal.id % interval !== world.clock.tick % interval) {
    benchmarkAdd(collector, 'decisionStaggerSkips', 1);
    benchmarkAddKeyed(collector, 'speciesDecisionStaggerSkips', animal.species, 1);
    // Continue following path or stay idle
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

  // --- Opportunistic: drink if adjacent to water and even slightly thirsty ---
  if (animal.thirst > (_decisionThresholds(animal).drink_opportunistic ?? 25) && world.isWaterAdjacent(animal.x, animal.y)) {
    animal.state = AnimalState.DRINKING;
    animal.applyEnergyCost('DRINK');
    return;
  }

  // --- Opportunistic: eat if standing on edible plant ---
  if (animal.hunger > (_decisionThresholds(animal).eat_opportunistic ?? 20) && (animal.diet === 'HERBIVORE' || animal.diet === 'OMNIVORE')) {
    const idx = world.idx(animal.x, animal.y);
    const ptype = world.plantType[idx];
    const stage = world.plantStage[idx];
    if (ptype > 0 && _isEdibleStage(ptype, stage) && _canEatPlant(animal, ptype)) {
      // Seeds only eaten when quite hungry; adult plants when moderately hungry
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

  // --- Priority-based decision ---

  // 1. Critical thirst → seek water
  if (animal.thirst > (_decisionThresholds(animal).critical_thirst ?? 55)) {
    _seekWater(animal, world, vision);
    return;
  }

  // 2. Flee from predators (herbivores and omnivores from stronger predators)
  if (animal.diet === 'HERBIVORE' || animal.diet === 'OMNIVORE') {
    const threat = _findNearestThreat(animal, world, spatialHash, vision);
    if (threat) { _fleeFrom(animal, threat, world); return; }
  }

  // 3. Critical hunger → seek food
  if (animal.hunger > (_decisionThresholds(animal).critical_hunger ?? 45)) {
    if (animal.diet === 'HERBIVORE') {
      _seekPlantFood(animal, world, vision);
    } else if (animal.diet === 'OMNIVORE') {
      _seekOmnivoreFood(animal, world, spatialHash, vision);
    } else {
      _seekPrey(animal, world, spatialHash, vision);
    }
    return;
  }

  // 4. Low energy → sleep (not on water)
  if (animal.energy < (_decisionThresholds(animal).sleep_energy_min ?? 20)) {
    const t = world.terrain[world.idx(animal.x, animal.y)];
    if (t !== WATER && t !== DEEP_WATER) {
      animal.state = AnimalState.SLEEPING;
      return;
    }
  }

  // 5. Mating opportunity (promoted — breed before moderate hunger/thirst)
  if (animal.lifeStage === LifeStage.ADULT && animal.mateCooldown <= 0 && animal.energy > (_decisionThresholds(animal).mate_energy_min ?? 50)) {
    const mate = _findMate(animal, spatialHash, Math.max(vision, _decisionThresholds(animal).mate_search_radius_min ?? 10));
    if (mate) {
      const dist = Math.abs(mate.x - animal.x) + Math.abs(mate.y - animal.y);
      if (dist <= 2) {
        _doMate(animal, mate, world);
      } else {
        // Walk toward mate
        _computePath(animal, world, mate.x, mate.y, 40, 'mate');
        if (animal.path.length) _followPath(animal, world);
        else _randomWalk(animal, world);
      }
      return;
    }
  }

  // 6. Moderate hunger — proactively seek food
  if (animal.hunger > (_decisionThresholds(animal).moderate_hunger ?? 30)) {
    if (animal.diet === 'HERBIVORE') {
      _seekPlantFood(animal, world, vision);
    } else if (animal.diet === 'OMNIVORE') {
      _seekOmnivoreFood(animal, world, spatialHash, vision);
    } else {
      _seekPrey(animal, world, spatialHash, vision);
    }
    return;
  }

  // 7. Moderate thirst — proactively seek water
  if (animal.thirst > (_decisionThresholds(animal).moderate_thirst ?? 35)) {
    _seekWater(animal, world, vision);
    return;
  }

  // 8. Idle or wander
  if (animal.path.length && animal.pathIndex < animal.path.length) {
    _followPath(animal, world);
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

// ---- Ongoing action handlers ----

function _doSleep(animal) {
  const recovery = _recoveryConfig(animal);
  animal.applyEnergyCost('SLEEP'); // negative cost = recovery
  animal.hp = Math.min(animal.maxHp, animal.hp + (recovery.sleep_hp ?? 0.8));
  if (animal.energy >= (recovery.sleep_exit_energy ?? 70)) animal.state = AnimalState.IDLE;
}

function _doEat(animal /*, world */) {
  const recovery = _recoveryConfig(animal);
  animal.hunger = Math.max(0, animal.hunger - (recovery.eat_hunger ?? 45));
  animal.energy = Math.min(animal.maxEnergy, animal.energy + (recovery.eat_energy ?? 5));
  animal.hp = Math.min(animal.maxHp, animal.hp + (recovery.eat_hp ?? 2));
  animal.applyEnergyCost('EAT');
  animal.state = AnimalState.IDLE;
}

function _doDrink(animal /*, world */) {
  const recovery = _recoveryConfig(animal);
  animal.thirst = Math.max(0, animal.thirst - (recovery.drink_thirst ?? 55));
  animal.applyEnergyCost('DRINK');
  animal.state = AnimalState.IDLE;
}

// ---- Seek behaviors ----

// Max ticks before a cached path is considered stale
function _pathCacheTtl(world) {
  return world.config.pathfinding_cache_ttl ?? 15;
}

function _threatCacheTtl(world) {
  return world.config.threat_cache_ttl ?? 4;
}

function _threatScanCooldown(world) {
  return world.config.threat_scan_cooldown_ticks ?? 2;
}

function _hasValidPath(animal, tick, ttl) {
  return animal.path.length > 0 &&
    animal.pathIndex < animal.path.length &&
    (tick - animal._pathTick) < ttl;
}

function _reusePathIfValid(animal, world, reason) {
  const collector = world._benchmarkCollector;
  const valid = _hasValidPath(animal, world.clock.tick, _pathCacheTtl(world));
  benchmarkAdd(collector, valid ? 'pathCacheHits' : 'pathCacheMisses', 1);
  benchmarkAddKeyed(collector, valid ? 'speciesPathCacheHits' : 'speciesPathCacheMisses', animal.species, 1);
  if (!valid) return false;
  benchmarkAddKeyed(collector, 'pathReuseReasons', reason, 1);
  _followPath(animal, world);
  return true;
}

function _computePath(animal, world, targetX, targetY, maxDist, reason) {
  const collector = world._benchmarkCollector;
  benchmarkAdd(collector, 'pathRequests', 1);
  benchmarkAddKeyed(collector, 'speciesPathRequests', animal.species, 1);
  benchmarkAddKeyed(collector, 'pathRequestReasons', reason, 1);
  const path = aStar(animal.x, animal.y, targetX, targetY, world, maxDist, animal._walkableSet);
  _setPath(animal, path, world.clock.tick);
  if (path.length > 0) {
    benchmarkAdd(collector, 'pathSuccesses', 1);
    benchmarkAddKeyed(collector, 'speciesPathSuccesses', animal.species, 1);
  } else {
    benchmarkAdd(collector, 'pathFailures', 1);
    benchmarkAddKeyed(collector, 'speciesPathFailures', animal.species, 1);
  }
}

function _isThreatValidFor(animal, threat, vision) {
  if (!threat || !threat.alive || threat.id === animal.id) return false;
  const dist = Math.abs(threat.x - animal.x) + Math.abs(threat.y - animal.y);
  if (dist > vision + 2) return false;
  if (threat._preySpecies.size > 0 && !threat._preySpecies.has(animal.species)) return false;
  if (threat.diet === 'CARNIVORE') return true;
  if (animal.diet === 'OMNIVORE' && threat.diet === 'OMNIVORE') {
    return threat._config.attack_power > animal._config.attack_power + (_combatConfig(animal).threat_attack_margin ?? 2);
  }
  return false;
}

function _setPath(animal, path, tick) {
  animal.path = path;
  animal.pathIndex = 0;
  animal._pathTick = tick;
}

function _seekWater(animal, world, vision) {
  const collector = world._benchmarkCollector;
  const startedAt = benchmarkStart(collector);
  try {
  benchmarkAddKeyed(collector, 'speciesSeekWater', animal.species, 1);
  // Already adjacent? Drink immediately
  if (world.isWaterAdjacent(animal.x, animal.y)) {
    animal.state = AnimalState.DRINKING;
    animal.applyEnergyCost('DRINK');
    return;
  }

  // Already following a path? Continue if still fresh
  if (_reusePathIfValid(animal, world, 'water')) {
    return;
  }

  // Search for nearest water — expand range when desperate
  const desperate = animal.thirst > ((_decisionThresholds(animal).critical_thirst ?? 55) + 20);
  const searchR = desperate ? Math.min(vision * 3, 30) : vision * 2;
  let best = null, bestDist = Infinity;

  for (let dy = -searchR; dy <= searchR; dy++) {
    for (let dx = -searchR; dx <= searchR; dx++) {
      const nx = animal.x + dx, ny = animal.y + dy;
      if (world.isInBounds(nx, ny)) {
        const t = world.terrain[world.idx(nx, ny)];
        if (t === WATER || t === DEEP_WATER) {
          const d = Math.abs(dx) + Math.abs(dy);
          if (d < bestDist) { bestDist = d; best = [nx, ny]; }
        }
      }
    }
  }

  if (best) {
    // Path to an adjacent walkable tile near the water
    const pathLimit = desperate ? 80 : 50;
    _computePath(animal, world, best[0], best[1], pathLimit, 'water');
  }

  if (animal.path.length) {
    _followPath(animal, world);
  } else {
    // Wander toward center of map (likely has water near islands)
    _randomWalk(animal, world);
  }
  } finally {
    benchmarkEnd(collector, 'seekWater', startedAt);
  }
}

function _seekPlantFood(animal, world, vision) {
  const collector = world._benchmarkCollector;
  const startedAt = benchmarkStart(collector);
  try {
  benchmarkAddKeyed(collector, 'speciesSeekPlantFood', animal.species, 1);
  const idx = world.idx(animal.x, animal.y);

  // Eat edible plant on current tile (consumes entirely)
  const ptype = world.plantType[idx];
  const stage = world.plantStage[idx];
  if (ptype > 0 && _isEdibleStage(ptype, stage) && _canEatPlant(animal, ptype)) {
    _eatPlantTile(animal, world, idx);
    return;
  }

  // Already following food path? Continue if fresh
  if (_reusePathIfValid(animal, world, 'plant')) {
    return;
  }

  // Spiral search: check nearest tiles first, early-exit on fruit found
  const r = vision;
  const maxR = animal.hunger > (_decisionThresholds(animal).expanded_plant_search_hunger ?? 65) ? Math.min(vision * 3, 25) : r;
  let bestFruit = null, bestPlant = null, bestSeed = null;

  for (let ring = 1; ring <= maxR; ring++) {
    // Scan the perimeter of this ring (Manhattan distance = ring)
    for (let dx = -ring; dx <= ring; dx++) {
      const absdy = ring - Math.abs(dx);
      const dys = absdy === 0 ? [0] : [-absdy, absdy];
      for (const dy of dys) {
        const nx = animal.x + dx, ny = animal.y + dy;
        if (!world.isInBounds(nx, ny)) continue;
        const ni = world.idx(nx, ny);

        const ntype = world.plantType[ni];
        const nstage = world.plantStage[ni];
        if (ntype > 0 && _isEdibleStage(ntype, nstage) && _canEatPlant(animal, ntype)) {
          if (nstage === S_FRUIT) {
            bestFruit = [nx, ny];
            break; // Fruit found at this ring — use it
          } else if (nstage === S_SEED) {
            if (!bestSeed) bestSeed = [nx, ny];
          } else if (!bestPlant) {
            bestPlant = [nx, ny];
          }
        }
      }
      if (bestFruit) break;
    }
    // Early exit: found fruit (best option) — stop expanding
    if (bestFruit) break;
    // If we found edible plant within vision range, stop expanding beyond vision (unless desperate)
    if ((bestPlant || bestSeed) && ring >= r) break;
  }

  const target = bestFruit || bestPlant || (animal.hunger > (_decisionThresholds(animal).desperate_seed_hunger_min ?? 60) ? bestSeed : null);
  if (target) {
    const pathLimit = target === bestFruit ? 40 : 60;
    _computePath(animal, world, target[0], target[1], pathLimit, target === bestFruit ? 'fruit' : 'plant');
    if (animal.path.length) { _followPath(animal, world); return; }
  }

  _randomWalk(animal, world);
  } finally {
    benchmarkEnd(collector, 'seekPlantFood', startedAt);
  }
}

function _seekPrey(animal, world, spatialHash, vision) {
  const collector = world._benchmarkCollector;
  const startedAt = benchmarkStart(collector);
  try {
  benchmarkAddKeyed(collector, 'speciesSeekPrey', animal.species, 1);
  // Carnivores can also eat fruit opportunistically when very hungry and no prey
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

  if (target) {
    const dist = Math.abs(target.x - animal.x) + Math.abs(target.y - animal.y);

    if (dist <= 1) {
      _attack(animal, target, world);
    } else {
      _computePath(animal, world, target.x, target.y, 30, 'prey');
      const fly = _canFly(animal);
      animal.state = fly ? AnimalState.FLYING : AnimalState.RUNNING;
      const steps = fly ? animal.speed + 1 : animal.speed;
      for (let s = 0; s < steps; s++) {
        _followPath(animal, world);
      }
      animal.applyEnergyCost(fly ? 'FLY' : 'RUN');
    }
    return;
  }

  // No live prey — try scavenging recent corpses (if species allows)
  if (animal._config.can_scavenge && _tryScavenge(animal, world, spatialHash, vision)) return;

  // No prey — carnivores eat fruit as fallback when desperate
  // Only if they have explicit edible_plants (empty list = strictly carnivorous)
  if (animal.hunger > (_decisionThresholds(animal).desperate_hunger_fallback_food_min ?? 50) && animal._ediblePlants.size > 0) {
    const idx = world.idx(animal.x, animal.y);
    const ptype = world.plantType[idx];
    const stage = world.plantStage[idx];
    if (ptype > 0 && _isEdibleStage(ptype, stage) && _canEatPlant(animal, ptype)) {
      _eatPlantTile(animal, world, idx);
      return;
    }
    // Seek nearby fruit when desperate
    _seekPlantFood(animal, world, vision);
    return;
  }

  _randomWalk(animal, world);
  } finally {
    benchmarkEnd(collector, 'seekPrey', startedAt);
  }
}

/**
 * Omnivore food-seeking: prefer plants first, hunt small prey when hungrier.
 */
function _seekOmnivoreFood(animal, world, spatialHash, vision) {
  const collector = world._benchmarkCollector;
  const startedAt = benchmarkStart(collector);
  try {
  benchmarkAddKeyed(collector, 'speciesSeekOmnivoreFood', animal.species, 1);
  // Try eating edible plant on current tile first
  const idx = world.idx(animal.x, animal.y);
  const ptype = world.plantType[idx];
  const stage = world.plantStage[idx];
  if (ptype > 0 && _isEdibleStage(ptype, stage) && _canEatPlant(animal, ptype)) {
    _eatPlantTile(animal, world, idx);
    return;
  }

  // When very hungry, try hunting prey from prey_species list
  if (animal.hunger > (_decisionThresholds(animal).desperate_hunger_hunt_min ?? 75)) {
    const nearby = spatialHash.queryRadius(animal.x, animal.y, vision);
    let target = null;
    let bestDist = Infinity;
    for (const entity of nearby) {
      if (!entity.alive || entity.id === animal.id || !_canHunt(animal, entity)) continue;
      const distCandidate = Math.abs(entity.x - animal.x) + Math.abs(entity.y - animal.y);
      if (distCandidate < bestDist) {
        bestDist = distCandidate;
        target = entity;
      }
    }
    if (target) {
      const dist = Math.abs(target.x - animal.x) + Math.abs(target.y - animal.y);
      if (dist <= 1) {
        _attack(animal, target, world);
      } else {
        _computePath(animal, world, target.x, target.y, 30, 'omnivore-prey');
        const fly = _canFly(animal);
        animal.state = fly ? AnimalState.FLYING : AnimalState.RUNNING;
        const steps = fly ? animal.speed + 1 : animal.speed;
        for (let s = 0; s < steps; s++) {
          _followPath(animal, world);
        }
        animal.applyEnergyCost(fly ? 'FLY' : 'RUN');
      }
      return;
    }

    // No live prey — try scavenging recent corpses (if species allows)
    if (animal._config.can_scavenge && _tryScavenge(animal, world, spatialHash, vision)) return;
  }

  // Fallback: seek plants in vision range
  _seekPlantFood(animal, world, vision);
  } finally {
    benchmarkEnd(collector, 'seekOmnivoreFood', startedAt);
  }
}

// ---- Scavenging ----

function _tryScavenge(animal, world, spatialHash, vision) {
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
    // Consume corpse
    animal.hunger = Math.max(0, animal.hunger - 60);
    animal.energy = Math.min(animal.maxEnergy, animal.energy + 15);
    animal.hp = Math.min(animal.maxHp, animal.hp + 8);
    animal.state = AnimalState.EATING;
    animal.applyEnergyCost('EAT');
    animal.logAction(world.clock.tick, 'SCAVENGED', { corpse: target.species, corpseId: target.id });
    target.consumed = true;
    return true;
  }

  // Walk toward corpse
  _computePath(animal, world, target.x, target.y, 30, 'scavenge');
  if (animal.path.length) {
    _followPath(animal, world);
    return true;
  }
  return false;
}

// ---- Combat ----

function _attack(attacker, defender, world) {
  const combat = _combatConfig(attacker);
  attacker.state = AnimalState.ATTACKING;
  attacker.applyEnergyCost('ATTACK');
  attacker.attackCooldown = combat.attack_cooldown ?? 3;

  let damage = attacker._config.attack_power - defender._config.defense * (combat.defense_factor ?? 0.5);
  if (damage < (combat.min_damage ?? 1)) damage = combat.min_damage ?? 1;
  defender.hp -= damage;

  attacker.logAction(world.clock.tick, 'ATTACK', { target: defender.species, targetId: defender.id, damage: Math.round(damage * 10) / 10 });
  defender.logAction(world.clock.tick, 'DEFENDED', { attacker: attacker.species, attackerId: attacker.id, damage: Math.round(damage * 10) / 10 });

  if (defender.hp <= 0) {
    defender.alive = false;
    defender.state = AnimalState.DEAD;
    defender._deathTick = world.clock.tick;
    defender.logAction(world.clock.tick, 'KILLED_BY', { attacker: attacker.species, attackerId: attacker.id });
    attacker.logAction(world.clock.tick, 'KILLED', { target: defender.species, targetId: defender.id });
    attacker.hunger = Math.max(0, attacker.hunger - 80);
    attacker.energy = Math.min(attacker.maxEnergy, attacker.energy + 25);
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + 15);
    attacker.state = AnimalState.EATING;
  }
}

// ---- Threat detection & fleeing ----

function _findNearestThreat(animal, world, spatialHash, vision) {
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

  if (tick < animal._nextThreatCheckTick) {
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
    const isThreat = entity.diet === 'CARNIVORE' ||
      (animal.diet === 'OMNIVORE' && entity.diet === 'OMNIVORE' && entity._config.attack_power > animal._config.attack_power + 2);
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

function _fleeFrom(animal, threat, world) {
  const dx = animal.x - threat.x;
  const dy = animal.y - threat.y;
  const dist = Math.max(1, Math.abs(dx) + Math.abs(dy));
  // Flying animals get an extra burst step when fleeing
  const fly = _canFly(animal);
  const bursts = fly ? animal.speed + 1 : animal.speed;
  for (let burst = 0; burst < bursts; burst++) {
    const cx = animal.x - threat.x;
    const cy = animal.y - threat.y;
    const cd = Math.max(1, Math.abs(cx) + Math.abs(cy));
    let moved = false;
    for (let step = 3; step >= 1; step--) {
      let fx = animal.x + Math.round(cx / cd * step);
      let fy = animal.y + Math.round(cy / cd * step);
      fx = Math.max(0, Math.min(world.width - 1, fx));
      fy = Math.max(0, Math.min(world.height - 1, fy));
      if (world.isWalkableFor(fx, fy, animal._walkableSet) && !world.isTileOccupied(fx, fy)) {
        _moveAnimal(animal, fx, fy, world);
        moved = true;
        break;
      }
    }
    if (!moved) break;
  }
  animal.state = fly ? AnimalState.FLYING : AnimalState.FLEEING;
  animal.applyEnergyCost(fly ? 'FLY' : 'FLEE');
  animal.logAction(world.clock.tick, 'FLED', { from: threat.species, threatId: threat.id });
}

// ---- Mating ----

function _findMate(animal, spatialHash, searchRadius) {
  const collector = spatialHash._benchmarkCollector;
  const startedAt = benchmarkStart(collector);
  try {
  const nearby = spatialHash.queryRadius(animal.x, animal.y, searchRadius || 10);
  const repro = animal._config.reproduction || REPRO_SEXUAL;
  let target = null;
  let bestDist = Infinity;
  for (const entity of nearby) {
    if (entity.species !== animal.species || !entity.alive || entity.id === animal.id) continue;
    if (entity.lifeStage !== LifeStage.ADULT || entity.mateCooldown > 0 || entity.energy <= (_decisionThresholds(entity).mate_energy_min ?? 50)) continue;
    if (repro === REPRO_SEXUAL) {
      if (animal.sex === SEX_MALE && entity.sex !== SEX_FEMALE) continue;
      if (animal.sex === SEX_FEMALE && entity.sex !== SEX_MALE) continue;
    }
    const distCandidate = Math.abs(entity.x - animal.x) + Math.abs(entity.y - animal.y);
    if (distCandidate < bestDist) {
      bestDist = distCandidate;
      target = entity;
    }
  }
  return target;
  } finally {
    benchmarkEnd(collector, 'findMate', startedAt);
  }
}

function _doMate(animal, mate, world) {
  animal.state = AnimalState.MATING;
  mate.state = AnimalState.MATING;
  animal.applyEnergyCost('MATE');
  mate.applyEnergyCost('MATE');
  animal.mateCooldown = animal._config.mate_cooldown || 60;
  mate.mateCooldown = mate._config.mate_cooldown || 60;

  animal.logAction(world.clock.tick, 'MATED', { partner: mate.species, partnerId: mate.id });
  mate.logAction(world.clock.tick, 'MATED', { partner: animal.species, partnerId: animal.id });

  // Per-species population cap, scaled by global cap when set
  const baseMax = animal._config.max_population;
  if (baseMax) {
    const globalMax = world.config.max_animal_population;
    const effectiveMax = globalMax > 0
      ? Math.max(2, Math.round(baseMax * globalMax / BASE_POP_TOTAL))
      : baseMax;
    const count = world.getAliveSpeciesCount(animal.species);
    if (count >= effectiveMax) return;
    // Gradual slowdown: from 60% capacity onward, reproduction chance drops linearly
    const ratio = count / effectiveMax;
    if (ratio > 0.6) {
      const chance = 1 - ((ratio - 0.6) / 0.4); // 100% at 60% → 0% at 100%
      if (Math.random() > chance) return;
    }
  }

  // Spawn baby nearby
  let bx = animal.x, by = animal.y;
  let babyPlaced = false;
  for (const [ddx, ddy] of [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const nx = animal.x + ddx, ny = animal.y + ddy;
    if (world.isWalkableFor(nx, ny, animal._walkableSet) && !world.isTileOccupied(nx, ny)) {
      bx = nx; by = ny; babyPlaced = true; break;
    }
  }
  if (!babyPlaced) return; // No free tile for baby

  const speciesConfig = world.config.animal_species[animal.species];
  const baby = new Animal(world.nextId(), bx, by, animal.species, speciesConfig);
  baby.energy = speciesConfig.max_energy * 0.4;
  baby.age = 0;
  baby.logAction(world.clock.tick, 'BORN', { parentA: animal.id, parentB: mate.id });
  animal.logAction(world.clock.tick, 'OFFSPRING', { babyId: baby.id, x: bx, y: by });
  mate.logAction(world.clock.tick, 'OFFSPRING', { babyId: baby.id, x: bx, y: by });
  world.animals.push(baby);
  world.placeAnimal(bx, by);
}

// ---- Movement helpers ----

/** Move animal and update occupancy grid. */
function _moveAnimal(animal, nx, ny, world) {
  world.vacateAnimal(animal.x, animal.y);
  animal.x = nx;
  animal.y = ny;
  world.placeAnimal(nx, ny);
}

function _followPath(animal, world) {
  if (!animal.path.length || animal.pathIndex >= animal.path.length) {
    animal.path = [];
    animal.pathIndex = 0;
    return;
  }

  const [nx, ny] = animal.path[animal.pathIndex];
  if (world.isWalkableFor(nx, ny, animal._walkableSet) && !world.isTileOccupied(nx, ny)) {
    _moveAnimal(animal, nx, ny, world);
  }
  animal.pathIndex++;
  animal.state = AnimalState.WALKING;
  animal.applyEnergyCost('WALK');

  if (animal.pathIndex >= animal.path.length) {
    animal.path = [];
    animal.pathIndex = 0;
  }
}

function _randomWalk(animal, world) {
  const collector = world._benchmarkCollector;
  const startedAt = benchmarkStart(collector);
  try {
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

    // Home bias: when far from home, prefer direction toward home (60% chance)
    const homeDist = Math.abs(animal.x - animal.homeX) + Math.abs(animal.y - animal.homeY);
    if (homeDist > 15 && Math.random() < 0.6) {
      const hdx = Math.sign(animal.homeX - animal.x);
      const hdy = Math.sign(animal.homeY - animal.y);
      dirs.sort((a, b) => {
        const sa = (a[0] === hdx ? -1 : 0) + (a[1] === hdy ? -1 : 0);
        const sb = (b[0] === hdx ? -1 : 0) + (b[1] === hdy ? -1 : 0);
        return sa - sb;
      });
    } else {
      for (let i = dirs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
      }
    }

    for (const [dx, dy] of dirs) {
      const nx = animal.x + dx, ny = animal.y + dy;
      if (world.isWalkableFor(nx, ny, animal._walkableSet) && !world.isTileOccupied(nx, ny)) {
        _moveAnimal(animal, nx, ny, world);
        animal.state = AnimalState.WALKING;
        animal.applyEnergyCost('WALK');
        return;
      }
    }

    animal.state = AnimalState.IDLE;
    animal.applyEnergyCost('IDLE');
    _idleRecover(animal);
  } finally {
    benchmarkEnd(collector, 'randomWalk', startedAt);
  }
}
