/**
 * Bounded A* pathfinding on the terrain grid.
 */
import {
  benchmarkAdd,
  benchmarkCount,
  benchmarkEnd,
  benchmarkStart,
} from './benchmarkProfiler.js';

/**
 * A* pathfinding from (sx,sy) to (gx,gy).
 * Returns array of [x,y] waypoints, or empty array if no path.
 * Limited to maxDist expansion radius.
 */
export function aStar(sx, sy, gx, gy, world, maxDist = 50, walkableSet = null) {
  const collector = world?._benchmarkCollector || null;
  const startedAt = benchmarkStart(collector);
  let pathLength = 0;
  let succeeded = false;
  const visited = new Set();

  try {
    if (sx === gx && sy === gy) return [];

    const _walkable = walkableSet
      ? (x, y) => world.isWalkableFor(x, y, walkableSet)
      : (x, y) => world.isWalkable(x, y);

    // Goal must be walkable (or water-adjacent for drinking)
    if (!_walkable(gx, gy)) {
      let found = false;
      for (let dx = -1; dx <= 1 && !found; dx++) {
        for (let dy = -1; dy <= 1 && !found; dy++) {
          const nx = gx + dx, ny = gy + dy;
          if (_walkable(nx, ny)) {
            gx = nx; gy = ny;
            found = true;
          }
        }
      }
      if (!found) return [];
    }

    // Min-heap using array (simple binary heap)
    const open = []; // [f, x, y]
    const gScore = new Map();
    const cameFrom = new Map();

    const startKey = `${sx},${sy}`;
    gScore.set(startKey, 0);
    _heapPush(open, [Math.abs(gx - sx) + Math.abs(gy - sy), sx, sy]);

    while (open.length > 0) {
      const [, cx, cy] = _heapPop(open);
      const ck = `${cx},${cy}`;

      if (visited.has(ck)) continue;
      visited.add(ck);

      if (cx === gx && cy === gy) {
        const path = [];
        let cur = `${gx},${gy}`;
        while (cameFrom.has(cur)) {
          const [px, py] = cur.split(',').map(Number);
          path.push([px, py]);
          cur = cameFrom.get(cur);
        }
        path.reverse();
        pathLength = path.length;
        succeeded = true;
        return path;
      }

      if (Math.abs(cx - sx) + Math.abs(cy - sy) > maxDist) continue;

      const cg = gScore.get(ck);
      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dx, dy] of dirs) {
        const nx = cx + dx, ny = cy + dy;
        const nk = `${nx},${ny}`;
        if (visited.has(nk)) continue;
        if (!_walkable(nx, ny)) continue;

        const ng = cg + 1;
        if (ng < (gScore.get(nk) ?? Infinity)) {
          gScore.set(nk, ng);
          cameFrom.set(nk, ck);
          const h = Math.abs(nx - gx) + Math.abs(ny - gy);
          _heapPush(open, [ng + h, nx, ny]);
        }
      }
    }

    return [];
  } finally {
    benchmarkEnd(collector, 'aStar', startedAt);
    benchmarkCount(collector, succeeded ? 'aStarSuccess' : 'aStarFailure');
    benchmarkAdd(collector, 'aStarVisited', visited.size);
    benchmarkAdd(collector, 'aStarPathNodes', pathLength);
  }
}

// Simple binary min-heap operations
function _heapPush(heap, item) {
  heap.push(item);
  let i = heap.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (heap[p][0] <= heap[i][0]) break;
    [heap[p], heap[i]] = [heap[i], heap[p]];
    i = p;
  }
}

function _heapPop(heap) {
  const top = heap[0];
  const last = heap.pop();
  if (heap.length > 0) {
    heap[0] = last;
    let i = 0;
    const n = heap.length;
    while (true) {
      let min = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && heap[l][0] < heap[min][0]) min = l;
      if (r < n && heap[r][0] < heap[min][0]) min = r;
      if (min === i) break;
      [heap[i], heap[min]] = [heap[min], heap[i]];
      i = min;
    }
  }
  return top;
}
