/**
 * Animal AI — state machine and decision logic.
 */
import { Animal, AnimalState, LifeStage } from './entities.js';
import { WATER, DEEP_WATER } from './world.js';
import { aStar } from './pathfinding.js';
import { SEX_MALE, SEX_FEMALE, SEX_HERMAPHRODITE, SEX_ASEXUAL, REPRO_SEXUAL, REPRO_HERMAPHRODITE } from './config.js';
import { S_FRUIT, S_ADULT, S_ADULT_SPROUT, S_NONE, P_NONE } from './flora.js';
import { buildDecisionIntervals } from './animalSpecies.js';

// Decision interval per species (ticks between full AI evaluations)
const DECISION_INTERVALS = buildDecisionIntervals();

/**
 * Process one tick for an animal: decide action, execute it.
 */
export function decideAndAct(animal, world, spatialHash) {
  if (!animal.alive) return;

  animal.tickNeeds(world.hungerMultiplier, world.thirstMultiplier);

  // Die of old age, zero energy, or max hunger/thirst
  if (animal.age > animal.maxAge || animal.energy <= 0 ||
      animal.hunger >= animal._config.max_hunger || animal.thirst >= animal._config.max_thirst) {
    animal.alive = false;
    animal.state = AnimalState.DEAD;
    animal._deathTick = world.clock.tick;
    return;
  }

  // Ongoing states always process
  if (animal.state === AnimalState.SLEEPING) { _doSleep(animal); return; }
  if (animal.state === AnimalState.EATING)   { _doEat(animal, world); return; }
  if (animal.state === AnimalState.DRINKING) { _doDrink(animal, world); return; }

  // Compute effective vision based on day/night and nocturnal trait
  const isNight = world.clock.isNight;
  const nocturnal = animal._config.nocturnal;
  const vision = nocturnal
    ? (isNight ? animal.visionRange : Math.floor(animal.visionRange * 0.8))
    : (isNight ? Math.floor(animal.visionRange * 0.65) : animal.visionRange);

  // Stagger: between decision ticks, just continue current action
  const interval = DECISION_INTERVALS[animal.species] || 2;
  if (animal.id % interval !== world.clock.tick % interval) {
    // Continue following path or stay idle
    if (animal.path.length && animal.pathIndex < animal.path.length) {
      _followPath(animal, world);
    } else {
      animal.applyEnergyCost('IDLE');
    }
    return;
  }

  // --- Opportunistic: drink if adjacent to water and even slightly thirsty ---
  if (animal.thirst > 25 && world.isWaterAdjacent(animal.x, animal.y)) {
    animal.state = AnimalState.DRINKING;
    animal.applyEnergyCost('DRINK');
    return;
  }

  // --- Opportunistic: eat if standing on food and even slightly hungry ---
  if (animal.hunger > 20 && (animal.diet === 'HERBIVORE' || animal.diet === 'OMNIVORE')) {
    const idx = world.idx(animal.x, animal.y);
    if (world.plantStage[idx] === S_FRUIT) {
      // Eat fruit — consume entirely (tile becomes empty)
      world.plantType[idx] = P_NONE;
      world.plantStage[idx] = S_NONE;
      world.plantAge[idx] = 0;
      world.activePlantTiles.delete(idx);
      animal.state = AnimalState.EATING;
      animal.applyEnergyCost('EAT');
      animal.hunger = Math.max(0, animal.hunger - 55);
      animal.energy = Math.min(animal.maxEnergy, animal.energy + 8);
      world.plantChanges.push([animal.x, animal.y, P_NONE, S_NONE]);
      return;
    }
    if (animal.hunger > 35 && world.plantType[idx] > 0 && world.plantStage[idx] >= S_ADULT_SPROUT) {
      world.plantStage[idx] = Math.max(1, world.plantStage[idx] - 1);
      animal.state = AnimalState.EATING;
      animal.hunger = Math.max(0, animal.hunger - 35);
      animal.energy = Math.min(animal.maxEnergy, animal.energy + 4);
      world.plantChanges.push([animal.x, animal.y, world.plantType[idx], world.plantStage[idx]]);
      return;
    }
  }

  // --- Priority-based decision ---

  // 1. Critical thirst → seek water
  if (animal.thirst > 55) {
    _seekWater(animal, world, vision);
    return;
  }

  // 2. Flee from predators (herbivores and omnivores from stronger predators)
  if (animal.diet === 'HERBIVORE' || animal.diet === 'OMNIVORE') {
    const threat = _findNearestThreat(animal, spatialHash, vision);
    if (threat) { _fleeFrom(animal, threat, world); return; }
  }

  // 3. Critical hunger → seek food
  if (animal.hunger > 45) {
    if (animal.diet === 'HERBIVORE') {
      _seekPlantFood(animal, world, vision);
    } else if (animal.diet === 'OMNIVORE') {
      _seekOmnivoreFood(animal, world, spatialHash, vision);
    } else {
      _seekPrey(animal, world, spatialHash, vision);
    }
    return;
  }

  // 4. Low energy → sleep
  if (animal.energy < 20) {
    animal.state = AnimalState.SLEEPING;
    return;
  }

  // 5. Moderate hunger — proactively seek food
  if (animal.hunger > 30) {
    if (animal.diet === 'HERBIVORE') {
      _seekPlantFood(animal, world, vision);
    } else if (animal.diet === 'OMNIVORE') {
      _seekOmnivoreFood(animal, world, spatialHash, vision);
    } else {
      _seekPrey(animal, world, spatialHash, vision);
    }
    return;
  }

  // 6. Moderate thirst — proactively seek water
  if (animal.thirst > 35) {
    _seekWater(animal, world, vision);
    return;
  }

  // 7. Mating opportunity
  if (animal.lifeStage === LifeStage.ADULT && animal.mateCooldown <= 0 && animal.energy > 50) {
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
  animal.hunger = Math.max(0, animal.hunger - 45);
  animal.energy = Math.min(animal.maxEnergy, animal.energy + 5);
  animal.applyEnergyCost('EAT');
  animal.state = AnimalState.IDLE;
}

function _doDrink(animal /*, world */) {
  animal.thirst = Math.max(0, animal.thirst - 55);
  animal.applyEnergyCost('DRINK');
  animal.state = AnimalState.IDLE;
}

// ---- Seek behaviors ----

// Max ticks before a cached path is considered stale
const PATH_CACHE_TTL = 15;

function _hasValidPath(animal, tick) {
  return animal.path.length > 0 &&
    animal.pathIndex < animal.path.length &&
    (tick - animal._pathTick) < PATH_CACHE_TTL;
}

function _setPath(animal, path, tick) {
  animal.path = path;
  animal.pathIndex = 0;
  animal._pathTick = tick;
}

function _seekWater(animal, world, vision) {
  // Already adjacent? Drink immediately
  if (world.isWaterAdjacent(animal.x, animal.y)) {
    animal.state = AnimalState.DRINKING;
    animal.applyEnergyCost('DRINK');
    return;
  }

  // Already following a path? Continue if still fresh
  if (_hasValidPath(animal, world.clock.tick)) {
    _followPath(animal, world);
    return;
  }

  // Search for nearest water — expand range when desperate
  const desperate = animal.thirst > 75;
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
    _setPath(animal, aStar(animal.x, animal.y, best[0], best[1], world, pathLimit), world.clock.tick);
  }

  if (animal.path.length) {
    _followPath(animal, world);
  } else {
    // Wander toward center of map (likely has water near islands)
    _randomWalk(animal, world);
  }
}

