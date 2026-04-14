import { describe, expect, it } from 'vitest';
import {
  tileHash,
  WATER, SAND, DIRT, SOIL, ROCK, FERTILE_SOIL, DEEP_WATER, MOUNTAIN, MUD,
  TERRAIN_COLORS,
  TERRAIN_VAR_RGB,
  TERRAIN_ELEVATION_ORDER,
} from '../terrainColors.js';

describe('tileHash', () => {
  it('returns values in [0, 1)', () => {
    for (let i = 0; i < 100; i++) {
      const h = tileHash(i, i * 7);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(1);
    }
  });

  it('is deterministic for the same coordinates', () => {
    expect(tileHash(10, 20)).toBe(tileHash(10, 20));
    expect(tileHash(0, 0)).toBe(tileHash(0, 0));
  });

  it('produces different values for different coordinates', () => {
    const a = tileHash(0, 0);
    const b = tileHash(1, 0);
    const c = tileHash(0, 1);
    // Extremely unlikely for a good hash to collide on adjacent tiles
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });
});

describe('terrain constants', () => {
  const ALL_TERRAIN_TYPES = [WATER, SAND, DIRT, SOIL, ROCK, FERTILE_SOIL, DEEP_WATER, MOUNTAIN, MUD];

  it('terrain type IDs are unique integers 0-8', () => {
    expect(new Set(ALL_TERRAIN_TYPES).size).toBe(9);
    ALL_TERRAIN_TYPES.forEach(t => {
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(8);
    });
  });

  it('TERRAIN_COLORS has an RGBA entry for every type', () => {
    for (const t of ALL_TERRAIN_TYPES) {
      expect(TERRAIN_COLORS[t]).toHaveLength(4);
      TERRAIN_COLORS[t].forEach(ch => {
        expect(ch).toBeGreaterThanOrEqual(0);
        expect(ch).toBeLessThanOrEqual(255);
      });
    }
  });

  it('TERRAIN_VAR_RGB has 3-channel entries for every type', () => {
    for (const t of ALL_TERRAIN_TYPES) {
      expect(TERRAIN_VAR_RGB[t]).toHaveLength(3);
    }
  });

  it('TERRAIN_ELEVATION_ORDER covers every type', () => {
    expect(TERRAIN_ELEVATION_ORDER).toHaveLength(9);
    const uniqueValues = new Set(TERRAIN_ELEVATION_ORDER);
    expect(uniqueValues.size).toBe(9);
  });
});
