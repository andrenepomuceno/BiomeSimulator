import { beforeEach, describe, expect, it, vi } from 'vitest';

const combatMocks = vi.hoisted(() => ({
  findNearestThreat: vi.fn(),
}));

const eatingMocks = vi.hoisted(() => ({
  eatPlantTile: vi.fn(),
}));

const movementMocks = vi.hoisted(() => ({
  computePath: vi.fn(),
  fleeFrom: vi.fn(),
  randomWalk: vi.fn(),
  reusePathIfValid: vi.fn(),
  walkPath: vi.fn(),
}));

const reproduceMocks = vi.hoisted(() => ({
  findMate: vi.fn(),
  doMate: vi.fn(),
  giveBirth: vi.fn(),
}));

const seekMocks = vi.hoisted(() => ({
  seekOmnivoreFood: vi.fn(),
  seekPlantFood: vi.fn(),
  seekPrey: vi.fn(),
  seekWater: vi.fn(),
}));

const stateMocks = vi.hoisted(() => ({
  doDrink: vi.fn(),
  doEat: vi.fn(),
  doSleep: vi.fn(),
}));

const utilsMocks = vi.hoisted(() => ({
  calculateEffectiveSleepThreshold: vi.fn(() => 20),
  canEatPlant: vi.fn(() => true),
  decisionThresholds: vi.fn(animal => animal._config.decision_thresholds || {}),
  idleRecover: vi.fn(),
  isEdibleStage: vi.fn(() => true),
}));

vi.mock('../behaviors/combat.js', () => ({
  _findNearestThreat: combatMocks.findNearestThreat,
}));

vi.mock('../behaviors/eating.js', () => ({
  _eatPlantTile: eatingMocks.eatPlantTile,
}));

vi.mock('../behaviors/movement.js', () => ({
  _computePath: movementMocks.computePath,
  _fleeFrom: movementMocks.fleeFrom,
  _randomWalk: movementMocks.randomWalk,
  _reusePathIfValid: movementMocks.reusePathIfValid,
  _walkPath: movementMocks.walkPath,
}));

vi.mock('../behaviors/reproduce.js', () => ({
  _findMate: reproduceMocks.findMate,
  _doMate: reproduceMocks.doMate,
  giveBirth: reproduceMocks.giveBirth,
}));

vi.mock('../behaviors/seek.js', () => ({
  _seekOmnivoreFood: seekMocks.seekOmnivoreFood,
  _seekPlantFood: seekMocks.seekPlantFood,
  _seekPrey: seekMocks.seekPrey,
  _seekWater: seekMocks.seekWater,
}));

vi.mock('../behaviors/states.js', () => ({
  _doDrink: stateMocks.doDrink,
  _doEat: stateMocks.doEat,
  _doSleep: stateMocks.doSleep,
}));

vi.mock('../behaviors/utils.js', () => ({
  DECISION_INTERVALS: { TEST: 2 },
  _calculateEffectiveSleepThreshold: utilsMocks.calculateEffectiveSleepThreshold,
  _canEatPlant: utilsMocks.canEatPlant,
  _decisionThresholds: utilsMocks.decisionThresholds,
  _idleRecover: utilsMocks.idleRecover,
  _isEdibleStage: utilsMocks.isEdibleStage,
}));

import { createAnimalConfig } from '../../test/testUtils.js';
import { Animal, AnimalState } from '../entities.js';
import { decideAndAct } from '../behaviors/index.js';
import { WATER } from '../world.js';

function createWorld(overrides = {}) {
  const width = overrides.width ?? 5;
  const height = overrides.height ?? 5;
  const terrain = overrides.terrain ?? new Uint8Array(width * height).fill(1);
  const plantType = overrides.plantType ?? new Uint8Array(width * height);
  const plantStage = overrides.plantStage ?? new Uint8Array(width * height);
  const occupiedTiles = overrides.occupiedTiles ?? new Set();

  return {
    width,
    height,
    terrain,
    plantType,
    plantStage,
    hungerMultiplier: 1,
    thirstMultiplier: 1,
    config: {
      animal_global_vision_multiplier: 1,
      night_vision_reduction_factor: 0.65,
      nocturnal_day_vision_factor: 0.8,
      ...overrides.config,
    },
    clock: {
      tick: overrides.tick ?? 1,
      isNight: overrides.isNight ?? false,
    },
    _benchmarkCollector: null,
    idx(x, y) {
      return (y | 0) * width + (x | 0);
    },
    isWaterAdjacent: overrides.isWaterAdjacent ?? (() => false),
    isTileOccupied: overrides.isTileOccupied ?? ((x, y) => occupiedTiles.has(`${x | 0},${y | 0}`)),
    isTileBlocked: overrides.isTileBlocked ?? ((x, y) => occupiedTiles.has(`${x | 0},${y | 0}`)),
    placeAnimal: overrides.placeAnimal ?? vi.fn(),
    placeEgg: overrides.placeEgg ?? vi.fn(),
    vacateEgg: overrides.vacateEgg ?? vi.fn(),
    markEntityDead: overrides.markEntityDead ?? function markEntityDead(entity) {
      entity.alive = false;
      entity.state = AnimalState.DEAD;
      entity._deathTick = this.clock.tick;
      return true;
    },
  };
}

