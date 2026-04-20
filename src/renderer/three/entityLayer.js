import * as THREE from 'three';
import { SPECIES_INFO } from '../../utils/terrainColors.js';
import { AnimalState, Direction, LifeStage } from '../../engine/entities.js';
import { buildAnimalColorMap, buildSpeciesVisualScale } from '../../engine/animalSpecies.js';
import { createModelAssetLoader } from './modelAssetLoader.js';
import { ThreePointLayer } from './pointLayer.js';
import { ThreeSpritePool } from './spritePool.js';
import { ThreeModelPool } from './modelPool.js';
import {
  MAX_VISIBLE_ENTITY_POINTS,
  ENTITY_SPRITE_ZOOM_THRESHOLD,
  ANIMAL_SPRITE_SCALE_BOOST,
  ANIMAL_MODEL_SCALE_BOOST,
  ORBIT_ENTITY_SPRITE_BOOST,
  ORBIT_ENTITY_MODEL_BOOST,
  ENTITY_MODEL_URLS,
  ENTITY_MODEL_SCALE_MULTIPLIERS,
} from './rendererConfig.js';
import { getModelRotateXOverride, shouldAutoRotateModel } from './modelProfiles.js';

// Map engine direction to model rotation around Z-axis.
// Models face +Y by default (forward).
const DIRECTION_YAW = {
  [Direction.UP]: 0,
  [Direction.RIGHT]: -Math.PI / 2,
  [Direction.LEFT]: Math.PI / 2,
  [Direction.DOWN]: Math.PI,
};

/**
 * Entity (animal) rendering layer for the Three.js renderer.
 * Manages entity points (zoomed-out), sprites (emoji), 3D models (GLB),
 * and state-transition effects (particles, sound events).
 */
export class ThreeEntityLayer {
  constructor(worldGroup, emojiAtlas) {
    this._worldGroup = worldGroup;

    this._animals = [];
    this._colorMap = buildAnimalColorMap();
    this._visualScale = buildSpeciesVisualScale();
    this._prevStates = new Map();
    this._fleeBuckets = new Set();
    this._fleeBucketTick = -1;

    this._points = new ThreePointLayer(worldGroup, MAX_VISIBLE_ENTITY_POINTS, 4.5, 3, 1);
    this._sprites = new ThreeSpritePool(worldGroup, emojiAtlas);
    this._models = new ThreeModelPool(worldGroup, createModelAssetLoader());
  }

  get animals() {
    return this._animals;
  }

  setAnimals(animals) {
    this._animals = Array.isArray(animals) ? animals : [];
  }

  // ---- State-transition effects ----

  /**
   * Detect state transitions and emit particle/effect events.
   * Returns array of effect event objects (or empty).
   */
  processStateTransitions(tick, viewport, particles) {
    const effects = [];
    const { x0, y0, x1, y1 } = viewport;

    for (const a of this._animals) {
      if (!a) continue;
      const inViewport = a.x >= x0 && a.x < x1 && a.y >= y0 && a.y < y1;
      const prevState = this._prevStates.get(a.id);

      if (prevState === undefined) {
        if (inViewport) particles.spawn('birth', a.x, a.y);
      } else if (prevState !== a.state) {
        if (!inViewport) {
          this._prevStates.set(a.id, a.state);
          continue;
        }
        const evt = this._emitTransition(a, tick, particles);
        if (evt) effects.push(evt);
      }

      if (inViewport && a.state === AnimalState.SLEEPING && tick > 0 && tick % 60 === 0) {
        particles.spawn('sleep', a.x, a.y);
      }
      this._prevStates.set(a.id, a.state);
    }

    // Prune stale entries
    if (this._prevStates.size > this._animals.length * 2 + 100) {
      const alive = new Set();
      for (const a of this._animals) if (a) alive.add(a.id);
      for (const id of this._prevStates.keys()) {
        if (!alive.has(id)) this._prevStates.delete(id);
      }
    }

    return effects;
  }

  _emitTransition(a, tick, particles) {
    switch (a.state) {
      case AnimalState.ATTACKING:
        particles.spawn('attack', a.x, a.y);
        return { type: 'attack', x: a.x, y: a.y, species: a.species, tick };
      case AnimalState.DEAD:
        particles.spawn('death', a.x, a.y);
        return { type: 'death', x: a.x, y: a.y, species: a.species, tick };
      case AnimalState.MATING:
        particles.spawn('mate', a.x, a.y);
        return { type: 'mate', x: a.x, y: a.y, species: a.species, tick };
      case AnimalState.EATING:
        particles.spawn('eat', a.x, a.y);
        return { type: 'eat', x: a.x, y: a.y, species: a.species, tick };
      case AnimalState.DRINKING:
        particles.spawn('drink', a.x, a.y);
        return { type: 'drink', x: a.x, y: a.y, species: a.species, tick };
      case AnimalState.FLEEING: {
        if (tick !== this._fleeBucketTick) {
          this._fleeBucketTick = tick;
          this._fleeBuckets.clear();
        }
        const bk = (Math.floor(a.x / 8) << 16) | (Math.floor(a.y / 8) & 0xffff);
        if (!this._fleeBuckets.has(bk)) {
          this._fleeBuckets.add(bk);
          particles.spawn('flee', a.x, a.y);
        }
        return null;
      }
      default:
        return null;
    }
  }

  // ---- Points (zoomed-out colored dots) ----

