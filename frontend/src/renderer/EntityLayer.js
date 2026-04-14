/**
 * EntityLayer — renders animals as procedural pixel-art sprites using a PixiJS
 * sprite pool, with 4-directional walk animations, energy bars, and zoom-gated
 * detail levels.
 */
import * as PIXI from 'pixi.js';
import { generateEmojiTextures } from '../utils/emojiTextures.js';
import { ENTITY_BARS_MIN_ZOOM } from '../constants/simulation.js';
import { MAX_ANIMAL_ENERGY } from '../engine/animalSpecies.js';
import { FRAME_SIZE } from '../utils/spriteAtlas.js';

const ATTACK_JUMP_DURATION = 12;
const ATTACK_JUMP_HEIGHT = 0.22;
const HIT_WOBBLE_DURATION = 8;
const HIT_WOBBLE_OFFSET = 0.08;
const HIT_WOBBLE_ROTATION = 0.22;

// Direction names matching engine Direction enum values (0-3)
const DIR_NAMES = ['DOWN', 'LEFT', 'RIGHT', 'UP'];

// Animation: cycle frames every ANIM_INTERVAL render ticks when moving
const ANIM_INTERVAL = 6;
// Ping-pong sequence: 0, 1, 2, 1, 0, 1, 2, ...
const ANIM_SEQUENCE = [0, 1, 2, 1];

