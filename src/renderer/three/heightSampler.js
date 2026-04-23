/**
 * Terrain height sampler — converts the engine heightmap into a world-space
 * Z function that the renderer (terrain mesh, entities, plants, items) can
 * query to follow the elevation profile.
 *
 * Input:
 *   heightmap   Float32Array length w*h, normalized [0,1] (post edge-falloff)
 *   terrain     Uint8Array length w*h, terrain type per tile
 *   width, height  map dimensions in tiles
 *   scale       max vertical displacement in world units (tile units)
 *
 * Output API:
 *   sampler.scale                 the scale used (cached)
 *   sampler.sampleAt(x, y)        bilinear height in world units, water flat
 *   sampler.sampleVertex(i, j)    corner-vertex height (avg of 4 surrounding
 *                                 tiles), used for terrain mesh displacement
 *
 * Water tiles (WATER=0, DEEP_WATER=6) are flattened to TERRAIN_WATER_BASE_Z
 * so seas and lakes stay level instead of forming a sloped basin.
 */

import { TERRAIN_WATER_BASE_Z } from './rendererConfig.js';

const WATER_TYPE = 0;
const DEEP_WATER_TYPE = 6;

function isWaterType(t) {
  return t === WATER_TYPE || t === DEEP_WATER_TYPE;
}

export function buildHeightSampler(heightmap, terrain, width, height, scale) {
  const w = width | 0;
  const h = height | 0;
  const hm = heightmap;
  const td = terrain;

  // Fallback flat sampler when no heightmap is available.
  if (!hm || !td || w <= 0 || h <= 0) {
    return {
      scale: 0,
      width: w,
      height: h,
      sampleAt: () => 0,
      sampleVertex: () => 0,
    };
  }

  /**
   * Bilinear height in world units at a continuous tile position (x, y),
   * where (0,0) is the top-left of tile (0,0) and (w,h) is the bottom-right
   * of tile (w-1,h-1). Used by entity/plant/item layers to follow the
   * terrain surface.
   */
  function sampleAt(x, y) {
    // Convert from tile space (corner) to tile-center space for sampling.
    // Heightmap stores one value per tile center.
    const fx = x - 0.5;
    const fy = y - 0.5;
    const ix = Math.max(0, Math.min(w - 1, Math.floor(fx)));
    const iy = Math.max(0, Math.min(h - 1, Math.floor(fy)));
    const ix1 = Math.min(w - 1, ix + 1);
    const iy1 = Math.min(h - 1, iy + 1);
    const tx = Math.max(0, Math.min(1, fx - ix));
    const ty = Math.max(0, Math.min(1, fy - iy));

    const i00 = iy * w + ix;
    const i10 = iy * w + ix1;
    const i01 = iy1 * w + ix;
    const i11 = iy1 * w + ix1;

    const t00 = td[i00];
    const t10 = td[i10];
    const t01 = td[i01];
    const t11 = td[i11];

    // If all 4 surrounding tiles are water → flat water level.
    if (isWaterType(t00) && isWaterType(t10) && isWaterType(t01) && isWaterType(t11)) {
      return TERRAIN_WATER_BASE_Z;
    }

    // Treat water samples as the water base so coastlines transition smoothly
    // without dragging the land down.
    const h00 = isWaterType(t00) ? 0 : hm[i00];
    const h10 = isWaterType(t10) ? 0 : hm[i10];
    const h01 = isWaterType(t01) ? 0 : hm[i01];
    const h11 = isWaterType(t11) ? 0 : hm[i11];

    const a = h00 * (1 - tx) + h10 * tx;
    const b = h01 * (1 - tx) + h11 * tx;
    const v = a * (1 - ty) + b * ty;
    return v * scale;
  }

  /**
   * Vertex-height for the terrain mesh: a vertex sits on the corner shared
   * by up to 4 tiles. Average those tiles' heights, flattening to water
   * base if every neighbor is water. Indices i,j are integers in
   * [0..w] x [0..h].
   */
  function sampleVertex(i, j) {
    let sum = 0;
    let n = 0;
    let allWater = true;
    for (let dy = -1; dy <= 0; dy++) {
      for (let dx = -1; dx <= 0; dx++) {
        const xx = i + dx;
        const yy = j + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const idx = yy * w + xx;
        const t = td[idx];
        if (!isWaterType(t)) allWater = false;
        sum += isWaterType(t) ? 0 : hm[idx];
        n++;
      }
    }
    if (n === 0) return TERRAIN_WATER_BASE_Z;
    if (allWater) return TERRAIN_WATER_BASE_Z;
    return (sum / n) * scale;
  }

  return {
    scale,
    width: w,
    height: h,
    sampleAt,
    sampleVertex,
  };
}