function _seekPlantFood(animal, world, vision) {
  const idx = world.idx(animal.x, animal.y);

  // Eat fruit on current tile (best food — consumes tile entirely)
  if (world.plantStage[idx] === S_FRUIT) {
    world.plantType[idx] = P_NONE;
    world.plantStage[idx] = S_NONE;
    world.plantAge[idx] = 0;
    world.activePlantTiles.delete(idx);
    animal.state = AnimalState.EATING;
    animal.applyEnergyCost('EAT');
    animal.hunger = Math.max(0, animal.hunger - 55);
    animal.energy = Math.min(animal.maxEnergy, animal.energy + 8);
    world.plantChanges.push([animal.x, animal.y, P_NONE, S_NONE]);
    return;
  }

  // Eat adult sprout or adult plant on current tile (degrade stage)
  if (world.plantType[idx] > 0 && world.plantStage[idx] >= S_ADULT_SPROUT) {
    world.plantStage[idx] = Math.max(1, world.plantStage[idx] - 1);
    animal.state = AnimalState.EATING;
    animal.hunger = Math.max(0, animal.hunger - 35);
    animal.energy = Math.min(animal.maxEnergy, animal.energy + 4);
    world.plantChanges.push([animal.x, animal.y, world.plantType[idx], world.plantStage[idx]]);
    return;
  }

  // Already following food path? Continue if fresh
  if (_hasValidPath(animal, world.clock.tick)) {
    _followPath(animal, world);
    return;
  }

  // Spiral search: check nearest tiles first, early-exit on fruit found
  const r = vision;
  const maxR = animal.hunger > 65 ? Math.min(vision * 3, 25) : r;
  let bestFruit = null, bestPlant = null;

  for (let ring = 1; ring <= maxR; ring++) {
    // Scan the perimeter of this ring (Manhattan distance = ring)
    for (let dx = -ring; dx <= ring; dx++) {
      const absdy = ring - Math.abs(dx);
      const dys = absdy === 0 ? [0] : [-absdy, absdy];
      for (const dy of dys) {
        const nx = animal.x + dx, ny = animal.y + dy;
        if (!world.isInBounds(nx, ny)) continue;
        const ni = world.idx(nx, ny);

        if (world.plantStage[ni] === S_FRUIT) {
          bestFruit = [nx, ny];
          break; // Fruit found at this ring — use it
        } else if (!bestPlant && world.plantType[ni] > 0 && world.plantStage[ni] >= S_ADULT_SPROUT) {
          bestPlant = [nx, ny];
        }
      }
      if (bestFruit) break;
    }
    // Early exit: found fruit (best option) — stop expanding
    if (bestFruit) break;
    // If we found a plant within vision range, stop expanding beyond vision (unless desperate)
    if (bestPlant && ring >= r) break;
  }

  const target = bestFruit || bestPlant;
  if (target) {
    const pathLimit = target === bestFruit ? 40 : 60;
    _setPath(animal, aStar(animal.x, animal.y, target[0], target[1], world, pathLimit), world.clock.tick);
    if (animal.path.length) { _followPath(animal, world); return; }
  }

  _randomWalk(animal, world);
}