  rebuildPoints(viewport, zoom) {
    if (this._animals.length === 0) {
      this._points.clear();
      return;
    }

    const { x0, y0, x1, y1 } = viewport;
    const positions = [];
    const colors = [];
    let count = 0;

    for (const a of this._animals) {
      if (!a || a.alive === false || a.state === AnimalState.DEAD) continue;
      if (a.x < x0 || a.x >= x1 || a.y < y0 || a.y >= y1) continue;
      const hex = this._colorMap[a.species] || 0xcccccc;
      const r = ((hex >> 16) & 0xff) / 255;
      const g = ((hex >> 8) & 0xff) / 255;
      const b = (hex & 0xff) / 255;
      positions.push(a.x, a.y, 0);
      colors.push(r, g, b);
      count++;
      if (count >= MAX_VISIBLE_ENTITY_POINTS) break;
    }

    const pointSize = zoom >= 6 ? 5 : 3.5;
    this._points.update(positions, colors, pointSize);
  }

  // ---- Sprites + Models (zoomed-in) ----

  rebuildSprites(viewport, zoom, orbitEnabled, onVisRefresh) {
    const showSprites = orbitEnabled || zoom >= ENTITY_SPRITE_ZOOM_THRESHOLD;
    if (!showSprites) {
      this._sprites.releaseAll();
      this._models.releaseAll((m) => m.userData?.species);
      return;
    }

    const { x0, y0, x1, y1 } = viewport;
    const seenSprites = new Set();
    const seenModels = new Set();

    for (const a of this._animals) {
      if (!a) continue;
      if (a.x < x0 || a.x >= x1 || a.y < y0 || a.y >= y1) continue;

      const emoji = this._getEmoji(a);
      const sprite = this._sprites.acquire(a.id, emoji);

      const speciesScale = this._visualScale[a.species] || 0.85;
      const stageFactor = a.lifeStage === LifeStage.EGG ? 0.4
        : a.lifeStage === LifeStage.PUPA ? 0.6
        : a.lifeStage === LifeStage.BABY ? 0.5
        : a.lifeStage === LifeStage.YOUNG ? 0.7
        : a.lifeStage === LifeStage.YOUNG_ADULT ? 0.85
        : 1.0;
      const orbitBoost = orbitEnabled ? ORBIT_ENTITY_SPRITE_BOOST : 1;
      const finalScale = Math.max(0.42, Math.min(2.4, speciesScale * stageFactor * ANIMAL_SPRITE_SCALE_BOOST * orbitBoost));

      // Attempt 3D model
      if (this._canUseModel(a)) {
        const species = a.species;
        const url = ENTITY_MODEL_URLS[species];
        this._models.ensureLoaded(species, url, onVisRefresh);

        let model = this._models.get(a.id);
        if (!model && this._models.isReady(species)) {
          model = this._models.acquire(a.id, species, (mesh) => this._normalizeEntityMesh(mesh, url));
          if (model) model.userData.species = species;
        }
        if (model) {
          // Release sprite fallback
          if (this._sprites.has(a.id)) this._sprites.release(a.id);
          const modelScale = this._getModelScale(a, finalScale, orbitEnabled);
          model.position.set(a.x, a.y, 0.4);
          model.scale.set(modelScale, modelScale, modelScale);
          this._setModelOrientation(model, a);
          model.visible = true;
          seenModels.add(a.id);
          continue;
        }
      }

      // Sprite fallback
      sprite.position.set(a.x, a.y, 0);
      sprite.scale.set(finalScale, finalScale, 1);
      sprite.material.opacity = a.state === AnimalState.DEAD ? 0.75
        : a.state === AnimalState.SLEEPING ? 0.68
        : 1;
      sprite.material.color.setHex(this._colorMap[a.species] || 0xffffff);
      sprite.renderOrder = 100 + Math.round(a.y * 1000);
      sprite.visible = true;
      seenSprites.add(a.id);
    }

    this._sprites.prune(seenSprites);
    this._models.prune(seenModels, (m) => m.userData?.species);
  }

  // ---- Helpers ----

  _getEmoji(a) {
    if (a.lifeStage === LifeStage.EGG) return '🥚';
    if (a.state === AnimalState.DEAD) return '💀';
    if (a.lifeStage === LifeStage.PUPA) return '🪲';
    return SPECIES_INFO[a.species]?.emoji || '🐾';
  }

  _canUseModel(a) {
    if (!a || !a.species) return false;
    if (a.state === AnimalState.DEAD) return false;
    if (a.lifeStage === LifeStage.EGG || a.lifeStage === LifeStage.PUPA) return false;
    return Boolean(ENTITY_MODEL_URLS[a.species]);
  }

  _getModelScale(a, spriteScale, orbitEnabled) {
    const speciesFactor = (this._visualScale[a.species] || 0.85) / 0.85;
    const base = 0.26;
    const stageFactor = a.lifeStage === LifeStage.BABY ? 0.6
      : a.lifeStage === LifeStage.YOUNG ? 0.78
      : a.lifeStage === LifeStage.YOUNG_ADULT ? 0.9
      : 1.0;
    const fallbackFromSprite = Number.isFinite(spriteScale) ? spriteScale * 0.28 : 1;
    const orbitBoost = orbitEnabled ? ORBIT_ENTITY_MODEL_BOOST : 1;
    const speciesModelBoost = ENTITY_MODEL_SCALE_MULTIPLIERS[a.species] || 1;
    return Math.max(0.14, Math.min(1.55, base * speciesFactor * stageFactor * fallbackFromSprite * ANIMAL_MODEL_SCALE_BOOST * orbitBoost * speciesModelBoost));
  }

  _setModelOrientation(model, a) {
    model.rotation.order = 'ZYX';
    model.rotation.x = 0;
    model.rotation.y = 0;
    const dir = Number.isFinite(a?.direction) ? a.direction : null;
    model.rotation.z = dir != null ? (DIRECTION_YAW[dir] ?? 0) : 0;
  }

  _normalizeEntityMesh(mesh, modelUrl) {
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
    this._prevStates.clear();
    this._fleeBuckets.clear();
  }
}
