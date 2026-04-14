/**
 * PlantLayer — renders plants as pixel overlay + emoji sprites when zoomed in.
 *
 * Pixel overlay: always visible, 1 pixel per tile (efficient at any zoom).
 * Emoji sprites: shown when zoom >= EMOJI_ZOOM_THRESHOLD for tiles in viewport.
 */
import * as PIXI from 'pixi.js';
import { PLANT_COLORS } from '../utils/terrainColors.js';
import { generatePlantEmojiTextures } from '../utils/emojiTextures.js';
import { buildSwayStages } from '../engine/plantSpecies.js';

const EMOJI_ZOOM_THRESHOLD = 6;
const MAX_EMOJI_SPRITES = 8000;
const EMOJI_SCALE = 0.011; // 96px texture → ~1 tile

export class PlantLayer {
  constructor() {
    this.container = new PIXI.Container();
    this.sprite = null; // pixel overlay sprite
    this.width = 0;
    this.height = 0;
    this._pixels = null;
    this._baseTexture = null;

    // Raw plant data for emoji lookups
    this._types = null;  // Uint8Array
    this._stages = null; // Uint8Array

    // Shadow container (rendered below emojis)
    this._shadowContainer = new PIXI.Container();
    this.container.addChild(this._shadowContainer);
    this._shadowPool = [];
    this._activeShadows = [];
    this._shadowTex = null;

    // Emoji sprite overlay
    this._emojiContainer = new PIXI.Container();
    this.container.addChild(this._emojiContainer);
    this._emojiPool = [];     // recycled sprites
    this._activeEmojis = [];  // currently visible sprites
    this._plantTextures = null;

    // Wind sway tick (set externally from GameRenderer)
    this._tick = 0;

    // Growth pulse tracking: idx → { startTick, targetScale }
    this._growthPulses = new Map();
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
    this._returnAllEmojis();
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
  }

  // ---- Emoji sprite overlay ----

  /**
   * Update emoji sprites for visible plants in the viewport.
   * Called by GameRenderer on viewport/zoom change and each tick.
   */
  updateEmojis(vx, vy, vw, vh, zoom, tick) {
    if (tick != null) this._tick = tick;

    if (zoom < EMOJI_ZOOM_THRESHOLD) {
      // Hide emojis at low zoom
      if (this._activeEmojis.length > 0) {
        this._returnAllEmojis();
        this._returnAllShadows();
      }
      this._emojiContainer.visible = false;
      this._shadowContainer.visible = false;
      return;
    }

    this._emojiContainer.visible = true;
    this._shadowContainer.visible = true;

    if (!this._plantTextures) {
      this._plantTextures = generatePlantEmojiTextures();
    }

    // Build shadow texture lazily (small dark ellipse)
    if (!this._shadowTex) {
      const g = new PIXI.Graphics();
      g.beginFill(0x000000, 0.2);
      g.drawEllipse(0, 0, 12, 5);
      g.endFill();
      this._shadowTex = this._emojiContainer.parent
        ? PIXI.RenderTexture.create({ width: 24, height: 10 })
        : null;
      // Fallback: use runtime graphics-based shadow if RenderTexture unavailable
      if (!this._shadowTex) {
        this._shadowTex = g;
      }
    }

    // Build sway stages map lazily
    if (!this._swayStages) {
      this._swayStages = buildSwayStages();
    }

    // Return all current emojis/shadows to pool
    this._returnAllEmojis();
    this._returnAllShadows();

    // Clamp viewport to map bounds
    const x0 = Math.max(0, vx);
    const y0 = Math.max(0, vy);
    const x1 = Math.min(this.width, vx + vw + 1);
    const y1 = Math.min(this.height, vy + vh + 1);

    const t = this._tick;
    const swayMap = this._swayStages;
    let count = 0;

    for (let y = y0; y < y1 && count < MAX_EMOJI_SPRITES; y++) {
      for (let x = x0; x < x1 && count < MAX_EMOJI_SPRITES; x++) {
        const idx = y * this.width + x;
        const ptype = this._types[idx];
        const stage = this._stages[idx];
        if (ptype === 0 || stage === 0 || stage === 6) continue;

        const key = `${ptype}_${stage}`;
        const tex = this._plantTextures[key];
        if (!tex) continue;

        // Wind sway offset — only for stages that sway per species config
        const canSway = swayMap[ptype] && swayMap[ptype].has(stage);
        const sway = canSway ? 0.03 * Math.sin(t * 0.08 + x * 0.5 + y * 0.3) : 0;

        // Growth pulse
        let scaleMultiplier = 1.0;
        const pulseStart = this._growthPulses.get(idx);
        if (pulseStart != null) {
          const age = t - pulseStart;
          if (age < 8) {
            // 1.0 → 1.3 → 1.0 ease-out
            const p = age / 8;
            scaleMultiplier = 1.0 + 0.3 * Math.sin(p * Math.PI);
          } else {
            this._growthPulses.delete(idx);
          }
        }

        const sprite = this._getPooledSprite(tex);
        sprite.x = x + 0.5 + sway;
        sprite.y = y + 0.5;
        sprite.scale.set(EMOJI_SCALE * scaleMultiplier);
        // Alpha: seed=0.5, youngSprout=0.6, adultSprout=0.8, adult=1.0, fruit=0.9
        sprite.alpha = stage === 1 ? 0.5 : (stage === 2 ? 0.6 : (stage === 3 ? 0.8 : (stage === 5 ? 0.9 : 1.0)));
        this._activeEmojis.push(sprite);

        // Ground shadow (only for stage >= 3, visible enough)
        if (stage >= 3) {
          const shadow = this._getPooledShadow();
          shadow.x = x + 0.5 + sway * 0.3;
          shadow.y = y + 0.85;
          shadow.scale.set(0.02 * scaleMultiplier, 0.01);
          shadow.alpha = 0.2;
          this._activeShadows.push(shadow);
        }

        count++;
      }
    }

    // Expire old growth pulses
    if (this._growthPulses.size > 500) {
      for (const [idx, start] of this._growthPulses) {
        if (t - start > 10) this._growthPulses.delete(idx);
      }
    }
  }

  _getPooledSprite(texture) {
    let sprite;
    if (this._emojiPool.length > 0) {
      sprite = this._emojiPool.pop();
      sprite.texture = texture;
      sprite.visible = true;
    } else {
      sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(0.5);
      this._emojiContainer.addChild(sprite);
    }
    return sprite;
  }

  _getPooledShadow() {
    let sprite;
    if (this._shadowPool.length > 0) {
      sprite = this._shadowPool.pop();
      sprite.visible = true;
    } else {
      // Create a simple dark ellipse graphic as shadow sprite
      const g = new PIXI.Graphics();
      g.beginFill(0x000000, 1);
      g.drawEllipse(0, 0, 12, 5);
      g.endFill();
      this._shadowContainer.addChild(g);
      sprite = g;
    }
    return sprite;
  }

  _returnAllEmojis() {
    for (const sprite of this._activeEmojis) {
      sprite.visible = false;
      this._emojiPool.push(sprite);
    }
    this._activeEmojis.length = 0;
  }

  _returnAllShadows() {
    for (const sprite of this._activeShadows) {
      sprite.visible = false;
      this._shadowPool.push(sprite);
    }
    this._activeShadows.length = 0;
  }
}
