/**
 * Terrain map generator — Perlin-like noise, island masks, BFS water proximity.
 * Pure JS port of the NumPy-based Python generator.
 */
import { WATER, SAND, DIRT, GRASS, ROCK } from './world.js';

/**
 * Generate terrain grid with natural-looking islands.
 * @param {object} config
 * @returns {{ terrain: Uint8Array, waterProximity: Uint8Array, seed: number }}
 */
export function generateTerrain(config) {
  const w = config.map_width;
  const h = config.map_height;
  const seaLevel = config.sea_level ?? 0.38;
  const islandCount = config.island_count ?? 5;
  const islandSize = config.island_size_factor ?? 0.3;
  const seed = config.seed ?? Math.floor(Math.random() * 2147483647);

  // Base heightmap with multi-octave gradient noise
  const heightmap = fbmNoise(w, h, seed, 6, 0.005);

  // Island mask
  const islandMask = generateIslandMask(w, h, islandCount, islandSize, seed);

  // Combine
  const combined = new Float64Array(h * w);
  for (let i = 0; i < h * w; i++) {
    combined[i] = heightmap[i] * islandMask[i];
  }

  // Normalize to 0..1
  let cmin = Infinity, cmax = -Infinity;
  for (let i = 0; i < combined.length; i++) {
    if (combined[i] < cmin) cmin = combined[i];
    if (combined[i] > cmax) cmax = combined[i];
  }
  const range = cmax - cmin;
  if (range > 0) {
    for (let i = 0; i < combined.length; i++) {
      combined[i] = (combined[i] - cmin) / range;
    }
  }

  // Classify terrain
  const terrain = new Uint8Array(h * w);
  for (let i = 0; i < terrain.length; i++) {
    const v = combined[i];
    if (v > seaLevel + 0.45) terrain[i] = ROCK;
    else if (v > seaLevel + 0.12) terrain[i] = GRASS;
    else if (v > seaLevel + 0.05) terrain[i] = DIRT;
    else if (v > seaLevel) terrain[i] = SAND;
    else terrain[i] = WATER;
  }

  // Detail noise for terrain variation
  const detail = fbmNoise(w, h, seed + 9999, 3, 0.015);
  for (let i = 0; i < terrain.length; i++) {
    if (terrain[i] === GRASS) {
      if (detail[i] > 0.55) terrain[i] = DIRT;
      else if (detail[i] < -0.6) terrain[i] = ROCK;
    }
  }

  // Compute water proximity via BFS
  const waterProximity = computeWaterProximity(terrain, w, h, 255);

  return { terrain, waterProximity, seed };
}

// ---------------------------------------------------------------------------
// Seeded PRNG (simple mulberry32)
// ---------------------------------------------------------------------------

