/**
 * EntityLayer — renders animals as emoji sprites using a PixiJS sprite pool.
 */
import * as PIXI from 'pixi.js';
import { generateEmojiTextures } from '../utils/emojiTextures';

export class EntityLayer {
  constructor() {
    this.container = new PIXI.Container();
    this._sprites = new Map(); // id → PIXI.Sprite
    this._textures = null;
    this._texturesReady = false;

    // Selection marker
    this._selectedId = null;
    this._selectionGfx = new PIXI.Graphics();
    this._selectionGfx.visible = false;
    this._selectionTick = 0;
    this.container.addChild(this._selectionGfx);
  }

  _ensureTextures() {
    if (this._texturesReady) return;
    this._textures = generateEmojiTextures();
    this._texturesReady = true;
  }

  /**
   * Get the texture key for an animal based on its state and species.
   */
  _getTexKey(a) {
    if (a.state === 9) return 'DEAD';
    if (a.state === 5) return 'SLEEPING';
    return a.species;
  }

  /**
   * Update all visible animals.
   * @param {Array} animals - [{id, x, y, species, state, energy}, ...]
   * @param {PIXI.Renderer} renderer - (unused, kept for API compat)
   */
  update(animals, renderer, currentTick = 0) {
    this._ensureTextures();

    const seen = new Set();

    for (const a of animals) {
      seen.add(a.id);
      let sprite = this._sprites.get(a.id);

      const texKey = this._getTexKey(a);
      const tex = this._textures[texKey] || this._textures[a.species];
      if (!tex) continue;

      if (!sprite) {
        sprite = new PIXI.Sprite(tex);
        sprite.anchor.set(0.5);
        sprite._texKey = texKey;
        this.container.addChild(sprite);
        this._sprites.set(a.id, sprite);
      }

      // Swap texture if state changed
      if (sprite._texKey !== texKey) {
        sprite.texture = tex;
        sprite._texKey = texKey;
      }

      // Position (center of tile)
      sprite.x = a.x + 0.5;
      sprite.y = a.y + 0.5;

      // Scale: 64px texture → ~1 tile.  Base scale 0.018, range varies by life stage
      const baseScale = 0.018;
      const energyFactor = 0.8 + (a.energy / 200) * 0.4;
      const stageFactor = a.state === 9 ? 1.0
        : a.lifeStage === 0 ? 0.5
        : a.lifeStage === 1 ? 0.7
        : a.lifeStage === 2 ? 0.85
        : 1.0;
      sprite.scale.set(baseScale * energyFactor * stageFactor);

      // Alpha based on state
      if (a.state === 9) {
        // Fade skull over its 200-tick lifespan
        if (a._deathTick != null && currentTick > 0) {
          const elapsed = currentTick - a._deathTick;
          sprite.alpha = Math.max(0.05, 0.5 * (1 - elapsed / 200));
        } else {
          sprite.alpha = 0.45;
        }
      } else if (a.state === 5) {
        sprite.alpha = 0.65;
      } else {
        sprite.alpha = 1;
      }
    }

    // Remove sprites for animals no longer visible
    for (const [id, sprite] of this._sprites) {
      if (!seen.has(id)) {
        this.container.removeChild(sprite);
        sprite.destroy();
        this._sprites.delete(id);
      }
    }

  }

  setSelectedId(id) {
    this._selectedId = id;
    if (id == null) {
      this._selectionGfx.visible = false;
    }
  }

  _updateSelectionMarker() {
    const gfx = this._selectionGfx;
    if (this._selectedId == null) {
      gfx.visible = false;
      return;
    }
    const sprite = this._sprites.get(this._selectedId);
    if (!sprite) {
      gfx.visible = false;
      return;
    }

    this._selectionTick++;
    const pulse = 0.9 + 0.1 * Math.sin(this._selectionTick * 0.12);
    const radius = 0.45 * pulse;

    gfx.clear();
    gfx.lineStyle(0.06, 0xffdd44, 0.9);
    gfx.drawCircle(0, 0, radius);
    // Inner subtle ring
    gfx.lineStyle(0.03, 0xffffff, 0.5);
    gfx.drawCircle(0, 0, radius * 0.75);

    gfx.x = sprite.x;
    gfx.y = sprite.y;
    gfx.visible = true;

    // Ensure marker renders on top
    this.container.setChildIndex(gfx, this.container.children.length - 1);
  }
}
