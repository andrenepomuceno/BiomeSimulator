import { describe, expect, it } from 'vitest';
import { generateTerrain, computeWaterProximity } from '../mapGenerator.js';
import { WATER, DEEP_WATER } from '../world.js';

describe('generateTerrain', () => {
  const config = {
    map_width: 64,
    map_height: 64,
    sea_level: 0.38,
    island_count: 2,
    island_size_factor: 0.3,
    seed: 42,
  };

  it('returns terrain, waterProximity, and the seed', () => {
    const result = generateTerrain(config);
    expect(result.terrain).toBeInstanceOf(Uint8Array);
    expect(result.terrain).toHaveLength(64 * 64);
    expect(result.waterProximity).toBeInstanceOf(Uint8Array);
    expect(result.waterProximity).toHaveLength(64 * 64);
    expect(result.seed).toBe(42);
  });

  it('is deterministic for the same seed', () => {
    const a = generateTerrain(config);
    const b = generateTerrain(config);
    expect(a.terrain).toEqual(b.terrain);
    expect(a.waterProximity).toEqual(b.waterProximity);
  });

  it('produces different terrain for different seeds', () => {
    const a = generateTerrain({ ...config, seed: 1 });
    const b = generateTerrain({ ...config, seed: 2 });
    // At least some tiles should differ
    let diffs = 0;
    for (let i = 0; i < a.terrain.length; i++) {
      if (a.terrain[i] !== b.terrain[i]) diffs++;
    }
    expect(diffs).toBeGreaterThan(0);
  });

  it('terrain values are within the valid range 0-8', () => {
    const { terrain } = generateTerrain(config);
    for (let i = 0; i < terrain.length; i++) {
      expect(terrain[i]).toBeGreaterThanOrEqual(0);
      expect(terrain[i]).toBeLessThanOrEqual(8);
    }
  });

  it('contains some water tiles', () => {
    const { terrain } = generateTerrain(config);
    let waterCount = 0;
    for (let i = 0; i < terrain.length; i++) {
      if (terrain[i] === WATER || terrain[i] === DEEP_WATER) waterCount++;
    }
    expect(waterCount).toBeGreaterThan(0);
  });

  it('guarantees at least min_land_ratio land tiles across multiple seeds', () => {
    const seeds = [1, 2, 42, 999, 12345];
    for (const seed of seeds) {
      const { terrain } = generateTerrain({ ...config, min_land_ratio: 0.5, seed });
      let landCount = 0;
      for (let i = 0; i < terrain.length; i++) {
        if (terrain[i] !== WATER && terrain[i] !== DEEP_WATER) landCount++;
      }
      expect(landCount / terrain.length).toBeGreaterThanOrEqual(0.5);
    }
  });

  it('respects min_land_ratio of 0 (no clamping)', () => {
    // With min_land_ratio=0, result should still be valid terrain
    const { terrain } = generateTerrain({ ...config, min_land_ratio: 0, seed: 42 });
    expect(terrain).toHaveLength(64 * 64);
  });

  it('accepts percentage min_land_ratio input (50 => 0.5)', () => {
    const { terrain } = generateTerrain({ ...config, min_land_ratio: 50, seed: 7 });
    let landCount = 0;
    for (let i = 0; i < terrain.length; i++) {
      if (terrain[i] !== WATER && terrain[i] !== DEEP_WATER) landCount++;
    }
    expect(landCount / terrain.length).toBeGreaterThanOrEqual(0.5);
  });

  it('falls back to the 50% minimum when min_land_ratio is empty/invalid', () => {
    const cases = ['', null, undefined, 'abc'];
    for (const value of cases) {
      const { terrain } = generateTerrain({ ...config, min_land_ratio: value, seed: 11 });
      let landCount = 0;
      for (let i = 0; i < terrain.length; i++) {
        if (terrain[i] !== WATER && terrain[i] !== DEEP_WATER) landCount++;
      }
      expect(landCount / terrain.length).toBeGreaterThanOrEqual(0.5);
    }
  });
});

describe('computeWaterProximity', () => {
  it('returns 0 for water tiles and positive for land tiles', () => {
    // 4x4 grid: water in top-left corner
    const w = 4, h = 4;
    const terrain = new Uint8Array(w * h).fill(3); // all SOIL
    terrain[0] = WATER; // (0,0) is water

    const dist = computeWaterProximity(terrain, w, h, 255);
    expect(dist[0]).toBe(0); // water tile
    expect(dist[1]).toBe(1); // adjacent
    expect(dist[w]).toBe(1); // adjacent below
  });

  it('caps distance at maxDist', () => {
    const w = 4, h = 4;
    const terrain = new Uint8Array(w * h).fill(3); // all SOIL, no water
    terrain[0] = WATER;

    const dist = computeWaterProximity(terrain, w, h, 3);
    // Corner (3,3) is manhattan-dist 6 from (0,0), should be capped at 3
    expect(dist[3 * w + 3]).toBeLessThanOrEqual(3);
  });

  it('handles DEEP_WATER as a water source', () => {
    const w = 4, h = 4;
    const terrain = new Uint8Array(w * h).fill(3);
    terrain[0] = DEEP_WATER;

    const dist = computeWaterProximity(terrain, w, h, 255);
    expect(dist[0]).toBe(0);
    expect(dist[1]).toBe(1);
  });
});