function mulberry32(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Perlin-like gradient noise (single octave)
// ---------------------------------------------------------------------------

function perlinNoise2D(w, h, seed, scale) {
  const rng = mulberry32(seed);

  // Build permutation + gradient tables sized for the grid
  const maxCoord = Math.max(Math.ceil(w * scale), Math.ceil(h * scale)) + 2;
  const tableSize = maxCoord + 256;

  // Fisher-Yates shuffle for permutation
  const perm = new Int32Array(tableSize);
  for (let i = 0; i < tableSize; i++) perm[i] = i;
  for (let i = tableSize - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }

  // Random gradient angles
  const gradX = new Float64Array(tableSize);
  const gradY = new Float64Array(tableSize);
  for (let i = 0; i < tableSize; i++) {
    const a = rng() * Math.PI * 2;
    gradX[i] = Math.cos(a);
    gradY[i] = Math.sin(a);
  }

  function hash(ix, iy) {
    return perm[(perm[((ix % tableSize) + tableSize) % tableSize] + iy) % tableSize];
  }

  function dotGrad(ix, iy, dx, dy) {
    const idx = hash(ix, iy);
    return gradX[idx] * dx + gradY[idx] * dy;
  }

  const result = new Float64Array(h * w);

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const gx = px * scale;
      const gy = py * scale;

      const x0 = Math.floor(gx);
      const y0 = Math.floor(gy);
      const x1 = x0 + 1;
      const y1 = y0 + 1;

      const fx = gx - x0;
      const fy = gy - y0;

      // Smoothstep fade: 6t^5 - 15t^4 + 10t^3
      const sx = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
      const sy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);

      const n00 = dotGrad(x0, y0, fx, fy);
      const n10 = dotGrad(x1, y0, fx - 1, fy);
      const n01 = dotGrad(x0, y1, fx, fy - 1);
      const n11 = dotGrad(x1, y1, fx - 1, fy - 1);

      const nx0 = n00 + sx * (n10 - n00);
      const nx1 = n01 + sx * (n11 - n01);
      result[py * w + px] = nx0 + sy * (nx1 - nx0);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Fractal Brownian Motion — multi-octave noise
// ---------------------------------------------------------------------------

function fbmNoise(w, h, seed, octaves = 4, scale = 0.005, lacunarity = 2.0, persistence = 0.5) {
  const result = new Float64Array(h * w);
  let amplitude = 1.0;
  let totalAmp = 0.0;
  let freq = scale;

  for (let i = 0; i < octaves; i++) {
    const octave = perlinNoise2D(w, h, seed + i * 31, freq);
    for (let j = 0; j < result.length; j++) {
      result[j] += amplitude * octave[j];
    }
    totalAmp += amplitude;
    amplitude *= persistence;
    freq *= lacunarity;
  }

  for (let j = 0; j < result.length; j++) {
    result[j] /= totalAmp;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Island mask — multiple circular blobs
// ---------------------------------------------------------------------------

function generateIslandMask(w, h, islandCount, sizeFactor, seed) {
  const rng = mulberry32(seed + 77777);
  const mask = new Float64Array(h * w);
  const cxBase = w / 2, cyBase = h / 2;
  const maxDim = Math.max(w, h);

  // Box-Muller for normal distribution
  function normalRng(mean, std) {
    const u1 = rng();
    const u2 = rng();
    return mean + std * Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
  }

  for (let n = 0; n < islandCount; n++) {
    const ix = normalRng(cxBase, w * 0.25);
    const iy = normalRng(cyBase, h * 0.25);
    const ir = maxDim * sizeFactor * (0.3 + rng() * 0.7);

    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const dist = Math.sqrt((px - ix) ** 2 + (py - iy) ** 2);
        const contrib = Math.max(0, Math.min(1, 1.0 - (dist / ir) ** 2));
        const idx = py * w + px;
        if (contrib > mask[idx]) mask[idx] = contrib;
      }
    }
  }

  return mask;
}

// ---------------------------------------------------------------------------
// BFS water proximity
// ---------------------------------------------------------------------------

export function computeWaterProximity(terrain, w, h, maxDist = 255) {
  const dist = new Uint8Array(h * w).fill(maxDist);

  // Use a flat queue for BFS (much faster than array shift)
  const queue = new Int32Array(h * w * 2); // pairs of (y, x)
  let qHead = 0, qTail = 0;

  for (let i = 0; i < terrain.length; i++) {
    if (terrain[i] === WATER) {
      dist[i] = 0;
      queue[qTail++] = i; // store flat index
    }
  }

  const dirs = [-w, w, -1, 1]; // up, down, left, right

  while (qHead < qTail) {
    const ci = queue[qHead++];
    const cd = dist[ci];
    if (cd >= maxDist - 1) continue;

    const cy = Math.floor(ci / w);
    const cx = ci % w;

    for (const d of dirs) {
      const ni = ci + d;
      // Bounds check
      if (d === -1 && cx === 0) continue;
      if (d === 1 && cx === w - 1) continue;
      if (ni < 0 || ni >= h * w) continue;

      const nd = cd + 1;
      if (nd < dist[ni]) {
        dist[ni] = nd;
        queue[qTail++] = ni;
      }
    }
  }

  return dist;
}
