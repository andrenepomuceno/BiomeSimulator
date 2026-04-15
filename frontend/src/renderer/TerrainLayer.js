/**
 * TerrainLayer — renders the terrain grid as a single texture with
 * per-channel multi-octave noise, 8-directional multi-radius blending,
 * transition-ordered color mixing, coastal effects, height-based shading,
 * elevation shadows, and water animation.
 *
 * When GPU terrain is available (Phase 2), the CPU pixel buffer becomes
 * the fallback path and the main rendering is done via PIXI.Mesh + shader.
 */
import * as PIXI from 'pixi.js';
import {
  TERRAIN_COLORS, TERRAIN_VAR_RGB, TRANSITION_TINT,
  COASTAL_SHALLOW_WATER, COASTAL_WET_SAND,
  tileHash,
} from '../utils/terrainColors.js';
import { TerrainShader } from './TerrainShader.js';
import { RENDERER_CONFIG } from '../engine/config.js';

function clamp255(v) { return v < 0 ? 0 : v > 255 ? 255 : v | 0; }

// ---------------------------------------------------------------------------
// Post-process blend shader (pass 2):
// Reads the 1px/tile raw terrain texture with LINEAR filtering and applies
// domain warping so tile boundaries follow organic curves.
// ---------------------------------------------------------------------------
const BLEND_VERT_SRC = `
  precision highp float;
  attribute vec2 aVertexPosition;
  attribute vec2 aTextureCoord;
  uniform mat3 translationMatrix;
  uniform mat3 projectionMatrix;
  varying vec2 v_uv;
  void main() {
    v_uv = aTextureCoord;
    gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
  }
`;

const BLEND_FRAG_SRC = `
  precision highp float;
  varying vec2 v_uv;
  uniform sampler2D u_rawTerrain;
  uniform vec2 u_worldSize;

  float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec2 tc = v_uv * u_worldSize;

    // Sharp (unwarped) sample — preserves per-tile detail
    vec4 sharp = texture2D(u_rawTerrain, v_uv);

    // Distance to nearest tile boundary (0.0 at edge, 0.5 at center)
    vec2 tileFrac = fract(tc);
    float distToBorder = min(
      min(tileFrac.x, 1.0 - tileFrac.x),
      min(tileFrac.y, 1.0 - tileFrac.y)
    );
    // borderFactor: 1.0 at tile edges, 0.0 at tile centers
    float borderFactor = 1.0 - smoothstep(0.0, 0.35, distToBorder);

    // Domain warp: adaptive amplitude — strong near borders, mild in interiors
    float warpStr = mix(0.4, 1.8, borderFactor);
    float detailStr = mix(0.1, 0.45, borderFactor);

    float wx = (valueNoise(tc * 0.35 + vec2(13.7, 7.3)) - 0.5) * warpStr
             + (valueNoise(tc * 0.85 + vec2(87.1, 42.5)) - 0.5) * detailStr;
    float wy = (valueNoise(tc * 0.35 + vec2(51.2, 23.1)) - 0.5) * warpStr
             + (valueNoise(tc * 0.85 + vec2(29.4, 73.8)) - 0.5) * detailStr;

    vec2 warpedUV = v_uv + vec2(wx, wy) / u_worldSize;
    warpedUV = clamp(warpedUV, vec2(0.0), vec2(1.0));
    vec4 smooth = texture2D(u_rawTerrain, warpedUV);

    // Adaptive blend: crisp interiors (85% sharp), soft borders (40% sharp)
    float blendRatio = mix(0.15, 0.60, borderFactor);
    gl_FragColor = mix(sharp, smooth, blendRatio);
  }
`;