function _seekPrey(animal, world, spatialHash, vision) {
  // Carnivores can also eat fruit opportunistically when very hungry and no prey
  const nearby = spatialHash.queryRadius(animal.x, animal.y, vision);
  const prey = nearby.filter(e => (e.diet === 'HERBIVORE' || e.diet === 'OMNIVORE') && e.alive && e.id !== animal.id);

  if (prey.length) {
    const target = prey.reduce((a, b) =>
      (Math.abs(a.x - animal.x) + Math.abs(a.y - animal.y)) <=
      (Math.abs(b.x - animal.x) + Math.abs(b.y - animal.y)) ? a : b
    );
    const dist = Math.abs(target.x - animal.x) + Math.abs(target.y - animal.y);

    if (dist <= 1) {
      _attack(animal, target, world);
    } else {
      _setPath(animal, aStar(animal.x, animal.y, target.x, target.y, world, 30), world.clock.tick);
      animal.state = AnimalState.RUNNING;
      for (let s = 0; s < animal.speed; s++) {
        _followPath(animal, world);
      }
      animal.applyEnergyCost('RUN');
    }
    return;
  }

  // No live prey — try scavenging recent corpses
  if (_tryScavenge(animal, world, spatialHash, vision)) return;

  // No prey — carnivores eat fruit as fallback when desperate
  if (animal.hunger > 50) {
    const idx = world.idx(animal.x, animal.y);
    if (world.plantStage[idx] === S_FRUIT) {
      world.plantType[idx] = P_NONE;
      world.plantStage[idx] = S_NONE;
      world.plantAge[idx] = 0;
      world.activePlantTiles.delete(idx);
      animal.state = AnimalState.EATING;
      animal.applyEnergyCost('EAT');
      animal.hunger = Math.max(0, animal.hunger - 35);
      animal.energy = Math.min(animal.maxEnergy, animal.energy + 5);
      world.plantChanges.push([animal.x, animal.y, P_NONE, S_NONE]);
      return;
    }
    // Seek nearby fruit when desperate
    _seekPlantFood(animal, world, vision);
    return;
  }

  _randomWalk(animal, world);
}

