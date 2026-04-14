/**
 * PlantLayer — renders plants as pixel overlay + procedural sprites when zoomed in.
 *
 * Pixel overlay: always visible, 1 pixel per tile (efficient at any zoom).
 * Sprites: shown when zoom >= EMOJI_ZOOM_THRESHOLD for tiles in viewport.
 *
 * Sprites are managed incrementally: a Map keyed by cell index tracks active
 * sprites. On each update only the delta (entered/left/changed tiles) is
 * processed, avoiding the previous full pool-return-and-rebuild every frame.
 *
 * Animation: frame-based (3 frames per stage) cycled via tick for sway plants.
 */
import * as PIXI from 'pixi.js';
import { PLANT_COLORS } from '../utils/terrainColors.js';
import { buildFloraAtlasSync, FRAME_SIZE } from '../utils/spriteAtlas.js';
import { buildSwayStages, buildTreeTypes, buildLowPlantTypes } from '../engine/plantSpecies.js';

const EMOJI_ZOOM_THRESHOLD = 6;
const MAX_EMOJI_SPRITES = 8000;
const BASE_EMOJI_SCALE = 1.0 / FRAME_SIZE;

// Per-category visual scale: trees large, medium default, low plants small
const PLANT_VISUAL_SCALE_TREE = 1.4;
const PLANT_VISUAL_SCALE_MEDIUM = 1.0;
const PLANT_VISUAL_SCALE_LOW = 0.75;

/** Deterministic per-cell scale jitter ±10%, multiplied by species visual scale. */
function cellScale(idx, speciesScale) {
  // simple hash → 0..1
  const h = ((idx * 2654435761) >>> 0) / 4294967296;
  return BASE_EMOJI_SCALE * speciesScale * (0.9 + h * 0.2);
}

/** Per-plant sway frame with varied phase & period so plants don't move in unison. */
function swayFrame(tick, idx) {
  const h = ((idx * 2654435761) >>> 0);
  const phase = h & 0xFF;                // 0..255 tick phase offset
  const period = 100 + ((h >>> 8) & 63); // 100..163 cycle length
  const t = (tick + phase) % period;
  const third = period / 3;
  return t < third ? 0 : (t < third * 2 ? 1 : 2);
}

export class PlantLayer {
  constructor(depthContainer, shadowContainer) {
    this.container = new PIXI.Container(); // pixel overlay only
    this.sprite = null; // pixel overlay sprite
    this.width = 0;
    this.height = 0;
    this._pixels = null;
    this._baseTexture = null;

    // Raw plant data for emoji lookups
    this._types = null;  // Uint8Array
    this._stages = null; // Uint8Array

    // Shared shadow container (ground level, rendered by GameRenderer)
    this._shadowContainer = shadowContainer;
    this._shadowPool = [];

    // Shared depth container for Y-sorted emoji sprites (managed by GameRenderer)
    this._depthContainer = depthContainer;
    this._emojiPool = [];     // recycled sprites

    // Incremental sprite tracking: cellIdx → { sprite, shadow (or null), texKey }
    this._spriteMap = new Map();

    this._plantTextures = null;

    // Plant category lookup (typeId → visual scale factor)
    this._treeTypes = null;
    this._lowPlantTypes = null;

    // Wind sway tick (set externally from GameRenderer)
    this._tick = 0;

    // Previous viewport for incremental diff
    this._prevVP = { x0: 0, y0: 0, x1: 0, y1: 0 };

    // Growth pulse tracking: idx → startTick
    this._growthPulses = new Map();

    // Dirty cell indices (tiles changed since last updateEmojis)
    this._dirtyCells = new Set();
  }

  init(width, height) {
    this.width = width;
    this.height = height;
    this._pixels = new Uint8Array(width * height * 4);
    this._types = new Uint8Array(width * height);
    this._stages = new Uint8Array(width * height);

    const resource = new PIXI.BufferResource(this._pixels, { width, height });
    this._baseTexture = new PIXI.BaseTexture(resource, {
      format: PIXI.FORMATS.RGBA,
      type: PIXI.TYPES.UNSIGNED_BYTE,
      scaleMode: PIXI.SCALE_MODES.NEAREST,
      width,
      height,
    });
    const texture = new PIXI.Texture(this._baseTexture);

    if (this.sprite) {
      this.container.removeChild(this.sprite);
      this.sprite.destroy();
    }

    this.sprite = new PIXI.Sprite(texture);
    this.container.addChildAt(this.sprite, 0);

    // Clear emoji state
    this._returnAll();
  }

