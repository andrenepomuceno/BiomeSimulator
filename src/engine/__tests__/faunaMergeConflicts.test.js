import { describe, expect, it } from 'vitest';
import { AnimalState, LifeStage } from '../entities.js';
import { SimulationEngine } from '../simulation.js';

function createAnimal(overrides) {
  return {
    id: overrides.id,
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    state: overrides.state ?? AnimalState.IDLE,
    energy: overrides.energy ?? 10,
    hp: overrides.hp ?? 10,
    hunger: overrides.hunger ?? 10,
    thirst: overrides.thirst ?? 0,
    age: overrides.age ?? 0,
    alive: overrides.alive ?? true,
    lifeStage: overrides.lifeStage ?? LifeStage.ADULT,
    mateCooldown: 0,
    attackCooldown: 0,
    path: [],
    pathIndex: 0,
    _pathTick: 0,
    _deathTick: undefined,
    consumed: false,
    targetX: undefined,
    targetY: undefined,
    pregnant: false,
    gestationTimer: 0,
    _gestationLitterSize: 0,
    _isEggStage: false,
    _incubationPeriod: 0,
    _eggMaxHp: 0,
    parentA: null,
    parentB: null,
    direction: 0,
    actionHistory: [],
    _dirty: false,
    ...overrides,
  };
}

function createDelta(overrides) {
  return {
    id: overrides.id,
    x: overrides.x,
    y: overrides.y,
    state: overrides.state,
    energy: overrides.energy,
    hp: overrides.hp,
    hunger: overrides.hunger,
    thirst: overrides.thirst,
    age: overrides.age,
    alive: overrides.alive,
    mateCooldown: overrides.mateCooldown ?? 0,
    attackCooldown: overrides.attackCooldown ?? 0,
    path: overrides.path ?? [],
    pathIndex: overrides.pathIndex ?? 0,
    _pathTick: overrides._pathTick ?? 0,
    _deathTick: overrides._deathTick,
    consumed: overrides.consumed ?? false,
    targetX: overrides.targetX,
    targetY: overrides.targetY,
    pregnant: overrides.pregnant ?? false,
    gestationTimer: overrides.gestationTimer ?? 0,
    _gestationLitterSize: overrides._gestationLitterSize ?? 0,
    _isEggStage: overrides._isEggStage ?? false,
    _incubationPeriod: overrides._incubationPeriod ?? 0,
    _eggMaxHp: overrides._eggMaxHp ?? 0,
    parentA: overrides.parentA ?? null,
    parentB: overrides.parentB ?? null,
    direction: overrides.direction ?? 0,
    actionHistory: overrides.actionHistory ?? [],
  };
}

function createEngineWithWorld(animals) {
  const width = 3;
  const height = 3;
  const size = width * height;
  const engine = new SimulationEngine({
    map_width: width,
    map_height: height,
    max_animal_population: 200,
    animal_species: {},
  });

  const world = {
    width,
    height,
    config: {
      max_animal_population: 200,
      animal_species: {},
    },
    clock: { tick: 10 },
    animals,
    animalGrid: new Uint8Array(size),
    eggGrid: new Uint8Array(size),
    plantType: new Uint8Array(size),
    plantStage: new Uint8Array(size),
    plantAge: new Uint16Array(size),
    activePlantTiles: new Set(),
    plantChanges: [],
    placeAnimal() {},
    placeEgg() {},
    isTileBlocked() { return false; },
    getAliveSpeciesCount() { return 0; },
    nextId() { return 9999; },
    _spawnMeatDrops() {},
  };

  engine.world = world;
  engine.spatialHash = { rebuild() {} };
  return { engine, world };
}

describe('applyFaunaResults merge conflicts', () => {
  it('keeps cross-chunk prey dead when another worker returns stale alive delta', () => {
    const predator = createAnimal({ id: 1, x: 0, y: 0, hunger: 90, energy: 20, hp: 30 });
    const prey = createAnimal({ id: 2, x: 1, y: 0, hp: 10, alive: true });
    const { engine } = createEngineWithWorld([predator, prey]);

    const workerResults = [
      {
        deltas: [createDelta({ ...predator, hunger: 10, energy: 45, hp: 40, state: AnimalState.EATING })],
        births: [],
        plantChanges: [],
        plantConsumptionClaims: [],
        deadIds: [2],
      },
      {
        deltas: [createDelta({ ...prey, hp: 10, alive: true, state: AnimalState.IDLE })],
        births: [],
        plantChanges: [],
        plantConsumptionClaims: [],
        deadIds: [],
      },
    ];

    engine.applyFaunaResults(workerResults);

    expect(predator.hunger).toBe(10);
    expect(prey.alive).toBe(false);
    expect(prey.state).toBe(AnimalState.DEAD);
    expect(prey._deathTick).toBe(10);
  });

  it('rolls back losing duplicate plant consumption claims from other chunks', () => {
    const winner = createAnimal({ id: 11, x: 0, y: 1, hunger: 30, energy: 40, hp: 20, state: AnimalState.IDLE });
    const loser = createAnimal({ id: 12, x: 2, y: 1, hunger: 25, energy: 45, hp: 22, state: AnimalState.IDLE });
    const { engine, world } = createEngineWithWorld([winner, loser]);

    const plantIdx = 1 * world.width + 1;
    world.plantType[plantIdx] = 5;
    world.plantStage[plantIdx] = 4;
    world.activePlantTiles.add(plantIdx);

    const workerResults = [
      {
        deltas: [createDelta({ ...winner, hunger: 10, energy: 55, hp: 30, state: AnimalState.EATING })],
        births: [],
        plantChanges: [[1, 1, 0, 0]],
        plantConsumptionClaims: [{ animalId: 11, idx: plantIdx, preHunger: 30, preEnergy: 40, preHp: 20, preState: AnimalState.IDLE }],
        deadIds: [],
      },
      {
        deltas: [createDelta({ ...loser, hunger: 5, energy: 60, hp: 35, state: AnimalState.EATING })],
        births: [],
        plantChanges: [[1, 1, 0, 0]],
        plantConsumptionClaims: [{ animalId: 12, idx: plantIdx, preHunger: 25, preEnergy: 45, preHp: 22, preState: AnimalState.IDLE }],
        deadIds: [],
      },
    ];

    engine.applyFaunaResults(workerResults);

    expect(winner.hunger).toBe(10);
    expect(winner.energy).toBe(55);
    expect(loser.hunger).toBe(25);
    expect(loser.energy).toBe(45);
    expect(loser.hp).toBe(22);
    expect(loser.state).toBe(AnimalState.IDLE);
    expect(world.plantChanges).toEqual([[1, 1, 0, 0]]);
    expect(world.plantType[plantIdx]).toBe(0);
  });
});