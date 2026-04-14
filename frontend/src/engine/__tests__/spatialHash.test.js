import { describe, expect, it } from 'vitest';
import { SpatialHash } from '../spatialHash.js';

function createEntity(id, x, y, alive = true) {
  return { id, x, y, alive };
}

describe('SpatialHash', () => {
  it('updates query results when an entity moves across cells', () => {
    const hash = new SpatialHash(2);
    const rabbit = createEntity(1, 0.5, 0.5);
    const fox = createEntity(2, 3.25, 0.5);

    hash.insert(rabbit);
    hash.insert(fox);

    expect(hash.queryRadius(0.5, 0.5, 1).map(entity => entity.id)).toEqual([1]);

    rabbit.x = 2.5;
    rabbit.y = 0.5;
    hash.update(rabbit);

    expect(hash.queryRadius(0.5, 0.5, 1).map(entity => entity.id)).toEqual([]);
    expect(hash.queryRadius(2.5, 0.5, 1).map(entity => entity.id).sort((a, b) => a - b)).toEqual([1, 2]);
  });

  it('rebuilds from scratch and ignores dead entities', () => {
    const hash = new SpatialHash(2);

    hash.insert(createEntity(99, 0.5, 0.5));
    hash.rebuild([
      createEntity(1, 1.5, 1.5, true),
      createEntity(2, 1.75, 1.5, false),
    ]);

    expect(hash.queryRadius(0.5, 0.5, 2).map(entity => entity.id)).toEqual([1]);
    expect(hash.queryRadius(0.5, 0.5, 5).map(entity => entity.id)).not.toContain(99);
  });
});