// ---------------------------------------------------------------------------
// Edge-aware anti-aliasing shader (pass 3):
// Detects color discontinuities at terrain borders and applies a
// cross-shaped Gaussian blur only at edge pixels, leaving flat regions
// untouched.  Bilinear-optimized sampling at half-texel offsets gives
// an effective ~4-texel radius with only 9 texture reads.
// ---------------------------------------------------------------------------
const EDGE_SMOOTH_FRAG_SRC = `
  precision highp float;
  varying vec2 v_uv;
  uniform sampler2D u_input;
  uniform vec2 u_texelSize;

  void main() {
    vec4 center = texture2D(u_input, v_uv);
    vec2 ts = u_texelSize;

    // Inner ring: bilinear samples at ±1.5 texels (covers texels 1-2)
    vec4 h1p = texture2D(u_input, v_uv + vec2( 1.5 * ts.x, 0.0));
    vec4 h1n = texture2D(u_input, v_uv + vec2(-1.5 * ts.x, 0.0));
    vec4 v1p = texture2D(u_input, v_uv + vec2(0.0,  1.5 * ts.y));
    vec4 v1n = texture2D(u_input, v_uv + vec2(0.0, -1.5 * ts.y));

    // Outer ring: bilinear samples at ±3.5 texels (covers texels 3-4)
    vec4 h2p = texture2D(u_input, v_uv + vec2( 3.5 * ts.x, 0.0));
    vec4 h2n = texture2D(u_input, v_uv + vec2(-3.5 * ts.x, 0.0));
    vec4 v2p = texture2D(u_input, v_uv + vec2(0.0,  3.5 * ts.y));
    vec4 v2n = texture2D(u_input, v_uv + vec2(0.0, -3.5 * ts.y));

    // Edge detection: color distance between center and inner samples
    float dH = max(length(h1p.rgb - center.rgb), length(h1n.rgb - center.rgb));
    float dV = max(length(v1p.rgb - center.rgb), length(v1n.rgb - center.rgb));
    float edge = max(dH, dV);

    // Edge mask: 0 for uniform terrain, 1 at biome borders
    float mask = smoothstep(0.03, 0.12, edge);

    // Gaussian-weighted cross blur (effective radius ~4 texels)
    // Weights: 0.25 + 4*0.10 + 4*0.0875 = 1.0
    vec4 blurred = center * 0.25
                 + (h1p + h1n + v1p + v1n) * 0.10
                 + (h2p + h2n + v2p + v2n) * 0.0875;

    gl_FragColor = mix(center, blurred, mask * 0.85);
  }
`;

/**
 * Compute per-tile base colors with per-channel multi-octave noise,
 * height-based brightness, water proximity gradient, and coastal tinting.
 * Writes into baseR/baseG/baseB arrays.
 */
function computeBaseColors(
  terrainData, width, height, heightmap, waterProximity,
  baseR, baseG, baseB,
) {
  const total = width * height;
  for (let i = 0; i < total; i++) {
    const t = terrainData[i];
    const color = TERRAIN_COLORS[t] || [0, 0, 0, 255];
    let r = color[0], g = color[1], b = color[2];

    const x = i % width;
    const y = (i / width) | 0;
    const varAmps = TERRAIN_VAR_RGB[t] || [8, 8, 8];

    // --- Multi-octave per-channel noise ---
    // Octave 1: base frequency, per-channel independent seeds
    const h0 = tileHash(x, y);
    const h1 = tileHash(x + 7919, y + 6271);
    const h2 = tileHash(x + 3571, y + 9929);
    // Octave 2: 3× frequency, blended at 30%
    const h0b = tileHash(x * 3 + 127, y * 3 + 311);
    const h1b = tileHash(x * 3 + 8123, y * 3 + 5987);
    const h2b = tileHash(x * 3 + 4219, y * 3 + 10061);

    const nr = ((h0 - 0.5) * 0.7 + (h0b - 0.5) * 0.3) * 2;
    const ng = ((h1 - 0.5) * 0.7 + (h1b - 0.5) * 0.3) * 2;
    const nb = ((h2 - 0.5) * 0.7 + (h2b - 0.5) * 0.3) * 2;

    r += nr * varAmps[0];
    g += ng * varAmps[1];
    b += nb * varAmps[2];

    // --- Coastal tinting ---
    if (waterProximity) {
      const wp = waterProximity[i];
      // Shallow water near land → lighter cyan
      if ((t === 0) && wp <= 2) {
        const coastF = wp === 0 ? 0.0 : (wp === 1 ? 0.35 : 0.15);
        if (coastF > 0) {
          r += (COASTAL_SHALLOW_WATER[0] - r) * coastF;
          g += (COASTAL_SHALLOW_WATER[1] - g) * coastF;
          b += (COASTAL_SHALLOW_WATER[2] - b) * coastF;
        }
      }
      // Wet sand near water → lighter whitish
      if (t === 1 && wp > 0 && wp <= 2) {
        const sandF = wp === 1 ? 0.30 : 0.12;
        r += (COASTAL_WET_SAND[0] - r) * sandF;
        g += (COASTAL_WET_SAND[1] - g) * sandF;
        b += (COASTAL_WET_SAND[2] - b) * sandF;
      }
      // Water proximity gradient: richer green for SOIL/FERTILE_SOIL
      if (t === 3 || t === 5) {
        if (wp > 0 && wp <= 5) {
          const boost = (5 - wp);
          g += boost * 3;
          r -= boost;
        }
      }
    }

    // --- Height-based brightness (0.88 at sea floor → 1.12 at peaks) ---
    if (heightmap) {
      const bright = 0.88 + heightmap[i] * 0.24;
      r *= bright;
      g *= bright;
      b *= bright;
    }

    baseR[i] = r;
    baseG[i] = g;
    baseB[i] = b;
  }
}

