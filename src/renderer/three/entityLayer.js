import * as THREE from 'three';
import { SPECIES_INFO } from '../../utils/terrainColors.js';
import { AnimalState, Direction, LifeStage } from '../../engine/entities.js';
import { buildAnimalColorMap, buildSpeciesVisualScale, buildSpeciesVocalProfile, buildCanFlySet } from '../../engine/animalSpecies.js';
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
import { ENTITY_BARS_MIN_ZOOM } from '../../constants/simulation.js';
import useSimStore from '../../store/simulationStore.js';

// Map engine direction to model rotation around Z-axis.
// Models face +Y by default (forward).
const DIRECTION_YAW = {
  [Direction.UP]: 0,
  [Direction.RIGHT]: -Math.PI / 2,
  [Direction.LEFT]: Math.PI / 2,
  [Direction.DOWN]: Math.PI,
};

// Animation constants (ported from Pixi EntityLayer)
const ATTACK_JUMP_DURATION = 18;
const ATTACK_JUMP_HEIGHT = 0.22;
const HIT_WOBBLE_DURATION = 12;
const HIT_WOBBLE_OFFSET = 0.08;
const SPAWN_POPIN_DURATION = 10;
const WALK_BOB_AMPLITUDE = 0.06;
const WALK_BOB_SPEED = 0.35;
const DEAD_FADE_TICKS = 300;

// Shared shadow geometry and material (reuse across all shadows)
let _shadowGeo = null;
let _shadowMat = null;
function getShadowGeo() {
  if (!_shadowGeo) {
    _shadowGeo = new THREE.CircleGeometry(0.5, 12);
    _shadowGeo.scale(1, 0.4, 1); // ellipse
  }
  return _shadowGeo;
}
function getShadowMat() {
  if (!_shadowMat) {
    _shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });
  }
  return _shadowMat;
}