/**
 * Omnivore food-seeking: prefer plants first, hunt small prey when hungrier.
 */
function _seekOmnivoreFood(animal, world, spatialHash, vision) {
  // Try eating plant on current tile first
  const idx = world.idx(animal.x, animal.y);
  if (world.plantStage[idx] === S_FRUIT) {
    world.plantType[idx] = P_NONE;
    world.plantStage[idx] = S_NONE;
    world.plantAge[idx] = 0;
    world.activePlantTiles.delete(idx);
    animal.state = AnimalState.EATING;
    animal.applyEnergyCost('EAT');
    animal.hunger = Math.max(0, animal.hunger - 55);
    animal.energy = Math.min(animal.maxEnergy, animal.energy + 8);
    world.plantChanges.push([animal.x, animal.y, P_NONE, S_NONE]);
    return;
  }
  if (world.plantType[idx] > 0 && world.plantStage[idx] >= S_ADULT_SPROUT) {
    world.plantStage[idx] = Math.max(1, world.plantStage[idx] - 1);
    animal.state = AnimalState.EATING;
    animal.hunger = Math.max(0, animal.hunger - 35);
    animal.energy = Math.min(animal.maxEnergy, animal.energy + 4);
    world.plantChanges.push([animal.x, animal.y, world.plantType[idx], world.plantStage[idx]]);
    return;
  }

  // When very hungry, try hunting small prey (weaker than self)
  if (animal.hunger > 55) {
    const nearby = spatialHash.queryRadius(animal.x, animal.y, vision);
    const prey = nearby.filter(e =>
      e.alive && e.id !== animal.id && e.diet === 'HERBIVORE' &&
      e._config.defense < animal._config.attack_power
    );
    if (prey.length) {
      const target = prey.reduce((a, b) =>
        (Math.abs(a.x - animal.x) + Math.abs(a.y - animal.y)) <=
        (Math.abs(b.x - animal.x) + Math.abs(b.y - animal.y)) ? a : b
      );
      const dist = Math.abs(target.x - animal.x) + Math.abs(target.y - animal.y);
      if (dist <= 1) {
        _attack(animal, target, world);
      } else {
        _setPath(animal, aStar(animal.x, animal.y, target.x, target.y, world, 30), world.clock.tick);
        animal.state = AnimalState.RUNNING;
        for (let s = 0; s < animal.speed; s++) {
          _followPath(animal, world);
        }
        animal.applyEnergyCost('RUN');
      }
      return;
    }

    // No live prey — try scavenging recent corpses
    if (_tryScavenge(animal, world, spatialHash, vision)) return;
  }

  // Fallback: seek plants in vision range
  _seekPlantFood(animal, world, vision);
}

// ---- Scavenging ----

function _tryScavenge(animal, world, spatialHash, vision) {
  const tick = world.clock.tick;
  const nearby = spatialHash.queryRadius(animal.x, animal.y, vision);
  const corpses = nearby.filter(e =>
    !e.alive && !e.consumed && e._deathTick != null && (tick - e._deathTick) < 100
  );
  if (!corpses.length) return false;

  const target = corpses.reduce((a, b) =>
    (Math.abs(a.x - animal.x) + Math.abs(a.y - animal.y)) <=
    (Math.abs(b.x - animal.x) + Math.abs(b.y - animal.y)) ? a : b
  );
  const dist = Math.abs(target.x - animal.x) + Math.abs(target.y - animal.y);

  if (dist <= 1) {
    // Consume corpse
    animal.hunger = Math.max(0, animal.hunger - 60);
    animal.energy = Math.min(animal.maxEnergy, animal.energy + 15);
    animal.state = AnimalState.EATING;
    animal.applyEnergyCost('EAT');
    target.consumed = true;
    return true;
  }

  // Walk toward corpse
  _setPath(animal, aStar(animal.x, animal.y, target.x, target.y, world, 30), world.clock.tick);
  if (animal.path.length) {
    _followPath(animal, world);
    return true;
  }
  return false;
}

// ---- Combat ----

