/**
 * ItemLayer — renders ground items (meat, fruit, seed) as emoji sprites
 * at high zoom and colored pixel dots at low zoom.
 *
 * Follows the PlantLayer / EntityLayer pattern:
 * - Incremental updates via itemChanges deltas (op: 'add'|'remove'|'update').
 * - Sprite pool for recycling.
 * - Pixel overlay Graphics for low-zoom rendering.
 */
import * as PIXI from 'pixi.js';

/** Minimum zoom to show emoji sprites instead of pixel dots. */
const ITEM_EMOJI_ZOOM = 6;

/** Item type → emoji and pixel color. */
const ITEM_DISPLAY = {
  1: { emoji: '🥩', color: 0xcc4444 }, // MEAT
  2: { emoji: '🍑', color: 0xffaa33 }, // FRUIT
  3: { emoji: '🌰', color: 0xaa8833 }, // SEED
};

const SPRITE_SCALE = 0.5; // half a tile

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
    this._sprites = new Map(); // id → PIXI.Text

    // Current item data for pixel overlay redraw
    this._items = new Map(); // id → {x, y, type}

    // Sprite pool
    this._pool = [];
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
    const showEmoji = zoom >= ITEM_EMOJI_ZOOM;
    this._pixelContainer.visible = !showEmoji;
    for (const sprite of this._sprites.values()) {
      sprite.visible = showEmoji;
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
    const display = ITEM_DISPLAY[item.type] || ITEM_DISPLAY[1];

    // Reuse pooled sprite or create new
    let sprite = this._pool.pop();
    if (sprite) {
      sprite.text = display.emoji;
    } else {
      sprite = new PIXI.Text(display.emoji, {
        fontSize: 14,
        align: 'center',
      });
      sprite.anchor.set(0.5, 0.5);
      this._depthContainer.addChild(sprite);
    }

    sprite.x = item.x + 0.5;
    sprite.y = item.y + 0.5;
    sprite.scale.set(SPRITE_SCALE / 14); // normalize to world units
    sprite.zIndex = (item.y + 0.5) * 10;
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
