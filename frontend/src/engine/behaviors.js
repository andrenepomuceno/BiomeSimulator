/**
 * Animal AI — state machine and decision logic.
 */
import { Animal, AnimalState } from './entities.js';
import { WATER } from './world.js';
import { aStar } from './pathfinding.js';
import { SEX_MALE, SEX_FEMALE, SEX_HERMAPHRODITE, SEX_ASEXUAL, REPRO_SEXUAL, REPRO_HERMAPHRODITE } from './config.js';
import { S_FRUIT, S_ADULT, S_ADULT_SPROUT, S_NONE, P_NONE } from './flora.js';

/**
 * Process one tick for an animal: decide action, execute it.
 */
export function decideAndAct(animal, world, spatialHash) {
  if (!animal.alive) return;

  animal.tickNeeds();

  // Die of old age or zero energy
  if (animal.age > animal.maxAge || animal.energy <= 0) {
    animal.alive = false;
    animal.state = AnimalState.DEAD;
    return;
  }

  // Ongoing states
  if (animal.state === AnimalState.SLEEPING) { _doSleep(animal); return; }
  if (animal.state === AnimalState.EATING)   { _doEat(animal, world); return; }
  if (animal.state === AnimalState.DRINKING) { _doDrink(animal, world); return; }

  // --- Opportunistic: drink if adjacent to water and even slightly thirsty ---
  if (animal.thirst > 25 && world.isWaterAdjacent(animal.x, animal.y)) {
    animal.state = AnimalState.DRINKING;
    animal.applyEnergyCost('DRINK');
    return;
  }

  // --- Opportunistic: eat if standing on food and even slightly hungry ---
  if (animal.hunger > 20 && animal.diet === 'HERBIVORE') {
    const idx = world.idx(animal.x, animal.y);
    if (world.plantStage[idx] === S_FRUIT) {
      // Eat fruit — consume entirely (tile becomes empty)
      world.plantType[idx] = P_NONE;
      world.plantStage[idx] = S_NONE;
      world.plantAge[idx] = 0;
      animal.state = AnimalState.EATING;
      animal.applyEnergyCost('EAT');
      animal.hunger = Math.max(0, animal.hunger - 40);
      world.plantChanges.push([animal.x, animal.y, P_NONE, S_NONE]);
      return;
    }
    if (animal.hunger > 35 && world.plantType[idx] > 0 && world.plantStage[idx] >= S_ADULT_SPROUT) {
      world.plantStage[idx] = Math.max(1, world.plantStage[idx] - 1);
      animal.state = AnimalState.EATING;
      animal.hunger = Math.max(0, animal.hunger - 25);
      world.plantChanges.push([animal.x, animal.y, world.plantType[idx], world.plantStage[idx]]);
      return;
    }
  }

  // --- Priority-based decision ---

  // 1. Critical thirst → seek water
  if (animal.thirst > 55) {
    _seekWater(animal, world);
    return;
  }

  // 2. Critical hunger → seek food
  if (animal.hunger > 45) {
    if (animal.diet === 'HERBIVORE') {
      _seekPlantFood(animal, world);
    } else {
      _seekPrey(animal, world, spatialHash);
    }
    return;
  }

  // 3. Low energy → sleep
  if (animal.energy < 20) {
    animal.state = AnimalState.SLEEPING;
    return;
  }

  // 4. Flee from predators (herbivores only)
  if (animal.diet === 'HERBIVORE') {
    const threat = _findNearestThreat(animal, spatialHash);
    if (threat) { _fleeFrom(animal, threat, world); return; }
  }

  // 5. Moderate hunger — proactively seek food
  if (animal.hunger > 30) {
    if (animal.diet === 'HERBIVORE') {
      _seekPlantFood(animal, world);
    } else {
      _seekPrey(animal, world, spatialHash);
    }
    return;
  }

  // 6. Moderate thirst — proactively seek water
  if (animal.thirst > 35) {
    _seekWater(animal, world);
    return;
  }

  // 7. Mating opportunity
  if (animal.age >= animal.matureAge && animal.mateCooldown <= 0 && animal.energy > 50) {
    const mate = _findMate(animal, spatialHash);
    if (mate) { _doMate(animal, mate, world); return; }
  }

  // 8. Idle or wander
  if (animal.path.length && animal.pathIndex < animal.path.length) {
    _followPath(animal, world);
  } else if (Math.random() < 0.3) {
    _randomWalk(animal, world);
  } else {
    animal.state = AnimalState.IDLE;
    animal.applyEnergyCost('IDLE');
  }
}

