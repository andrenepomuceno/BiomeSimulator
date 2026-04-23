import * as THREE from 'three';
import { createModelAssetLoader } from './modelAssetLoader.js';
import { ThreePointLayer } from './pointLayer.js';
import { ThreeSpritePool } from './spritePool.js';
import { ThreeModelPool } from './modelPool.js';
import {
  MAX_VISIBLE_ITEM_POINTS,
  MAX_VISIBLE_ITEM_SPRITES,
  ITEM_SPRITE_ZOOM_THRESHOLD,
  ITEM_EMOJIS,
  ITEM_COLORS,
  ITEM_MODEL_URLS,
  ITEM_MODEL_SCALE_MULTIPLIERS,
} from './rendererConfig.js';
import { getModelRotateXOverride, shouldAutoRotateModel } from './modelProfiles.js';

/**
 * Item rendering layer for the Three.js renderer.
 * Manages item points (zoomed-out dots), item sprites (emoji),
 * and item 3D models (GLB).
 */
export class ThreeItemLayer {
  constructor(worldGroup, emojiAtlas) {
    this._worldGroup = worldGroup;
    this._itemsById = new Map();
    this._points = new ThreePointLayer(worldGroup, MAX_VISIBLE_ITEM_POINTS, 3.5, 2, 1);
    this._sprites = new ThreeSpritePool(worldGroup, emojiAtlas);
    this._models = new ThreeModelPool(worldGroup, createModelAssetLoader());
    this._heightSampler = null;
  }

  /** Provide a terrain height sampler so items follow the displaced surface. */
  setHeightSampler(sampler) {
    this._heightSampler = sampler || null;
  }

  _terrainZ(x, y) {
    return this._heightSampler ? this._heightSampler.sampleAt(x, y) : 0;
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
      positions.push(item.x + 0.5, item.y + 0.5, this._terrainZ(item.x + 0.5, item.y + 0.5) + 0.05);
      colors.push(r, g, b);
      count++;
      if (count >= MAX_VISIBLE_ITEM_POINTS) break;
    }

    const pointSize = zoom >= 6 ? 4 : 3;
    this._points.update(positions, colors, pointSize);
  }

  // ---- Sprites & Models (zoomed-in) ----

  rebuildSprites(viewport, zoom, orbitEnabled, onVisRefresh) {
    const show = (orbitEnabled || zoom >= ITEM_SPRITE_ZOOM_THRESHOLD)
      && this._itemsById.size > 0;
    if (!show) {
      this._sprites.releaseAll();
      this._models.releaseAll(() => null);
      return;
    }

    const { x0, y0, x1, y1 } = viewport;
    const seenSprites = new Set();
    const seenModels = new Set();
    const scale = 0.55;
    let count = 0;

    for (const item of this._itemsById.values()) {
      if (!item || item.consumed) continue;
      if (item.x < x0 || item.x >= x1 || item.y < y0 || item.y >= y1) continue;
      if (count >= MAX_VISIBLE_ITEM_SPRITES) break;

      const modelUrl = ITEM_MODEL_URLS[item.type];
      const modelKey = modelUrl ? `item_${item.type}` : null;

      // Try 3D model first
      if (modelKey && modelUrl) {
        if (!this._models.isReady(modelKey)) {
          this._models.ensureLoaded(modelKey, modelUrl, () => {
            if (typeof onVisRefresh === 'function') onVisRefresh();
          });
        }

        const model = this._models.acquire(item.id, modelKey, (mesh) => {
          this._normalizeItemMesh(mesh, modelUrl);
        });

        if (model) {
          if (this._sprites.has(item.id)) this._sprites.release(item.id);
          const scaleMul = ITEM_MODEL_SCALE_MULTIPLIERS[item.type] || 0.5;
          const s = scaleMul * (orbitEnabled ? 1.4 : 1);
          model.scale.set(s, s, s);
          model.position.set(item.x + 0.5, item.y + 0.5, this._terrainZ(item.x + 0.5, item.y + 0.5));
          model.visible = true;
          seenModels.add(item.id);
          count++;
          continue;
        }
      }

      // Fallback: emoji sprite
      const emoji = ITEM_EMOJIS[item.type] || '📦';
      const sprite = this._sprites.acquire(item.id, emoji);
      sprite.position.set(item.x + 0.5, item.y + 0.5, this._terrainZ(item.x + 0.5, item.y + 0.5) + 2.5);
      sprite.scale.set(scale, scale, 1);
      sprite.material.opacity = 0.92;
      sprite.renderOrder = 50;
      sprite.visible = true;
      seenSprites.add(item.id);
      count++;
    }

    this._sprites.prune(seenSprites);
    this._models.prune(seenModels, (m) => m.userData.modelKey ?? null);
  }

  /** Normalize a freshly-cloned item mesh (center, upright). */
  _normalizeItemMesh(mesh, modelUrl = null) {
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    if (box.isEmpty()) return;

    const rotateXOverride = getModelRotateXOverride(modelUrl);
    if (Number.isFinite(rotateXOverride)) {
      mesh.rotation.x = rotateXOverride;
      mesh.updateMatrixWorld(true);
    } else {
      const sizeForHeuristic = box.getSize(new THREE.Vector3());
      if (shouldAutoRotateModel(sizeForHeuristic)) {
        mesh.rotation.x = Math.PI / 2;
        mesh.updateMatrixWorld(true);
      }
    }

    const normalizedBox = new THREE.Box3().setFromObject(mesh);
    const center = normalizedBox.getCenter(new THREE.Vector3());
    const size = normalizedBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    mesh.position.sub(center);
    mesh.position.z -= normalizedBox.min.z;
    mesh.scale.multiplyScalar(1 / maxDim);
  }

  destroy() {
    this._points.destroy();
    this._sprites.destroy();
    this._models.destroy();
    this._itemsById.clear();
  }
}
