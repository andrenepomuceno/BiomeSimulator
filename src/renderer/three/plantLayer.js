import * as THREE from 'three';
import { PLANT_COLORS } from '../../utils/terrainColors.js';
import { buildPlantEmojiMap, buildTreeTypes } from '../../engine/plantSpecies.js';
import { createModelAssetLoader } from './modelAssetLoader.js';
import { ThreePointLayer } from './pointLayer.js';
import { ThreeSpritePool } from './spritePool.js';
import { ThreeModelPool } from './modelPool.js';
import {
  MAX_VISIBLE_PLANT_POINTS,
  MAX_VISIBLE_PLANT_SPRITES,
  PLANT_SPRITE_ZOOM_THRESHOLD,
  ORBIT_TREE_SCALE_BOOST,
  TREE_MODEL_URLS,
  PLANT_MODEL_URLS,
  PLANT_MODEL_SCALE_MULTIPLIERS,
  DEAD_TREE_MODEL_URL,
} from './rendererConfig.js';
import { getModelRotateXOverride, shouldAutoRotateModel } from './modelProfiles.js';

/**
 * Plant rendering layer for the Three.js renderer.
 * Manages plant points (zoomed-out dots), plant sprites (emoji),
 * and plant/tree 3D models (GLB).
 */
export class ThreePlantLayer {
  constructor(worldGroup, emojiAtlas) {
    this._worldGroup = worldGroup;

    this._plantType = null;
    this._plantStage = null;
    this._mapWidth = 0;
    this._mapHeight = 0;

    this._emojiMap = buildPlantEmojiMap();
    this._treeTypeIds = buildTreeTypes();

    this._points = new ThreePointLayer(worldGroup, MAX_VISIBLE_PLANT_POINTS, 2.5, 1, 0.95);
    this._sprites = new ThreeSpritePool(worldGroup, emojiAtlas);
    this._models = new ThreeModelPool(worldGroup, createModelAssetLoader());
  }

  setData(plantType, plantStage, mapWidth, mapHeight) {
    this._plantType = plantType;
    this._plantStage = plantStage;
    this._mapWidth = mapWidth;
    this._mapHeight = mapHeight;
  }

  getStageAt(x, y) {
    if (!this._plantStage || x < 0 || y < 0 || x >= this._mapWidth || y >= this._mapHeight) return 0;
    return this._plantStage[y * this._mapWidth + x];
  }

  /** Apply incremental changes to the cached plant arrays. */
  applyChanges(changes) {
    if (!this._plantType || !this._plantStage) return;
    for (const change of changes) {
      const [x, y, ptype, stage] = change;
      if (x < 0 || y < 0 || x >= this._mapWidth || y >= this._mapHeight) continue;
      const idx = y * this._mapWidth + x;
      this._plantType[idx] = ptype;
      this._plantStage[idx] = stage;
    }
  }

  // ---- Points (zoomed-out colored dots) ----