  /**
   * Apply plant changes: array of [x, y, plantType, stage]
   */
  applyChanges(changes) {
    if (!this._pixels || !changes || changes.length === 0) return;

    for (const change of changes) {
      const [x, y, ptype, stage] = change;
      const idx = y * this.width + x;
      const i = idx * 4;

      // Detect stage transitions for growth pulse
      const prevStage = this._stages[idx];
      if (prevStage > 0 && stage > prevStage && stage <= 5) {
        this._growthPulses.set(idx, this._tick);
      }

      // Update raw data
      this._types[idx] = ptype;
      this._stages[idx] = stage;

      // Mark cell dirty for incremental sprite update
      this._dirtyCells.add(idx);

      if (ptype === 0 || stage === 0 || stage === 6) {
        this._pixels[i] = 0;
        this._pixels[i + 1] = 0;
        this._pixels[i + 2] = 0;
        this._pixels[i + 3] = 0;
      } else {
        const key = `${ptype}_${stage}`;
        const color = PLANT_COLORS[key] || [100, 200, 100, 150];
        this._pixels[i] = color[0];
        this._pixels[i + 1] = color[1];
        this._pixels[i + 2] = color[2];
        this._pixels[i + 3] = color[3];
      }
    }

    if (this._baseTexture && this._baseTexture.resource) {
      this._baseTexture.resource.data = this._pixels;
      this._baseTexture.resource.update();
      this._baseTexture.update();
    }
  }

  /**
   * Full plant grid update from initial load using flat binary arrays.
   */
  setFromArrays(types, stages, width, height) {
    if (!this._pixels) return;
    this._pixels.fill(0);

    // Store raw data
    this._types.set(types);
    this._stages.set(stages);

    for (let i = 0; i < types.length; i++) {
      const t = types[i];
      const s = stages[i];
      if (t === 0 || s === 0 || s === 6) continue;
      const key = `${t}_${s}`;
      const color = PLANT_COLORS[key] || [100, 200, 100, 150];
      const pi = i * 4;
      this._pixels[pi] = color[0];
      this._pixels[pi + 1] = color[1];
      this._pixels[pi + 2] = color[2];
      this._pixels[pi + 3] = color[3];
    }

    if (this._baseTexture && this._baseTexture.resource) {
      this._baseTexture.resource.data = this._pixels;
      this._baseTexture.resource.update();
      this._baseTexture.update();
    }

    // Force full rebuild on next updateEmojis
    this._returnAll();
  }

  // ---- Emoji sprite overlay (incremental) ----

