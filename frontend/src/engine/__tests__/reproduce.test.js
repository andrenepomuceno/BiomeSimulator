import { afterEach, describe, expect, it, vi } from 'vitest';

import { SEX_FEMALE, SEX_MALE } from '../config.js';
import { buildAnimalSpeciesConfig } from '../animalSpecies.js';
import { Animal, LifeStage } from '../entities.js';
import { _doMate } from '../behaviors/reproduce.js';

function createWorld(speciesConfigMap) {
  let nextId = 100;

  return {
    animals: [],
    clock: { tick: 12 },
    config: {
      animal_species: speciesConfigMap,
      max_animal_population: 0,
    },
    nextId() {
      nextId += 1;
      return nextId;
    },
    getAliveSpeciesCount() {
      return 2;
    },
    isWalkableFor() {
      return true;
    },
  };
}

describe('_doMate', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('allows oviparous species to occasionally lay a second egg', () => {
    const speciesConfigMap = buildAnimalSpeciesConfig();
    const world = createWorld(speciesConfigMap);
    const female = new Animal(1, 5.5, 5.5, 'BEETLE', speciesConfigMap.BEETLE);
    const male = new Animal(2, 5.5, 5.5, 'BEETLE', speciesConfigMap.BEETLE);
    female.sex = SEX_FEMALE;
    male.sex = SEX_MALE;

    vi.spyOn(Math, 'random').mockReturnValue(0.999);

    _doMate(female, male, world);

    expect(world.animals).toHaveLength(2);
    expect(world.animals.every(egg => egg.lifeStage === LifeStage.EGG)).toBe(true);
    expect(world.animals.every(egg => egg.species === 'BEETLE')).toBe(true);
  });

  it('keeps viviparous litter size unchanged at one offspring', () => {
    const speciesConfigMap = buildAnimalSpeciesConfig();
    const world = createWorld(speciesConfigMap);
    const female = new Animal(1, 5.5, 5.5, 'RABBIT', speciesConfigMap.RABBIT);
    const male = new Animal(2, 5.5, 5.5, 'RABBIT', speciesConfigMap.RABBIT);
    female.sex = SEX_FEMALE;
    male.sex = SEX_MALE;

    vi.spyOn(Math, 'random').mockReturnValue(0.999);

    _doMate(female, male, world);

    expect(world.animals).toHaveLength(0);
    expect(female.pregnant).toBe(true);
    expect(female._gestationLitterSize).toBe(1);
  });
});