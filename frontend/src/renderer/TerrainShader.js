/**
 * TerrainShader — custom PIXI.Shader for GPU-based terrain rendering.
 *
 * Terrain type, heightmap, and water proximity are uploaded as 1px/tile
 * data textures.  All sub-tile procedural detail, border blending, height
 * shading, elevation shadows, coastal tinting, and water animation are
 * computed per-fragment on the GPU.
 */
import * as PIXI from 'pixi.js';
import { TERRAIN_COLORS, TERRAIN_VAR_RGB, COASTAL_SHALLOW_WATER, COASTAL_WET_SAND } from '../utils/terrainColors.js';

// ---------------------------------------------------------------------------
// GLSL source
// ---------------------------------------------------------------------------

const VERT_SRC = `
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

const FRAG_SRC = `
  precision highp float;

  varying vec2 v_uv;

  // Data textures (NEAREST sampling, 1px/tile)
  uniform sampler2D u_terrain;     // R = terrain type (0-8) encoded as float
  uniform sampler2D u_heightmap;   // R = elevation [0,1]
  uniform sampler2D u_waterProx;   // R = water proximity (0-255 encoded)

  uniform vec2  u_worldSize;       // [width, height] in tiles
  uniform float u_time;            // animation tick
  uniform vec3  u_colors[9];       // base color per terrain type (0-1 range)
  uniform vec3  u_varAmps[9];      // per-channel noise amplitude (0-1 range)
  uniform vec3  u_coastShallow;    // coastal shallow water color (0-1)
  uniform vec3  u_coastWetSand;    // coastal wet sand color (0-1)

  // --- Hash-based noise ---
  float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  float hash31(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
  }

  // Value noise with smooth interpolation
  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f); // smoothstep
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  // Multi-octave noise
  float fbm(vec2 p, int octaves) {
    float val = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      if (i >= octaves) break;
      val += amp * valueNoise(p);
      p *= 2.17;
      amp *= 0.5;
    }
    return val;
  }

  // --- Terrain type sampling ---
  // Terrain type is stored in the R channel as type/255.0
  int sampleTerrain(vec2 tileCoord) {
    vec2 uv = (floor(tileCoord) + 0.5) / u_worldSize;
    float raw = texture2D(u_terrain, uv).r;
    return int(raw * 255.0 + 0.5);
  }

  float sampleHeight(vec2 tileCoord) {
    vec2 uv = (floor(tileCoord) + 0.5) / u_worldSize;
    return texture2D(u_heightmap, uv).r;
  }

  float sampleWaterProx(vec2 tileCoord) {
    vec2 uv = (floor(tileCoord) + 0.5) / u_worldSize;
    return texture2D(u_waterProx, uv).r * 255.0;
  }

  vec3 getTerrainColor(int t) {
    // Unrolled lookup (GLSL ES 1.0 doesn't support dynamic array indexing reliably)
    if (t == 0) return u_colors[0];
    if (t == 1) return u_colors[1];
    if (t == 2) return u_colors[2];
    if (t == 3) return u_colors[3];
    if (t == 4) return u_colors[4];
    if (t == 5) return u_colors[5];
    if (t == 6) return u_colors[6];
    if (t == 7) return u_colors[7];
    if (t == 8) return u_colors[8];
    return vec3(0.0);
  }

  vec3 getVarAmps(int t) {
    if (t == 0) return u_varAmps[0];
    if (t == 1) return u_varAmps[1];
    if (t == 2) return u_varAmps[2];
    if (t == 3) return u_varAmps[3];
    if (t == 4) return u_varAmps[4];
    if (t == 5) return u_varAmps[5];
    if (t == 6) return u_varAmps[6];
    if (t == 7) return u_varAmps[7];
    if (t == 8) return u_varAmps[8];
    return vec3(0.03);
  }

  // --- Per-terrain-type sub-tile pattern ---
  // Each terrain type gets a unique, clearly visible internal texture
  // that breaks the grid appearance and gives each tile visual richness.

  // Grass blade pattern: thin vertical streaks
  float grassBlades(vec2 p) {
    // Multiple layers of thin vertical lines at different frequencies
    float b1 = sin(p.x * 25.0 + valueNoise(p * 3.0) * 5.0) * 0.5 + 0.5;
    float b2 = sin(p.x * 40.0 + p.y * 3.0 + valueNoise(p * 5.0) * 3.0) * 0.5 + 0.5;
    float b3 = sin(p.x * 15.0 - p.y * 2.0 + valueNoise(p * 2.0) * 4.0) * 0.5 + 0.5;
    // Combine with varying intensity
    float blades = b1 * 0.4 + b2 * 0.35 + b3 * 0.25;
    // Add some clumping via low-freq noise
    float clump = valueNoise(p * 1.5);
    return blades * mix(0.6, 1.0, clump);
  }

  // Sand grain / ripple pattern
  float sandGrain(vec2 p) {
    // Fine dots (high-freq hash for individual grains)
    float grain = hash21(floor(p * 12.0)) * 0.5;
    // Wind ripples (elongated low-freq waves)
    float ripple = sin(p.x * 8.0 + p.y * 2.5 + valueNoise(p * 2.0) * 3.0) * 0.5 + 0.5;
    // Combine
    return grain * 0.4 + ripple * 0.6;
  }

  // Dirt / earth chunky pattern
  float dirtPattern(vec2 p) {
    // Coarse lumps
    float lumps = valueNoise(p * 6.0);
    // Small pebbles (scattered dots)
    float pebble = step(0.85, hash21(floor(p * 10.0)));
    // Cracks between clumps
    float crack = abs(valueNoise(p * 8.0) - 0.5) * 2.0;
    crack = smoothstep(0.0, 0.15, crack);
    return lumps * 0.6 + pebble * 0.15 + crack * 0.25;
  }

  // Rock / stone pattern with cracks and layers
  float rockPattern(vec2 p) {
    // Layered strata (horizontal-ish bands)
    float strata = sin(p.y * 6.0 + valueNoise(p * 2.0) * 4.0) * 0.5 + 0.5;
    // Deep cracks
    float n = valueNoise(p * 5.0);
    float crack = abs(n - 0.5);
    crack = 1.0 - smoothstep(0.0, 0.06, crack);
    // Surface roughness (2 octaves instead of 3 for perf)
    float rough = fbm(p * 4.0, 2);
    return strata * 0.35 + rough * 0.45 + (1.0 - crack) * 0.2;
  }

  // Mountain pattern: layered rock + snow patches
  float mountainPattern(vec2 p, float height) {
    // Simplified: strata + noise-based snow (no nested rockPattern call)
    float strata = sin(p.y * 5.0 + valueNoise(p * 1.5) * 3.5) * 0.5 + 0.5;
    float rough = valueNoise(p * 3.0);
    float base = strata * 0.5 + rough * 0.5;
    // Snow-like patches
    float snow = smoothstep(0.52, 0.72, valueNoise(p * 2.5 + vec2(17.0, 31.0)));
    return mix(base, 1.0, snow * 0.35);
  }

  // Mud pattern: wet splotches
  float mudPattern(vec2 p) {
    // Shiny wet patches
    float wet = valueNoise(p * 4.0);
    wet = smoothstep(0.3, 0.7, wet);
    // Bubbles / pockmarks
    float pock = hash21(floor(p * 8.0));
    pock = step(0.92, pock);
    return wet * 0.8 + pock * 0.2;
  }

  // Fertile soil pattern: rich dark earth with organic debris
  float fertilePattern(vec2 p) {
    // Dark clumps of organic matter
    float organic = fbm(p * 5.0, 2);
    // Small bright mineral specks
    float spec = step(0.90, hash21(floor(p * 14.0))) * 0.8;
    // Worm-like subtle curves
    float worm = sin(p.x * 12.0 + valueNoise(p * 3.0) * 6.0) * 0.5 + 0.5;
    worm *= sin(p.y * 10.0 + valueNoise(p * 4.0) * 5.0) * 0.5 + 0.5;
    return organic * 0.55 + spec + worm * 0.2;
  }

  vec3 terrainPattern(int t, vec2 tileCoord, vec2 subTile) {
    vec3 baseCol = getTerrainColor(t);
    vec3 amps = getVarAmps(t);

    // Sub-tile world position (continuous across tile boundaries)
    vec2 worldPos = tileCoord + subTile;

    // Per-channel noise: 2-octave, independent seeds per channel
    float n0 = (fbm(tileCoord * 1.0 + vec2(0.0, 0.0), 2) - 0.5) * 2.0;
    float n1 = (fbm(tileCoord * 1.0 + vec2(79.19, 62.71), 2) - 0.5) * 2.0;
    float n2 = (fbm(tileCoord * 1.0 + vec2(35.71, 99.29), 2) - 0.5) * 2.0;

    vec3 noiseColor = baseCol + vec3(n0, n1, n2) * amps;

    // Per-type sub-tile texture (strong, clearly visible)
    if (t == 3) {
      // SOIL: grass blades
      float g = grassBlades(worldPos);
      // Vary blade color: lighter tips, darker roots
      vec3 grassDark  = baseCol * 0.82;
      vec3 grassLight = baseCol * vec3(1.05, 1.25, 0.95);
      noiseColor = mix(grassDark, grassLight, g);
      // Re-apply per-tile noise on top (subtle)
      noiseColor += vec3(n0, n1, n2) * amps * 0.5;
    } else if (t == 5) {
      // FERTILE_SOIL: rich earth with organic matter
      float f = fertilePattern(worldPos);
      vec3 darkEarth  = baseCol * 0.80;
      vec3 lightEarth = baseCol * vec3(1.15, 1.10, 1.20);
      noiseColor = mix(darkEarth, lightEarth, f);
      noiseColor += vec3(n0, n1, n2) * amps * 0.4;
    } else if (t == 1) {
      // SAND: grain + wind ripples
      float s = sandGrain(worldPos);
      vec3 sandDark  = baseCol * 0.90;
      vec3 sandLight = baseCol * vec3(1.12, 1.10, 1.05);
      noiseColor = mix(sandDark, sandLight, s);
      noiseColor += vec3(n0, n1, n2) * amps * 0.5;
    } else if (t == 4) {
      // ROCK: layered stone + cracks
      float r = rockPattern(worldPos);
      vec3 rockDark  = baseCol * 0.78;
      vec3 rockLight = baseCol * 1.18;
      noiseColor = mix(rockDark, rockLight, r);
      noiseColor += vec3(n0, n1, n2) * amps * 0.3;
    } else if (t == 7) {
      // MOUNTAIN: layered rock + snow patches
      float hHere = sampleHeight(tileCoord);
      float m = mountainPattern(worldPos, hHere);
      vec3 mtnDark  = baseCol * 0.78;
      vec3 mtnLight = vec3(0.90, 0.90, 0.92); // lighter / snow-ish
      noiseColor = mix(mtnDark, mtnLight, m);
      noiseColor += vec3(n0, n1, n2) * amps * 0.3;
    } else if (t == 2) {
      // DIRT: chunky earth
      float d = dirtPattern(worldPos);
      vec3 dirtDark  = baseCol * 0.82;
      vec3 dirtLight = baseCol * vec3(1.18, 1.12, 1.08);
      noiseColor = mix(dirtDark, dirtLight, d);
      noiseColor += vec3(n0, n1, n2) * amps * 0.5;
    } else if (t == 8) {
      // MUD: wet splotches
      float mu = mudPattern(worldPos);
      vec3 mudDry = baseCol * 1.10;
      vec3 mudWet = baseCol * vec3(0.80, 0.82, 0.90); // darker, slight blue
      noiseColor = mix(mudDry, mudWet, mu);
      noiseColor += vec3(n0, n1, n2) * amps * 0.4;
    } else if (t == 0) {
      // WATER: subtle depth variation (animation added separately)
      float w = valueNoise(worldPos * 3.0);
      noiseColor = mix(baseCol * 0.92, baseCol * 1.08, w);
      noiseColor += vec3(n0, n1, n2) * amps * 0.5;
    } else if (t == 6) {
      // DEEP_WATER: dark rolling variation
      float dw = fbm(worldPos * 2.0, 2);
      noiseColor = mix(baseCol * 0.88, baseCol * 1.06, dw);
      noiseColor += vec3(n0, n1, n2) * amps * 0.5;
    }

    return noiseColor;
  }

  // --- Water animation ---
  vec3 waterEffect(int t, vec2 tileCoord, vec2 subTile, vec3 col) {
    if (t != 0 && t != 6) return col;
    float time = u_time * 0.008;

    // Gentle wave distortion
    float wave = sin(tileCoord.x * 2.5 + subTile.x * 4.0 + time * 1.3)
               * cos(tileCoord.y * 3.0 + subTile.y * 3.0 + time * 0.9) * 0.03;
    col += wave;

    // Subtle caustic-like pattern
    float caustic = valueNoise(tileCoord * 2.0 + subTile * 3.0 + vec2(time * 0.4, time * 0.3));
    col += (caustic - 0.5) * 0.04;

    // Sparkle: rare bright pixel flicker
    float sparkleHash = hash31(vec3(floor(tileCoord), floor(u_time / 50.0)));
    if (sparkleHash > 0.992) {
      float sparkT = fract(u_time / 50.0);
      float sparkle = sin(sparkT * 3.14159) * 0.12;
      col += sparkle;
    }

    return col;
  }

  void main() {
    vec2 tileCoord = v_uv * u_worldSize;
    vec2 tileFloor = floor(tileCoord);
    vec2 subTile = fract(tileCoord);
    vec2 worldPos = tileCoord;

    // Bounds check
    if (tileFloor.x < 0.0 || tileFloor.y < 0.0 ||
        tileFloor.x >= u_worldSize.x || tileFloor.y >= u_worldSize.y) {
      gl_FragColor = vec4(0.04, 0.04, 0.1, 1.0);
      return;
    }

    // Sample center terrain — full expensive pattern only here
    int tCenter = sampleTerrain(tileCoord);
    vec3 centerColor = terrainPattern(tCenter, tileCoord, subTile);

    // --- Noise-distorted organic border blending ---
    // Use cheap base color for neighbors (no terrainPattern calls).
    // Distort the blend boundary with noise so edges are wavy, not grid-aligned.

    // Noise displacement: shifts the effective tile boundary by ±0.35 tiles
    // Uses low-freq noise seeded from world position so borders are continuous.
    float edgeNoise = (valueNoise(worldPos * 2.7 + vec2(13.7, 7.3)) - 0.5) * 0.7;
    float edgeNoiseY = (valueNoise(worldPos * 2.7 + vec2(51.2, 23.1)) - 0.5) * 0.7;

    // Distorted sub-tile coordinates for blending
    float dsx = subTile.x + edgeNoise;
    float dsy = subTile.y + edgeNoiseY;

    vec3 finalColor = centerColor;
    float blendTotal = 0.0;
    vec3 blendAccum = vec3(0.0);
    float blendWidth = 0.48;

    // Left neighbor
    if (dsx < blendWidth && tileFloor.x > 0.0) {
      int tN = sampleTerrain(tileCoord + vec2(-1.0, 0.0));
      if (tN != tCenter) {
        float w = smoothstep(blendWidth, -0.05, dsx);
        blendAccum += getTerrainColor(tN) * w;
        blendTotal += w;
      }
    }
    // Right neighbor
    if (dsx > (1.0 - blendWidth) && tileFloor.x < u_worldSize.x - 1.0) {
      int tN = sampleTerrain(tileCoord + vec2(1.0, 0.0));
      if (tN != tCenter) {
        float w = smoothstep(1.0 - blendWidth, 1.05, dsx);
        blendAccum += getTerrainColor(tN) * w;
        blendTotal += w;
      }
    }
    // Top neighbor
    if (dsy < blendWidth && tileFloor.y > 0.0) {
      int tN = sampleTerrain(tileCoord + vec2(0.0, -1.0));
      if (tN != tCenter) {
        float w = smoothstep(blendWidth, -0.05, dsy);
        blendAccum += getTerrainColor(tN) * w;
        blendTotal += w;
      }
    }
    // Bottom neighbor
    if (dsy > (1.0 - blendWidth) && tileFloor.y < u_worldSize.y - 1.0) {
      int tN = sampleTerrain(tileCoord + vec2(0.0, 1.0));
      if (tN != tCenter) {
        float w = smoothstep(1.0 - blendWidth, 1.05, dsy);
        blendAccum += getTerrainColor(tN) * w;
        blendTotal += w;
      }
    }

    // Diagonal corners (cheap: use radial distance with same noise distortion)
    float diagDist;
    // Top-left
    diagDist = max(dsx, dsy);
    if (diagDist < 0.35 && tileFloor.x > 0.0 && tileFloor.y > 0.0) {
      int tN = sampleTerrain(tileCoord + vec2(-1.0, -1.0));
      if (tN != tCenter) {
        float w = smoothstep(0.35, -0.05, diagDist) * 0.45;
        blendAccum += getTerrainColor(tN) * w;
        blendTotal += w;
      }
    }
    // Top-right
    diagDist = max(1.0 - dsx, dsy);
    if (diagDist < 0.35 && tileFloor.x < u_worldSize.x - 1.0 && tileFloor.y > 0.0) {
      int tN = sampleTerrain(tileCoord + vec2(1.0, -1.0));
      if (tN != tCenter) {
        float w = smoothstep(0.35, -0.05, diagDist) * 0.45;
        blendAccum += getTerrainColor(tN) * w;
        blendTotal += w;
      }
    }
    // Bottom-left
    diagDist = max(dsx, 1.0 - dsy);
    if (diagDist < 0.35 && tileFloor.x > 0.0 && tileFloor.y < u_worldSize.y - 1.0) {
      int tN = sampleTerrain(tileCoord + vec2(-1.0, 1.0));
      if (tN != tCenter) {
        float w = smoothstep(0.35, -0.05, diagDist) * 0.45;
        blendAccum += getTerrainColor(tN) * w;
        blendTotal += w;
      }
    }
    // Bottom-right
    diagDist = max(1.0 - dsx, 1.0 - dsy);
    if (diagDist < 0.35 && tileFloor.x < u_worldSize.x - 1.0 && tileFloor.y < u_worldSize.y - 1.0) {
      int tN = sampleTerrain(tileCoord + vec2(1.0, 1.0));
      if (tN != tCenter) {
        float w = smoothstep(0.35, -0.05, diagDist) * 0.45;
        blendAccum += getTerrainColor(tN) * w;
        blendTotal += w;
      }
    }

    if (blendTotal > 0.0) {
      float blendF = min(blendTotal, 0.65);
      finalColor = mix(centerColor, blendAccum / blendTotal, blendF);
    }

    // --- Coastal tinting ---
    float wp = sampleWaterProx(tileCoord);
    if (tCenter == 0 && wp <= 2.0) {
      float coastF = wp <= 1.0 ? 0.35 : 0.15;
      finalColor = mix(finalColor, u_coastShallow, coastF);
    }
    if (tCenter == 1 && wp > 0.0 && wp <= 2.0) {
      float sandF = wp <= 1.0 ? 0.30 : 0.12;
      finalColor = mix(finalColor, u_coastWetSand, sandF);
    }
    // Water proximity gradient for soil/fertile soil
    if ((tCenter == 3 || tCenter == 5) && wp > 0.0 && wp <= 5.0) {
      float boost = (5.0 - wp) / 255.0;
      finalColor.g += boost * 3.0;
      finalColor.r -= boost;
    }

    // --- Water animation ---
    finalColor = waterEffect(tCenter, tileCoord, subTile, finalColor);

    // --- Height-based brightness ---
    float hHere = sampleHeight(tileCoord);
    float bright = 0.88 + hHere * 0.24;
    finalColor *= bright;

    // --- Elevation shadow (sun from south) ---
    if (tileFloor.y > 0.0) {
      float hN = sampleHeight(tileCoord + vec2(0.0, -1.0));
      if (hN > hHere) {
        float shadow = 1.0 - min(0.12, (hN - hHere) * 0.8);
        finalColor *= shadow;
      }
    }
    if (tileFloor.y > 0.0 && tileFloor.x > 0.0) {
      float hNW = sampleHeight(tileCoord + vec2(-1.0, -1.0));
      if (hNW > hHere) {
        float shadow = 1.0 - min(0.08, (hNW - hHere) * 0.5);
        finalColor *= shadow;
      }
    }
    // Mountain/rock south-face highlight
    if ((tCenter == 7 || tCenter == 4) && tileFloor.y < u_worldSize.y - 1.0) {
      float hS = sampleHeight(tileCoord + vec2(0.0, 1.0));
      if (hS < hHere) {
        float hl = 1.0 + min(0.15, (hHere - hS) * 0.6);
        finalColor *= hl;
      }
    }

    finalColor = clamp(finalColor, 0.0, 1.0);
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// ---------------------------------------------------------------------------
// Shader helper
// ---------------------------------------------------------------------------

function colorToVec3(rgba) {
  return [rgba[0] / 255, rgba[1] / 255, rgba[2] / 255];
}

/**
 * Build the uniform color arrays needed by the shader.
 */
function buildColorUniforms() {
  const colors = [];
  const varAmps = [];
  for (let t = 0; t < 9; t++) {
    const c = TERRAIN_COLORS[t] || [0, 0, 0, 255];
    colors.push(c[0] / 255, c[1] / 255, c[2] / 255);
    const v = TERRAIN_VAR_RGB[t] || [8, 8, 8];
    varAmps.push(v[0] / 255, v[1] / 255, v[2] / 255);
  }
  return { colors, varAmps };
}

// ---------------------------------------------------------------------------
// Data texture helpers
// ---------------------------------------------------------------------------

/**
 * Create a 1-channel NEAREST-sampled data texture from a Uint8Array.
 * The data is stored in the R channel of an RGBA texture (each pixel gets
 * [value, 0, 0, 255]).  This ensures max compatibility with WebGL1.
 */
function createDataTexture(data, width, height) {
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4]     = data[i];
    rgba[i * 4 + 1] = 0;
    rgba[i * 4 + 2] = 0;
    rgba[i * 4 + 3] = 255;
  }
  const resource = new PIXI.BufferResource(rgba, { width, height });
  const bt = new PIXI.BaseTexture(resource, {
    format: PIXI.FORMATS.RGBA,
    type: PIXI.TYPES.UNSIGNED_BYTE,
    scaleMode: PIXI.SCALE_MODES.NEAREST,
    mipmap: PIXI.MIPMAP_MODES.OFF,
    width,
    height,
  });
  return { texture: new PIXI.Texture(bt), rgba };
}

