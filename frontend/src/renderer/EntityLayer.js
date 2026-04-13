/**
 * EntityLayer — renders animals as emoji sprites using a PixiJS sprite pool,
 * with energy bars, direction flipping, and zoom-gated detail levels.
 */
import * as PIXI from 'pixi.js';
import { generateEmojiTextures } from '../utils/emojiTextures';
import { ENTITY_BARS_MIN_ZOOM } from '../constants/simulation';
import { MAX_ANIMAL_ENERGY } from '../engine/animalSpecies';

export class EntityLayer {
  constructor(animationLayer) {
    this.container = new PIXI.Container();
    this._sprites = new Map(); // id → PIXI.Sprite
    this._textures = null;
    this._texturesReady = false;
    this._animationLayer = animationLayer || null;

    // Track previous state per animal to detect transitions
    this._prevStates = new Map(); // id → state

    // Sprite pool for recycling
    this._pool = [];

    // Energy bar overlay (single Graphics for all bars — batched draw)
    this._barGfx = new PIXI.Graphics();
    this.container.addChild(this._barGfx);

    // Selection marker
    this._selectedId = null;
    this._selectionGfx = new PIXI.Graphics();
    this._selectionGfx.visible = false;
    this._selectionTick = 0;
    this._lastSelX = -1;
    this._lastSelY = -1;
    this.container.addChild(this._selectionGfx);
  }

  _ensureTextures() {
    if (this._texturesReady) return;
    this._textures = generateEmojiTextures();
    this._texturesReady = true;
  }

  _acquireSprite(tex) {
    let sprite;
    if (this._pool.length > 0) {
      sprite = this._pool.pop();
      sprite.texture = tex;
      sprite.visible = true;
      sprite.alpha = 1;
    } else {
      sprite = new PIXI.Sprite(tex);
      sprite.anchor.set(0.5);
    }
    this.container.addChild(sprite);
    return sprite;
  }