// ---- Ongoing action handlers ----

function _doSleep(animal) {
  animal.applyEnergyCost('SLEEP'); // negative cost = recovery
  if (animal.energy >= 70) animal.state = AnimalState.IDLE;
}

function _doEat(animal /*, world */) {
  animal.hunger = Math.max(0, animal.hunger - 35);
  animal.applyEnergyCost('EAT');
  animal.state = AnimalState.IDLE;
}

function _doDrink(animal /*, world */) {
  animal.thirst = Math.max(0, animal.thirst - 45);
  animal.applyEnergyCost('DRINK');
  animal.state = AnimalState.IDLE;
}

// ---- Seek behaviors ----

function _seekWater(animal, world) {
  // Already adjacent? Drink immediately
  if (world.isWaterAdjacent(animal.x, animal.y)) {
    animal.state = AnimalState.DRINKING;
    animal.applyEnergyCost('DRINK');
    return;
  }

  // Already following a path? Continue
  if (animal.path.length && animal.pathIndex < animal.path.length) {
    _followPath(animal, world);
    return;
  }

  // Search for nearest water — expand range when desperate
  const desperate = animal.thirst > 75;
  const searchR = desperate ? Math.min(animal.visionRange * 3, 30) : animal.visionRange * 2;
  let best = null, bestDist = Infinity;

  for (let dy = -searchR; dy <= searchR; dy++) {
    for (let dx = -searchR; dx <= searchR; dx++) {
      const nx = animal.x + dx, ny = animal.y + dy;
      if (world.isInBounds(nx, ny) && world.terrain[world.idx(nx, ny)] === WATER) {
        const d = Math.abs(dx) + Math.abs(dy);
        if (d < bestDist) { bestDist = d; best = [nx, ny]; }
      }
    }
  }

  if (best) {
    // Path to an adjacent walkable tile near the water
    const pathLimit = desperate ? 80 : 50;
    animal.path = aStar(animal.x, animal.y, best[0], best[1], world, pathLimit);
    animal.pathIndex = 0;
  }

  if (animal.path.length) {
    _followPath(animal, world);
  } else {
    // Wander toward center of map (likely has water near islands)
    _randomWalk(animal, world);
  }
}