export class EntityLayer {
  constructor(animationLayer, onEffectEvent) {
    this.container = new PIXI.Container();
    this._sprites = new Map(); // id → PIXI.Sprite
    this._textures = null;
    this._texturesReady = false;
    this._animationLayer = animationLayer || null;
    this._onEffectEvent = onEffectEvent || null;

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

  _emitEffectEvent(type, x, y, species) {
    if (!this._onEffectEvent) return;
    this._onEffectEvent({ type, x, y, species: species || null });
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
    sprite.rotation = 0;
    sprite._spawnTick = null;
    sprite._attackTick = null;
    sprite._hitTick = null;
    sprite._lastHp = null;
    sprite._animFrame = 0;
    sprite._animSeqIdx = 0;
    sprite._animTick = 0;
    sprite._direction = 0;
    this.container.addChild(sprite);
    return sprite;
  }

  _releaseSprite(sprite) {
    sprite.visible = false;
    sprite.rotation = 0;
    sprite._spawnTick = null;
    sprite._attackTick = null;
    sprite._hitTick = null;
    sprite._lastHp = null;
    sprite._animFrame = 0;
    sprite._animSeqIdx = 0;
    sprite._animTick = 0;
    sprite._direction = 0;
    this.container.removeChild(sprite);
    this._pool.push(sprite);
  }

  /**
   * Get the texture key for an animal based on its state, direction, and animation frame.
   * For special states, returns a direction-agnostic single key.
   * For normal animals, returns e.g. 'RABBIT_DOWN_1'.
   */
  _getTexKey(a, direction, animFrame) {
    if (a.lifeStage === -1) return 'EGG'; // LifeStage.EGG = -1
    if (a.state === 9) return 'DEAD';
    if (a.state === 5) return 'SLEEPING';
    if (a.lifeStage === 4) return 'PUPA';
    return `${a.species}_${DIR_NAMES[direction] || 'DOWN'}_${animFrame}`;
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
      const isEgg = a.lifeStage === -1; // LifeStage.EGG

      // Update direction from engine data
      const dir = a.direction ?? 0;

      // Determine animation frame
      let animFrame;
      if (!sprite) {
        animFrame = 1; // neutral frame for new sprites
      } else {
        // Advance walk animation when animal moves
        const moved = a.x !== sprite._lastX || a.y !== sprite._lastY;
        if (moved) {
          sprite._animTick++;
          if (sprite._animTick >= ANIM_INTERVAL) {
            sprite._animTick = 0;
            sprite._animSeqIdx = (sprite._animSeqIdx + 1) % ANIM_SEQUENCE.length;
          }
          animFrame = ANIM_SEQUENCE[sprite._animSeqIdx];
        } else {
          // Idle: reset to neutral frame
          sprite._animSeqIdx = 0;
          sprite._animTick = 0;
          animFrame = 1;
        }
        sprite._direction = dir;
      }

      const texKey = this._getTexKey(a, dir, animFrame);
      const tex = this._textures[texKey]
        || this._textures[`${a.species}_DOWN_1`]
        || this._textures[a.species];
      if (!tex) continue;

      if (!sprite) {
        sprite = this._acquireSprite(tex);
        sprite._texKey = texKey;
        sprite._lastX = a.x;
        sprite._lastY = a.y;
        sprite._direction = dir;
        sprite._animFrame = 1;
        sprite._lastHp = Number.isFinite(a.hp) ? a.hp : null;
        this._sprites.set(a.id, sprite);
        // New animal appeared — birth animation (skip for dead)
        if (a.state !== 9 && this._animationLayer) {
          this._animationLayer.spawnBirth(a.x, a.y);
        }
        // Pop-in: start small, tracked via _spawnTick
        sprite._spawnTick = currentTick;
      }

      // Detect state transitions for animations
      const prevState = this._prevStates.get(a.id);
      if (prevState !== undefined && prevState !== a.state) {
        if (a.state === 6) {
          sprite._attackTick = currentTick;
          if (this._animationLayer) this._animationLayer.spawnAttack(a.x, a.y);
          this._emitEffectEvent('attack', a.x, a.y, a.species);
        } else if (this._animationLayer && a.state === 9) {
          this._animationLayer.spawnDeath(a.x, a.y);
          this._emitEffectEvent('death', a.x, a.y, a.species);
        } else if (a.state === 8) {
          if (this._animationLayer) this._animationLayer.spawnMate(a.x, a.y);
          this._emitEffectEvent('mate', a.x, a.y, a.species);
        } else if (a.state === 3) {
          if (this._animationLayer) this._animationLayer.spawnEat(a.x, a.y);
          this._emitEffectEvent('eat', a.x, a.y, a.species);
        } else if (a.state === 4) {
          this._emitEffectEvent('drink', a.x, a.y, a.species);
        } else if (a.state === 7 && prevState !== 7) {
          this._emitEffectEvent('flee', a.x, a.y, a.species);
        }
      }
      this._prevStates.set(a.id, a.state);

      const currentHp = Number.isFinite(a.hp) ? a.hp : null;
      if (
        currentTick > 0
        && currentHp != null
        && sprite._lastHp != null
        && currentHp < sprite._lastHp
        && a.state !== 9
        && a.alive !== false
      ) {
        sprite._hitTick = currentTick;
      }
      sprite._lastHp = currentHp;

      // Swap texture if state changed
      if (sprite._texKey !== texKey) {
        sprite.texture = tex;
        sprite._texKey = texKey;
      }

      // Position (already at sub-cell position including tile center)
      let spriteX = a.x;
      let spriteY = a.y;
      sprite.rotation = 0;

      // Track position for animation
      sprite._lastX = a.x;
      sprite._lastY = a.y;

      // Scale: atlas frame → ~1 tile.  Adjust for frame size so 1 frame ≈ 1 tile.
      const baseScale = 1 / FRAME_SIZE;
      let finalScale;
      if (isEgg) {
        // Eggs: small, static
        finalScale = baseScale * 0.4;
      } else {
        const energy = Number.isFinite(a.energy) ? a.energy : 0;
        const energyFactor = 0.8 + (energy / MAX_ANIMAL_ENERGY) * 0.4;
        const stageFactor = a.state === 9 ? 1.0
          : a.lifeStage === 4 ? 0.6   // PUPA
          : a.lifeStage === 0 ? 0.5
          : a.lifeStage === 1 ? 0.7
          : a.lifeStage === 2 ? 0.85
          : 1.0;
        const pregnantFactor = a.pregnant ? 1.1 : 1.0;
        finalScale = baseScale * energyFactor * stageFactor * pregnantFactor;
      }

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

      if (sprite._attackTick != null && currentTick > 0) {
        const age = currentTick - sprite._attackTick;
        if (age < ATTACK_JUMP_DURATION) {
          const t = age / ATTACK_JUMP_DURATION;
          const jump = Math.sin(t * Math.PI) * ATTACK_JUMP_HEIGHT;
          spriteY -= jump;
          finalScale *= 1 + Math.sin(t * Math.PI) * 0.08;
        } else {
          sprite._attackTick = null;
        }
      }

      if (sprite._hitTick != null && currentTick > 0) {
        const age = currentTick - sprite._hitTick;
        if (age < HIT_WOBBLE_DURATION) {
          const t = age / HIT_WOBBLE_DURATION;
          const envelope = 1 - t;
          const wave = Math.sin(t * Math.PI * 3);
          spriteX += wave * HIT_WOBBLE_OFFSET * envelope;
          sprite.rotation = wave * HIT_WOBBLE_ROTATION * envelope;
        } else {
          sprite._hitTick = null;
        }
      }

      // Guard: clamp to valid range to prevent giant sprites from NaN/invalid data
      if (!Number.isFinite(finalScale) || finalScale <= 0) finalScale = baseScale;

      sprite.x = spriteX;
      sprite.y = spriteY;

      // Uniform scale — direction is handled by the directional sprite frame
      sprite.scale.set(finalScale, finalScale);

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
        const barX = a.x - barW / 2;
        const barY = a.y - 0.52;

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
