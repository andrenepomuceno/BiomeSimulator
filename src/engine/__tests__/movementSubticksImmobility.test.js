import { describe, expect, it } from 'vitest';
import { Animal } from '../entities.js';
import { SimulationEngine } from '../simulation.js';
import { DIRT } from '../world.js';

function createBeetleConfig() {
  return {
    diet: 'HERBIVORE',
    reproduction: 'SEXUAL',
    speed: 4,
    max_energy: 70,
    max_hunger: 80,
    max_thirst: 80,
    max_hp: 20,
    max_age: 1000,
    mature_age: 100,
    mate_cooldown: 100,
    decision_interval: 10,
    hunger_rate: 0.05,
    thirst_rate: 0.05,
    attack_power: 1,
    defense: 1,
    walkable_terrain: ['DIRT'],
    prey_species: [],
    edible_plants: [],
    energy_costs: {
      WALK: 0.03,
    },
  };
}

describe('SimulationEngine.tickMovementOnly immobility guards', () => {
  it('keeps egg-stage animals fixed even if they still have a path', () => {
    const engine = new SimulationEngine({
      map_width: 12,
      map_height: 12,
      max_animal_population: 0,
      animal_species: {},
    });
    engine.generateWorld();

    const world = engine.world;
    world.terrain.fill(DIRT);
    world.animals = [];
    world.animalGrid.fill(0);
    world.eggGrid.fill(0);

    const egg = new Animal(1, 3.5, 3.5, 'BEETLE', createBeetleConfig());
    egg._isEggStage = true;
    egg._incubationPeriod = 100;
    egg.age = 10;
    egg.path = [[6, 3]];
    egg.pathIndex = 0;

    world.animals.push(egg);
    world.placeEgg(egg.x, egg.y);

    engine.tickMovementOnly();

    expect(egg.x).toBe(3.5);
    expect(egg.y).toBe(3.5);
    expect(egg.path).toEqual([[6, 3]]);
    expect(world.eggGrid[world.idx(3, 3)]).toBe(1);
    expect(world.animalGrid[world.idx(3, 3)]).toBe(0);
  });
});
