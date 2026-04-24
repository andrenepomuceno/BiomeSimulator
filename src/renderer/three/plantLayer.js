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
  MODEL_ZOOM_THRESHOLD,
  ORBIT_TREE_SCALE_BOOST,
  TREE_MODEL_URLS,
  PLANT_MODEL_URLS,
  PLANT_MODEL_SCALE_MULTIPLIERS,
  DEAD_TREE_MODEL_URL,
  DEAD_PLANT_MODEL_URL,

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

    // Shadow pool for plant/tree shadows
    this._shadows = new Map(); // idx → Mesh
    this._shadowPool = [];
    this._shadowGeo = new THREE.CircleGeometry(0.5, 12);
    this._shadowGeo.scale(1, 0.4, 1);
    this._shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    });

    // Growth pulse tracking: idx → timestamp of growth event
    this._growthPulse = new Map();

    // Terrain height sampler (set by ThreeRenderer)
    this._heightSampler = null;

    // Reusable scratch Sets (reduce per-frame allocation/GC)
    this._seenSprites = new Set();
    this._seenModels = new Set();
    this._seenShadows = new Set();
  }

  /** Provide a terrain height sampler so plants follow the displaced surface. */
  setHeightSampler(sampler) {
    this._heightSampler = sampler || null;
  }

  _terrainZ(x, y) {
    return this._heightSampler ? this._heightSampler.sampleAt(x, y) : 0;
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
    const now = performance.now();
    for (const change of changes) {
      const [x, y, ptype, stage] = change;
      if (x < 0 || y < 0 || x >= this._mapWidth || y >= this._mapHeight) continue;
      const idx = y * this._mapWidth + x;
      const oldStage = this._plantStage[idx];
      this._plantType[idx] = ptype;
      this._plantStage[idx] = stage;
      // Track stage increase for growth pulse
      if (stage > oldStage && stage > 0 && oldStage > 0) {
        this._growthPulse.set(idx, now);
      }
    }
    // Bound _growthPulse growth: plants off-screen never hit the rebuild loop
    // where expired entries are pruned, so sweep when the map grows large.
    if (this._growthPulse.size > 2048) {
      const cutoff = now - 600;
      for (const [k, t] of this._growthPulse) {
        if (t < cutoff) this._growthPulse.delete(k);
      }
    }
  }

  // ---- Points (zoomed-out colored dots) ----

  rebuildPoints(viewport, zoom, orbitEnabled = false, stride = 1) {
    if (!this._plantType || !this._plantStage || this._mapWidth <= 0) {
      this._points.clear();
      return;
    }

    const { x0, y0, x1, y1 } = viewport;
    const buf = this._points.beginUpdate();
    const positions = buf.positions;
    const colors = buf.colors;
    const capacity = buf.capacity;
    const cap = Math.min(capacity, MAX_VISIBLE_PLANT_POINTS);
    const mapWidth = this._mapWidth;
    const plantType = this._plantType;
    const plantStage = this._plantStage;
    // All plants are emitted as points; 3D models (when active) overlay on
    // top inside the LOD bubble. Emoji sprites have been removed so there
    // is no longer a sprite layer that "covers" plants and lets us skip them.
    const step = Math.max(1, stride | 0);
    let count = 0;
    let p = 0;
    let c = 0;

    outer: for (let y = y0; y < y1; y += step) {
      const rowBase = y * mapWidth;
      for (let x = x0; x < x1; x += step) {
        const idx = rowBase + x;
        const t = plantType[idx];
        if (t === 0) continue;
        const s = plantStage[idx];
        if (s === 0) continue;
        const rgba = PLANT_COLORS[`${t}_${s}`] || [100, 200, 100, 180];
        const alpha = Math.max(0.35, Math.min(1, (rgba[3] || 180) / 255));
        positions[p++] = x + 0.5;
        positions[p++] = y + 0.5;
        positions[p++] = this._terrainZ(x + 0.5, y + 0.5) + 0.05;
        colors[c++] = (rgba[0] / 255) * alpha;
        colors[c++] = (rgba[1] / 255) * alpha;
        colors[c++] = (rgba[2] / 255) * alpha;
        count++;
        if (count >= cap) break outer;
      }
    }

    // Compensate point size when striding so the dot cloud keeps similar
    // visual coverage even when we sample fewer cells.
    const pointSize = (zoom >= 6 ? 3.5 : 2.5) * Math.min(2.5, Math.sqrt(step));
    this._points.commit(count, pointSize);
  }

  // ---- Sprites + Models (zoomed-in) ----

  rebuildSprites(viewport, zoom, orbitEnabled, onVisRefresh, lodCenter, lodRadiusSq, allowModels = true, lodRadius = 0, allowSprites = true) {
    // The function name says "sprites" but it also drives 3D model placement.
    // We bail out only when nothing in either branch could render — if
    // sprites are disabled but models are still allowed (e.g. zoomed in or
    // inside the LOD bubble) we must keep going to spawn the GLB models.
    const visible = (orbitEnabled || zoom >= PLANT_SPRITE_ZOOM_THRESHOLD)
      && this._plantType && this._plantStage && this._mapWidth > 0;
    const show = visible && (allowSprites || allowModels);

    if (!show) {
      this._sprites.releaseAll();
      this._models.releaseAll((m) => m.userData?.treeModelKey);
      this._hideAllShadows();
      return;
    }

    let { x0, y0, x1, y1 } = viewport;
    const useLOD = orbitEnabled && lodCenter && lodRadiusSq > 0;
    // Restrict the tile scan to the LOD bbox when in orbit. Without this,
    // far-zoom overviews scan ~1M tiles per frame even though only the
    // detail bubble produces sprites/models. Clip to the viewport to keep
    // off-screen culling correct.
    if (useLOD && lodRadius > 0) {
      const r = Math.ceil(lodRadius) + 1;
      const cx = lodCenter.x;
      const cy = lodCenter.y;
      x0 = Math.max(x0, Math.floor(cx - r));
      y0 = Math.max(y0, Math.floor(cy - r));
      x1 = Math.min(x1, Math.ceil(cx + r));
      y1 = Math.min(y1, Math.ceil(cy + r));
    }
    const seenSprites = this._seenSprites; seenSprites.clear();
    const seenModels = this._seenModels; seenModels.clear();
    const seenShadows = this._seenShadows; seenShadows.clear();
    const scale = 0.82;
    let count = 0;
    const now = performance.now();
    const swayTime = now * 0.001; // seconds for sway
    const GROWTH_PULSE_DURATION = 600; // ms

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const idx = y * this._mapWidth + x;
        const t = this._plantType[idx];
        const s = this._plantStage[idx];
        if (t === 0 || s === 0) continue;

        if (useLOD) {
          const dx = x - lodCenter.x;
          const dy = y - lodCenter.y;
          if (dx * dx + dy * dy > lodRadiusSq) continue;
        }

        // Growth pulse scale factor
        let growthScale = 1;
        const pulseStart = this._growthPulse.get(idx);
        if (pulseStart !== undefined) {
          const elapsed = now - pulseStart;
          if (elapsed < GROWTH_PULSE_DURATION) {
            const t01 = elapsed / GROWTH_PULSE_DURATION;
            // Elastic ease-out: overshoot then settle
            growthScale = 1 + 0.2 * Math.sin(t01 * Math.PI) * (1 - t01);
          } else {
            this._growthPulse.delete(idx);
          }
        }

        // Gate 3D models by zoom — below MODEL_ZOOM_THRESHOLD we keep the
        // sprite fallback so dense plant fields stay affordable. The renderer
        // also forces allowModels=false when the orbit camera is far enough
        // that 3D meshes stop being worth their cost.
        const modelsAllowed = allowModels && (orbitEnabled || zoom >= MODEL_ZOOM_THRESHOLD);
        if (modelsAllowed && this._isModelRenderable(t, s)) {
          const modelKey = this._getModelKey(t, s);
          const url = this._getModelUrl(t, s);
          this._models.ensureLoaded(modelKey, url, onVisRefresh);

          let model = this._models.get(idx);
          // Release stale model when the plant at this tile transitioned to a
          // different modelKey (alive→dead, species swap, etc.). Without this
          // the cached live-tree model would persist past the dead transition.
          if (model && model.userData?.treeModelKey !== modelKey) {
            this._models.release(idx, model.userData.treeModelKey);
            model = null;
          }
          if (!model && this._models.isReady(modelKey)) {
            model = this._models.acquire(idx, modelKey, (mesh) => this._normalizeMesh(mesh, url));
            if (model) model.userData = { treeTypeId: t, treeModelKey: modelKey };
          }

          if (model) {
            if (this._sprites.has(idx)) this._sprites.release(idx);
            const modelScale = this._getModelScale(t, s, orbitEnabled) * growthScale;
            model.position.set(x + 0.5, y + 0.5, this._terrainZ(x + 0.5, y + 0.5) + 0.02);
            model.scale.set(modelScale, modelScale, modelScale);

            // Subtle sway: Z-rotation using position hash for per-plant phase offset
            const swayPhase = (x * 13 + y * 37) * 0.1;
            const swayAmount = 0.03 + (s >= 4 ? 0.02 : 0); // larger trees sway more
            model.rotation.z = Math.sin(swayTime * 1.2 + swayPhase) * swayAmount;

            model.visible = true;
            seenModels.add(idx);

            // Shadow under plant model
            this._updateShadow(idx, x + 0.5, y + 0.5, modelScale * 0.7);
            seenShadows.add(idx);

            count++;
            if (count >= MAX_VISIBLE_PLANT_SPRITES) break;
            continue;
          }
        }

        // Sprite fallback (only when sprites are enabled — otherwise the
        // plant is represented by the colored point cloud below).
        if (!allowSprites) continue;
        const emoji = this._getEmoji(t, s);
        const sprite = this._sprites.acquire(idx, emoji);
        sprite.position.set(x + 0.5, y + 0.5, this._terrainZ(x + 0.5, y + 0.5) + 0.5);
        const isDead = s > 5;
        const sprScale = scale * growthScale * (isDead ? 0.5 : 1);
        sprite.scale.set(sprScale, sprScale, 1);
        sprite.material.opacity = isDead ? 0.3
          : s === 1 ? 0.75 : s === 2 ? 0.85 : s === 3 ? 0.92 : s === 5 ? 0.96 : 1.0;
        sprite.renderOrder = 20;
        sprite.visible = true;
        seenSprites.add(idx);

        // Shadow under sprite
        this._updateShadow(idx, x + 0.5, y + 0.5, scale * 0.4);
        seenShadows.add(idx);

        count++;
        if (count >= MAX_VISIBLE_PLANT_SPRITES) break;
      }
      if (count >= MAX_VISIBLE_PLANT_SPRITES) break;
    }

    this._sprites.prune(seenSprites);
    this._models.prune(seenModels, (m) => m.userData?.treeModelKey ?? m.userData?.treeTypeId);
    this._pruneShadows(seenShadows);
  }

  // ---- Shadow management ----

  _acquireShadow() {
    if (this._shadowPool.length > 0) return this._shadowPool.pop();
    const mesh = new THREE.Mesh(this._shadowGeo, this._shadowMat);
    mesh.renderOrder = 1;
    this._worldGroup.add(mesh);
    return mesh;
  }

  _updateShadow(idx, x, y, scale) {
    let shadow = this._shadows.get(idx);
    if (!shadow) {
      shadow = this._acquireShadow();
      this._shadows.set(idx, shadow);
    }
    shadow.position.set(x, y, this._terrainZ(x, y) + 0.01);
    shadow.scale.set(scale, scale, 1);
    shadow.visible = true;
  }

  _hideAllShadows() {
    for (const shadow of this._shadows.values()) {
      shadow.visible = false;
      this._shadowPool.push(shadow);
    }
    this._shadows.clear();
  }

  _pruneShadows(seenIds) {
    for (const id of this._shadows.keys()) {
      if (!seenIds.has(id)) {
        const shadow = this._shadows.get(id);
        shadow.visible = false;
        this._shadowPool.push(shadow);
        this._shadows.delete(id);
      }
    }
  }

  // ---- Model helpers ----

  _isModelRenderable(typeId, stage) {
    if (!typeId || stage <= 0) return false;
    if (stage > 5) return true; // dead: trees → stump_round, others → stump_old
    return Boolean(PLANT_MODEL_URLS[typeId] || TREE_MODEL_URLS[typeId]);
  }

  _getModelKey(typeId, stage) {
    if (stage > 5) return this._treeTypeIds.has(typeId) ? 'DEAD_STUMP' : 'DEAD_PLANT';
    return `PLANT_${typeId}`;
  }

  _getModelUrl(typeId, stage) {
    if (stage > 5) return this._treeTypeIds.has(typeId) ? DEAD_TREE_MODEL_URL : DEAD_PLANT_MODEL_URL;
    return PLANT_MODEL_URLS[typeId] || TREE_MODEL_URLS[typeId] || null;
  }

  _getModelScale(typeId, stage, orbitEnabled) {
    if (stage > 5) {
      // Dead: tree stumps stay chunky; non-tree dead plants sit low to the ground.
      if (this._treeTypeIds.has(typeId)) return 0.62;
      return 0.32;
    }
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
    for (const shadow of this._shadows.values()) this._worldGroup.remove(shadow);
    for (const shadow of this._shadowPool) this._worldGroup.remove(shadow);
    this._shadows.clear();
    this._shadowPool.length = 0;
    if (this._shadowGeo) { this._shadowGeo.dispose(); this._shadowGeo = null; }
    if (this._shadowMat) { this._shadowMat.dispose(); this._shadowMat = null; }
  }
}
