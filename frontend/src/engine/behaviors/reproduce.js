import { REPRO_SEXUAL, SEX_FEMALE, SEX_MALE } from '../config.js';
import { BASE_POP_TOTAL } from '../animalSpecies.js';
import { Animal, AnimalState, LifeStage, ReproductionType } from '../entities.js';
import { benchmarkEnd, benchmarkStart } from '../benchmarkProfiler.js';
import { _decisionThresholds } from './utils.js';

export function _findMate(animal, spatialHash, searchRadius) {
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
      if (entity.pregnant) continue;
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

export function _doMate(animal, mate, world) {
  animal.state = AnimalState.MATING;
  mate.state = AnimalState.MATING;
  animal.applyEnergyCost('MATE');
  mate.applyEnergyCost('MATE');
  animal.mateCooldown = animal._config.mate_cooldown || 60;
  mate.mateCooldown = mate._config.mate_cooldown || 60;

  animal.logAction(world.clock.tick, 'MATED', { partner: mate.species, partnerId: mate.id });
  mate.logAction(world.clock.tick, 'MATED', { partner: animal.species, partnerId: animal.id });

  if (_checkPopulationCap(animal, world)) return;

  const reproType = animal._config.reproduction_type || 'VIVIPAROUS';
  const clutchRange = animal._config.clutch_size || [1, 1];
  const litterSize = clutchRange[0] + Math.floor(Math.random() * (clutchRange[1] - clutchRange[0] + 1));

  if (reproType === ReproductionType.VIVIPAROUS) {
    const female = animal.sex === SEX_FEMALE ? animal : mate;
    female.pregnant = true;
    female.gestationTimer = animal._config.gestation_period || 30;
    female._gestationLitterSize = litterSize;
    female.logAction(world.clock.tick, 'PREGNANT', { litterSize, gestationTicks: female.gestationTimer });
  } else {
    _layEggs(animal, mate, world, litterSize);
  }
}

function _checkPopulationCap(animal, world) {
  const baseMax = animal._config.max_population;
  if (!baseMax) return false;
  const globalMax = world.config.max_animal_population;
  const effectiveMax = globalMax > 0
    ? Math.max(2, Math.round(baseMax * globalMax / BASE_POP_TOTAL))
    : baseMax;
  const count = world.getAliveSpeciesCount(animal.species);
  if (count >= effectiveMax) return true;
  const ratio = count / effectiveMax;
  if (ratio > 0.6) {
    const chance = 1 - ((ratio - 0.6) / 0.4);
    if (Math.random() > chance) return true;
  }
  return false;
}

function _checkPopulationCapWithEggs(animal, world) {
  const baseMax = animal._config.max_population;
  if (!baseMax) return false;
  const globalMax = world.config.max_animal_population;
  const effectiveMax = globalMax > 0
    ? Math.max(2, Math.round(baseMax * globalMax / BASE_POP_TOTAL))
    : baseMax;
  const count = world.getAliveSpeciesCount(animal.species);
  if (count >= effectiveMax) return true;
  const ratio = count / effectiveMax;
  if (ratio > 0.5) {
    const chance = 1 - ((ratio - 0.5) / 0.5);
    if (Math.random() > chance) return true;
  }
  return false;
}

function _layEggs(animal, mate, world, clutchSize) {
  const baseTx = animal.x | 0;
  const baseTy = animal.y | 0;
  const speciesConfig = world.config.animal_species[animal.species];
  const landWalkable = new Set([...animal._walkableSet].filter(t => t !== 0 && t !== 6));
  if (landWalkable.size === 0) return;

  const offsets = [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  let placed = 0;
  for (const [ddx, ddy] of offsets) {
    if (placed >= clutchSize) break;
    if (_checkPopulationCapWithEggs(animal, world)) break;
    const ntx = baseTx + ddx;
    const nty = baseTy + ddy;
    if (world.isWalkableFor(ntx, nty, landWalkable)) {
      const bx = ntx + 0.5;
      const by = nty + 0.5;
      const egg = new Animal(world.nextId(), bx, by, animal.species, speciesConfig);
      egg._isEggStage = true;
      egg._incubationPeriod = speciesConfig.incubation_period || 30;
      egg._eggMaxHp = speciesConfig.egg_hp || 10;
      egg.hp = egg._eggMaxHp;
      egg.energy = speciesConfig.max_energy * 0.4;
      egg.age = 0;
      egg.parentA = animal.id;
      egg.parentB = mate.id;
      egg._birthTick = world.clock.tick;
      egg.logAction(world.clock.tick, 'LAID', { parentA: animal.id, parentB: mate.id });
      world.animals.push(egg);
      placed++;
    }
  }
  if (placed > 0) {
    animal.logAction(world.clock.tick, 'LAID_EGGS', { count: placed });
    mate.logAction(world.clock.tick, 'LAID_EGGS', { count: placed });
  }
}

export function giveBirth(mother, world) {
  if (!mother.pregnant || mother.gestationTimer > 0) return;
  const litterSize = mother._gestationLitterSize || 1;
  const speciesConfig = world.config.animal_species[mother.species];
  const baseTx = mother.x | 0;
  const baseTy = mother.y | 0;
  const offsets = [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  let born = 0;
  for (const [ddx, ddy] of offsets) {
    if (born >= litterSize) break;
    if (_checkPopulationCap(mother, world)) break;
    const ntx = baseTx + ddx;
    const nty = baseTy + ddy;
    if (world.isWalkableFor(ntx, nty, mother._walkableSet) && !world.isTileOccupied(ntx, nty)) {
      const bx = ntx + 0.5;
      const by = nty + 0.5;
      const baby = new Animal(world.nextId(), bx, by, mother.species, speciesConfig);
      baby.energy = speciesConfig.max_energy * 0.4;
      baby.age = 0;
      baby._birthTick = world.clock.tick;
      baby.logAction(world.clock.tick, 'BORN', { parentA: mother.id });
      mother.logAction(world.clock.tick, 'OFFSPRING', { babyId: baby.id, x: bx, y: by });
      world.animals.push(baby);
      world.placeAnimal(bx, by);
      born++;
    }
  }
  mother.pregnant = false;
  mother.gestationTimer = 0;
  mother._gestationLitterSize = 0;
  if (born > 0) {
    mother.logAction(world.clock.tick, 'GAVE_BIRTH', { count: born });
  }
}