/**
 * Create a heightmap data texture.  The heightmap is a Float32Array [0,1];
 * we encode each value as R=floor(v*255) in an RGBA8 texture.
 */
function createHeightTexture(heightmap, width, height) {
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const v = heightmap ? Math.round(heightmap[i] * 255) : 128;
    rgba[i * 4]     = v < 0 ? 0 : v > 255 ? 255 : v;
    rgba[i * 4 + 1] = 0;
    rgba[i * 4 + 2] = 0;
    rgba[i * 4 + 3] = 255;
  }
  const resource = new PIXI.BufferResource(rgba, { width, height });
  const bt = new PIXI.BaseTexture(resource, {
    format: PIXI.FORMATS.RGBA,
    type: PIXI.TYPES.UNSIGNED_BYTE,
    scaleMode: PIXI.SCALE_MODES.NEAREST,
    mipmap: PIXI.MIPMAP_MODES.OFF,
    width,
    height,
  });
  return { texture: new PIXI.Texture(bt), rgba };
}

// ---------------------------------------------------------------------------
// Exported class
// ---------------------------------------------------------------------------

export class TerrainShader {
  constructor() {
    this.shader = null;
    this._terrainRGBA = null;
    this._heightRGBA = null;
    this._waterProxRGBA = null;
    this._terrainTex = null;
    this._heightTex = null;
    this._waterProxTex = null;
  }