function createAnimal(overrides = {}, configOverrides = {}) {
  const animal = new Animal(1, 2.5, 2.5, 'TEST', createAnimalConfig({
    max_age: 50,
    max_energy: 100,
    max_hp: 20,
    speed: 1,
    diet: 'HERBIVORE',
    vision_range: 6,
    energy_costs: { IDLE: 2 },
    initial_state: {
      energy_fraction: 1,
      hunger_range: [0, 0],
      thirst_range: [0, 0],
    },
    decision_thresholds: {
      critical_thirst: 55,
      critical_hunger: 45,
      moderate_hunger: 30,
      moderate_thirst: 35,
      mate_energy_min: 50,
      ...configOverrides.decision_thresholds,
    },
    ...configOverrides,
  }));

  Object.assign(animal, overrides);
  return animal;
}

describe('decideAndAct', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    combatMocks.findNearestThreat.mockReturnValue(null);
    movementMocks.reusePathIfValid.mockReturnValue(false);
    utilsMocks.calculateEffectiveSleepThreshold.mockReturnValue(20);
    utilsMocks.canEatPlant.mockReturnValue(true);
    utilsMocks.isEdibleStage.mockReturnValue(true);
  });

  it('continues sleeping before evaluating higher-priority needs', () => {
    const animal = createAnimal({ state: AnimalState.SLEEPING, thirst: 80, hunger: 80 });
    const world = createWorld({ isWaterAdjacent: () => true });

    decideAndAct(animal, world, {});

    expect(stateMocks.doSleep).toHaveBeenCalledWith(animal, world);
    expect(seekMocks.seekWater).not.toHaveBeenCalled();
    expect(seekMocks.seekPlantFood).not.toHaveBeenCalled();
  });

  it('puts exhausted animals to sleep on land immediately', () => {
    const animal = createAnimal({ energy: 0 });
    const world = createWorld();

    decideAndAct(animal, world, {});

    expect(animal.state).toBe(AnimalState.SLEEPING);
    expect(stateMocks.doSleep).toHaveBeenCalledWith(animal, world);
  });

  it('marks animals dead when hp is depleted after needs update', () => {
    const animal = createAnimal({ hp: 0, age: 10 });
    const world = createWorld({ tick: 7 });

    decideAndAct(animal, world, {});

    expect(animal.alive).toBe(false);
    expect(animal.state).toBe(AnimalState.DEAD);
    expect(animal._deathTick).toBe(7);
    expect(seekMocks.seekWater).not.toHaveBeenCalled();
  });

  it('keeps egg-stage animals idle after ticking needs', () => {
    const animal = createAnimal({ _isEggStage: true, _incubationPeriod: 5, age: 1, state: AnimalState.ATTACKING });
    const world = createWorld();

    decideAndAct(animal, world, {});

    expect(animal.age).toBe(2);
    expect(animal.state).toBe(AnimalState.IDLE);
    expect(seekMocks.seekWater).not.toHaveBeenCalled();
  });

  it('prioritizes critical thirst before critical hunger', () => {
    const animal = createAnimal({ thirst: 90, hunger: 90, diet: 'OMNIVORE' });
    const world = createWorld();

    decideAndAct(animal, world, {});

    expect(seekMocks.seekWater).toHaveBeenCalledWith(animal, world, animal.visionRange);
    expect(seekMocks.seekPlantFood).not.toHaveBeenCalled();
    expect(seekMocks.seekOmnivoreFood).not.toHaveBeenCalled();
  });

  it('flees from nearby threats before seeking food', () => {
    const animal = createAnimal({ thirst: 0, hunger: 80, diet: 'OMNIVORE' });
    const threat = { id: 99, x: 3.5, y: 2.5 };
    const world = createWorld();
    combatMocks.findNearestThreat.mockReturnValue(threat);

    decideAndAct(animal, world, {});

    expect(combatMocks.findNearestThreat).toHaveBeenCalledWith(animal, world, {}, animal.visionRange);
    expect(movementMocks.fleeFrom).toHaveBeenCalledWith(animal, threat, world);
    expect(seekMocks.seekOmnivoreFood).not.toHaveBeenCalled();
  });

  it('reuses existing paths on staggered ticks instead of evaluating decisions', () => {
    const animal = createAnimal({ path: [[3, 2]], pathIndex: 0 });
    const world = createWorld({ tick: 0 });
    movementMocks.reusePathIfValid.mockReturnValue(true);

    decideAndAct(animal, world, {});

    expect(movementMocks.reusePathIfValid).toHaveBeenCalledWith(animal, world, 'stagger');
    expect(utilsMocks.idleRecover).not.toHaveBeenCalled();
    expect(seekMocks.seekWater).not.toHaveBeenCalled();
  });

  it('falls back to idle recovery on staggered ticks without a reusable path', () => {
    const animal = createAnimal({ energy: 10 });
    const world = createWorld({ tick: 0 });

    decideAndAct(animal, world, {});

    expect(animal.energy).toBe(8);
    expect(utilsMocks.idleRecover).toHaveBeenCalledWith(animal);
    expect(seekMocks.seekWater).not.toHaveBeenCalled();
  });

  it('wakes sleeping animals that drift onto water instead of continuing sleep', () => {
    const terrain = new Uint8Array(25).fill(1);
    terrain[12] = WATER;
    const animal = createAnimal({ state: AnimalState.SLEEPING });
    const world = createWorld({ terrain });

    decideAndAct(animal, world, {});

    expect(stateMocks.doSleep).not.toHaveBeenCalled();
    expect(animal.state).toBe(AnimalState.IDLE);
  });
});