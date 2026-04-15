import { describe, expect, it } from 'vitest';
import { aStar } from '../pathfinding.js';
import { createGridWorld } from '../../test/testUtils.js';

describe('aStar', () => {
  it('finds a route around blocked terrain', () => {
    const world = createGridWorld({
      width: 4,
      height: 3,
      blocked: [[1, 0]],
    });

    const path = aStar(0, 0, 2, 0, world, 10);

    expect(path).toEqual([
      [0, 1],
      [1, 1],
      [2, 1],
      [2, 0],
    ]);
  });

  it('falls back to an adjacent walkable tile when the goal is blocked', () => {
    const world = createGridWorld({
      width: 4,
      height: 4,
      blocked: [[2, 0]],
    });

    const path = aStar(0, 0, 2, 0, world, 10);

    expect(path.at(-1)).toEqual([1, 0]);
  });

  it('returns an empty path when the destination and adjacent tiles are unreachable', () => {
    const world = createGridWorld({
      width: 4,
      height: 4,
      blocked: [[2, 2], [1, 1], [2, 1], [3, 1], [1, 2], [3, 2], [1, 3], [2, 3], [3, 3]],
    });

    expect(aStar(0, 0, 2, 2, world, 20)).toEqual([]);
  });
});