  /**
   * Update emoji sprites for visible plants in the viewport.
   * Called by GameRenderer on viewport/zoom change and each tick.
   *
   * Uses incremental diff: only tiles that entered/left the viewport or
   * whose plant data changed are touched. Sway is applied in-place on
   * existing sprites without pool recycling.
   */
  updateEmojis(vx, vy, vw, vh, zoom, tick) {
    if (tick != null) this._tick = tick;

    if (zoom < EMOJI_ZOOM_THRESHOLD) {
      if (this._spriteMap.size > 0) this._returnAll();
      // Full opacity pixel overlay when sprites hidden
      if (this.sprite) this.sprite.alpha = 1;
      return;
    }

    // Fade pixel overlay as zoom increases past threshold
    if (this.sprite) {
      const fadeStart = EMOJI_ZOOM_THRESHOLD;
      const fadeEnd = EMOJI_ZOOM_THRESHOLD + 4;
      this.sprite.alpha = zoom >= fadeEnd ? 0 : Math.max(0, 1 - (zoom - fadeStart) / (fadeEnd - fadeStart));
    }

    if (!this._plantTextures) {
      this._plantTextures = buildFloraAtlasSync();
    }
    if (!this._swayStages) {
      this._swayStages = buildSwayStages();
    }
    if (!this._treeTypes) {
      this._treeTypes = buildTreeTypes();
    }
    if (!this._lowPlantTypes) {
      this._lowPlantTypes = buildLowPlantTypes();
    }

    // Clamp viewport to map bounds
    const x0 = Math.max(0, vx);
    const y0 = Math.max(0, vy);
    const x1 = Math.min(this.width, vx + vw + 1);
    const y1 = Math.min(this.height, vy + vh + 1);

    const prev = this._prevVP;
    const viewportChanged = x0 !== prev.x0 || y0 !== prev.y0 || x1 !== prev.x1 || y1 !== prev.y1;

    // ── Phase 1: Remove sprites outside new viewport ──
    if (viewportChanged) {
      for (const [idx, entry] of this._spriteMap) {
        const cx = idx % this.width;
        const cy = (idx / this.width) | 0;
        if (cx < x0 || cx >= x1 || cy < y0 || cy >= y1) {
          this._releaseEntry(entry);
          this._spriteMap.delete(idx);
        }
      }
    }

    // ── Shared state for phases 2-4 ──
    const t = this._tick;
    const swayMap = this._swayStages;

    // ── Phase 2: Process dirty cells within viewport ──
    const dirty = this._dirtyCells;
    if (dirty.size > 0) {
      for (const idx of dirty) {
        const cx = idx % this.width;
        const cy = (idx / this.width) | 0;
        if (cx < x0 || cx >= x1 || cy < y0 || cy >= y1) continue;

        const ptype = this._types[idx];
        const stage = this._stages[idx];
        const baseKey = (ptype === 0 || stage === 0 || stage === 6) ? null : `${ptype}_${stage}`;
        const existing = this._spriteMap.get(idx);

        if (!baseKey) {
          // Plant removed/dead — release sprite
          if (existing) {
            this._releaseEntry(existing);
            this._spriteMap.delete(idx);
          }
        } else if (existing) {
          // Plant changed — update texture if needed
          if (existing.baseKey !== baseKey) {
            const canSway = swayMap[ptype] && swayMap[ptype].has(stage);
            const animFrame = canSway ? swayFrame(t, idx) : 0;
            const key = `${baseKey}_${animFrame}`;
            const tex = this._plantTextures[key];
            if (tex) {
              existing.sprite.texture = tex;
              existing.baseKey = baseKey;
              existing.texKey = key;
            }
          }
        }
        // New cells in dirty set that don't have sprites yet will be
        // picked up in Phase 3 if they are in the viewport.
      }
      dirty.clear();
    }

    // ── Phase 3: Add sprites for new viewport tiles ──

    if (viewportChanged) {
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const idx = y * this.width + x;
          if (this._spriteMap.has(idx)) continue;
          if (this._spriteMap.size >= MAX_EMOJI_SPRITES) break;

          const ptype = this._types[idx];
          const stage = this._stages[idx];
          if (ptype === 0 || stage === 0 || stage === 6) continue;

          const baseKey = `${ptype}_${stage}`;
          const canSway = swayMap[ptype] && swayMap[ptype].has(stage);
          const animFrame = canSway ? swayFrame(t, idx) : 0;
          const key = `${baseKey}_${animFrame}`;
          const tex = this._plantTextures[key];
          if (!tex) continue;

          this._addEntry(idx, x, y, ptype, stage, baseKey, key, tex, t, swayMap);
        }
      }
    }

    // ── Phase 4: Update animation frames + growth pulse on all active sprites ──
    for (const [idx, entry] of this._spriteMap) {
      const cx = idx % this.width;
      const cy = (idx / this.width) | 0;
      const ptype = this._types[idx];
      const stage = this._stages[idx];

      // Frame-based sway: cycle through 3 frames using tick + spatial hash
      const canSway = swayMap[ptype] && swayMap[ptype].has(stage);
      if (canSway) {
        const animFrame = swayFrame(t, idx);
        const newKey = `${entry.baseKey}_${animFrame}`;
        if (newKey !== entry.texKey) {
          const tex = this._plantTextures[newKey];
          if (tex) {
            entry.sprite.texture = tex;
            entry.texKey = newKey;
          }
        }
      }

      let scaleMultiplier = 1.0;
      const pulseStart = this._growthPulses.get(idx);
      if (pulseStart != null) {
        const age = t - pulseStart;
        if (age < 8) {
          const p = age / 8;
          scaleMultiplier = 1.0 + 0.3 * Math.sin(p * Math.PI);
        } else {
          this._growthPulses.delete(idx);
        }
      }

      const speciesScale = this._getSpeciesScale(ptype);
      const sc = cellScale(idx, speciesScale);

      entry.sprite.x = cx + 0.5;
      // Anchor (0.5, 1.0): base at tile bottom, sprite body extends upward
      entry.sprite.y = cy + 1.0;
      entry.sprite.scale.set(sc * scaleMultiplier);
      // Y-sort: higher Y values render in front
      entry.sprite.zIndex = Math.round((cy + 1.0) * 1000);

      if (entry.shadow) {
        const ss = stage === 3 ? 0.010 : (stage >= 4 ? 0.016 : 0.013);
        const sh = stage === 3 ? 0.005 : (stage >= 4 ? 0.008 : 0.006);
        entry.shadow.x = cx + 0.5;
        entry.shadow.y = cy + 0.95;
        entry.shadow.scale.set(ss * speciesScale * scaleMultiplier, sh * speciesScale);
      }
    }

    // Update previous viewport
    prev.x0 = x0;
    prev.y0 = y0;
    prev.x1 = x1;
    prev.y1 = y1;

    // Expire old growth pulses
    if (this._growthPulses.size > 500) {
      for (const [idx, start] of this._growthPulses) {
        if (t - start > 10) this._growthPulses.delete(idx);
      }
    }
  }

  // ── Sprite lifecycle helpers ──

  _addEntry(idx, x, y, ptype, stage, baseKey, texKey, tex, t, swayMap) {
    const sprite = this._acquireSprite(tex);
    const speciesScale = this._getSpeciesScale(ptype);
    const sc = cellScale(idx, speciesScale);

    sprite.x = x + 0.5;
    // Anchor (0.5, 1.0): base at tile bottom, sprite body extends upward
    sprite.y = y + 1.0;
    sprite.anchor.set(0.5, 1.0);
    sprite.scale.set(sc);
    sprite.alpha = stage === 1 ? 0.5 : (stage === 2 ? 0.6 : (stage === 3 ? 0.8 : (stage === 5 ? 0.9 : 1.0)));
    // Y-sort: higher Y values render in front
    sprite.zIndex = Math.round((y + 1.0) * 1000);

    let shadow = null;
    if (stage >= 3) {
      shadow = this._acquireShadow();
      shadow.x = x + 0.5;
      shadow.y = y + 0.95;
      const ss = stage === 3 ? 0.010 : (stage >= 4 ? 0.016 : 0.013);
      const sh = stage === 3 ? 0.005 : (stage >= 4 ? 0.008 : 0.006);
      shadow.scale.set(ss * speciesScale, sh * speciesScale);
      shadow.alpha = 0.35;
    }

    this._spriteMap.set(idx, { sprite, shadow, baseKey, texKey });
  }

  _releaseEntry(entry) {
    entry.sprite.visible = false;
    this._emojiPool.push(entry.sprite);
    if (entry.shadow) {
      entry.shadow.visible = false;
      this._shadowPool.push(entry.shadow);
    }
  }

  _acquireSprite(texture) {
    let sprite;
    if (this._emojiPool.length > 0) {
      sprite = this._emojiPool.pop();
      sprite.texture = texture;
      sprite.visible = true;
    } else {
      sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(0.5, 1.0);
      this._depthContainer.addChild(sprite);
    }
    return sprite;
  }

  _acquireShadow() {
    let sprite;
    if (this._shadowPool.length > 0) {
      sprite = this._shadowPool.pop();
      sprite.visible = true;
    } else {
      const g = new PIXI.Graphics();
      g.beginFill(0x000000, 1);
      g.drawEllipse(0, 0, 12, 5);
      g.endFill();
      this._shadowContainer.addChild(g);
      sprite = g;
    }
    return sprite;
  }

  _returnAll() {
    for (const [, entry] of this._spriteMap) {
      this._releaseEntry(entry);
    }
    this._spriteMap.clear();
    this._prevVP.x0 = 0;
    this._prevVP.y0 = 0;
    this._prevVP.x1 = 0;
    this._prevVP.y1 = 0;
    this._dirtyCells.clear();
  }

  /** Get the visual scale factor for a plant typeId based on its category. */
  _getSpeciesScale(typeId) {
    if (this._treeTypes && this._treeTypes.has(typeId)) return PLANT_VISUAL_SCALE_TREE;
    if (this._lowPlantTypes && this._lowPlantTypes.has(typeId)) return PLANT_VISUAL_SCALE_LOW;
    return PLANT_VISUAL_SCALE_MEDIUM;
  }
}