function _seekPlantFood(animal, world) {
  const idx = world.idx(animal.x, animal.y);

  // Eat fruit on current tile (best food — consumes tile entirely)
  if (world.plantStage[idx] === S_FRUIT) {
    world.plantType[idx] = P_NONE;
    world.plantStage[idx] = S_NONE;
    world.plantAge[idx] = 0;
    animal.state = AnimalState.EATING;
    animal.applyEnergyCost('EAT');
    animal.hunger = Math.max(0, animal.hunger - 40);
    world.plantChanges.push([animal.x, animal.y, P_NONE, S_NONE]);
    return;
  }

  // Eat adult sprout or adult plant on current tile (degrade stage)
  if (world.plantType[idx] > 0 && world.plantStage[idx] >= S_ADULT_SPROUT) {
    world.plantStage[idx] = Math.max(1, world.plantStage[idx] - 1);
    animal.state = AnimalState.EATING;
    animal.hunger = Math.max(0, animal.hunger - 25);
    world.plantChanges.push([animal.x, animal.y, world.plantType[idx], world.plantStage[idx]]);
    return;
  }

  // Already following food path? Continue
  if (animal.path.length && animal.pathIndex < animal.path.length) {
    _followPath(animal, world);
    return;
  }

  // Search nearby for food — prioritize fruit, fallback to mature plants
  const r = animal.visionRange;
  let bestFruit = null, bestFruitDist = Infinity;
  let bestPlant = null, bestPlantDist = Infinity;

  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const nx = animal.x + dx, ny = animal.y + dy;
      if (!world.isInBounds(nx, ny)) continue;
      const ni = world.idx(nx, ny);
      const d = Math.abs(dx) + Math.abs(dy);
      if (d === 0) continue;

      if (world.plantStage[ni] === S_FRUIT && d < bestFruitDist) {
        bestFruitDist = d;
        bestFruit = [nx, ny];
      } else if (world.plantType[ni] > 0 && world.plantStage[ni] >= S_ADULT_SPROUT && d < bestPlantDist) {
        bestPlantDist = d;
        bestPlant = [nx, ny];
      }
    }
  }

  const target = bestFruit || bestPlant;
  if (target) {
    animal.path = aStar(animal.x, animal.y, target[0], target[1], world, 40);
    animal.pathIndex = 0;
    if (animal.path.length) { _followPath(animal, world); return; }
  }

  // Nothing nearby — expand search when very hungry
  if (animal.hunger > 65) {
    const bigR = Math.min(animal.visionRange * 3, 25);
    for (let dy = -bigR; dy <= bigR; dy += 2) {
      for (let dx = -bigR; dx <= bigR; dx += 2) {
        const nx = animal.x + dx, ny = animal.y + dy;
        if (!world.isInBounds(nx, ny)) continue;
        const ni = world.idx(nx, ny);
        const d = Math.abs(dx) + Math.abs(dy);
        if (world.plantStage[ni] === S_FRUIT && d < bestFruitDist) {
          bestFruitDist = d;
          bestFruit = [nx, ny];
        } else if (world.plantType[ni] > 0 && world.plantStage[ni] >= S_ADULT_SPROUT && d < bestPlantDist) {
          bestPlantDist = d;
          bestPlant = [nx, ny];
        }
      }
    }
    const farTarget = bestFruit || bestPlant;
    if (farTarget) {
      animal.path = aStar(animal.x, animal.y, farTarget[0], farTarget[1], world, 60);
      animal.pathIndex = 0;
      if (animal.path.length) { _followPath(animal, world); return; }
    }
  }

  _randomWalk(animal, world);
}

function _seekPrey(animal, world, spatialHash) {
  // Carnivores can also eat fruit opportunistically when very hungry and no prey
  const nearby = spatialHash.queryRadius(animal.x, animal.y, animal.visionRange);
  const prey = nearby.filter(e => e.diet === 'HERBIVORE' && e.alive && e.id !== animal.id);

  if (prey.length) {
    const target = prey.reduce((a, b) =>
      (Math.abs(a.x - animal.x) + Math.abs(a.y - animal.y)) <=
      (Math.abs(b.x - animal.x) + Math.abs(b.y - animal.y)) ? a : b
    );
    const dist = Math.abs(target.x - animal.x) + Math.abs(target.y - animal.y);

    if (dist <= 1) {
      _attack(animal, target, world);
    } else {
      animal.path = aStar(animal.x, animal.y, target.x, target.y, world, 30);
      animal.pathIndex = 0;
      animal.state = AnimalState.RUNNING;
      for (let s = 0; s < animal.speed; s++) {
        _followPath(animal, world);
      }
      animal.applyEnergyCost('RUN');
    }
    return;
  }

  // No prey — carnivores eat fruit as fallback when desperate
  if (animal.hunger > 60) {
    const idx = world.idx(animal.x, animal.y);
    if (world.plantStage[idx] === S_FRUIT) {
      world.plantType[idx] = P_NONE;
      world.plantStage[idx] = S_NONE;
      world.plantAge[idx] = 0;
      animal.state = AnimalState.EATING;
      animal.applyEnergyCost('EAT');
      animal.hunger = Math.max(0, animal.hunger - 20);
      world.plantChanges.push([animal.x, animal.y, P_NONE, S_NONE]);
      return;
    }
  }

  _randomWalk(animal, world);
}

// ---- Combat ----

function _attack(attacker, defender /*, world */) {
  attacker.state = AnimalState.ATTACKING;
  attacker.applyEnergyCost('ATTACK');
  attacker.attackCooldown = 3;

  let damage = attacker._config.attack_power - defender._config.defense * 0.5;
  if (damage < 1) damage = 1;
  defender.energy -= damage;

  if (defender.energy <= 0) {
    defender.alive = false;
    defender.state = AnimalState.DEAD;
    attacker.hunger = Math.max(0, attacker.hunger - 70);
    attacker.energy = Math.min(attacker.maxEnergy, attacker.energy + 15);
    attacker.state = AnimalState.EATING;
  }
}

