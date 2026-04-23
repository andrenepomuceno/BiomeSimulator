/**
 * Terrain height sampler — converts the engine heightmap into a world-space
 * Z function that the renderer (terrain mesh, entities, plants, items) can
 * query to follow the elevation profile.
 *
 * Strategy: every tile (land or water) is displaced by its heightmap value.
 * Water bodies naturally sit below adjacent land because the generator
 * classifies a tile as water precisely when its height falls below the sea
 * level threshold; rivers are carved along the height gradient
 * (see `generateRivers` in engine/mapGenerator.js), so they descend smoothly
 * from mountains to the sea without any special handling here.
 *
 * This keeps the sampler branch-free in the hot path (no water check per
 * sample) and makes the 3D volume a direct visualization of the heightmap,
 * so water naturally fills the valleys instead of revealing bare basins.
 */

export function buildHeightSampler(heightmap, terrain, width, height, scale) {
  const w = width | 0;
  const h = height | 0;
  const hm = heightmap;

  // Fallback flat sampler when no heightmap is available.
  if (!hm || w <= 0 || h <= 0) {
    return {
      scale: 0,
      width: w,
      height: h,
      sampleAt: () => 0,
      sampleVertex: () => 0,
    };
  }

  /**
   * Bilinear height in world units at a continuous tile position (x, y).
   * (0,0) is the top-left corner of tile (0,0); (w,h) is the bottom-right
   * of tile (w-1,h-1). Used by entity/plant/item layers to follow the
   * terrain surface.
   */
  function sampleAt(x, y) {
    // Convert from tile-corner space to tile-center space (heightmap stores
    // one value per tile center).
    const fx = x - 0.5;
    const fy = y - 0.5;
    const ix = fx < 0 ? 0 : (fx > w - 1 ? w - 1 : Math.floor(fx));
    const iy = fy < 0 ? 0 : (fy > h - 1 ? h - 1 : Math.floor(fy));
    const ix1 = ix + 1 >= w ? w - 1 : ix + 1;
    const iy1 = iy + 1 >= h ? h - 1 : iy + 1;
    const tx = fx < ix ? 0 : (fx > ix + 1 ? 1 : fx - ix);
    const ty = fy < iy ? 0 : (fy > iy + 1 ? 1 : fy - iy);

    const h00 = hm[iy * w + ix];
    const h10 = hm[iy * w + ix1];
    const h01 = hm[iy1 * w + ix];
    const h11 = hm[iy1 * w + ix1];

    const a = h00 * (1 - tx) + h10 * tx;
    const b = h01 * (1 - tx) + h11 * tx;
    return (a * (1 - ty) + b * ty) * scale;
  }

  /**
   * Vertex-height for the terrain mesh: a vertex sits on the corner shared
   * by up to 4 tiles. Averages their heights. Indices i, j are integers in
   * [0..w] x [0..h].
   */
  function sampleVertex(i, j) {
    let sum = 0;
    let n = 0;
    for (let dy = -1; dy <= 0; dy++) {
      const yy = j + dy;
      if (yy < 0 || yy >= h) continue;
      for (let dx = -1; dx <= 0; dx++) {
        const xx = i + dx;
        if (xx < 0 || xx >= w) continue;
        sum += hm[yy * w + xx];
        n++;
      }
    }
    if (n === 0) return 0;
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