  rebuildPoints(viewport, zoom) {
    if (!this._plantType || !this._plantStage || this._mapWidth <= 0) {
      this._points.clear();
      return;
    }

    const { x0, y0, x1, y1 } = viewport;
    const positions = [];
    const colors = [];
    let count = 0;

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const idx = y * this._mapWidth + x;
        const t = this._plantType[idx];
        const s = this._plantStage[idx];
        if (t === 0 || s === 0) continue;
        if (this._isModelRenderable(t, s)) continue;
        const rgba = PLANT_COLORS[`${t}_${s}`] || [100, 200, 100, 180];
        const alpha = Math.max(0.35, Math.min(1, (rgba[3] || 180) / 255));
        positions.push(x + 0.5, y + 0.5, 0);
        colors.push((rgba[0] / 255) * alpha, (rgba[1] / 255) * alpha, (rgba[2] / 255) * alpha);
        count++;
        if (count >= MAX_VISIBLE_PLANT_POINTS) break;
      }
      if (count >= MAX_VISIBLE_PLANT_POINTS) break;
    }

    const pointSize = zoom >= 6 ? 3.5 : 2.5;
    this._points.update(positions, colors, pointSize);
  }

  // ---- Sprites + Models (zoomed-in) ----

  rebuildSprites(viewport, zoom, orbitEnabled, onVisRefresh) {
    const show = (orbitEnabled || zoom >= PLANT_SPRITE_ZOOM_THRESHOLD)
      && this._plantType && this._plantStage && this._mapWidth > 0;

    if (!show) {
      this._sprites.releaseAll();
      this._models.releaseAll((m) => m.userData?.treeModelKey);
      return;
    }

    const { x0, y0, x1, y1 } = viewport;
    const seenSprites = new Set();
    const seenModels = new Set();
    const scale = 0.82;
    let count = 0;

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const idx = y * this._mapWidth + x;
        const t = this._plantType[idx];
        const s = this._plantStage[idx];
        if (t === 0 || s === 0) continue;

        if (this._isModelRenderable(t, s)) {
          const modelKey = this._getModelKey(t, s);
          const url = this._getModelUrl(t, s);
          this._models.ensureLoaded(modelKey, url, onVisRefresh);

          let model = this._models.get(idx);
          if (!model && this._models.isReady(modelKey)) {
            model = this._models.acquire(idx, modelKey, (mesh) => this._normalizeMesh(mesh, url));
            if (model) model.userData = { treeTypeId: t, treeModelKey: modelKey };
          }

          if (model) {
            // Remove sprite fallback if model is now available
            if (this._sprites.has(idx)) this._sprites.release(idx);
            const modelScale = this._getModelScale(t, s, orbitEnabled);
            model.position.set(x + 0.5, y + 0.5, 0.02);
            model.scale.set(modelScale, modelScale, modelScale);
            model.visible = true;
            seenModels.add(idx);
            count++;
            if (count >= MAX_VISIBLE_PLANT_SPRITES) break;
            continue;
          }
        }

        // Sprite fallback
        const emoji = this._getEmoji(t, s);
        const sprite = this._sprites.acquire(idx, emoji);
        sprite.position.set(x + 0.5, y + 0.5, 0.5);
        sprite.scale.set(scale, scale, 1);
        sprite.material.opacity = s === 1 ? 0.75 : s === 2 ? 0.85 : s === 3 ? 0.92 : s === 5 ? 0.96 : 1.0;
        sprite.renderOrder = 20;
        sprite.visible = true;
        seenSprites.add(idx);
        count++;
        if (count >= MAX_VISIBLE_PLANT_SPRITES) break;
      }
      if (count >= MAX_VISIBLE_PLANT_SPRITES) break;
    }

    this._sprites.prune(seenSprites);
    this._models.prune(seenModels, (m) => m.userData?.treeModelKey ?? m.userData?.treeTypeId);
  }

  // ---- Model helpers ----

  _isModelRenderable(typeId, stage) {
    if (!typeId || stage <= 0) return false;
    if (stage > 5) return this._treeTypeIds.has(typeId);
    return Boolean(PLANT_MODEL_URLS[typeId] || TREE_MODEL_URLS[typeId]);
  }

  _getModelKey(typeId, stage) {
    return stage > 5 ? 'DEAD_STUMP' : `PLANT_${typeId}`;
  }

  _getModelUrl(typeId, stage) {
    if (stage > 5) return this._treeTypeIds.has(typeId) ? DEAD_TREE_MODEL_URL : null;
    return PLANT_MODEL_URLS[typeId] || TREE_MODEL_URLS[typeId] || null;
  }

  _getModelScale(typeId, stage, orbitEnabled) {
    if (stage > 5) return 0.62;
    const stageScale = stage === 1 ? 0.4
      : stage === 2 ? 0.58
      : stage === 3 ? 0.78
      : stage === 4 ? 1.0
      : 1.12;
    const isTree = this._treeTypeIds.has(typeId);
    const orbitBoost = orbitEnabled ? (isTree ? ORBIT_TREE_SCALE_BOOST : 1.2) : 1;
    const speciesBoost = PLANT_MODEL_SCALE_MULTIPLIERS[typeId] || 1;
    if (typeId === 4) return stageScale * 1.05 * speciesBoost * orbitBoost;
    if (typeId === 5) return stageScale * 1.1 * speciesBoost * orbitBoost;
    if (typeId === 10) return stageScale * 1.2 * speciesBoost * orbitBoost;
    if (typeId === 12) return stageScale * 1.35 * speciesBoost * orbitBoost;
    return stageScale * speciesBoost * orbitBoost;
  }

  _getEmoji(typeId, stage) {
    if (stage > 5) return '🪵';
    return this._emojiMap[`${typeId}_${stage}`] || '🌿';
  }

  _normalizeMesh(mesh, modelUrl = null) {
    mesh.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(mesh);
    if (box.isEmpty()) return;

    const size = new THREE.Vector3();
    box.getSize(size);
    const rotateXOverride = getModelRotateXOverride(modelUrl);
    if (Number.isFinite(rotateXOverride)) {
      mesh.rotation.x = rotateXOverride;
      mesh.updateMatrixWorld(true);
      box = new THREE.Box3().setFromObject(mesh);
    } else if (shouldAutoRotateModel(size)) {
      mesh.rotation.x = Math.PI / 2;
      mesh.updateMatrixWorld(true);
      box = new THREE.Box3().setFromObject(mesh);
    }

    const center = new THREE.Vector3();
    box.getCenter(center);
    mesh.position.x -= center.x;
    mesh.position.y -= center.y;
    mesh.position.z -= box.min.z;
    mesh.updateMatrixWorld(true);
  }

  destroy() {
    this._points.destroy();
    this._sprites.destroy();
    this._models.destroy();
  }
}