  /**
   * Build (or rebuild) the shader and its data textures.
   * Returns the PIXI.Shader ready to be used with a Mesh.
   */
  build(terrainData, width, height, heightmap, waterProximity) {
    // Data textures
    const td = createDataTexture(terrainData, width, height);
    this._terrainTex = td.texture;
    this._terrainRGBA = td.rgba;

    const hd = createHeightTexture(heightmap, width, height);
    this._heightTex = hd.texture;
    this._heightRGBA = hd.rgba;

    const wpData = waterProximity || new Uint8Array(width * height);
    const wd = createDataTexture(wpData, width, height);
    this._waterProxTex = wd.texture;
    this._waterProxRGBA = wd.rgba;

    const { colors, varAmps } = buildColorUniforms();

    this.shader = PIXI.Shader.from(VERT_SRC, FRAG_SRC, {
      u_terrain: this._terrainTex,
      u_heightmap: this._heightTex,
      u_waterProx: this._waterProxTex,
      u_worldSize: [width, height],
      u_time: 0,
      u_colors: colors,
      u_varAmps: varAmps,
      u_coastShallow: colorToVec3(COASTAL_SHALLOW_WATER),
      u_coastWetSand: colorToVec3(COASTAL_WET_SAND),
    });

    return this.shader;
  }

