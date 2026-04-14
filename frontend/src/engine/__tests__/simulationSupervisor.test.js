import { describe, expect, it } from 'vitest';

import { buildAnimalSpeciesConfig } from '../animalSpecies.js';
import { DEFAULT_CONFIG } from '../config.js';
import { Animal } from '../entities.js';
import { createSimulationSupervisor } from '../simulationSupervisor.js';
import { SpatialHash } from '../spatialHash.js';
import { World } from '../world.js';

function createWorld(width = 4, height = 4) {
  const config = {
    ...DEFAULT_CONFIG,
    map_width: width,
    map_height: height,
    animal_species: buildAnimalSpeciesConfig(),
  };
  return new World(config);
}

describe('SimulationSupervisor', () => {
  it('skips audits on unscheduled ticks', () => {
    const world = createWorld();
    const supervisor = createSimulationSupervisor({
      supervisor_enabled: true,
      supervisor_full_audit_interval_ticks: 30,
    });

    expect(supervisor.shouldAudit(29)).toBe(false);
    expect(supervisor.skipAudit(29).audited).toBe(false);
    expect(supervisor.skipAudit(29).issueCount).toBe(0);
    expect(world.animals).toHaveLength(0);
  });

  it('returns a clean report for a consistent world', () => {
    const world = createWorld();
    const hash = new SpatialHash(16);
    const supervisor = createSimulationSupervisor({
      supervisor_enabled: true,
      supervisor_full_audit_interval_ticks: 30,
    });
    const rabbit = new Animal(1, 1.5, 1.5, 'RABBIT', world.config.animal_species.RABBIT);

    world.animals.push(rabbit);
    world.placeAnimal(1, 1);
    hash.insert(rabbit);
    world.plantType[0] = 1;
    world.plantStage[0] = 1;
    world.activePlantTiles.add(0);
    world.clock.tick = 30;

    const report = supervisor.audit(world, hash);

    expect(report.audited).toBe(true);
    expect(report.issueCount).toBe(0);
    expect(report.countsByType).toEqual({});
  });

  it('detects overlaps and corrupted derived state', () => {
    const world = createWorld();
    const hash = new SpatialHash(16);
    const supervisor = createSimulationSupervisor({
      supervisor_enabled: true,
      supervisor_full_audit_interval_ticks: 30,
      supervisor_sample_limit: 4,
    });

    const rabbit = new Animal(1, 1.5, 1.5, 'RABBIT', world.config.animal_species.RABBIT);
    rabbit.hunger = Number.NaN;

    const eggA = new Animal(2, 1.5, 1.5, 'BEETLE', world.config.animal_species.BEETLE);
    eggA._isEggStage = true;
    eggA._incubationPeriod = 20;
    eggA._eggMaxHp = 10;
    eggA.hp = 10;

    const eggB = new Animal(3, 1.5, 1.5, 'BEETLE', world.config.animal_species.BEETLE);
    eggB._isEggStage = true;
    eggB._incubationPeriod = 20;
    eggB._eggMaxHp = 10;
    eggB.hp = 10;

    world.animals.push(rabbit, eggA, eggB);
    world.placeAnimal(1, 1);
    world.placeAnimal(1, 1);
    hash.insert(rabbit);
    world.plantType[2] = 1;
    world.plantStage[2] = 0;
    world.plantAge[2] = 7;
    world.clock.tick = 30;

    const report = supervisor.audit(world, hash);

    expect(report.audited).toBe(true);
    expect(report.countsByType.animal_numeric).toBeGreaterThan(0);
    expect(report.countsByType.egg_overlap).toBeGreaterThan(0);
    expect(report.countsByType.animal_egg_overlap).toBeGreaterThan(0);
    expect(report.countsByType.occupancy_grid).toBeGreaterThan(0);
    expect(report.countsByType.plant_state).toBeGreaterThan(0);
    expect(report.countsByType.spatial_hash).toBeGreaterThan(0);
  });
});