// 8-directional offsets: [dx, dy, weight]
// Cardinals = 1.0, diagonals = 0.707 (1/√2)
const NEIGHBOR_OFFSETS_8 = [
  [0, -1, 1.0],  [-1,  0, 1.0],  [1,  0, 1.0],  [0,  1, 1.0],
  [-1, -1, 0.707], [1, -1, 0.707], [-1, 1, 0.707], [1,  1, 0.707],
];

/**
 * Blend pass: 8-directional neighbor blending with multi-radius support,
 * transition-ordered color mixing, elevation shadows, and directional highlights.
 * Writes final clamped RGBA into the pixels buffer.
 */
function blendAndShade(
  terrainData, width, height, heightmap,
  baseR, baseG, baseB, pixels, waterIdx,
) {
  const total = width * height;

  // --- Pre-compute border distance (Chebyshev, radius 2) ---
  // borderDist[i] = 0 if tile has a different-type neighbor within radius 1,
  //               = 1 if within radius 2, = 2 otherwise (interior).
  const borderDist = new Uint8Array(total);
  borderDist.fill(2);
  for (let i = 0; i < total; i++) {
    const t = terrainData[i];
    const x = i % width;
    const y = (i / width) | 0;
    // Check 8-connected for radius 1 border
    let isBorder = false;
    for (let d = 0; d < 8; d++) {
      const nx = x + NEIGHBOR_OFFSETS_8[d][0];
      const ny = y + NEIGHBOR_OFFSETS_8[d][1];
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        if (terrainData[ny * width + nx] !== t) { isBorder = true; break; }
      }
    }
    if (isBorder) borderDist[i] = 0;
  }
  // Expand radius 1 borders to mark radius 2 neighbors
  for (let i = 0; i < total; i++) {
    if (borderDist[i] !== 2) continue;
    const x = i % width;
    const y = (i / width) | 0;
    for (let d = 0; d < 8; d++) {
      const nx = x + NEIGHBOR_OFFSETS_8[d][0];
      const ny = y + NEIGHBOR_OFFSETS_8[d][1];
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        if (borderDist[ny * width + nx] === 0) { borderDist[i] = 1; break; }
      }
    }
  }

  // --- Blend + shade pass ---
  for (let i = 0; i < total; i++) {
    const x = i % width;
    const y = (i / width) | 0;
    const t = terrainData[i];

    let r = baseR[i], g = baseG[i], b = baseB[i];
    const bd = borderDist[i];

    // Multi-radius 8-directional blending
    if (bd < 2) {
      // Blend factor: radius-0 border tiles get full blend (0.22),
      // radius-1 tiles get lighter blend (0.10)
      const maxBlend = bd === 0 ? 0.22 : 0.10;
      let bR = 0, bG = 0, bB = 0, bW = 0;

      for (let d = 0; d < 8; d++) {
        const nx = x + NEIGHBOR_OFFSETS_8[d][0];
        const ny = y + NEIGHBOR_OFFSETS_8[d][1];
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const ni = ny * width + nx;
        const nt = terrainData[ni];
        if (nt === t) continue;

        const w = NEIGHBOR_OFFSETS_8[d][2];
        // Transition tint: use intermediate color if defined
        const tint = TRANSITION_TINT[t * 16 + nt];
        if (tint) {
          bR += tint[0] * w;
          bG += tint[1] * w;
          bB += tint[2] * w;
        } else {
          bR += baseR[ni] * w;
          bG += baseG[ni] * w;
          bB += baseB[ni] * w;
        }
        bW += w;
      }

      if (bW > 0) {
        const f = maxBlend;
        const inv = 1 - f;
        r = r * inv + (bR / bW) * f;
        g = g * inv + (bG / bW) * f;
        b = b * inv + (bB / bW) * f;
      }
    }

    // Elevation shadow & highlights
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
}

