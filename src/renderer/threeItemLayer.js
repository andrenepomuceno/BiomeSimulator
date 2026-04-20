import { ThreePointLayer } from './threePointLayer.js';
import { ThreeSpritePool } from './threeSpritePool.js';
import {
  MAX_VISIBLE_ITEM_POINTS,
  MAX_VISIBLE_ITEM_SPRITES,
  ITEM_SPRITE_ZOOM_THRESHOLD,
  ITEM_EMOJIS,
  ITEM_COLORS,
} from './threeRendererConfig.js';

/**
 * Item rendering layer for the Three.js renderer.
 * Manages item points (zoomed-out dots) and item sprites (emoji).
 */
export class ThreeItemLayer {
  constructor(worldGroup, emojiAtlas) {
    this._itemsById = new Map();
    this._points = new ThreePointLayer(worldGroup, MAX_VISIBLE_ITEM_POINTS, 3.5, 2, 1);
    this._sprites = new ThreeSpritePool(worldGroup, emojiAtlas);
  }

  get size() {
    return this._itemsById.size;
  }

  getItems() {
    return this._itemsById;
  }

  /** Apply incremental item changes (add / update / remove). */
  applyChanges(itemChanges) {
    for (const change of itemChanges) {
      const { op, item } = change;
      if (!item) continue;
      if (op === 'remove') {
        this._itemsById.delete(item.id);
      } else if (op === 'add' || op === 'update') {
        this._itemsById.set(item.id, item);
      }
    }
  }

  /** Full replacement of item data. */
  setAll(items) {
    this._itemsById.clear();
    if (Array.isArray(items)) {
      for (const item of items) {
        if (!item || item.consumed) continue;
        this._itemsById.set(item.id, item);
      }
    }
  }

  // ---- Points (zoomed-out colored dots) ----

  rebuildPoints(viewport, zoom) {
    if (this._itemsById.size === 0) {
      this._points.clear();
      return;
    }

    const { x0, y0, x1, y1 } = viewport;
    const positions = [];
    const colors = [];
    let count = 0;

    for (const item of this._itemsById.values()) {
      if (!item || item.consumed) continue;
      if (item.x < x0 || item.x >= x1 || item.y < y0 || item.y >= y1) continue;
      const hex = ITEM_COLORS[item.type] || 0xcccccc;
      const r = ((hex >> 16) & 0xff) / 255;
      const g = ((hex >> 8) & 0xff) / 255;
      const b = (hex & 0xff) / 255;
      positions.push(item.x + 0.5, item.y + 0.5, 0);
      colors.push(r, g, b);
      count++;
      if (count >= MAX_VISIBLE_ITEM_POINTS) break;
    }

    const pointSize = zoom >= 6 ? 4 : 3;
    this._points.update(positions, colors, pointSize);
  }

  // ---- Sprites (zoomed-in emoji) ----

  rebuildSprites(viewport, zoom, orbitEnabled) {
    const show = (orbitEnabled || zoom >= ITEM_SPRITE_ZOOM_THRESHOLD)
      && this._itemsById.size > 0;
    if (!show) {
      this._sprites.releaseAll();
      return;
    }

    const { x0, y0, x1, y1 } = viewport;
    const seen = new Set();
    const scale = 0.55;
    let count = 0;

    for (const item of this._itemsById.values()) {
      if (!item || item.consumed) continue;
      if (item.x < x0 || item.x >= x1 || item.y < y0 || item.y >= y1) continue;
      const emoji = ITEM_EMOJIS[item.type] || '📦';
      const sprite = this._sprites.acquire(item.id, emoji);
      sprite.position.set(item.x + 0.5, item.y + 0.5, 2.5);
      sprite.scale.set(scale, scale, 1);
      sprite.material.opacity = 0.92;
      sprite.renderOrder = 50;
      sprite.visible = true;
      seen.add(item.id);
      count++;
      if (count >= MAX_VISIBLE_ITEM_SPRITES) break;
    }

    this._sprites.prune(seen);
  }

  destroy() {
    this._points.destroy();
    this._sprites.destroy();
    this._itemsById.clear();
  }
}