  /**
   * Update data textures after terrain editing.
   */
  updateTiles(changes, terrainData, heightmap) {
    if (!this._terrainRGBA) return;
    const w = this.shader.uniforms.u_worldSize[0];
    for (const { x, y, terrain } of changes) {
      const i = y * w + x;
      this._terrainRGBA[i * 4] = terrain;
      if (heightmap) {
        this._heightRGBA[i * 4] = Math.round(heightmap[i] * 255);
      }
    }
    this._terrainTex.baseTexture.resource.data = this._terrainRGBA;
    this._terrainTex.baseTexture.resource.update();
    this._terrainTex.baseTexture.update();
    if (heightmap) {
      this._heightTex.baseTexture.resource.data = this._heightRGBA;
      this._heightTex.baseTexture.resource.update();
      this._heightTex.baseTexture.update();
    }
  }

  destroy() {
    if (this._terrainTex) { this._terrainTex.destroy(true); this._terrainTex = null; }
    if (this._heightTex) { this._heightTex.destroy(true); this._heightTex = null; }
    if (this._waterProxTex) { this._waterProxTex.destroy(true); this._waterProxTex = null; }
    this.shader = null;
    this._terrainRGBA = null;
    this._heightRGBA = null;
    this._waterProxRGBA = null;
  }
}
