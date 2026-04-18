import { beforeEach, describe, expect, it, vi } from 'vitest';

const movementMocks = vi.hoisted(() => ({
  computePath: vi.fn(),
  walkPath: vi.fn(),
}));

vi.mock('../behaviors/movement.js', () => ({
  _computePath: movementMocks.computePath,
  _walkPath: movementMocks.walkPath,
}));

import { createAnimalConfig } from '../../test/testUtils.js';
import { Animal, AnimalState, LifeStage } from '../entities.js';
import { _tryEatEgg, _tryScavenge } from '../behaviors/scavenge.js';

function createAnimal(overrides = {}, configOverrides = {}) {
  const animal = new Animal(1, 2.5, 2.5, 'TEST', createAnimalConfig({
    diet: 'CARNIVORE',
    max_energy: 100,
    max_hp: 20,
    energy_costs: { EAT: 2 },
    initial_state: {
      energy_fraction: 0.5,
      hunger_range: [0, 0],
      thirst_range: [0, 0],
    },
    ...configOverrides,
  }));

  Object.assign(animal, overrides);
  return animal;
}

function createWorld(overrides = {}) {
  return {
    clock: { tick: overrides.tick ?? 50 },
    config: {
      scavenge_decay_ticks: overrides.scavengeDecayTicks ?? 100,
      ...overrides.config,
    },
    _benchmarkCollector: null,
    isWalkableFor: overrides.isWalkableFor ?? (() => true),
    isTileBlocked: overrides.isTileBlocked ?? (() => false),
    vacateEgg: overrides.vacateEgg ?? vi.fn(),
    markEntityDead: overrides.markEntityDead ?? function markEntityDead(entity) {
      entity.alive = false;
      entity.state = AnimalState.DEAD;
      entity._deathTick = this.clock.tick;
      this.vacateEgg(entity.x, entity.y);
      return true;
    },
  };
}

function createSpatialHash(entities) {
  return {
    queryRadius: vi.fn(() => entities),
  };
}

describe('scavenge behaviors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    movementMocks.computePath.mockImplementation(() => {});
  });

  it('consumes the nearest fresh corpse and ignores expired or consumed bodies', () => {
    const animal = createAnimal({ hunger: 90, energy: 40, hp: 10 });
    const world = createWorld({ tick: 120 });
    const expiredCorpse = { id: 2, species: 'DEER', x: 2.5, y: 3.5, alive: false, consumed: false, _deathTick: 20 };
    const consumedCorpse = { id: 3, species: 'GOAT', x: 2.5, y: 3.5, alive: false, consumed: true, _deathTick: 110 };
    const nearestCorpse = { id: 4, species: 'RABBIT', x: 2.5, y: 3.5, alive: false, consumed: false, _deathTick: 110 };
    const fartherCorpse = { id: 5, species: 'FOX', x: 4.5, y: 4.5, alive: false, consumed: false, _deathTick: 115 };
    const spatialHash = createSpatialHash([expiredCorpse, consumedCorpse, fartherCorpse, nearestCorpse]);

    const ate = _tryScavenge(animal, world, spatialHash, 6);

    expect(ate).toBe(true);
    expect(nearestCorpse.consumed).toBe(true);
    expect(fartherCorpse.consumed).toBe(false);
    expect(animal.hunger).toBe(30);
    expect(animal.energy).toBe(53);
    expect(animal.hp).toBe(18);
    expect(animal.state).toBe(AnimalState.EATING);
    expect(movementMocks.computePath).not.toHaveBeenCalled();
  });

  it('computes a path toward a fresh corpse when it is not adjacent', () => {
    const animal = createAnimal();
    const world = createWorld();
    const target = { id: 9, species: 'BOAR', x: 4.5, y: 4.5, alive: false, consumed: false, _deathTick: 40 };
    const spatialHash = createSpatialHash([target]);

    movementMocks.computePath.mockImplementation(currentAnimal => {
      currentAnimal.path = [[4, 4]];
      currentAnimal.pathIndex = 0;
    });

    const ate = _tryScavenge(animal, world, spatialHash, 6);

    expect(ate).toBe(true);
    expect(movementMocks.computePath).toHaveBeenCalledWith(animal, world, target.x, target.y, 30, 'scavenge');
    expect(movementMocks.walkPath).toHaveBeenCalledWith(animal, world);
  });

  it('skips egg predation for herbivores', () => {
    const animal = createAnimal({}, { diet: 'HERBIVORE' });
    const world = createWorld();
    const egg = { id: 7, species: 'LIZARD', x: 3.5, y: 2.5, alive: true, lifeStage: LifeStage.EGG };
    const spatialHash = createSpatialHash([egg]);

    const ate = _tryEatEgg(animal, world, spatialHash, 5);

    expect(ate).toBe(false);
    expect(spatialHash.queryRadius).not.toHaveBeenCalled();
  });

  it('kills adjacent foreign eggs and converts them into immediate food', () => {
    const animal = createAnimal({ hunger: 50, energy: 40 });
    const world = createWorld({ tick: 61 });
    const egg = {
      id: 8,
      species: 'HERON',
      x: 3.5,
      y: 2.5,
      alive: true,
      hp: 10,
      lifeStage: LifeStage.EGG,
      state: AnimalState.IDLE,
      logAction: () => {},
    };
    const spatialHash = createSpatialHash([egg]);

    const ate = _tryEatEgg(animal, world, spatialHash, 4);

    expect(ate).toBe(true);
    expect(egg.hp).toBe(0);
    expect(egg.alive).toBe(false);
    expect(egg.state).toBe(AnimalState.DEAD);
    expect(egg._deathTick).toBe(61);
    // hunger -20, energy +10, then EAT cost -2
    expect(animal.hunger).toBe(30);
    expect(animal.energy).toBe(48); // 40 + 10 - 2
    expect(animal.state).toBe(AnimalState.EATING);
    expect(movementMocks.computePath).not.toHaveBeenCalled();
    expect(world.vacateEgg).toHaveBeenCalledWith(egg.x, egg.y);
  });

  it('paths to an adjacent free tile instead of the egg tile itself', () => {
    const animal = createAnimal({ x: 1.5, y: 1.5 });
    const world = createWorld();
    const egg = {
      id: 8,
      species: 'HERON',
      x: 5.5,
      y: 5.5,
      alive: true,
      hp: 10,
      lifeStage: LifeStage.EGG,
      state: AnimalState.IDLE,
    };
    const spatialHash = createSpatialHash([egg]);

    movementMocks.computePath.mockImplementation((currentAnimal, currentWorld, tx, ty) => {
      currentAnimal.path = [[tx | 0, ty | 0]];
      currentAnimal.pathIndex = 0;
    });

    const ate = _tryEatEgg(animal, world, spatialHash, 10);

    expect(ate).toBe(true);
    const [, , targetX, targetY] = movementMocks.computePath.mock.calls[0];
    expect((targetX | 0) === (egg.x | 0) && (targetY | 0) === (egg.y | 0)).toBe(false);
    expect(Math.max(Math.abs((targetX | 0) - (egg.x | 0)), Math.abs((targetY | 0) - (egg.y | 0)))).toBe(1);
  });
});