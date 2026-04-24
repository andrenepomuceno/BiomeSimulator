/**
 * TerrainShader — custom Three.js ShaderMaterial for GPU-based terrain rendering.
 *
 * Ported from the Pixi.js TerrainShader. Terrain type, heightmap, and water
 * proximity are uploaded as 1px/tile data textures. All sub-tile procedural
 * detail, border blending, height shading, elevation shadows, coastal tinting,
 * and water animation are computed per-fragment on the GPU.
 */
import * as THREE from 'three';
import {
  TERRAIN_COLORS,
  TERRAIN_VAR_RGB,
  COASTAL_SHALLOW_WATER,
  COASTAL_WET_SAND,
} from '../../utils/terrainColors.js';

// ---------------------------------------------------------------------------
// GLSL source
// ---------------------------------------------------------------------------

const VERT_SRC = `
  varying vec2 v_uv;
  varying vec3 v_normal;
  void main() {
    v_uv = uv;
    // Normal is computed at displacement time on the geometry attribute.
    // Transform into world space by the normal matrix; the world group has
    // no rotation so the rotation portion is identity, but using normalMatrix
    // keeps the shader correct under future scene transforms.
    v_normal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG_SRC = `
  precision highp float;

  varying vec2 v_uv;
  varying vec3 v_normal;

  uniform sampler2D u_terrain;
  uniform sampler2D u_heightmap;
  uniform sampler2D u_waterProx;
  uniform vec3  u_lightDir;     // normalized, points TOWARD the light
  uniform float u_lightStrength; // 0..1 lambert mix
  uniform float u_ambient;       // base ambient floor

  uniform vec2  u_worldSize;
  uniform float u_time;
  uniform vec3  u_colors[9];
  uniform vec3  u_varAmps[9];
  uniform vec3  u_coastShallow;
  uniform vec3  u_coastWetSand;

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

  // --- Per-terrain-type sub-tile patterns ---

  float grassBlades(vec2 p) {
    float b1 = sin(p.x * 25.0 + valueNoise(p * 3.0) * 5.0) * 0.5 + 0.5;
    float b2 = sin(p.x * 40.0 + p.y * 3.0 + valueNoise(p * 5.0) * 3.0) * 0.5 + 0.5;
    float b3 = sin(p.x * 15.0 - p.y * 2.0 + valueNoise(p * 2.0) * 4.0) * 0.5 + 0.5;
    float blades = b1 * 0.4 + b2 * 0.35 + b3 * 0.25;
    float clump = valueNoise(p * 1.5);
    return blades * mix(0.6, 1.0, clump);
  }

  float sandGrain(vec2 p) {
    float grain = hash21(floor(p * 12.0)) * 0.5;
    float ripple = sin(p.x * 8.0 + p.y * 2.5 + valueNoise(p * 2.0) * 3.0) * 0.5 + 0.5;
    return grain * 0.4 + ripple * 0.6;
  }

  float dirtPattern(vec2 p) {
    float lumps = valueNoise(p * 6.0);
    float pebble = step(0.85, hash21(floor(p * 10.0)));
    float crack = abs(valueNoise(p * 8.0) - 0.5) * 2.0;
    crack = smoothstep(0.0, 0.15, crack);
    return lumps * 0.6 + pebble * 0.15 + crack * 0.25;
  }

  float rockPattern(vec2 p) {
    float strata = sin(p.y * 6.0 + valueNoise(p * 2.0) * 4.0) * 0.5 + 0.5;
    float n = valueNoise(p * 5.0);
    float crack = abs(n - 0.5);
    crack = 1.0 - smoothstep(0.0, 0.06, crack);
    float rough = fbm(p * 4.0, 2);
    return strata * 0.35 + rough * 0.45 + (1.0 - crack) * 0.2;
  }

  float mountainPattern(vec2 p, float height) {
    float strata = sin(p.y * 5.0 + valueNoise(p * 1.5) * 3.5) * 0.5 + 0.5;
    float rough = valueNoise(p * 3.0);
    float base = strata * 0.5 + rough * 0.5;
    float snow = smoothstep(0.52, 0.72, valueNoise(p * 2.5 + vec2(17.0, 31.0)));
    return mix(base, 1.0, snow * 0.35);
  }

  float mudPattern(vec2 p) {
    float wet = valueNoise(p * 4.0);
    wet = smoothstep(0.3, 0.7, wet);
    float pock = hash21(floor(p * 8.0));
    pock = step(0.92, pock);
    return wet * 0.8 + pock * 0.2;
  }

  float fertilePattern(vec2 p) {
    float organic = fbm(p * 5.0, 2);
    float spec = step(0.90, hash21(floor(p * 14.0))) * 0.8;
    float worm = sin(p.x * 12.0 + valueNoise(p * 3.0) * 6.0) * 0.5 + 0.5;
    worm *= sin(p.y * 10.0 + valueNoise(p * 4.0) * 5.0) * 0.5 + 0.5;
    return organic * 0.55 + spec + worm * 0.2;
  }

  vec3 terrainPattern(int t, vec2 tileCoord, vec2 subTile) {
    vec3 baseCol = getTerrainColor(t);
    vec3 amps = getVarAmps(t);
    vec2 worldPos = floor(tileCoord) + subTile;

    float n0 = (fbm(tileCoord * 1.0 + vec2(0.0, 0.0), 2) - 0.5) * 2.0;
    float n1 = (fbm(tileCoord * 1.0 + vec2(79.19, 62.71), 2) - 0.5) * 2.0;
    float n2 = (fbm(tileCoord * 1.0 + vec2(35.71, 99.29), 2) - 0.5) * 2.0;

    vec3 noiseColor = baseCol + vec3(n0, n1, n2) * amps;

    if (t == 3) {
      float g = grassBlades(worldPos);
      vec3 grassDark  = baseCol * 0.82;
      vec3 grassLight = baseCol * vec3(1.05, 1.25, 0.95);
      noiseColor = mix(grassDark, grassLight, g);
      noiseColor += vec3(n0, n1, n2) * amps * 0.5;
    } else if (t == 5) {
      float f = fertilePattern(worldPos);
      vec3 darkEarth  = baseCol * 0.80;
      vec3 lightEarth = baseCol * vec3(1.15, 1.10, 1.20);
      noiseColor = mix(darkEarth, lightEarth, f);
      noiseColor += vec3(n0, n1, n2) * amps * 0.4;
    } else if (t == 1) {
      float s = sandGrain(worldPos);
      vec3 sandDark  = baseCol * 0.90;
      vec3 sandLight = baseCol * vec3(1.12, 1.10, 1.05);
      noiseColor = mix(sandDark, sandLight, s);
      noiseColor += vec3(n0, n1, n2) * amps * 0.5;
    } else if (t == 4) {
      float r = rockPattern(worldPos);
      vec3 rockDark  = baseCol * 0.78;
      vec3 rockLight = baseCol * 1.18;
      noiseColor = mix(rockDark, rockLight, r);
      noiseColor += vec3(n0, n1, n2) * amps * 0.3;
    } else if (t == 7) {
      float hHere = sampleHeight(tileCoord);
      float m = mountainPattern(worldPos, hHere);
      vec3 mtnDark  = baseCol * 0.78;
      vec3 mtnLight = vec3(0.90, 0.90, 0.92);
      noiseColor = mix(mtnDark, mtnLight, m);
      noiseColor += vec3(n0, n1, n2) * amps * 0.3;
    } else if (t == 2) {
      float d = dirtPattern(worldPos);
      vec3 dirtDark  = baseCol * 0.82;
      vec3 dirtLight = baseCol * vec3(1.18, 1.12, 1.08);
      noiseColor = mix(dirtDark, dirtLight, d);
      noiseColor += vec3(n0, n1, n2) * amps * 0.5;
    } else if (t == 8) {
      float mu = mudPattern(worldPos);
      vec3 mudDry = baseCol * 1.10;
      vec3 mudWet = baseCol * vec3(0.80, 0.82, 0.90);
      noiseColor = mix(mudDry, mudWet, mu);
      noiseColor += vec3(n0, n1, n2) * amps * 0.4;
    } else if (t == 0) {
      float w = valueNoise(worldPos * 3.0);
      noiseColor = mix(baseCol * 0.92, baseCol * 1.08, w);
      noiseColor += vec3(n0, n1, n2) * amps * 0.5;
    } else if (t == 6) {
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

    float wave = sin(tileCoord.x * 2.5 + subTile.x * 4.0 + time * 1.3)
               * cos(tileCoord.y * 3.0 + subTile.y * 3.0 + time * 0.9) * 0.03;
    col += wave;

    float caustic = valueNoise(tileCoord * 2.0 + subTile * 3.0 + vec2(time * 0.4, time * 0.3));
    col += (caustic - 0.5) * 0.04;

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
    vec2 subTile = fract(tileCoord);
    vec2 tileFloor = floor(tileCoord);

    if (tileFloor.x < 0.0 || tileFloor.y < 0.0 ||
        tileFloor.x >= u_worldSize.x || tileFloor.y >= u_worldSize.y) {
      gl_FragColor = vec4(0.04, 0.04, 0.1, 1.0);
      return;
    }

    int tCenter = sampleTerrain(tileCoord);
    vec3 finalColor = terrainPattern(tCenter, tileCoord, subTile);

    // Coastal tinting
    float wp = sampleWaterProx(tileCoord);
    if (tCenter == 0 && wp <= 2.0) {
      float coastF = wp <= 1.0 ? 0.35 : 0.15;
      finalColor = mix(finalColor, u_coastShallow, coastF);
    }
    if (tCenter == 1 && wp > 0.0 && wp <= 2.0) {
      float sandF = wp <= 1.0 ? 0.30 : 0.12;
      finalColor = mix(finalColor, u_coastWetSand, sandF);
    }
    if ((tCenter == 3 || tCenter == 5) && wp > 0.0 && wp <= 5.0) {
      float boost = (5.0 - wp) / 255.0;
      finalColor.g += boost * 3.0;
      finalColor.r -= boost;
    }

    // Water animation
    finalColor = waterEffect(tCenter, tileCoord, subTile, finalColor);

    // Height-based brightness
    float hHere = sampleHeight(tileCoord);
    float bright = 0.88 + hHere * 0.24;
    finalColor *= bright;

    // Elevation shadow (sun from south)
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
    if ((tCenter == 7 || tCenter == 4) && tileFloor.y < u_worldSize.y - 1.0) {
      float hS = sampleHeight(tileCoord + vec2(0.0, 1.0));
      if (hS < hHere) {
        float hl = 1.0 + min(0.15, (hHere - hS) * 0.6);
        finalColor *= hl;
      }
    }

    // 3D volumetric lighting from per-vertex normals (computed on the
    // displaced terrain mesh). Land slopes catch / lose light to reveal
    // hills, valleys and mountain ridges.
    float ndl = max(0.0, dot(normalize(v_normal), normalize(u_lightDir)));
    float lambert = mix(u_ambient, 1.0, ndl);
    finalColor *= mix(1.0, lambert, u_lightStrength);

    finalColor = clamp(finalColor, 0.0, 1.0);
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function colorToVec3(rgba) {
  return new THREE.Vector3(rgba[0] / 255, rgba[1] / 255, rgba[2] / 255);
}

function buildColorUniforms() {
  const colors = [];
  const varAmps = [];
  for (let t = 0; t < 9; t++) {
    const c = TERRAIN_COLORS[t] || [0, 0, 0, 255];
    colors.push(new THREE.Vector3(c[0] / 255, c[1] / 255, c[2] / 255));
    const v = TERRAIN_VAR_RGB[t] || [8, 8, 8];
    varAmps.push(new THREE.Vector3(v[0] / 255, v[1] / 255, v[2] / 255));
  }
  return { colors, varAmps };
}

/**
 * Create a single-channel NEAREST-sampled DataTexture from a Uint8Array.
 * Data is stored in the R channel of RGBA (WebGL1 compat).
 */
function createDataTexture(data, width, height) {
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4]     = data[i];
    rgba[i * 4 + 1] = 0;
    rgba[i * 4 + 2] = 0;
    rgba[i * 4 + 3] = 255;
  }
  const texture = new THREE.DataTexture(rgba, width, height, THREE.RGBAFormat);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.flipY = false;
  texture.needsUpdate = true;
  return { texture, rgba };
}