function _attack(attacker, defender, world) {
  attacker.state = AnimalState.ATTACKING;
  attacker.applyEnergyCost('ATTACK');
  attacker.attackCooldown = 3;

  let damage = attacker._config.attack_power - defender._config.defense * 0.5;
  if (damage < 1) damage = 1;
  defender.energy -= damage;

  if (defender.energy <= 0) {
    defender.alive = false;
    defender.state = AnimalState.DEAD;
    defender._deathTick = world.clock.tick;
    attacker.hunger = Math.max(0, attacker.hunger - 80);
    attacker.energy = Math.min(attacker.maxEnergy, attacker.energy + 25);
    attacker.state = AnimalState.EATING;
  }
}

// ---- Threat detection & fleeing ----

function _findNearestThreat(animal, spatialHash, vision) {
  const nearby = spatialHash.queryRadius(animal.x, animal.y, vision);
  const threats = nearby.filter(e => {
    if (!e.alive || e.id === animal.id) return false;
    if (e.diet === 'CARNIVORE') return true;
    // Omnivores only fear stronger omnivores/carnivores
    if (animal.diet === 'OMNIVORE' && e.diet === 'OMNIVORE') {
      return e._config.attack_power > animal._config.attack_power + 2;
    }
    return false;
  });
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
  // Use speed for flee burst (fast animals flee faster)
  for (let burst = 0; burst < animal.speed; burst++) {
    const cx = animal.x - threat.x;
    const cy = animal.y - threat.y;
    const cd = Math.max(1, Math.abs(cx) + Math.abs(cy));
    let moved = false;
    for (let step = 3; step >= 1; step--) {
      let fx = animal.x + Math.round(cx / cd * step);
      let fy = animal.y + Math.round(cy / cd * step);
      fx = Math.max(0, Math.min(world.width - 1, fx));
      fy = Math.max(0, Math.min(world.height - 1, fy));
      if (world.isWalkable(fx, fy) && !world.isTileOccupied(fx, fy)) {
        _moveAnimal(animal, fx, fy, world);
        moved = true;
        break;
      }
    }
    if (!moved) break;
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
    if (e.lifeStage !== LifeStage.ADULT || e.mateCooldown > 0 || e.energy <= 50) return false;
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
  animal.mateCooldown = animal._config.mate_cooldown || 60;
  mate.mateCooldown = mate._config.mate_cooldown || 60;

  // Enforce population cap
  const maxPop = animal._config.max_population;
  if (maxPop) {
    let count = 0;
    for (const a of world.animals) {
      if (a.alive && a.species === animal.species) count++;
    }
    if (count >= maxPop) return;
  }

  // Spawn baby nearby
  let bx = animal.x, by = animal.y;
  let babyPlaced = false;
  for (const [ddx, ddy] of [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const nx = animal.x + ddx, ny = animal.y + ddy;
    if (world.isWalkable(nx, ny) && !world.isTileOccupied(nx, ny)) {
      bx = nx; by = ny; babyPlaced = true; break;
    }
  }
  if (!babyPlaced) return; // No free tile for baby

  const speciesConfig = world.config.animal_species[animal.species];
  const baby = new Animal(world.nextId(), bx, by, animal.species, speciesConfig);
  baby.energy = speciesConfig.max_energy * 0.4;
  baby.age = 0;
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
  if (world.isWalkable(nx, ny) && !world.isTileOccupied(nx, ny)) {
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
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

  // Home bias: when far from home, prefer direction toward home (60% chance)
  const homeDist = Math.abs(animal.x - animal.homeX) + Math.abs(animal.y - animal.homeY);
  if (homeDist > 15 && Math.random() < 0.6) {
    const hdx = Math.sign(animal.homeX - animal.x);
    const hdy = Math.sign(animal.homeY - animal.y);
    // Sort: preferred home direction first
    dirs.sort((a, b) => {
      const sa = (a[0] === hdx ? -1 : 0) + (a[1] === hdy ? -1 : 0);
      const sb = (b[0] === hdx ? -1 : 0) + (b[1] === hdy ? -1 : 0);
      return sa - sb;
    });
  } else {
    // Fisher-Yates shuffle
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }
  }

  for (const [dx, dy] of dirs) {
    const nx = animal.x + dx, ny = animal.y + dy;
    if (world.isWalkable(nx, ny) && !world.isTileOccupied(nx, ny)) {
      _moveAnimal(animal, nx, ny, world);
      animal.state = AnimalState.WALKING;
      animal.applyEnergyCost('WALK');
      return;
    }
  }
  animal.state = AnimalState.IDLE;
  animal.applyEnergyCost('IDLE');
}