// ---- Threat detection & fleeing ----

function _findNearestThreat(animal, spatialHash) {
  const nearby = spatialHash.queryRadius(animal.x, animal.y, animal.visionRange);
  const threats = nearby.filter(e => e.diet === 'CARNIVORE' && e.alive && e.id !== animal.id);
  if (!threats.length) return null;
  return threats.reduce((a, b) =>
    (Math.abs(a.x - animal.x) + Math.abs(a.y - animal.y)) <=
    (Math.abs(b.x - animal.x) + Math.abs(b.y - animal.y)) ? a : b
  );
}

function _fleeFrom(animal, threat, world) {
  const dx = animal.x - threat.x;
  const dy = animal.y - threat.y;
  const dist = Math.max(1, Math.abs(dx) + Math.abs(dy));
  let fx = animal.x + Math.round(dx / dist * 3);
  let fy = animal.y + Math.round(dy / dist * 3);
  fx = Math.max(0, Math.min(world.width - 1, fx));
  fy = Math.max(0, Math.min(world.height - 1, fy));

  if (world.isWalkable(fx, fy)) {
    animal.x = fx;
    animal.y = fy;
  }
  animal.state = AnimalState.FLEEING;
  animal.applyEnergyCost('FLEE');
}

// ---- Mating ----

function _findMate(animal, spatialHash) {
  const nearby = spatialHash.queryRadius(animal.x, animal.y, 3);
  const repro = animal._config.reproduction || REPRO_SEXUAL;
  const candidates = nearby.filter(e => {
    if (e.species !== animal.species || !e.alive || e.id === animal.id) return false;
    if (e.age < e.matureAge || e.mateCooldown > 0 || e.energy <= 50) return false;
    // Sex compatibility check
    if (repro === REPRO_SEXUAL) {
      // Need opposite sex
      if (animal.sex === SEX_MALE && e.sex !== SEX_FEMALE) return false;
      if (animal.sex === SEX_FEMALE && e.sex !== SEX_MALE) return false;
    }
    // HERMAPHRODITE and ASEXUAL can mate with any same-species
    return true;
  });
  if (!candidates.length) return null;
  return candidates.reduce((a, b) =>
    (Math.abs(a.x - animal.x) + Math.abs(a.y - animal.y)) <=
    (Math.abs(b.x - animal.x) + Math.abs(b.y - animal.y)) ? a : b
  );
}

function _doMate(animal, mate, world) {
  animal.state = AnimalState.MATING;
  mate.state = AnimalState.MATING;
  animal.applyEnergyCost('MATE');
  mate.applyEnergyCost('MATE');
  animal.mateCooldown = 100;
  mate.mateCooldown = 100;

  // Spawn baby nearby
  let bx = animal.x, by = animal.y;
  for (const [ddx, ddy] of [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1]]) {
    const nx = animal.x + ddx, ny = animal.y + ddy;
    if (world.isWalkable(nx, ny)) { bx = nx; by = ny; break; }
  }

  const speciesConfig = world.config.animal_species[animal.species];
  const baby = new Animal(world.nextId(), bx, by, animal.species, speciesConfig);
  baby.energy = speciesConfig.max_energy * 0.4;
  baby.age = 0;
  world.animals.push(baby);
}

// ---- Movement helpers ----

function _followPath(animal, world) {
  if (!animal.path.length || animal.pathIndex >= animal.path.length) {
    animal.path = [];
    animal.pathIndex = 0;
    return;
  }

  const [nx, ny] = animal.path[animal.pathIndex];
  if (world.isWalkable(nx, ny)) {
    animal.x = nx;
    animal.y = ny;
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
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  // Fisher-Yates shuffle
  for (let i = dirs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
  }
  for (const [dx, dy] of dirs) {
    const nx = animal.x + dx, ny = animal.y + dy;
    if (world.isWalkable(nx, ny)) {
      animal.x = nx;
      animal.y = ny;
      animal.state = AnimalState.WALKING;
      animal.applyEnergyCost('WALK');
      return;
    }
  }
  animal.state = AnimalState.IDLE;
  animal.applyEnergyCost('IDLE');
}