// Shared HP bar geometry
let _barBgGeo = null;
let _barFillGeo = null;
function getBarBgGeo() {
  if (!_barBgGeo) _barBgGeo = new THREE.PlaneGeometry(1, 1);
  return _barBgGeo;
}
function getBarFillGeo() {
  if (!_barFillGeo) _barFillGeo = new THREE.PlaneGeometry(1, 1);
  return _barFillGeo;
}

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
    this._vocalProfile = buildSpeciesVocalProfile();
    this._flyingSet = buildCanFlySet();
    this._prevStates = new Map();
    this._fleeBuckets = new Set();
    this._fleeBucketTick = -1;

    this._points = new ThreePointLayer(worldGroup, MAX_VISIBLE_ENTITY_POINTS, 4.5, 3, 1);
    this._sprites = new ThreeSpritePool(worldGroup, emojiAtlas);
    this._models = new ThreeModelPool(worldGroup, createModelAssetLoader());

    // --- Animation state per entity ---
    this._animState = new Map(); // id → { lastX, lastY, lastHp, spawnTick, attackTick, hitTick, walkPhase }

    // --- Shadow pool ---
    this._shadows = new Map(); // id → Mesh
    this._shadowPool = [];

    // --- HP bar pool ---
    this._hpBars = new Map(); // id → { bg: Mesh, fill: Mesh }
    this._hpBarPool = [];
    this._hpBarFillMaterials = {
      high: new THREE.MeshBasicMaterial({ color: 0x44cc55, transparent: true, opacity: 0.85, depthWrite: false }),
      mid:  new THREE.MeshBasicMaterial({ color: 0xddaa33, transparent: true, opacity: 0.85, depthWrite: false }),
      low:  new THREE.MeshBasicMaterial({ color: 0xdd4444, transparent: true, opacity: 0.85, depthWrite: false }),
    };
    this._hpBarBgMaterial = new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.6, depthWrite: false });

    // --- Vocal event tracking ---
    this._lastIdleVocalTickByEntity = new Map();

    // --- Selection ring ---
    this._selectedId = null;
    this._selectionTick = 0;
    this._selectionRing = null;
    this._selectionRingMat = new THREE.MeshBasicMaterial({
      color: 0xffdd44,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }

  get animals() {
    return this._animals;
  }

  setAnimals(animals) {
    this._animals = Array.isArray(animals) ? animals : [];
  }

  setSelectedId(id) {
    this._selectedId = id ?? null;
    this._selectionTick = 0;
    if (!id && this._selectionRing) {
      this._selectionRing.visible = false;
    }
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

        // Track animation state for attack/hit
        const anim = this._animState.get(a.id);
        if (anim) {
          if (a.state === AnimalState.ATTACKING) {
            anim.attackTick = tick;
            // Vocal: attack
            const profile = this._vocalProfile[a.species];
            if (profile?.enabled && Math.random() <= profile.attackChance) {
              effects.push({ type: 'attackVocal', x: a.x, y: a.y, species: a.species, tick, gainMultiplier: profile.gainMultiplier });
            }
          }
        }
      }

      // HP-based hit detection
      if (tick > 0 && inViewport) {
        const anim = this._animState.get(a.id);
        if (anim) {
          const currentHp = Number.isFinite(a.hp) ? a.hp : null;
          if (currentHp != null && anim.lastHp != null && currentHp < anim.lastHp
              && a.state !== AnimalState.DEAD && a.alive !== false) {
            anim.hitTick = tick;
          }
          anim.lastHp = currentHp;
        }
      }

      // Idle vocal
      if (inViewport && (a.state === AnimalState.IDLE || a.state === AnimalState.WALKING || a.state === AnimalState.FLYING)) {
        const profile = this._vocalProfile[a.species];
        if (profile?.enabled && Number.isFinite(tick) && tick > 0 && tick % profile.idleIntervalTicks === 0) {
          const lastTick = this._lastIdleVocalTickByEntity.get(a.id) ?? -Infinity;
          if (tick - lastTick >= profile.idleCooldownTicks && Math.random() <= profile.idleChance) {
            this._lastIdleVocalTickByEntity.set(a.id, tick);
            effects.push({ type: 'idleVocal', x: a.x, y: a.y, species: a.species, tick, gainMultiplier: profile.gainMultiplier });
          }
        }
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

  rebuildSprites(viewport, zoom, orbitEnabled, onVisRefresh, tick, cameraPos) {
    const showSprites = orbitEnabled || zoom >= ENTITY_SPRITE_ZOOM_THRESHOLD;
    if (!showSprites) {
      this._sprites.releaseAll();
      this._models.releaseAll((m) => m.userData?.species);
      this._hideAllShadows();
      this._hideAllHpBars();
      return;
    }

    const currentTick = tick || 0;
    const { showAnimalHpBars } = useSimStore.getState();
    const showBars = showAnimalHpBars !== false && zoom >= ENTITY_BARS_MIN_ZOOM;

    // LOD: in orbit mode, skip models/sprites beyond this distance from camera
    const LOD_SPRITE_DIST_SQ = 80 * 80;
    const useLOD = orbitEnabled && cameraPos;

    const { x0, y0, x1, y1 } = viewport;
    const seenSprites = new Set();
    const seenModels = new Set();
    const seenIds = new Set();

    for (const a of this._animals) {
      if (!a) continue;
      if (a.x < x0 || a.x >= x1 || a.y < y0 || a.y >= y1) continue;

      // LOD distance cull — entities beyond threshold rely on points layer only
      if (useLOD) {
        const dx = a.x - cameraPos.x;
        const dy = a.y - cameraPos.y;
        if (dx * dx + dy * dy > LOD_SPRITE_DIST_SQ) continue;
      }

      seenIds.add(a.id);

      // Ensure animation state
      let anim = this._animState.get(a.id);
      if (!anim) {
        anim = { lastX: a.x, lastY: a.y, lastHp: a.hp, spawnTick: currentTick, attackTick: null, hitTick: null, walkPhase: 0 };
        this._animState.set(a.id, anim);
      }

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
      let finalScale = Math.max(0.42, Math.min(2.4, speciesScale * stageFactor * ANIMAL_SPRITE_SCALE_BOOST * orbitBoost));

      // --- Animations ---
      let posX = a.x;
      let posY = a.y;
      let posZ = 0.4; // sprite base Z (billboard above ground)
      const isFlying = this._flyingSet.has(a.species);
      let modelPosZ = isFlying ? 0.25 : 0.02; // models sit on ground, flying species hover
      let rotZ = 0;

      // Walk bobbing
      const moved = a.x !== anim.lastX || a.y !== anim.lastY;
      if (moved) {
        anim.walkPhase += WALK_BOB_SPEED;
        const bob = Math.abs(Math.sin(anim.walkPhase)) * WALK_BOB_AMPLITUDE;
        posZ += bob;
        modelPosZ += bob;
      } else {
        anim.walkPhase = 0;
      }
      anim.lastX = a.x;
      anim.lastY = a.y;

      // Spawn pop-in
      if (anim.spawnTick != null && currentTick > 0) {
        const age = currentTick - anim.spawnTick;
        if (age < SPAWN_POPIN_DURATION) {
          const t = age / SPAWN_POPIN_DURATION;
          const bounce = t < 0.6 ? (t / 0.6) * 1.3 : 1.0 + (1.0 - t) / 0.4 * 0.3;
          finalScale *= Math.min(bounce, 1.3);
        } else {
          anim.spawnTick = null;
        }
      }

      // Attack jump
      if (anim.attackTick != null && currentTick > 0) {
        const age = currentTick - anim.attackTick;
        if (age < ATTACK_JUMP_DURATION) {
          const t = age / ATTACK_JUMP_DURATION;
          const jump = Math.sin(t * Math.PI) * ATTACK_JUMP_HEIGHT;
          posZ += jump;
          modelPosZ += jump;
          finalScale *= 1 + Math.sin(t * Math.PI) * 0.08;
        } else {
          anim.attackTick = null;
        }
      }

      // Hit wobble
      if (anim.hitTick != null && currentTick > 0) {
        const age = currentTick - anim.hitTick;
        if (age < HIT_WOBBLE_DURATION) {
          const t = age / HIT_WOBBLE_DURATION;
          const envelope = 1 - t;
          const wave = Math.sin(t * Math.PI * 3);
          posX += wave * HIT_WOBBLE_OFFSET * envelope;
        } else {
          anim.hitTick = null;
        }
      }

      // Dead fade
      let opacity = 1;
      if (a.state === AnimalState.DEAD) {
        opacity = 0.75;
        if (a._deathTick != null && currentTick > 0) {
          const elapsed = currentTick - a._deathTick;
          opacity = Math.max(0.05, 0.8 * (1 - elapsed / DEAD_FADE_TICKS));
        }
      } else if (a.state === AnimalState.SLEEPING) {
        opacity = 0.68;
      }

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
          if (this._sprites.has(a.id)) this._sprites.release(a.id);
          const modelScale = this._getModelScale(a, finalScale, orbitEnabled);
          model.position.set(posX, posY, modelPosZ);
          model.scale.set(modelScale, modelScale, modelScale);
          this._setModelOrientation(model, a);
          model.visible = true;
          // Model opacity for dead/sleeping
          model.traverse((child) => {
            if (child.isMesh && child.material) {
              child.material.transparent = opacity < 1;
              child.material.opacity = opacity;
            }
          });
          seenModels.add(a.id);

          // Shadow for model
          this._updateShadow(a.id, posX, posY, modelScale * 1.2, a.state);

          // HP bar for model
          if (showBars && a.state !== AnimalState.DEAD && a.alive !== false) {
            this._updateHpBar(a.id, posX, posY, posZ + modelScale * 1.2, a);
          } else {
            this._hideHpBar(a.id);
          }
          continue;
        }
      }

      // Sprite fallback
      sprite.position.set(posX, posY, posZ);
      sprite.scale.set(finalScale, finalScale, 1);
      sprite.material.opacity = opacity;
      sprite.material.color.setHex(this._colorMap[a.species] || 0xffffff);
      sprite.renderOrder = 100 + Math.round(a.y * 1000);
      sprite.visible = true;
      seenSprites.add(a.id);

      // Shadow for sprite
      this._updateShadow(a.id, posX, posY, finalScale * 0.5, a.state);

      // HP bar for sprite
      if (showBars && a.state !== AnimalState.DEAD && a.alive !== false) {
        this._updateHpBar(a.id, posX, posY, posZ + finalScale * 0.8, a);
      } else {
        this._hideHpBar(a.id);
      }
    }

    this._sprites.prune(seenSprites);
    this._models.prune(seenModels, (m) => m.userData?.species);
    this._pruneShadows(seenIds);
    this._pruneHpBars(seenIds);
    this._pruneAnimState(seenIds);
    this._updateSelectionRing();
  }

  // ---- Shadow management ----

  _acquireShadow() {
    if (this._shadowPool.length > 0) return this._shadowPool.pop();
    const mesh = new THREE.Mesh(getShadowGeo(), getShadowMat());
    mesh.renderOrder = 1;
    this._worldGroup.add(mesh);
    return mesh;
  }

  _updateShadow(id, x, y, scale, state) {
    if (state === AnimalState.DEAD) {
      this._hideShadow(id);
      return;
    }
    let shadow = this._shadows.get(id);
    if (!shadow) {
      shadow = this._acquireShadow();
      this._shadows.set(id, shadow);
    }
    shadow.position.set(x, y, 0.01);
    shadow.scale.set(scale, scale, 1);
    shadow.visible = true;
  }

  _hideShadow(id) {
    const shadow = this._shadows.get(id);
    if (shadow) {
      shadow.visible = false;
      this._shadowPool.push(shadow);
      this._shadows.delete(id);
    }
  }

  _hideAllShadows() {
    for (const [id, shadow] of this._shadows) {
      shadow.visible = false;
      this._shadowPool.push(shadow);
    }
    this._shadows.clear();
  }

  _pruneShadows(seenIds) {
    for (const id of this._shadows.keys()) {
      if (!seenIds.has(id)) this._hideShadow(id);
    }
  }

  // ---- HP bar management ----

  _acquireHpBar() {
    if (this._hpBarPool.length > 0) return this._hpBarPool.pop();
    const bg = new THREE.Mesh(getBarBgGeo(), this._hpBarBgMaterial);
    const fill = new THREE.Mesh(getBarFillGeo(), this._hpBarFillMaterials.high);
    bg.renderOrder = 200;
    fill.renderOrder = 201;
    this._worldGroup.add(bg);
    this._worldGroup.add(fill);
    return { bg, fill };
  }

  _updateHpBar(id, x, y, barZ, a) {
    const barW = 0.6;
    const barH = 0.06;
    const hpMax = a.maxHp || 1;
    const hpRatio = Math.max(0, Math.min(1, (a.hp ?? hpMax) / hpMax));

    let bar = this._hpBars.get(id);
    if (!bar) {
      bar = this._acquireHpBar();
      this._hpBars.set(id, bar);
    }

    // Background
    bar.bg.position.set(x, y, barZ);
    bar.bg.scale.set(barW, barH, 1);
    bar.bg.visible = true;

    // Fill
    const fillW = barW * hpRatio;
    bar.fill.position.set(x - (barW - fillW) / 2, y, barZ + 0.001);
    bar.fill.scale.set(fillW, barH, 1);
    bar.fill.material = hpRatio < 0.25 ? this._hpBarFillMaterials.low
      : hpRatio < 0.6 ? this._hpBarFillMaterials.mid
      : this._hpBarFillMaterials.high;
    bar.fill.visible = true;
  }

  _hideHpBar(id) {
    const bar = this._hpBars.get(id);
    if (bar) {
      bar.bg.visible = false;
      bar.fill.visible = false;
      this._hpBarPool.push(bar);
      this._hpBars.delete(id);
    }
  }

  _hideAllHpBars() {
    for (const [, bar] of this._hpBars) {
      bar.bg.visible = false;
      bar.fill.visible = false;
      this._hpBarPool.push(bar);
    }
    this._hpBars.clear();
  }

  _pruneHpBars(seenIds) {
    for (const id of this._hpBars.keys()) {
      if (!seenIds.has(id)) this._hideHpBar(id);
    }
  }

  _pruneAnimState(seenIds) {
    if (this._animState.size > seenIds.size * 2 + 100) {
      for (const id of this._animState.keys()) {
        if (!seenIds.has(id)) {
          this._animState.delete(id);
          this._lastIdleVocalTickByEntity.delete(id);
        }
      }
    }
  }

  // ---- Selection ring ----

  _updateSelectionRing() {
    if (!this._selectedId) {
      if (this._selectionRing) this._selectionRing.visible = false;
      return;
    }

    // Find selected entity position
    const entity = this._animals.find(a => a && a.id === this._selectedId);
    if (!entity) {
      if (this._selectionRing) this._selectionRing.visible = false;
      return;
    }

    // Lazy-create ring mesh
    if (!this._selectionRing) {
      const geo = new THREE.RingGeometry(0.38, 0.48, 24);
      this._selectionRing = new THREE.Mesh(geo, this._selectionRingMat);
      this._selectionRing.renderOrder = 150;
      this._worldGroup.add(this._selectionRing);
    }

    this._selectionTick++;
    const pulse = 0.9 + 0.1 * Math.sin(this._selectionTick * 0.12);
    this._selectionRing.position.set(entity.x, entity.y, 0.03);
    this._selectionRing.scale.set(pulse, pulse, 1);
    this._selectionRingMat.opacity = 0.7 + 0.2 * Math.sin(this._selectionTick * 0.12);
    this._selectionRing.visible = true;
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
    this._animState.clear();
    this._lastIdleVocalTickByEntity.clear();

    // Selection ring
    if (this._selectionRing) {
      this._worldGroup.remove(this._selectionRing);
      this._selectionRing.geometry.dispose();
      this._selectionRing = null;
    }
    this._selectionRingMat.dispose();

    // Clean up shadows
    for (const shadow of this._shadows.values()) {
      this._worldGroup.remove(shadow);
    }
    for (const shadow of this._shadowPool) {
      this._worldGroup.remove(shadow);
    }
    this._shadows.clear();
    this._shadowPool.length = 0;

    // Clean up HP bars
    for (const bar of this._hpBars.values()) {
      this._worldGroup.remove(bar.bg);
      this._worldGroup.remove(bar.fill);
    }
    for (const bar of this._hpBarPool) {
      this._worldGroup.remove(bar.bg);
      this._worldGroup.remove(bar.fill);
    }
    this._hpBars.clear();
    this._hpBarPool.length = 0;
  }
}
