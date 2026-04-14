import { describe, expect, it } from 'vitest';

import {
  buildAnimalSpeciesConfig,
  getEffectiveAnimalPopulationCap,
  normalizeAnimalCountsToBudget,
} from '../animalSpecies.js';
import { SimulationEngine } from '../simulation.js';

function sumCounts(counts) {
  return Object.values(counts).reduce((sum, value) => sum + (value || 0), 0);
}

function countBySpecies(animals) {
  const counts = {};
  for (const animal of animals) {
    counts[animal.species] = (counts[animal.species] || 0) + 1;
  }
  return counts;
}

function nonZeroCounts(counts) {
  return Object.fromEntries(Object.entries(counts).filter(([, value]) => value > 0));
}

function createFakeWorld() {
  let nextId = 0;

  return {
    width: 80,
    height: 80,
    animals: [],
    nextId() {
      nextId += 1;
      return nextId;
    },
    isWalkableFor() {
      return true;
    },
    isTileBlocked() {
      return false;
    },
    placeAnimal() {},
  };
}

describe('animal population budget helpers', () => {
  it('clamps requested counts to the effective species caps and total budget', () => {
    const budget = 1000;
    const normalized = normalizeAnimalCountsToBudget({
      RABBIT: 400,
      BEETLE: 500,
      WOLF: 120,
      BEAR: 80,
    }, budget);

    expect(sumCounts(normalized)).toBeLessThanOrEqual(budget);
    expect(normalized.RABBIT).toBeLessThanOrEqual(getEffectiveAnimalPopulationCap('RABBIT', budget));
    expect(normalized.BEETLE).toBeLessThanOrEqual(getEffectiveAnimalPopulationCap('BEETLE', budget));
    expect(normalized.WOLF).toBeLessThanOrEqual(getEffectiveAnimalPopulationCap('WOLF', budget));
    expect(normalized.BEAR).toBeLessThanOrEqual(getEffectiveAnimalPopulationCap('BEAR', budget));
  });

  it('keeps a manually edited species pinned while rebalancing the rest', () => {
    const budget = 1000;
    const rabbitCap = getEffectiveAnimalPopulationCap('RABBIT', budget);
    const normalized = normalizeAnimalCountsToBudget({
      RABBIT: rabbitCap,
      BEETLE: 500,
      WOLF: 120,
    }, budget, { lockedSpecies: ['RABBIT'] });

    expect(normalized.RABBIT).toBe(rabbitCap);
    expect(sumCounts(normalized)).toBeLessThanOrEqual(budget);
  });
});

describe('SimulationEngine._spawnAnimals', () => {
  it('spawns the normalized initial counts instead of the raw requested counts', () => {
    const budget = 1000;
    const requestedCounts = {
      RABBIT: 400,
      BEETLE: 500,
      WOLF: 120,
      BEAR: 80,
    };
    const expectedCounts = normalizeAnimalCountsToBudget(requestedCounts, budget);
    const speciesConfig = buildAnimalSpeciesConfig();
    const engine = new SimulationEngine({
      max_animal_population: budget,
      initial_animal_counts: requestedCounts,
      animal_species: speciesConfig,
    });

    engine.world = createFakeWorld();
    engine._spawnAnimals();

    expect(engine.world.animals).toHaveLength(sumCounts(expectedCounts));
    expect(countBySpecies(engine.world.animals)).toEqual(expect.objectContaining(nonZeroCounts(expectedCounts)));
  });
});