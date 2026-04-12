/**
 * Bounded A* pathfinding on the terrain grid.
 */

/**
 * A* pathfinding from (sx,sy) to (gx,gy).
 * Returns array of [x,y] waypoints, or empty array if no path.
 * Limited to maxDist expansion radius.
 */
export function aStar(sx, sy, gx, gy, world, maxDist = 50) {
  if (sx === gx && sy === gy) return [];

  // Goal must be walkable (or water-adjacent for drinking)
  if (!world.isWalkable(gx, gy)) {
    let found = false;
    for (let dx = -1; dx <= 1 && !found; dx++) {
      for (let dy = -1; dy <= 1 && !found; dy++) {
        const nx = gx + dx, ny = gy + dy;
        if (world.isWalkable(nx, ny)) {
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
  const visited = new Set();

  const startKey = `${sx},${sy}`;
  gScore.set(startKey, 0);
  _heapPush(open, [Math.abs(gx - sx) + Math.abs(gy - sy), sx, sy]);

  while (open.length > 0) {
    const [, cx, cy] = _heapPop(open);
    const ck = `${cx},${cy}`;

    if (visited.has(ck)) continue;
    visited.add(ck);

    if (cx === gx && cy === gy) {
      // Reconstruct path
      const path = [];
      let cur = `${gx},${gy}`;
      while (cameFrom.has(cur)) {
        const [px, py] = cur.split(',').map(Number);
        path.push([px, py]);
        cur = cameFrom.get(cur);
      }
      path.reverse();
      return path;
    }

    // Expansion limit
    if (Math.abs(cx - sx) + Math.abs(cy - sy) > maxDist) continue;

    const cg = gScore.get(ck);
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dx, dy] of dirs) {
      const nx = cx + dx, ny = cy + dy;
      const nk = `${nx},${ny}`;
      if (visited.has(nk)) continue;
      if (!world.isWalkable(nx, ny)) continue;

      const ng = cg + 1;
      if (ng < (gScore.get(nk) ?? Infinity)) {
        gScore.set(nk, ng);
        cameFrom.set(nk, ck);
        const h = Math.abs(nx - gx) + Math.abs(ny - gy);
        _heapPush(open, [ng + h, nx, ny]);
      }
    }
  }

  return []; // No path
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
