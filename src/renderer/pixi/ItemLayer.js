/**
 * ItemLayer — renders ground items (meat, fruit, seed) as atlas sprites
 * at high zoom and colored pixel dots at low zoom.
 *
 * Follows the PlantLayer / EntityLayer pattern:
 * - Incremental updates via itemChanges deltas (op: 'add'|'remove'|'update').
 * - Sprite pool for recycling.
 * - Pixel overlay Graphics for low-zoom rendering.
 */
import * as PIXI from 'pixi.js';
import { generateItemEmojiTextures } from '../../utils/emojiTextures.js';
import { FRAME_SIZE } from '../../utils/spriteAtlas.js';
import { buildMassDropMap } from '../../engine/animalSpecies.js';
import { buildFruitKeysBySource, buildSeedKeysBySource } from '../../engine/plantSpecies.js';

/** Minimum zoom to show item sprites instead of pixel dots. */
const ITEM_SPRITE_ZOOM = 6;

const FRUIT_KEYS_BY_SOURCE = buildFruitKeysBySource();
const SEED_KEYS_BY_SOURCE = buildSeedKeysBySource();

const MASS_DROP_MAP = buildMassDropMap();

/** Item type → emoji and pixel color. */
const ITEM_DISPLAY = {
  1: { emoji: '🥩', color: 0xcc4444 }, // MEAT
  2: { emoji: '🍑', color: 0xffaa33 }, // FRUIT
  3: { emoji: '🌰', color: 0xaa8833 }, // SEED
};

// Keep item size in line with fauna/flora atlas scaling and apply
// a small boost so drops remain readable without dominating the scene.
const SPRITE_SCALE = (1 / FRAME_SIZE) * 0.85;

function getMeatTextureKey(sourceSpecies) {
  const massInfo = MASS_DROP_MAP[sourceSpecies];
  const category = massInfo?.category || 'medium';
  if (category === 'small') return 'MEAT_SMALL_0';
  if (category === 'large') return 'MEAT_LARGE_0';
  return 'MEAT_MEDIUM_0';
}

function getItemTextureKey(item) {
  if (item.type === 1) return getMeatTextureKey(item.source);
  if (item.type === 2) return FRUIT_KEYS_BY_SOURCE[item.source] || 'FRUIT_STRAWBERRY_0';
  if (item.type === 3) return SEED_KEYS_BY_SOURCE[item.source] || 'SEED_STRAWBERRY_0';
  return 'MEAT_MEDIUM_0';
}

export class ItemLayer {
  /**
   * @param {PIXI.Container} depthContainer - Y-sorted container shared with plants/entities.
   */
  constructor(depthContainer) {
    this._depthContainer = depthContainer;

    // Pixel overlay for low-zoom rendering
    this._pixelGfx = new PIXI.Graphics();
    this._pixelContainer = new PIXI.Container();
    this._pixelContainer.addChild(this._pixelGfx);
    this._pixelContainer.zIndex = -500000; // below animals, above terrain

    // Per-item sprite tracking
    this._sprites = new Map(); // id → PIXI.Sprite

    // Current item data for pixel overlay redraw
    this._items = new Map(); // id → {x, y, type}

    // Sprite pool
    this._pool = [];

    // Atlas textures (lazy)
    this._itemTextures = null;
  }

  /** Returns the pixel overlay container (added to worldContainer). */
  get pixelContainer() {
    return this._pixelContainer;
  }

  /**
   * Apply an array of item change deltas.
   * @param {Array<{op: string, item: object}>} changes
   */
  updateItems(changes) {
    if (!changes || changes.length === 0) return;

    for (const change of changes) {
      const { op, item } = change;
      if (op === 'add') {
        this._addItem(item);
      } else if (op === 'remove') {
        this._removeItem(item.id);
      } else if (op === 'update') {
        // Type changed (fruit → seed): remove and re-add
        this._removeItem(item.id);
        if (!item.consumed) this._addItem(item);
      }
    }
    this._redrawPixelOverlay();
  }

  /** Full sync — replace all item sprites. */
  setItems(items) {
    // Remove all existing
    for (const id of this._sprites.keys()) {
      this._recycleSprite(id);
    }
    this._items.clear();

    for (const item of items) {
      if (!item.consumed) this._addItem(item);
    }
    this._redrawPixelOverlay();
  }

  /**
   * Refresh sprite visibility based on current zoom.
   * Called each frame when zoom changes.
   */
  updateZoom(zoom) {
    const showSprites = zoom >= ITEM_SPRITE_ZOOM;
    this._pixelContainer.visible = !showSprites;
    for (const sprite of this._sprites.values()) {
      sprite.visible = showSprites;
    }
  }

  destroy() {
    for (const id of [...this._sprites.keys()]) {
      this._recycleSprite(id);
    }
    this._pixelGfx.destroy();
    this._pixelContainer.destroy();
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  _addItem(item) {
    if (item.consumed) return;
    if (!this._itemTextures) this._itemTextures = generateItemEmojiTextures();

    const texKey = getItemTextureKey(item);
    const texture = this._itemTextures[texKey] || this._itemTextures.MEAT_MEDIUM_0;
    if (!texture) return;

    // Reuse pooled sprite or create new
    let sprite = this._pool.pop();
    if (sprite) {
      sprite.texture = texture;
    } else {
      sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(0.5, 0.5);
      this._depthContainer.addChild(sprite);
    }

    sprite.x = item.x + 0.5;
    sprite.y = item.y + 0.5;
    sprite.scale.set(SPRITE_SCALE);
    sprite.zIndex = Math.round((item.y + 0.5) * 1000);
    sprite.visible = false; // set by updateZoom

    this._sprites.set(item.id, sprite);
    this._items.set(item.id, { x: item.x, y: item.y, type: item.type });
  }

  _removeItem(id) {
    this._recycleSprite(id);
    this._items.delete(id);
  }

  _recycleSprite(id) {
    const sprite = this._sprites.get(id);
    if (!sprite) return;
    sprite.visible = false;
    this._pool.push(sprite);
    this._sprites.delete(id);
  }

  _redrawPixelOverlay() {
    const gfx = this._pixelGfx;
    gfx.clear();
    for (const [, { x, y, type }] of this._items) {
      const color = (ITEM_DISPLAY[type] || ITEM_DISPLAY[1]).color;
      gfx.beginFill(color, 0.85);
      gfx.drawRect(x + 0.25, y + 0.25, 0.5, 0.5);
      gfx.endFill();
    }
  }
}