/**
 * Create a heightmap DataTexture. Input is Float32Array [0,1]; encoded as R=v*255 in RGBA8.
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
  const texture = new THREE.DataTexture(rgba, width, height, THREE.RGBAFormat);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.flipY = false;
  texture.needsUpdate = true;
  return { texture, rgba };
}

// ---------------------------------------------------------------------------
// Exported class
// ---------------------------------------------------------------------------

export class ThreeTerrainShader {
  constructor() {
    this.material = null;
    this._terrainRGBA = null;
    this._heightRGBA = null;
    this._waterProxRGBA = null;
    this._terrainTex = null;
    this._heightTex = null;
    this._waterProxTex = null;
    this._width = 0;
    this._height = 0;
  }

  /**
   * Build (or rebuild) the shader material and its data textures.
   * Returns a THREE.ShaderMaterial ready to be used with a Mesh.
   */
  build(terrainData, width, height, heightmap, waterProximity) {
    this.destroy();
    this._width = width;
    this._height = height;

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

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT_SRC,
      fragmentShader: FRAG_SRC,
      uniforms: {
        u_terrain:      { value: this._terrainTex },
        u_heightmap:    { value: this._heightTex },
        u_waterProx:    { value: this._waterProxTex },
        u_worldSize:    { value: new THREE.Vector2(width, height) },
        u_time:         { value: 0 },
        u_colors:       { value: colors },
        u_varAmps:      { value: varAmps },
        u_coastShallow: { value: colorToVec3(COASTAL_SHALLOW_WATER) },
        u_coastWetSand: { value: colorToVec3(COASTAL_WET_SAND) },
        // Lighting (3D relief shading). Direction points TOWARD the light.
        // Matches the scene key light coming from above and slightly south-east.
        u_lightDir:      { value: new THREE.Vector3(0.45, -0.5, 1.0).normalize() },
        u_lightStrength: { value: 0.65 },
        u_ambient:       { value: 0.55 },
      },
      depthWrite: true,
    });

    return this.material;
  }

  /**
   * Advance the water animation time uniform.
   */
  tick(dt) {
    if (!this.material) return;
    this.material.uniforms.u_time.value += dt;
  }

  /**
   * Update data textures after terrain editing.
   */
  updateTiles(changes, terrainData, heightmap) {
    if (!this._terrainRGBA) return;
    const w = this._width;
    for (const { x, y, terrain } of changes) {
      const i = y * w + x;
      this._terrainRGBA[i * 4] = terrain;
      if (heightmap) {
        this._heightRGBA[i * 4] = Math.round(heightmap[i] * 255);
      }
    }
    this._terrainTex.image.data = this._terrainRGBA;
    this._terrainTex.needsUpdate = true;
    if (heightmap) {
      this._heightTex.image.data = this._heightRGBA;
      this._heightTex.needsUpdate = true;
    }
  }

  destroy() {
    if (this._terrainTex)   { this._terrainTex.dispose();   this._terrainTex = null; }
    if (this._heightTex)    { this._heightTex.dispose();    this._heightTex = null; }
    if (this._waterProxTex) { this._waterProxTex.dispose(); this._waterProxTex = null; }
    if (this.material)      { this.material.dispose();      this.material = null; }
    this._terrainRGBA = null;
    this._heightRGBA = null;
    this._waterProxRGBA = null;
  }
}
