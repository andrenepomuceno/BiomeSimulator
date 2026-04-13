/**
 * TerrainLayer — renders the terrain grid as a single texture with
 * per-tile color variation, height-based shading, neighbor blending,
 * and elevation shadows.
 */
import * as PIXI from 'pixi.js';
import { TERRAIN_COLORS, tileHash } from '../utils/terrainColors';

// Per-terrain hash variation amplitude (max ± per RGB channel)
const TERRAIN_VAR = [
  6,   // 0 WATER
  12,  // 1 SAND
  10,  // 2 DIRT
  10,  // 3 SOIL
  15,  // 4 ROCK
  8,   // 5 FERTILE_SOIL
  5,   // 6 DEEP_WATER
  15,  // 7 MOUNTAIN
  10,  // 8 MUD
];

function clamp255(v) { return v < 0 ? 0 : v > 255 ? 255 : v | 0; }

export class TerrainLayer {
  constructor() {
    this.container = new PIXI.Container();
    this.sprite = null;
    this.width = 0;
    this.height = 0;
    this._pixels = null;
    this._terrainData = null;
    this._heightmap = null;
    this._waterProximity = null;
    // Water tile tracking for animated water (Phase 2)
    this._waterIndices = null;
    this._waterBaseColors = null;
  }

  setTerrain(terrainData, width, height, heightmap, waterProximity) {
    this.width = width;
    this.height = height;
    this._terrainData = terrainData;
    this._heightmap = heightmap || null;
    this._waterProximity = waterProximity || null;

    const total = width * height;
    const pixels = new Uint8Array(total * 4);

    // --- Pass 1: base color + hash variation + height shading + water proximity ---
    const baseR = new Float32Array(total);
    const baseG = new Float32Array(total);
    const baseB = new Float32Array(total);

    for (let i = 0; i < total; i++) {
      const t = terrainData[i];
      const color = TERRAIN_COLORS[t] || [0, 0, 0, 255];
      let r = color[0], g = color[1], b = color[2];

      const x = i % width;
      const y = (i / width) | 0;

      // Hash-based per-tile color variation
      const h = tileHash(x, y);
      const v = (h - 0.5) * 2 * (TERRAIN_VAR[t] || 8);
      r += v;
      g += v;
      b += v;

      // Height-based brightness (0.88 at sea floor → 1.12 at peaks)
      if (heightmap) {
        const bright = 0.88 + heightmap[i] * 0.24;
        r *= bright;
        g *= bright;
        b *= bright;
      }

      // Water proximity gradient: richer green for SOIL/FERTILE_SOIL near water
      if (waterProximity && (t === 3 || t === 5)) {
        const wp = waterProximity[i];
        if (wp > 0 && wp <= 5) {
          const boost = (5 - wp);
          g += boost * 3;
          r -= boost;
        }
      }

      baseR[i] = r;
      baseG[i] = g;
      baseB[i] = b;
    }

    // --- Pass 2: neighbor blending + elevation shadow + edge highlights ---
    const waterIdx = [];

    for (let i = 0; i < total; i++) {
      const x = i % width;
      const y = (i / width) | 0;
      const t = terrainData[i];

      let r = baseR[i], g = baseG[i], b = baseB[i];

      // Neighbor blending: soften terrain transitions
      let bR = 0, bG = 0, bB = 0, bN = 0;
      if (y > 0 && terrainData[i - width] !== t) {
        bR += baseR[i - width]; bG += baseG[i - width]; bB += baseB[i - width]; bN++;
      }
      if (y < height - 1 && terrainData[i + width] !== t) {
        bR += baseR[i + width]; bG += baseG[i + width]; bB += baseB[i + width]; bN++;
      }
      if (x > 0 && terrainData[i - 1] !== t) {
        bR += baseR[i - 1]; bG += baseG[i - 1]; bB += baseB[i - 1]; bN++;
      }
      if (x < width - 1 && terrainData[i + 1] !== t) {
        bR += baseR[i + 1]; bG += baseG[i + 1]; bB += baseB[i + 1]; bN++;
      }
      if (bN > 0) {
        const f = 0.20;
        const inv = 1 - f;
        r = r * inv + (bR / bN) * f;
        g = g * inv + (bG / bN) * f;
        b = b * inv + (bB / bN) * f;
      }

      // Elevation shadow: darken tiles south of higher terrain (sun from south)
      if (heightmap) {
        const hHere = heightmap[i];
        let shadow = 1.0;
        if (y > 0) {
          const hN = heightmap[i - width];
          if (hN > hHere) shadow -= Math.min(0.12, (hN - hHere) * 0.8);
        }
        if (y > 0 && x > 0) {
          const hNW = heightmap[i - width - 1];
          if (hNW > hHere) shadow -= Math.min(0.08, (hNW - hHere) * 0.5);
        }
        r *= shadow;
        g *= shadow;
        b *= shadow;

        // Mountain/rock south-face highlight (directional light)
        if ((t === 7 || t === 4) && y < height - 1) {
          const hS = heightmap[i + width];
          if (hS < hHere) {
            const hl = 1 + Math.min(0.15, (hHere - hS) * 0.6);
            r *= hl;
            g *= hl;
            b *= hl;
          }
        }
      }

      const pi = i * 4;
      pixels[pi]     = clamp255(r);
      pixels[pi + 1] = clamp255(g);
      pixels[pi + 2] = clamp255(b);
      pixels[pi + 3] = 255;

      if (t === 0 || t === 6) waterIdx.push(i);
    }

    // Store water tile info for animated water (Phase 2)
    this._waterIndices = new Uint32Array(waterIdx);
    this._waterBaseColors = new Uint8Array(waterIdx.length * 3);
    for (let j = 0; j < waterIdx.length; j++) {
      const pi = waterIdx[j] * 4;
      this._waterBaseColors[j * 3]     = pixels[pi];
      this._waterBaseColors[j * 3 + 1] = pixels[pi + 1];
      this._waterBaseColors[j * 3 + 2] = pixels[pi + 2];
    }

    this._pixels = pixels;

    // Create texture from pixel data
    const resource = new PIXI.BufferResource(pixels, { width, height });
    const baseTexture = new PIXI.BaseTexture(resource, {
      format: PIXI.FORMATS.RGBA,
      type: PIXI.TYPES.UNSIGNED_BYTE,
      scaleMode: PIXI.SCALE_MODES.NEAREST,
      width,
      height,
    });
    const texture = new PIXI.Texture(baseTexture);

    if (this.sprite) {
      this.container.removeChild(this.sprite);
      this.sprite.destroy();
    }

    this.sprite = new PIXI.Sprite(texture);
    this.container.addChild(this.sprite);
  }