  _releaseSprite(sprite) {
    sprite.visible = false;
    this.container.removeChild(sprite);
    this._pool.push(sprite);
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
   * @param {number} currentTick
   * @param {number} zoom - current camera zoom level
   */
  update(animals, renderer, currentTick = 0, zoom = 1) {
    this._ensureTextures();

    const seen = new Set();
    const showBars = zoom >= ENTITY_BARS_MIN_ZOOM;

    // Clear energy bars (redrawn each frame)
    const barGfx = this._barGfx;
    barGfx.clear();

    for (const a of animals) {
      seen.add(a.id);
      let sprite = this._sprites.get(a.id);

      const texKey = this._getTexKey(a);
      const tex = this._textures[texKey] || this._textures[a.species];
      if (!tex) continue;

      if (!sprite) {
        sprite = this._acquireSprite(tex);
        sprite._texKey = texKey;
        sprite._lastX = a.x;
        sprite._facingLeft = false;
        this._sprites.set(a.id, sprite);
        // New animal appeared — birth animation (skip for dead)
        if (a.state !== 9 && this._animationLayer) {
          this._animationLayer.spawnBirth(a.x, a.y);
        }
        // Pop-in: start small, tracked via _spawnTick
        sprite._spawnTick = currentTick;
      }

      // Detect state transitions for animations
      if (this._animationLayer) {
        const prevState = this._prevStates.get(a.id);
        if (prevState !== undefined && prevState !== a.state) {
          if (a.state === 6) this._animationLayer.spawnAttack(a.x, a.y);       // ATTACKING
          else if (a.state === 9) this._animationLayer.spawnDeath(a.x, a.y);   // DEAD
          else if (a.state === 8) this._animationLayer.spawnMate(a.x, a.y);    // MATING
          else if (a.state === 3) this._animationLayer.spawnEat(a.x, a.y);     // EATING
        }
        this._prevStates.set(a.id, a.state);
      }

      // Swap texture if state changed
      if (sprite._texKey !== texKey) {
        sprite.texture = tex;
        sprite._texKey = texKey;
      }

      // Position (center of tile)
      sprite.x = a.x + 0.5;
      sprite.y = a.y + 0.5;

      // Direction flip: track horizontal movement
      if (a.x !== sprite._lastX) {
        sprite._facingLeft = a.x < sprite._lastX;
        sprite._lastX = a.x;
      }

      // Scale: 96px texture → ~1 tile.  Base scale 0.012, range varies by life stage
      const baseScale = 0.012;
      const energy = Number.isFinite(a.energy) ? a.energy : 0;
      const energyFactor = 0.8 + (energy / MAX_ANIMAL_ENERGY) * 0.4;
      const stageFactor = a.state === 9 ? 1.0
        : a.lifeStage === 0 ? 0.5
        : a.lifeStage === 1 ? 0.7
        : a.lifeStage === 2 ? 0.85
        : 1.0;
      let finalScale = baseScale * energyFactor * stageFactor;

      // Pop-in animation for newly spawned sprites
      if (sprite._spawnTick != null && currentTick > 0) {
        const age = currentTick - sprite._spawnTick;
        if (age < 10) {
          const t = age / 10;
          // Elastic ease-out: overshoots then settles
          const bounce = t < 0.6 ? (t / 0.6) * 1.3 : 1.0 + (1.0 - t) / 0.4 * 0.3;
          finalScale *= Math.min(bounce, 1.3);
        } else {
          sprite._spawnTick = null; // Animation done
        }
      }

      // Attack shake
      if (a.state === 6 && currentTick > 0) {
        const shake = 0.06 * Math.sin(currentTick * 1.5);
        sprite.x += shake;
        finalScale *= 1.1;
      }

      // Guard: clamp to valid range to prevent giant sprites from NaN/invalid data
      if (!Number.isFinite(finalScale) || finalScale <= 0) finalScale = baseScale;

      // Apply direction flip via negative scale.x
      const sx = sprite._facingLeft ? -finalScale : finalScale;
      sprite.scale.set(sx, finalScale);

      // Alpha based on state
      if (a.state === 9) {
        // Fade skull over its 300-tick lifespan
        if (a._deathTick != null && currentTick > 0) {
          const elapsed = currentTick - a._deathTick;
          sprite.alpha = Math.max(0.05, 0.8 * (1 - elapsed / 300));
        } else {
          sprite.alpha = 0.75;
        }
      } else if (a.state === 5) {
        sprite.alpha = 0.65;
      } else {
        sprite.alpha = 1;
      }

      // HP bar (zoom >= threshold, not dead)
      if (showBars && a.state !== 9 && a.alive !== false) {
        const barW = 0.6;
        const barH = 0.06;
        const barX = a.x + 0.5 - barW / 2;
        const barY = a.y - 0.02;

        const hpMax = a.maxHp || 1;
        const hpRatio = Math.max(0, Math.min(1, (a.hp ?? hpMax) / hpMax));
        barGfx.beginFill(0x222222, 0.6);
        barGfx.drawRect(barX, barY, barW, barH);
        barGfx.endFill();
        const hpColor = hpRatio < 0.25 ? 0xdd4444 : hpRatio < 0.6 ? 0xddaa33 : 0xcc3333;
        barGfx.beginFill(hpColor, 0.85);
        barGfx.drawRect(barX, barY, barW * hpRatio, barH);
        barGfx.endFill();
      }
    }

    // Return sprites for animals no longer visible to the pool
    for (const [id, sprite] of this._sprites) {
      if (!seen.has(id)) {
        this._releaseSprite(sprite);
        this._sprites.delete(id);
        this._prevStates.delete(id);
      }
    }

    // Keep bar overlay and selection marker on top
    this.container.setChildIndex(barGfx, this.container.children.length - 1);
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

    // Only redraw if position changed
    const moved = sprite.x !== this._lastSelX || sprite.y !== this._lastSelY;
    this._selectionTick++;

    // Redraw every 4th tick for pulse, or immediately on move
    if (!moved && this._selectionTick % 4 !== 0) {
      gfx.x = sprite.x;
      gfx.y = sprite.y;
      return;
    }

    this._lastSelX = sprite.x;
    this._lastSelY = sprite.y;
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