export class TerrainLayer {
  constructor() {
    this.container = new PIXI.Container();
    this.sprite = null;
    this._mesh = null;        // Phase 2 GPU mesh (null until enabled)
    this._shader = null;      // Phase 2 terrain shader
    this.width = 0;
    this.height = 0;
    this._pixels = null;
    this._terrainData = null;
    this._heightmap = null;
    this._waterProximity = null;
    this._waterIndices = null;
    this._waterBaseColors = null;
    this.useGPU = false;      // Phase 2 flag
    // RTT cache state
    this._rawCacheRT = null;    // Pass 1: 1px/tile terrain colors (LINEAR)
    this._cachedRT = null;      // Pass 2: smooth blended output (Npx/tile)
    this._cachedSprite = null;  // Sprite displaying the cached texture
    this._blendMesh = null;     // Post-process blend mesh
    this._blendShader = null;   // Post-process blend shader
    this._blendOutW = 0;
    this._blendOutH = 0;
    this._edgeOutW = 0;
    this._edgeOutH = 0;
    this._cacheEnabled = false; // Set by enableGPU()
    this._cacheDirty = false;   // Set when terrain changes
    this._cacheScale = 1;       // Pixels per tile in smooth cache
    this._renderer = null;      // PIXI.Renderer ref (set via setRenderer)
  }

  /**
   * Provide reference to the PIXI renderer for RTT.
   * Must be called before setTerrain() if cache is enabled.
   */
  setRenderer(renderer) {
    this._renderer = renderer;
  }

  setTerrain(terrainData, width, height, heightmap, waterProximity) {
    this.width = width;
    this.height = height;
    this._terrainData = terrainData;
    this._heightmap = heightmap || null;
    this._waterProximity = waterProximity || null;

    // GPU path: build data textures + mesh
    if (this.useGPU) {
      this._buildGPUTerrain(terrainData, width, height, heightmap, waterProximity);
      return;
    }

    // CPU fallback path: compute pixel buffer
    this._buildCPUTerrain(terrainData, width, height, heightmap, waterProximity);
  }