  /**
   * Update individual terrain tiles (for editor).
   */
  updateTiles(changes) {
    if (!this._pixels || !this.sprite) return;

    for (const { x, y, terrain } of changes) {
      const i = y * this.width + x;
      const pi = i * 4;
      if (this._terrainData) this._terrainData[i] = terrain;

      const color = TERRAIN_COLORS[terrain] || [0, 0, 0, 255];
      let r = color[0], g = color[1], b = color[2];

      // Apply hash variation
      const h = tileHash(x, y);
      const v = (h - 0.5) * 2 * (TERRAIN_VAR[terrain] || 8);
      r += v;
      g += v;
      b += v;

      // Height-based brightness
      if (this._heightmap) {
        const bright = 0.88 + this._heightmap[i] * 0.24;
        r *= bright;
        g *= bright;
        b *= bright;
      }

      this._pixels[pi]     = clamp255(r);
      this._pixels[pi + 1] = clamp255(g);
      this._pixels[pi + 2] = clamp255(b);
      this._pixels[pi + 3] = 255;
    }

    // Re-upload texture
    this.sprite.texture.baseTexture.resource.data = this._pixels;
    this.sprite.texture.baseTexture.resource.update();
    this.sprite.texture.baseTexture.update();
  }

  /**
   * Animate water tiles with sine-based color shimmer.
   * Call from render loop, throttled (every 6–8 frames).
   */
  animateWater(tick) {
    if (!this._waterIndices || !this._pixels || !this.sprite) return;

    const indices = this._waterIndices;
    const base = this._waterBaseColors;
    const pixels = this._pixels;
    const w = this.width;
    const t1 = tick * 0.15;
    const t2 = tick * 0.05;

    for (let j = 0; j < indices.length; j++) {
      const idx = indices[j];
      const x = idx % w;
      const y = (idx / w) | 0;

      // Primary shimmer: fast, localized ripple
      const wave1 = Math.sin(t1 + x * 0.3 + y * 0.2) * 12;
      // Secondary rolling wave: slow, large-scale motion
      const wave2 = Math.sin(t2 + x * 0.1 + y * 0.08) * 8;
      const shift = wave1 + wave2;

      const bj = j * 3;
      const pi = idx * 4;
      pixels[pi]     = clamp255(base[bj]     + shift * 0.4);
      pixels[pi + 1] = clamp255(base[bj + 1] + shift * 0.6);
      pixels[pi + 2] = clamp255(base[bj + 2] + shift);
    }

    this.sprite.texture.baseTexture.resource.data = pixels;
    this.sprite.texture.baseTexture.resource.update();
    this.sprite.texture.baseTexture.update();
  }
}
