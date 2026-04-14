/**
 * Simulation stability tests — run a small world for many ticks and verify
 * that no invariants are violated: no crashes, populations stay bounded,
 * entities maintain valid state, grids stay consistent.
 */
import { describe, expect, it } from 'vitest';
import { SimulationEngine } from '../simulation.js';
import { DEFAULT_CONFIG } from '../config.js';

function createSmallConfig(overrides = {}) {
  return {
    ...DEFAULT_CONFIG,
    map_width: 80,
    map_height: 80,
    seed: 12345,
    max_animal_population: 200,
    initial_population_fraction: 0.1,
    ticks_per_day: 260,
    supervisor_enabled: true,
    supervisor_full_audit_interval_ticks: 10,
    ...overrides,
  };
}

function createEngine(overrides = {}) {
  const config = createSmallConfig(overrides);
  const engine = new SimulationEngine(config);
  engine.generateWorld();
  return engine;
}

describe('simulation stability — world generation', () => {
  it('generates a world with terrain, plants, and animals', () => {
    const engine = createEngine();
    const w = engine.world;

    expect(w.terrain).toBeInstanceOf(Uint8Array);
    expect(w.terrain).toHaveLength(80 * 80);
    expect(w.animals.length).toBeGreaterThan(0);

    // At least some plant tiles should be active
    expect(w.activePlantTiles.size).toBeGreaterThan(0);
  });

  it('seed-based generation is deterministic', () => {
    const a = createEngine();
    const b = createEngine();
    expect(a.world.terrain).toEqual(b.world.terrain);
    expect(a.world.animals.length).toBe(b.world.animals.length);
  });

  it('all spawned animals have valid initial state', () => {
    const engine = createEngine();
    for (const animal of engine.world.animals) {
      expect(animal.alive).toBe(true);
      expect(animal.energy).toBeGreaterThan(0);
      expect(animal.x).toBeGreaterThanOrEqual(0);
      expect(animal.x).toBeLessThan(80);
      expect(animal.y).toBeGreaterThanOrEqual(0);
      expect(animal.y).toBeLessThan(80);
      expect(animal.species).toEqual(expect.any(String));
    }
  });
});

describe('simulation stability — multi-tick run', () => {
  it('runs 500 ticks without throwing', () => {
    const engine = createEngine();
    for (let i = 0; i < 500; i++) {
      engine.tick();
    }
    // If we got here, no crash occurred
    expect(engine.world.clock.tick).toBe(500);
  });

  it('no animal has NaN or Infinity in position or energy after 200 ticks', () => {
    const engine = createEngine();
    for (let i = 0; i < 200; i++) {
      engine.tick();
    }

    for (const animal of engine.world.animals) {
      if (!animal.alive) continue;
      expect(Number.isFinite(animal.x)).toBe(true);
      expect(Number.isFinite(animal.y)).toBe(true);
      expect(Number.isFinite(animal.energy)).toBe(true);
      expect(Number.isFinite(animal.hunger)).toBe(true);
      expect(Number.isFinite(animal.thirst)).toBe(true);
    }
  });

  it('alive animals stay within world bounds after 200 ticks', () => {
    const engine = createEngine();
    const w = engine.world;
    for (let i = 0; i < 200; i++) {
      engine.tick();
    }

    for (const animal of w.animals) {
      if (!animal.alive) continue;
      expect(animal.x).toBeGreaterThanOrEqual(0);
      expect(animal.x).toBeLessThan(w.width);
      expect(animal.y).toBeGreaterThanOrEqual(0);
      expect(animal.y).toBeLessThan(w.height);
    }
  });

  it('population stays within the configured budget', () => {
    const budget = 200;
    const engine = createEngine({ max_animal_population: budget });
    for (let i = 0; i < 300; i++) {
      engine.tick();
    }

    const aliveCount = engine.world.animals.filter(a => a.alive).length;
    expect(aliveCount).toBeLessThanOrEqual(budget);
  });

  it('clock advances correctly over a full day cycle', () => {
    const engine = createEngine();
    const tpd = engine.world.clock.ticksPerDay;
    for (let i = 0; i < tpd; i++) {
      engine.tick();
    }
    expect(engine.world.clock.dayNumber).toBe(1);
  });

  it('stats history is populated periodically', () => {
    const engine = createEngine();
    for (let i = 0; i < 100; i++) {
      engine.tick();
    }
    expect(engine.world.statsHistory.length).toBeGreaterThan(0);
  });
});

describe('simulation stability — ecosystem health', () => {
  it('some animals are still alive after 1 full day', () => {
    const engine = createEngine();
    const tpd = engine.world.clock.ticksPerDay;
    for (let i = 0; i < tpd; i++) {
      engine.tick();
    }
    const alive = engine.world.animals.filter(a => a.alive).length;
    expect(alive).toBeGreaterThan(0);
  });

  it('plants are still present after 1 full day', () => {
    const engine = createEngine();
    const tpd = engine.world.clock.ticksPerDay;
    for (let i = 0; i < tpd; i++) {
      engine.tick();
    }
    expect(engine.world.activePlantTiles.size).toBeGreaterThan(0);
  });

  it('not all species go extinct in the first 2 days', () => {
    const engine = createEngine();
    const tpd = engine.world.clock.ticksPerDay;
    for (let i = 0; i < tpd * 2; i++) {
      engine.tick();
    }

    const speciesCounts = {};
    for (const animal of engine.world.animals) {
      if (!animal.alive) continue;
      speciesCounts[animal.species] = (speciesCounts[animal.species] || 0) + 1;
    }
    const aliveSpecies = Object.keys(speciesCounts).length;
    // At least some species should survive 2 days on an 80x80 map
    expect(aliveSpecies).toBeGreaterThan(0);
  });
});

describe('simulation stability — reset', () => {
  it('resetSimulation restores animals, plants, and clock', () => {
    const engine = createEngine();
    const initialAnimalCount = engine.world.animals.length;

    // Run a while
    for (let i = 0; i < 100; i++) {
      engine.tick();
    }
    expect(engine.world.clock.tick).toBe(100);

    // Reset
    engine.resetSimulation();
    expect(engine.world.clock.tick).toBe(0);
    expect(engine.world.animals.length).toBeGreaterThan(0);
    expect(engine.world.activePlantTiles.size).toBeGreaterThan(0);
    // All animals should be alive after reset
    expect(engine.world.animals.every(a => a.alive)).toBe(true);
  });

  it('simulation runs cleanly after a reset', () => {
    const engine = createEngine();

    for (let i = 0; i < 50; i++) engine.tick();
    engine.resetSimulation();
    // Should not crash when running again
    for (let i = 0; i < 100; i++) engine.tick();
    expect(engine.world.clock.tick).toBe(100);
    expect(engine.world.animals.filter(a => a.alive).length).toBeGreaterThan(0);
  });
});

describe('simulation stability — entity placement & removal', () => {
  it('editTerrain changes the specified tiles', () => {
    const engine = createEngine();
    const changes = [{ x: 5, y: 5, terrain: 1 }]; // SAND
    engine.editTerrain(changes);
    const idx = 5 * 80 + 5;
    expect(engine.world.terrain[idx]).toBe(1);
  });

  it('placeEntity and removeEntity work for animals', () => {
    const engine = createEngine();
    const result = engine.placeEntity('RABBIT', 10, 10);
    expect(result).not.toBeNull();
    expect(result.species).toBe('RABBIT');
    const id = result.id;

    const removed = engine.removeEntity(id);
    expect(removed).toBe(true);
  });
});