  _buildCPUTerrain(terrainData, width, height, heightmap, waterProximity) {
    const total = width * height;
    const pixels = new Uint8Array(total * 4);
    const baseR = new Float32Array(total);
    const baseG = new Float32Array(total);
    const baseB = new Float32Array(total);

    // Pass 1: base colors
    computeBaseColors(
      terrainData, width, height, heightmap, waterProximity,
      baseR, baseG, baseB,
    );

    // Pass 2: blend + shade
    const waterIdx = [];
    blendAndShade(
      terrainData, width, height, heightmap,
      baseR, baseG, baseB, pixels, waterIdx,
    );

    // Store water tile info for animated sparkle
    this._waterIndices = new Uint32Array(waterIdx);
    this._waterBaseColors = new Uint8Array(waterIdx.length * 3);
    for (let j = 0; j < waterIdx.length; j++) {
      const pi = waterIdx[j] * 4;
      this._waterBaseColors[j * 3]     = pixels[pi];
      this._waterBaseColors[j * 3 + 1] = pixels[pi + 1];
      this._waterBaseColors[j * 3 + 2] = pixels[pi + 2];
    }

    this._pixels = pixels;

    // Create / replace Pixi texture + sprite
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
   * Re-computes per-tile color with multi-octave per-channel noise and height shading.
   */
  updateTiles(changes) {
    // GPU path delegates to data texture update
    if (this.useGPU && this._shader) {
      this._updateTilesGPU(changes);
      return;
    }

    if (!this._pixels || !this.sprite) return;

    for (const { x, y, terrain } of changes) {
      const i = y * this.width + x;
      const pi = i * 4;
      if (this._terrainData) this._terrainData[i] = terrain;

      const color = TERRAIN_COLORS[terrain] || [0, 0, 0, 255];
      let r = color[0], g = color[1], b = color[2];
      const varAmps = TERRAIN_VAR_RGB[terrain] || [8, 8, 8];

      // Multi-octave per-channel noise (same as setTerrain pass 1)
      const h0 = tileHash(x, y);
      const h1 = tileHash(x + 7919, y + 6271);
      const h2 = tileHash(x + 3571, y + 9929);
      const h0b = tileHash(x * 3 + 127, y * 3 + 311);
      const h1b = tileHash(x * 3 + 8123, y * 3 + 5987);
      const h2b = tileHash(x * 3 + 4219, y * 3 + 10061);

      r += ((h0 - 0.5) * 0.7 + (h0b - 0.5) * 0.3) * 2 * varAmps[0];
      g += ((h1 - 0.5) * 0.7 + (h1b - 0.5) * 0.3) * 2 * varAmps[1];
      b += ((h2 - 0.5) * 0.7 + (h2b - 0.5) * 0.3) * 2 * varAmps[2];

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
   * Skipped when GPU path is active (shader handles water animation).
   */
  animateWater(tick) {
    if (this.useGPU && this._shader) return;
    if (!this._waterIndices || !this._pixels || !this.sprite) return;

    const indices = this._waterIndices;
    const base = this._waterBaseColors;
    const pixels = this._pixels;
    const w = this.width;

    for (let j = 0; j < indices.length; j++) {
      const idx = indices[j];
      const x = idx % w;
      const y = (idx / w) | 0;

      const bj = j * 3;
      const pi = idx * 4;

      let r = base[bj], g = base[bj + 1], b = base[bj + 2];

      const h = ((x * 374761393 + y * 668265263) ^ 0x5deece66d) >>> 0;
      const sparklePhase = (h + tick) % 6000;

      if (sparklePhase < 50) {
        const t = sparklePhase / 49;
        const intensity = Math.sin(t * Math.PI) * 30;
        r += intensity;
        g += intensity;
        b += intensity * 0.7;
      }

      pixels[pi]     = clamp255(r);
      pixels[pi + 1] = clamp255(g);
      pixels[pi + 2] = clamp255(b);
    }

    this.sprite.texture.baseTexture.resource.data = pixels;
    this.sprite.texture.baseTexture.resource.update();
    this.sprite.texture.baseTexture.update();
  }

  // --- Phase 2 GPU implementation ---

  /**
   * Enable GPU rendering path.  Call before setTerrain() to take effect.
   */
  enableGPU() {
    this.useGPU = true;
    this._cacheEnabled = RENDERER_CONFIG.cacheStaticTerrain;
    if (!this._shader) {
      this._shaderWrapper = new TerrainShader();
    }
  }

  _buildGPUTerrain(terrainData, width, height, heightmap, waterProximity) {
    if (!this._shaderWrapper) this._shaderWrapper = new TerrainShader();
    const shader = this._shaderWrapper.build(
      terrainData, width, height, heightmap, waterProximity,
    );
    this._shader = shader;

    // Build a quad geometry covering [0, 0] → [width, height] world units
    const geometry = new PIXI.Geometry()
      .addAttribute('aVertexPosition', [
        0, 0,
        width, 0,
        width, height,
        0, height,
      ], 2)
      .addAttribute('aTextureCoord', [
        0, 0,
        1, 0,
        1, 1,
        0, 1,
      ], 2)
      .addIndex([0, 1, 2, 0, 2, 3]);

    // Remove old sprite/mesh/cache
    if (this._cachedSprite) {
      this.container.removeChild(this._cachedSprite);
      this._cachedSprite.destroy();
      this._cachedSprite = null;
    }
    if (this.sprite) {
      this.container.removeChild(this.sprite);
      this.sprite.destroy(true);
      this.sprite = null;
    }
    if (this._mesh) {
      this.container.removeChild(this._mesh);
      this._mesh.destroy(true);
    }

    this._mesh = new PIXI.Mesh(geometry, shader);

    // RTT cache: render the mesh once to a RenderTexture, display via Sprite
    if (this._cacheEnabled && this._renderer) {
      // Mesh is not added to stage — only used as RTT source
      this._renderToCache();
    } else {
      // No cache: display mesh directly (per-frame shader)
      this.container.addChild(this._mesh);
    }
  }

  /**
   * Two-pass render-to-cache pipeline:
   *  Pass 1 — terrain shader → raw 1px/tile texture (per-tile colors)
   *  Pass 2 — blend shader reads raw texture with LINEAR filtering +
   *           domain warping → smooth Npx/tile output
   */
  _renderToCache() {
    if (!this._mesh || !this._renderer) return;

    const w = this.width;
    const h = this.height;

    // Compute output scale first — used by both passes
    const maxDim = 4096;
    const scale = Math.min(
      RENDERER_CONFIG.cacheResolution || 8,
      Math.max(1, Math.floor(maxDim / Math.max(w, h))),
    );
    this._cacheScale = scale;
    const outW = w * scale;
    const outH = h * scale;

    // --- Pass 1: render terrain shader at Npx/tile (LINEAR) ---
    // Rendering at full resolution lets sub-tile patterns (grass blades,
    // sand ripples, rock cracks) produce real fragment variation.
    if (!this._rawCacheRT || this._rawCacheRT.width !== outW || this._rawCacheRT.height !== outH) {
      if (this._rawCacheRT) this._rawCacheRT.destroy(true);
      this._rawCacheRT = PIXI.RenderTexture.create({
        width: outW,
        height: outH,
        scaleMode: PIXI.SCALE_MODES.LINEAR,
        resolution: 1,
      });
    }
    this._mesh.scale.set(scale);
    this._renderer.render(this._mesh, { renderTexture: this._rawCacheRT });
    this._mesh.scale.set(1);

    // --- Pass 2: adaptive domain-warp blend → organic borders ---

    // Create / update blend mesh
    const needsBlendRebuild = !this._blendMesh || this._blendOutW !== outW || this._blendOutH !== outH;
    if (needsBlendRebuild) {
      if (this._blendMesh) {
        this._blendMesh.destroy(true);
        this._blendMesh = null;
      }
      this._blendShader = PIXI.Shader.from(BLEND_VERT_SRC, BLEND_FRAG_SRC, {
        u_rawTerrain: this._rawCacheRT,
        u_worldSize: [w, h],
      });
      const geo = new PIXI.Geometry()
        .addAttribute('aVertexPosition', [0, 0, outW, 0, outW, outH, 0, outH], 2)
        .addAttribute('aTextureCoord', [0, 0, 1, 0, 1, 1, 0, 1], 2)
        .addIndex([0, 1, 2, 0, 2, 3]);
      this._blendMesh = new PIXI.Mesh(geo, this._blendShader);
      this._blendOutW = outW;
      this._blendOutH = outH;
    } else {
      this._blendShader.uniforms.u_rawTerrain = this._rawCacheRT;
      this._blendShader.uniforms.u_worldSize = [w, h];
    }

    // Intermediate RT for blend output (input for Pass 3)
    if (!this._blendedRT || this._blendedRT.width !== outW || this._blendedRT.height !== outH) {
      if (this._blendedRT) this._blendedRT.destroy(true);
      this._blendedRT = PIXI.RenderTexture.create({
        width: outW,
        height: outH,
        scaleMode: PIXI.SCALE_MODES.LINEAR,
        resolution: 1,
      });
    }
    this._renderer.render(this._blendMesh, { renderTexture: this._blendedRT });

    // --- Pass 3: edge-aware anti-aliasing → soft biome borders ---

    const needsEdgeRebuild = !this._edgeMesh || this._edgeOutW !== outW || this._edgeOutH !== outH;
    if (needsEdgeRebuild) {
      if (this._edgeMesh) {
        this._edgeMesh.destroy(true);
        this._edgeMesh = null;
      }
      this._edgeShader = PIXI.Shader.from(BLEND_VERT_SRC, EDGE_SMOOTH_FRAG_SRC, {
        u_input: this._blendedRT,
        u_texelSize: [1.0 / outW, 1.0 / outH],
      });
      const geo = new PIXI.Geometry()
        .addAttribute('aVertexPosition', [0, 0, outW, 0, outW, outH, 0, outH], 2)
        .addAttribute('aTextureCoord', [0, 0, 1, 0, 1, 1, 0, 1], 2)
        .addIndex([0, 1, 2, 0, 2, 3]);
      this._edgeMesh = new PIXI.Mesh(geo, this._edgeShader);
      this._edgeOutW = outW;
      this._edgeOutH = outH;
    } else {
      this._edgeShader.uniforms.u_input = this._blendedRT;
      this._edgeShader.uniforms.u_texelSize = [1.0 / outW, 1.0 / outH];
    }

    // Final output RT
    if (!this._cachedRT || this._cachedRT.width !== outW || this._cachedRT.height !== outH) {
      if (this._cachedRT) this._cachedRT.destroy(true);
      this._cachedRT = PIXI.RenderTexture.create({
        width: outW,
        height: outH,
        scaleMode: PIXI.SCALE_MODES.LINEAR,
        resolution: 1,
      });
    }
    this._renderer.render(this._edgeMesh, { renderTexture: this._cachedRT });

    // Display sprite — scale from Npx/tile back to 1 tile per world unit
    if (!this._cachedSprite) {
      this._cachedSprite = new PIXI.Sprite(this._cachedRT);
      this.container.addChild(this._cachedSprite);
    } else {
      this._cachedSprite.texture = this._cachedRT;
    }
    this._cachedSprite.width = w;
    this._cachedSprite.height = h;

    this._cacheDirty = false;
  }

  /**
   * Re-render the cache after terrain edits or water animation updates.
   * Cheap for occasional calls; avoid calling every frame.
   */
  refreshCache() {
    if (!this._cacheEnabled || !this._mesh || !this._renderer) return;
    this._renderToCache();
  }

  _updateTilesGPU(changes) {
    if (!this._shaderWrapper) return;
    // Update terrain data array
    if (this._terrainData) {
      for (const { x, y, terrain } of changes) {
        this._terrainData[y * this.width + x] = terrain;
      }
    }
    this._shaderWrapper.updateTiles(changes, this._terrainData, this._heightmap);

    // Mark cache dirty so next refreshCache() re-renders
    if (this._cacheEnabled) {
      this._cacheDirty = true;
      // Immediately refresh for interactive terrain editing responsiveness
      this.refreshCache();
    }
  }

  /**
   * Update shader time uniform for GPU water animation.
   * Called from render loop when GPU path is active.
   */
  updateShaderTime(tick) {
    if (this._shader) this._shader.uniforms.u_time = tick;
  }

  /**
   * Whether the terrain cache is active (RTT mode).
   */
  get isCached() {
    return this._cacheEnabled && this._cachedRT != null;
  }

  destroy() {
    if (this._cachedSprite) { this._cachedSprite.destroy(); this._cachedSprite = null; }
    if (this._cachedRT) { this._cachedRT.destroy(true); this._cachedRT = null; }
    if (this._blendedRT) { this._blendedRT.destroy(true); this._blendedRT = null; }
    if (this._rawCacheRT) { this._rawCacheRT.destroy(true); this._rawCacheRT = null; }
    if (this._edgeMesh) { this._edgeMesh.destroy(true); this._edgeMesh = null; }
    this._edgeShader = null;
    this._edgeOutW = 0;
    this._edgeOutH = 0;
    if (this._blendMesh) { this._blendMesh.destroy(true); this._blendMesh = null; }
    this._blendShader = null;
    this._blendOutW = 0;
    this._blendOutH = 0;
    if (this.sprite) { this.sprite.destroy(true); this.sprite = null; }
    if (this._mesh) { this._mesh.destroy(true); this._mesh = null; }
    this._shader = null;
    this._pixels = null;
    this._waterIndices = null;
    this._waterBaseColors = null;
    this._renderer = null;
  }
}
