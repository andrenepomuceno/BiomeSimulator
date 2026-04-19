import * as THREE from 'three';
import { TERRAIN_COLORS } from '../utils/terrainColors.js';
import { PLANT_COLORS } from '../utils/terrainColors.js';
import { SPECIES_INFO } from '../utils/terrainColors.js';
import { AnimalState, LifeStage } from '../engine/entities.js';
import { buildAnimalColorMap, buildSpeciesVisualScale } from '../engine/animalSpecies.js';
import { buildPlantEmojiMap } from '../engine/plantSpecies.js';
import useSimStore from '../store/simulationStore.js';

const MIN_ZOOM = 1;
const MAX_ZOOM = 120;
const MAX_VISIBLE_PLANT_POINTS = 18000;
const MAX_VISIBLE_ENTITY_POINTS = 5000;
const MAX_VISIBLE_ITEM_POINTS = 5000;
const MAX_VISIBLE_PLANT_SPRITES = 8000;
const MAX_VISIBLE_ITEM_SPRITES = 5000;
const ENTITY_SPRITE_ZOOM_THRESHOLD = 6;
const MAX_PARTICLES = 1200;

// Particle spawn configs by type
const PARTICLE_DEFS = {
  attack: { count: 10, color: 0xff4444, speed: 0.016, maxLife: 48, size: 3.5, gravity: 0 },
  birth:  { count: 10, color: 0x88ff88, speed: 0.012, maxLife: 56, size: 3,   gravity: 0 },
  death:  { count: 12, color: 0x888888, speed: 0.014, maxLife: 62, size: 3,   gravity: 0.0007 },
  fruit:  { count:  5, color: 0xffee44, speed: 0.008, maxLife: 50, size: 2.5, gravity: -0.003 },
  mate:   { count:  7, color: 0xff4488, speed: 0.007, maxLife: 60, size: 3.5, gravity: -0.001 },
  eat:    { count:  5, color: 0x99cc55, speed: 0.014, maxLife: 38, size: 2.5, gravity: 0.0008 },
  drink:  { count:  5, color: 0x44aaff, speed: 0.009, maxLife: 38, size: 2.5, gravity: 0.0005 },
  flee:   { count:  6, color: 0xffaa22, speed: 0.018, maxLife: 34, size: 2.5, gravity: 0 },
  sleep:  { count:  3, color: 0xbbaaff, speed: 0.004, maxLife: 60, size: 3,   gravity: -0.002 },
};
const PLANT_SPRITE_ZOOM_THRESHOLD = 6;
const ITEM_SPRITE_ZOOM_THRESHOLD = 6;

const ITEM_EMOJIS = {
  1: '🥩',
  2: '🍎',
  3: '🌱',
};

const ITEM_COLORS = {
  1: 0xcc4444,
  2: 0xffaa33,
  3: 0xaa8833,
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

class ViewCamera {
  constructor(screen, onChanged) {
    this.screen = screen;
    this.onChanged = onChanged;
    this.zoom = 4;
    this.worldW = 1000;
    this.worldH = 1000;
    this.centerX = this.worldW / 2;
    this.centerY = this.worldH / 2;
  }

  setScreenSize(width, height) {
    this.screen.width = width;
    this.screen.height = height;
    this._clampCenter();
    this.onChanged?.();
  }

  setWorldBounds(w, h) {
    this.worldW = Math.max(1, w | 0);
    this.worldH = Math.max(1, h | 0);
    this.centerOn(this.worldW / 2, this.worldH / 2);
  }

  pan(dx, dy) {
    this.centerX -= dx / this.zoom;
    this.centerY -= dy / this.zoom;
    this._clampCenter();
    this.onChanged?.();
  }

  setZoom(z) {
    this.zoom = clamp(z, MIN_ZOOM, MAX_ZOOM);
    this._clampCenter();
    this.onChanged?.();
  }

  onWheel(event) {
    event.preventDefault();
    const oldZoom = this.zoom;
    const factor = event.deltaY < 0 ? 1.15 : 1 / 1.15;
    this.zoom = clamp(this.zoom * factor, MIN_ZOOM, MAX_ZOOM);

    const rect = event.target.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;

    const before = this.screenToTile(mx, my, oldZoom);
    const after = this.screenToTile(mx, my, this.zoom);
    this.centerX += before.x - after.x;
    this.centerY += before.y - after.y;

    this._clampCenter();
    this.onChanged?.();
  }

  centerOn(tileX, tileY) {
    this.centerX = tileX;
    this.centerY = tileY;
    this._clampCenter();
    this.onChanged?.();
  }

  screenToTile(screenX, screenY, zoomOverride = null) {
    const zoom = zoomOverride ?? this.zoom;
    const viewportW = this.screen.width / zoom;
    const viewportH = this.screen.height / zoom;
    const startX = this.centerX - viewportW / 2;
    const startY = this.centerY - viewportH / 2;
    return {
      x: Math.floor(startX + screenX / zoom),
      y: Math.floor(startY + screenY / zoom),
    };
  }

  getViewportTiles() {
    const w = Math.ceil(this.screen.width / this.zoom);
    const h = Math.ceil(this.screen.height / this.zoom);
    return {
      x: Math.floor(this.centerX - w / 2),
      y: Math.floor(this.centerY - h / 2),
      w,
      h,
    };
  }

  _clampCenter() {
    const halfW = (this.screen.width / this.zoom) / 2;
    const halfH = (this.screen.height / this.zoom) / 2;
    this.centerX = clamp(this.centerX, halfW, Math.max(halfW, this.worldW - halfW));
    this.centerY = clamp(this.centerY, halfH, Math.max(halfH, this.worldH - halfH));
  }
}

export class ThreeRenderer {
  constructor(container, onViewportChange, onTileClick, onEffectEvent) {
    this.container = container;
    this.onViewportChange = onViewportChange;
    this.onTileClick = onTileClick;
    this.onEffectEvent = onEffectEvent || null;

    this.screen = {
      width: container.clientWidth || 1,
      height: container.clientHeight || 1,
    };

    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setSize(this.screen.width, this.screen.height, false);
    this.renderer.setClearColor(0x0a0a1a, 1);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera3D = new THREE.OrthographicCamera(0, this.screen.width, this.screen.height, 0, -1000, 1000);
    this.camera3D.position.z = 10;

    this.worldGroup = new THREE.Group();
    this.scene.add(this.worldGroup);

    this.terrainLayer = {
      updateTiles: (changes) => this.updateTerrainTiles(changes),
    };
    this.plantLayer = {
      setFromArrays: (plantType, plantStage, width, height) => this.setPlantSnapshot(plantType, plantStage, width, height),
    };

    this.mapWidth = 0;
    this.mapHeight = 0;
    this._terrainData = null;
    this._terrainMesh = null;
    this._terrainTexture = null;
    this._terrainPixels = null;

    this._plantType = null;
    this._plantStage = null;
    this._animals = [];
    this._animalColorMap = buildAnimalColorMap();
    this._entityVisualScale = buildSpeciesVisualScale();
    this._itemsById = new Map();
    this._prevAnimalStates = new Map();
    this._fleeBuckets = new Set();
    this._fleeBucketTick = -1;

    this._plantPoints = null;
    this._itemPoints = null;
    this._entityPoints = null;

    // Plant sprites (zoom >= PLANT_SPRITE_ZOOM_THRESHOLD)
    this._plantEmojiMap = buildPlantEmojiMap();
    this._plantSprites = new Map(); // cellIdx → THREE.Sprite
    this._plantSpritePool = [];
    this._plantTextureCache = new Map();

    // Item sprites (zoom >= ITEM_SPRITE_ZOOM_THRESHOLD)
    this._itemSprites = new Map(); // item.id → THREE.Sprite
    this._itemSpritePool = [];
    this._itemTextureCache = new Map();

    // Entity sprites
    this._entitySprites = new Map();
    this._entitySpritePool = [];
    this._entityTextureCache = new Map();
    this._selectionLine = null;

    // Particle system
    this._particleList = [];
    const maxP = MAX_PARTICLES;
    this._particlePositions = new Float32Array(maxP * 3);
    this._particleColors    = new Float32Array(maxP * 3);
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(this._particlePositions, 3));
    pGeo.setAttribute('color',    new THREE.BufferAttribute(this._particleColors,    3));
    pGeo.setDrawRange(0, 0);
    this._particleGeometry = pGeo;
    this._particleMaterial = new THREE.PointsMaterial({
      size: 5,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      depthTest: false,
      depthWrite: false,
      sizeAttenuation: false,
    });
    this._particlePoints = new THREE.Points(pGeo, this._particleMaterial);
    this._particlePoints.renderOrder = 200;
    this.worldGroup.add(this._particlePoints);

    // FPS tracking
    this._frameLastAt = performance.now();
    this._frameWindow = { frames: 0, startedAt: this._frameLastAt };

    // Night overlay — screen-space quad rendered in a separate scene
    this._overlayScene = new THREE.Scene();
    this._overlayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this._nightMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
    });
    this._overlayScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this._nightMaterial));

    this._selectedTile = null;
    this._selectedEntityId = null;
    this._lastHoverTile = null;
    this._lastEntityBrushTile = null;
    this._isEntityBrushing = false;
    this._refreshQueued = false;

    this.camera = new ViewCamera(this.screen, () => {
      this._syncWorldTransform();
      this._emitViewportChanged();
    });

    this._setupInput();
    this._setupResize();

    this._running = true;
    this._animate = () => {
      if (!this._running) return;
      this._tickParticles();
      this._tickFps();
      this.renderer.render(this.scene, this.camera3D);
      if (this._nightMaterial.opacity > 0.002) {
        this.renderer.autoClear = false;
        this.renderer.render(this._overlayScene, this._overlayCamera);
        this.renderer.autoClear = true;
      }
      this._rafId = requestAnimationFrame(this._animate);
    };
    this._animate();
  }

  _setupInput() {
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let downX = 0;
    let downY = 0;

    this._wheelHandler = (e) => this.camera.onWheel(e);
    this.renderer.domElement.addEventListener('wheel', this._wheelHandler, { passive: false });

    this._pointerDownHandler = (e) => {
      if (e.button === 0 || e.button === 1) {
        const tool = useSimStore.getState().tool;
        this._lastEntityBrushTile = null;
        if (e.button === 0 && tool === 'PLACE_ENTITY') {
          dragging = true;
          this._isEntityBrushing = true;
          lastX = e.clientX;
          lastY = e.clientY;
          downX = e.clientX;
          downY = e.clientY;
          return;
        }
        if (e.button === 0 && tool !== 'SELECT') {
          return;
        }
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        downX = e.clientX;
        downY = e.clientY;
      }
    };
    this.renderer.domElement.addEventListener('pointerdown', this._pointerDownHandler);

    this._pointerMoveHandler = (e) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      this._lastHoverTile = this.camera.screenToTile(screenX, screenY);

      if (!dragging) return;
      if (this._isEntityBrushing) {
        const tile = this._lastHoverTile;
        if (!tile) return;
        if (tile.x >= 0 && tile.y >= 0 && tile.x < this.mapWidth && tile.y < this.mapHeight) {
          const key = `${tile.x}:${tile.y}`;
          if (this._lastEntityBrushTile !== key) {
            this._lastEntityBrushTile = key;
            this.onTileClick?.(tile.x, tile.y);
          }
        }
        return;
      }
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      this.camera.pan(dx, dy);
    };
    window.addEventListener('pointermove', this._pointerMoveHandler);

    this._pointerUpHandler = (e) => {
      if (!dragging) return;
      dragging = false;
      const dist = Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY);
      if (dist < 5 && this.onTileClick && this._lastHoverTile && !this._lastEntityBrushTile) {
        const { x, y } = this._lastHoverTile;
        if (x >= 0 && y >= 0 && x < this.mapWidth && y < this.mapHeight) {
          this.onTileClick(x, y);
        }
      }
      this._isEntityBrushing = false;
      this._lastEntityBrushTile = null;
    };
    window.addEventListener('pointerup', this._pointerUpHandler);
  }

  _setupResize() {
    this._resizeObserver = new ResizeObserver(() => {
      const width = this.container.clientWidth || 1;
      const height = this.container.clientHeight || 1;
      this.renderer.setSize(width, height, false);
      this.camera3D.left = 0;
      this.camera3D.right = width;
      this.camera3D.top = height;
      this.camera3D.bottom = 0;
      this.camera3D.updateProjectionMatrix();
      this.camera.setScreenSize(width, height);
      this._syncWorldTransform();
    });
    this._resizeObserver.observe(this.container);
  }

  _emitViewportChanged() {
    if (this.onViewportChange) {
      this.onViewportChange({ ...this.camera.getViewportTiles(), zoom: this.camera.zoom });
    }
    this._scheduleVisibilityRefresh();
  }

  _syncWorldTransform() {
    const vp = this.camera.getViewportTiles();
    this.worldGroup.position.set(-vp.x * this.camera.zoom, this.screen.height + vp.y * this.camera.zoom, 0);
    this.worldGroup.scale.set(this.camera.zoom, -this.camera.zoom, 1);
  }

  _buildTerrainTexture(terrainData, width, height) {
    const pixels = new Uint8Array(width * height * 4);
    for (let i = 0; i < terrainData.length; i++) {
      const color = TERRAIN_COLORS[terrainData[i]] || [0, 0, 0, 255];
      const p = i * 4;
      pixels[p] = color[0];
      pixels[p + 1] = color[1];
      pixels[p + 2] = color[2];
      pixels[p + 3] = color[3];
    }

    const texture = new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    // Keep texture row order aligned with the world grid (y=0 at top) so
    // Three rendering matches Pixi orientation.
    texture.flipY = false;
    texture.needsUpdate = true;
    this._terrainPixels = pixels;
    return texture;
  }

  _toRgbFloats(hex, alpha = 1) {
    const r = ((hex >> 16) & 0xff) / 255;
    const g = ((hex >> 8) & 0xff) / 255;
    const b = (hex & 0xff) / 255;
    return [r * alpha, g * alpha, b * alpha];
  }

  _getEmojiTexture(cache, emoji) {
    const existing = cache.get(emoji);
    if (existing) return existing;

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 64, 64);
    ctx.font = '52px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 32, 34);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    cache.set(emoji, texture);
    return texture;
  }

  _disposePoints(points) {
    if (!points) return;
    points.geometry.dispose();
    points.material.dispose();
    this.worldGroup.remove(points);
  }

  _replacePoints(layerKey, positions, colors, size, z, opacity = 1) {
    const old = this[layerKey];
    if (old) this._disposePoints(old);

    if (positions.length === 0) {
      this[layerKey] = null;
      return;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size,
      vertexColors: true,
      transparent: true,
      opacity,
      depthTest: false,
      depthWrite: false,
      sizeAttenuation: false,
    });

    const points = new THREE.Points(geometry, material);
    points.position.set(0, 0, z);
    points.renderOrder = 10 + z;
    this.worldGroup.add(points);
    this[layerKey] = points;
  }

  // ---- FPS profiling ----

  _tickFps() {
    const now = performance.now();
    this._frameWindow.frames++;
    if (now - this._frameWindow.startedAt >= 1000) {
      const elapsed = now - this._frameWindow.startedAt;
      const fps = elapsed > 0 ? (this._frameWindow.frames * 1000) / elapsed : 0;
      const store = useSimStore.getState();
      if (store.profilingEnabled) {
        store.setRendererProfile({
          ...store.profiling.renderer,
          fps,
          frameMs: now - this._frameLastAt,
          lastTickAt: Date.now(),
        });
      }
      this._frameWindow = { frames: 0, startedAt: now };
    }
    this._frameLastAt = now;
  }

  // ---- Particle system ----

  _spawnParticles(type, wx, wy) {
    const def = PARTICLE_DEFS[type];
    if (!def) return;
    const remaining = MAX_PARTICLES - this._particleList.length;
    const count = Math.min(def.count, remaining);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = def.speed * (0.7 + Math.random() * 0.6);
      this._particleList.push({
        x:  wx + (Math.random() - 0.5) * 0.3,
        y:  wy + (Math.random() - 0.5) * 0.3,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: def.gravity,
        life:    0,
        maxLife: def.maxLife * (0.8 + Math.random() * 0.4),
        r: ((def.color >> 16) & 0xff) / 255,
        g: ((def.color >>  8) & 0xff) / 255,
        b: ( def.color        & 0xff) / 255,
      });
    }
  }

  _emitEffectEvent(event) {
    if (!this.onEffectEvent || !event) return;
    this.onEffectEvent(event);
  }

  _tickParticles() {
    const list = this._particleList;
    if (list.length === 0) {
      if (this._particleGeometry.drawRange.count !== 0) {
        this._particleGeometry.setDrawRange(0, 0);
      }
      return;
    }
    let writeIdx = 0;
    let i = 0;
    while (i < list.length) {
      const p = list[i];
      p.life++;
      p.vx *= 0.93;
      p.vy = p.vy * 0.93 + p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      if (p.life >= p.maxLife) {
        list[i] = list[list.length - 1];
        list.pop();
        continue;
      }
      const t = p.life / p.maxLife;
      const alpha = 1 - t;
      const pi = writeIdx * 3;
      this._particlePositions[pi    ] = p.x;
      this._particlePositions[pi + 1] = p.y;
      this._particlePositions[pi + 2] = 4;
      this._particleColors[pi    ] = p.r * alpha;
      this._particleColors[pi + 1] = p.g * alpha;
      this._particleColors[pi + 2] = p.b * alpha;
      writeIdx++;
      i++;
    }
    this._particleGeometry.attributes.position.needsUpdate = true;
    this._particleGeometry.attributes.color.needsUpdate = true;
    this._particleGeometry.setDrawRange(0, writeIdx);
  }

  _scheduleVisibilityRefresh() {
    if (this._refreshQueued) return;
    this._refreshQueued = true;
    requestAnimationFrame(() => {
      this._refreshQueued = false;
      this._rebuildPlantPoints();
      this._rebuildItemPoints();
      this._rebuildEntityPoints();
      this._rebuildEntitySprites();
      this._refreshSelectionMarker();
    });
  }

  _getViewportBounds(extra = 1) {
    const vp = this.camera.getViewportTiles();
    const x0 = Math.max(0, vp.x - extra);
    const y0 = Math.max(0, vp.y - extra);
    const x1 = Math.min(this.mapWidth, vp.x + vp.w + extra);
    const y1 = Math.min(this.mapHeight, vp.y + vp.h + extra);
    return { x0, y0, x1, y1 };
  }

  _rebuildPlantPoints() {
    if (!this._plantType || !this._plantStage || this.mapWidth <= 0 || this.mapHeight <= 0) {
      this._replacePoints('_plantPoints', [], [], 2.5, 1, 0.95);
      return;
    }

    const { x0, y0, x1, y1 } = this._getViewportBounds(1);
    const positions = [];
    const colors = [];

    let count = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const idx = y * this.mapWidth + x;
        const t = this._plantType[idx];
        const s = this._plantStage[idx];
        if (t === 0 || s === 0) continue;
        const rgba = PLANT_COLORS[`${t}_${s}`] || [100, 200, 100, 180];
        const alpha = Math.max(0.35, Math.min(1, (rgba[3] || 180) / 255));
        positions.push(x + 0.5, y + 0.5, 0);
        colors.push((rgba[0] / 255) * alpha, (rgba[1] / 255) * alpha, (rgba[2] / 255) * alpha);
        count++;
        if (count >= MAX_VISIBLE_PLANT_POINTS) break;
      }
      if (count >= MAX_VISIBLE_PLANT_POINTS) break;
    }

    const pointSize = this.camera.zoom >= 6 ? 3.5 : 2.5;
    this._replacePoints('_plantPoints', positions, colors, pointSize, 1, 0.95);
    this._rebuildPlantSprites();
  }

  _rebuildItemPoints() {
    if (this._itemsById.size === 0) {
      this._replacePoints('_itemPoints', [], [], 3.5, 2, 1);
      return;
    }

    const { x0, y0, x1, y1 } = this._getViewportBounds(1);
    const positions = [];
    const colors = [];
    let count = 0;

    for (const item of this._itemsById.values()) {
      if (!item || item.consumed) continue;
      if (item.x < x0 || item.x >= x1 || item.y < y0 || item.y >= y1) continue;
      const [r, g, b] = this._toRgbFloats(ITEM_COLORS[item.type] || 0xcccccc, 1);
      positions.push(item.x + 0.5, item.y + 0.5, 0);
      colors.push(r, g, b);
      count++;
      if (count >= MAX_VISIBLE_ITEM_POINTS) break;
    }

    const pointSize = this.camera.zoom >= 6 ? 4 : 3;
    this._replacePoints('_itemPoints', positions, colors, pointSize, 2, 1);
    this._rebuildItemSprites();
  }

  _rebuildEntityPoints() {
    if (!this._animals || this._animals.length === 0) {
      this._replacePoints('_entityPoints', [], [], 4.5, 3, 1);
      return;
    }

    const { x0, y0, x1, y1 } = this._getViewportBounds(1);
    const positions = [];
    const colors = [];
    let count = 0;

    for (const a of this._animals) {
      if (!a || a.alive === false || a.state === AnimalState.DEAD) continue;
      if (a.x < x0 || a.x >= x1 || a.y < y0 || a.y >= y1) continue;
      const [r, g, b] = this._toRgbFloats(this._animalColorMap[a.species] || 0xcccccc, 1);
      positions.push(a.x, a.y, 0);
      colors.push(r, g, b);
      count++;
      if (count >= MAX_VISIBLE_ENTITY_POINTS) break;
    }

    const pointSize = this.camera.zoom >= 6 ? 5 : 3.5;
    this._replacePoints('_entityPoints', positions, colors, pointSize, 3, 1);
  }

  // --- Plant sprites ---

  _getPlantEmoji(typeId, stage) {
    return this._plantEmojiMap[`${typeId}_${stage}`] || '🌿';
  }

  _getPlantTexture(emoji) {
    return this._getEmojiTexture(this._plantTextureCache, emoji);
  }

  _acquirePlantSprite(emoji) {
    let sprite;
    if (this._plantSpritePool.length > 0) {
      sprite = this._plantSpritePool.pop();
      sprite.visible = true;
    } else {
      const material = new THREE.SpriteMaterial({
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      sprite = new THREE.Sprite(material);
      this.worldGroup.add(sprite);
    }
    sprite.material.map = this._getPlantTexture(emoji);
    sprite.material.needsUpdate = true;
    return sprite;
  }

  _releasePlantSprite(sprite) {
    sprite.visible = false;
    this._plantSpritePool.push(sprite);
  }

  _rebuildPlantSprites() {
    const show = this.camera.zoom >= PLANT_SPRITE_ZOOM_THRESHOLD
      && this._plantType
      && this._plantStage
      && this.mapWidth > 0;
    if (!show) {
      for (const sprite of this._plantSprites.values()) this._releasePlantSprite(sprite);
      this._plantSprites.clear();
      return;
    }
    const { x0, y0, x1, y1 } = this._getViewportBounds(1);
    const seen = new Set();
    const scale = 0.82;
    let count = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const idx = y * this.mapWidth + x;
        const t = this._plantType[idx];
        const s = this._plantStage[idx];
        if (t === 0 || s === 0) continue;
        const emoji = this._getPlantEmoji(t, s);
        let sprite = this._plantSprites.get(idx);
        if (!sprite) {
          sprite = this._acquirePlantSprite(emoji);
          this._plantSprites.set(idx, sprite);
        }
        const nextTex = this._getPlantTexture(emoji);
        if (sprite.material.map !== nextTex) {
          sprite.material.map = nextTex;
          sprite.material.needsUpdate = true;
        }
        sprite.position.set(x + 0.5, y + 0.5, 0.5);
        sprite.scale.set(scale, scale, 1);
        sprite.material.opacity = s === 1 ? 0.75 : s === 2 ? 0.85 : s === 3 ? 0.92 : s === 5 ? 0.96 : 1.0;
        sprite.renderOrder = 20;
        sprite.visible = true;
        seen.add(idx);
        count++;
        if (count >= MAX_VISIBLE_PLANT_SPRITES) break;
      }
      if (count >= MAX_VISIBLE_PLANT_SPRITES) break;
    }
    for (const [idx, sprite] of this._plantSprites) {
      if (!seen.has(idx)) {
        this._releasePlantSprite(sprite);
        this._plantSprites.delete(idx);
      }
    }
  }

  // --- Item sprites ---

  _getItemEmoji(type) {
    return ITEM_EMOJIS[type] || '📦';
  }

  _getItemTexture(emoji) {
    return this._getEmojiTexture(this._itemTextureCache, emoji);
  }

  _acquireItemSprite(emoji) {
    let sprite;
    if (this._itemSpritePool.length > 0) {
      sprite = this._itemSpritePool.pop();
      sprite.visible = true;
    } else {
      const material = new THREE.SpriteMaterial({
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      sprite = new THREE.Sprite(material);
      this.worldGroup.add(sprite);
    }
    sprite.material.map = this._getItemTexture(emoji);
    sprite.material.needsUpdate = true;
    return sprite;
  }

  _releaseItemSprite(sprite) {
    sprite.visible = false;
    this._itemSpritePool.push(sprite);
  }

  _rebuildItemSprites() {
    const show = this.camera.zoom >= ITEM_SPRITE_ZOOM_THRESHOLD
      && this._itemsById.size > 0;
    if (!show) {
      for (const sprite of this._itemSprites.values()) this._releaseItemSprite(sprite);
      this._itemSprites.clear();
      return;
    }
    const { x0, y0, x1, y1 } = this._getViewportBounds(1);
    const seen = new Set();
    const scale = 0.55;
    let count = 0;
    for (const item of this._itemsById.values()) {
      if (!item || item.consumed) continue;
      if (item.x < x0 || item.x >= x1 || item.y < y0 || item.y >= y1) continue;
      const emoji = this._getItemEmoji(item.type);
      let sprite = this._itemSprites.get(item.id);
      if (!sprite) {
        sprite = this._acquireItemSprite(emoji);
        this._itemSprites.set(item.id, sprite);
      }
      const nextTex = this._getItemTexture(emoji);
      if (sprite.material.map !== nextTex) {
        sprite.material.map = nextTex;
        sprite.material.needsUpdate = true;
      }
      sprite.position.set(item.x + 0.5, item.y + 0.5, 2.5);
      sprite.scale.set(scale, scale, 1);
      sprite.material.opacity = 0.92;
      sprite.renderOrder = 50;
      sprite.visible = true;
      seen.add(item.id);
      count++;
      if (count >= MAX_VISIBLE_ITEM_SPRITES) break;
    }
    for (const [id, sprite] of this._itemSprites) {
      if (!seen.has(id)) {
        this._releaseItemSprite(sprite);
        this._itemSprites.delete(id);
      }
    }
  }

  // --- Entity sprites ---

  _getEntityEmoji(a) {
    if (a.lifeStage === LifeStage.EGG) return '🥚';
    if (a.state === AnimalState.DEAD) return '💀';
    if (a.lifeStage === LifeStage.PUPA) return '🪲';
    return SPECIES_INFO[a.species]?.emoji || '🐾';
  }

  _getEntityTexture(a) {
    const key = this._getEntityEmoji(a);
    return this._getEmojiTexture(this._entityTextureCache, key);
  }

  _acquireEntitySprite(a) {
    let sprite;
    if (this._entitySpritePool.length > 0) {
      sprite = this._entitySpritePool.pop();
      sprite.visible = true;
    } else {
      const material = new THREE.SpriteMaterial({
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      sprite = new THREE.Sprite(material);
      this.worldGroup.add(sprite);
    }
    sprite.material.map = this._getEntityTexture(a);
    sprite.material.needsUpdate = true;
    return sprite;
  }

  _releaseEntitySprite(sprite) {
    sprite.visible = false;
    this._entitySpritePool.push(sprite);
  }

  _rebuildEntitySprites() {
    const showSprites = this.camera.zoom >= ENTITY_SPRITE_ZOOM_THRESHOLD;
    if (!showSprites) {
      for (const sprite of this._entitySprites.values()) {
        this._releaseEntitySprite(sprite);
      }
      this._entitySprites.clear();
      return;
    }

    const { x0, y0, x1, y1 } = this._getViewportBounds(1);
    const seen = new Set();

    for (const a of this._animals) {
      if (!a) continue;
      if (a.x < x0 || a.x >= x1 || a.y < y0 || a.y >= y1) continue;

      let sprite = this._entitySprites.get(a.id);
      if (!sprite) {
        sprite = this._acquireEntitySprite(a);
        this._entitySprites.set(a.id, sprite);
      }

      const nextMap = this._getEntityTexture(a);
      if (sprite.material.map !== nextMap) {
        sprite.material.map = nextMap;
        sprite.material.needsUpdate = true;
      }

      const speciesScale = this._entityVisualScale[a.species] || 0.85;
      const stageFactor = a.lifeStage === LifeStage.EGG ? 0.4
        : a.lifeStage === LifeStage.PUPA ? 0.6
        : a.lifeStage === LifeStage.BABY ? 0.5
        : a.lifeStage === LifeStage.YOUNG ? 0.7
        : a.lifeStage === LifeStage.YOUNG_ADULT ? 0.85
        : 1.0;
      const finalScale = Math.max(0.35, Math.min(1.5, speciesScale * stageFactor));

      sprite.position.set(a.x, a.y, 0);
      sprite.scale.set(finalScale, finalScale, 1);
      sprite.material.opacity = a.state === AnimalState.DEAD ? 0.75
        : a.state === AnimalState.SLEEPING ? 0.68
        : 1;
      sprite.material.color.setHex(this._animalColorMap[a.species] || 0xffffff);
      sprite.renderOrder = 100 + Math.round(a.y * 1000);
      sprite.visible = true;
      seen.add(a.id);
    }

    for (const [id, sprite] of this._entitySprites) {
      if (!seen.has(id)) {
        this._releaseEntitySprite(sprite);
        this._entitySprites.delete(id);
      }
    }
  }

  _refreshSelectionMarker() {
    if (!this._selectedTile) {
      if (this._selectionLine) {
        this.worldGroup.remove(this._selectionLine);
        this._selectionLine.geometry.dispose();
        this._selectionLine.material.dispose();
        this._selectionLine = null;
      }
      return;
    }

    const { x, y } = this._selectedTile;
    const points = [
      x + 0.04, y + 0.04, 0,
      x + 0.96, y + 0.04, 0,
      x + 0.96, y + 0.96, 0,
      x + 0.04, y + 0.96, 0,
    ];

    if (this._selectionLine) {
      this.worldGroup.remove(this._selectionLine);
      this._selectionLine.geometry.dispose();
      this._selectionLine.material.dispose();
      this._selectionLine = null;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const material = new THREE.LineBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.95, depthTest: false });
    this._selectionLine = new THREE.LineLoop(geometry, material);
    this._selectionLine.position.set(0, 0, 4);
    this._selectionLine.renderOrder = 30;
    this.worldGroup.add(this._selectionLine);
  }

  setTerrain(terrainData, width, height) {
    this._terrainData = terrainData;
    this.mapWidth = width;
    this.mapHeight = height;
    this.camera.setWorldBounds(width, height);

    if (this._terrainMesh) {
      this.worldGroup.remove(this._terrainMesh);
      this._terrainMesh.geometry.dispose();
      this._terrainMesh.material.dispose();
      this._terrainMesh = null;
    }
    if (this._terrainTexture) {
      this._terrainTexture.dispose();
      this._terrainTexture = null;
    }

    this._terrainTexture = this._buildTerrainTexture(terrainData, width, height);
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({ map: this._terrainTexture });
    this._terrainMesh = new THREE.Mesh(geometry, material);
    this._terrainMesh.position.set(width / 2, height / 2, 0);
    this.worldGroup.add(this._terrainMesh);

    this._syncWorldTransform();
    this._emitViewportChanged();
  }

  setPlantSnapshot(plantType, plantStage, width, height) {
    if (width !== this.mapWidth || height !== this.mapHeight) {
      this.mapWidth = width;
      this.mapHeight = height;
      this.camera.setWorldBounds(width, height);
    }
    this._plantType = plantType;
    this._plantStage = plantStage;
    this._rebuildPlantPoints();
  }

  updatePlants(plantChanges) {
    const store = useSimStore.getState();
    const profiling = store.profilingEnabled;
    const t0 = profiling ? performance.now() : 0;

    if (!Array.isArray(plantChanges) || plantChanges.length === 0 || !this._plantType || !this._plantStage) return;

    const { x0, y0, x1, y1 } = this._getViewportBounds(2);
    for (const change of plantChanges) {
      const [x, y, ptype, stage] = change;
      if (x < 0 || y < 0 || x >= this.mapWidth || y >= this.mapHeight) continue;
      const idx = y * this.mapWidth + x;
      const prevStage = this._plantStage[idx];
      if (stage === 5 && prevStage !== 5) {
        this._spawnParticles('fruit', x + 0.5, y + 0.5);
        if (x >= x0 && x < x1 && y >= y0 && y < y1) {
          this._emitEffectEvent({ type: 'fruit', x: x + 0.5, y: y + 0.5 });
        }
      }
      this._plantType[idx] = ptype;
      this._plantStage[idx] = stage;
    }
    this._rebuildPlantPoints();

    if (profiling) {
      store.setRendererProfile({
        ...store.profiling.renderer,
        plantUpdateMs: performance.now() - t0,
        lastTickAt: Date.now(),
      });
    }
  }

  updateItems(itemChanges) {
    if (!Array.isArray(itemChanges) || itemChanges.length === 0) return;
    for (const change of itemChanges) {
      const { op, item } = change;
      if (!item) continue;
      if (op === 'remove') {
        this._itemsById.delete(item.id);
      } else if (op === 'add' || op === 'update') {
        this._itemsById.set(item.id, item);
      }
    }
    this._rebuildItemPoints();
  }

  setItems(items) {
    this._itemsById.clear();
    if (Array.isArray(items)) {
      for (const item of items) {
        if (!item || item.consumed) continue;
        this._itemsById.set(item.id, item);
      }
    }
    this._rebuildItemPoints();
  }

  updateEntities(animals, nativeRenderer, tick, zoom) {
    const store = useSimStore.getState();
    const profiling = store.profilingEnabled;
    const t0 = profiling ? performance.now() : 0;

    this._animals = Array.isArray(animals) ? animals : [];
    void nativeRenderer;
    void zoom;

    // Detect state transitions for particle effects
    const currentTick = tick || 0;
    const { x0, y0, x1, y1 } = this._getViewportBounds(2);
    for (const a of this._animals) {
      if (!a) continue;
      const inViewport = a.x >= x0 && a.x < x1 && a.y >= y0 && a.y < y1;
      const prevState = this._prevAnimalStates.get(a.id);
      if (prevState === undefined) {
        // New animal – birth pop
        if (inViewport) this._spawnParticles('birth', a.x, a.y);
      } else if (prevState !== a.state) {
        if (!inViewport) {
          this._prevAnimalStates.set(a.id, a.state);
          continue;
        }
        switch (a.state) {
          case AnimalState.ATTACKING:
            this._spawnParticles('attack', a.x, a.y);
            this._emitEffectEvent({ type: 'attack', x: a.x, y: a.y, species: a.species, tick: currentTick });
            break;
          case AnimalState.DEAD:
            this._spawnParticles('death',  a.x, a.y);
            this._emitEffectEvent({ type: 'death', x: a.x, y: a.y, species: a.species, tick: currentTick });
            break;
          case AnimalState.MATING:
            this._spawnParticles('mate',   a.x, a.y);
            this._emitEffectEvent({ type: 'mate', x: a.x, y: a.y, species: a.species, tick: currentTick });
            break;
          case AnimalState.EATING:
            this._spawnParticles('eat',    a.x, a.y);
            this._emitEffectEvent({ type: 'eat', x: a.x, y: a.y, species: a.species, tick: currentTick });
            break;
          case AnimalState.DRINKING:
            this._spawnParticles('drink',  a.x, a.y);
            this._emitEffectEvent({ type: 'drink', x: a.x, y: a.y, species: a.species, tick: currentTick });
            break;
          case AnimalState.FLEEING: {
            if (currentTick !== this._fleeBucketTick) {
              this._fleeBucketTick = currentTick;
              this._fleeBuckets.clear();
            }
            const bk = (Math.floor(a.x / 8) << 16) | (Math.floor(a.y / 8) & 0xffff);
            if (!this._fleeBuckets.has(bk)) {
              this._fleeBuckets.add(bk);
              this._spawnParticles('flee', a.x, a.y);
            }
            break;
          }
          default: break;
        }
      }
      // Periodic sleep Zzz
      if (inViewport && a.state === AnimalState.SLEEPING && currentTick > 0 && currentTick % 60 === 0) {
        this._spawnParticles('sleep', a.x, a.y);
      }
      this._prevAnimalStates.set(a.id, a.state);
    }
    // Prune stale entries
    if (this._prevAnimalStates.size > this._animals.length * 2 + 100) {
      const alive = new Set(this._animals.map(a => a?.id));
      for (const id of this._prevAnimalStates.keys()) {
        if (!alive.has(id)) this._prevAnimalStates.delete(id);
      }
    }

    if (profiling) {
      store.setRendererProfile({
        ...store.profiling.renderer,
        entityUpdateMs: performance.now() - t0,
        lastTickAt: Date.now(),
      });
    }

    if (this.camera.zoom >= ENTITY_SPRITE_ZOOM_THRESHOLD) {
      this._replacePoints('_entityPoints', [], [], 4.5, 3, 1);
      this._rebuildEntitySprites();
    } else {
      for (const sprite of this._entitySprites.values()) {
        this._releaseEntitySprite(sprite);
      }
      this._entitySprites.clear();
      this._rebuildEntityPoints();
    }
    this._refreshSelectionMarker();
  }

  updateDayNight(clock) {
    if (!clock || !clock.ticks_per_day) return;
    const tpd = clock.ticks_per_day;
    const tid = clock.tick_in_day;

    // Phase boundaries matching GameRenderer
    const dawnEnd  = tpd * 0.08;
    const dayEnd   = tpd * 0.52;
    const duskEnd  = tpd * 0.60;

    let targetColor, targetAlpha;
    if (tid < dawnEnd) {
      const t = tid / dawnEnd;
      targetColor = 0x443355;
      targetAlpha = 0.20 * (1 - t);
    } else if (tid < dayEnd) {
      targetColor = 0x000000;
      targetAlpha = 0;
    } else if (tid < duskEnd) {
      const t = (tid - dayEnd) / (duskEnd - dayEnd);
      targetColor = 0x553322;
      targetAlpha = 0.22 * t;
    } else {
      const t = Math.min(1, (tid - duskEnd) / (tpd * 0.1));
      targetColor = 0x0a0a3e;
      targetAlpha = 0.22 + 0.16 * t;
    }

    this._nightMaterial.opacity += (targetAlpha - this._nightMaterial.opacity) * 0.12;
    this._nightMaterial.color.setHex(targetColor);
    this._nightMaterial.needsUpdate = true;
  }

  setSelectedEntity(id) {
    this._selectedEntityId = id;
    const selected = this._animals?.find((a) => a.id === id);
    if (selected && Number.isFinite(selected.x) && Number.isFinite(selected.y)) {
      this._selectedTile = { x: selected.x | 0, y: selected.y | 0 };
    } else {
      this._selectedTile = null;
    }
    this._refreshSelectionMarker();
  }

  setSelectedTile(x, y) {
    if (x == null || y == null) {
      this._selectedTile = null;
    } else {
      this._selectedTile = { x, y };
    }
    this._selectedEntityId = null;
    this._refreshSelectionMarker();
  }

  clearSelection() {
    this._selectedEntityId = null;
    this._selectedTile = null;
    this._refreshSelectionMarker();
  }

  async prepareAssets(onStep) {
    if (typeof onStep === 'function') {
      onStep('Preparing Three.js renderer', 'Bootstrapping initial materials and buffers.');
    }
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  getViewportTiles() {
    return { ...this.camera.getViewportTiles(), zoom: this.camera.zoom };
  }

  centerOn(x, y) {
    this.camera.centerOn(x, y);
  }

  setZoom(z) {
    this.camera.setZoom(z);
  }

  captureViewport() {
    const canvas = this.renderer.domElement;
    const dataUrl = canvas.toDataURL('image/png');
    return {
      dataUrl,
      meta: {
        width: canvas.width,
        height: canvas.height,
        zoom: this.camera.zoom,
        mapWidth: this.mapWidth,
        mapHeight: this.mapHeight,
      },
    };
  }

  getNativeRenderer() {
    return this.renderer;
  }

  updateTerrainTiles(changes) {
    if (!Array.isArray(changes) || changes.length === 0 || !this._terrainTexture || !this._terrainPixels) return;
    for (const change of changes) {
      const x = change.x | 0;
      const y = change.y | 0;
      if (x < 0 || y < 0 || x >= this.mapWidth || y >= this.mapHeight) continue;
      const idx = y * this.mapWidth + x;
      const p = idx * 4;
      const color = TERRAIN_COLORS[change.terrain] || [0, 0, 0, 255];
      this._terrainPixels[p] = color[0];
      this._terrainPixels[p + 1] = color[1];
      this._terrainPixels[p + 2] = color[2];
      this._terrainPixels[p + 3] = color[3];
      if (this._terrainData) this._terrainData[idx] = change.terrain;
    }
    this._terrainTexture.needsUpdate = true;
  }

  destroy() {
    this._running = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);

    if (this._resizeObserver) this._resizeObserver.disconnect();
    if (this._wheelHandler) {
      this.renderer.domElement.removeEventListener('wheel', this._wheelHandler);
    }
    if (this._pointerDownHandler) {
      this.renderer.domElement.removeEventListener('pointerdown', this._pointerDownHandler);
    }
    window.removeEventListener('pointermove', this._pointerMoveHandler);
    window.removeEventListener('pointerup', this._pointerUpHandler);

    if (this._terrainMesh) {
      this.worldGroup.remove(this._terrainMesh);
      this._terrainMesh.geometry.dispose();
      this._terrainMesh.material.dispose();
      this._terrainMesh = null;
    }
    if (this._terrainTexture) {
      this._terrainTexture.dispose();
      this._terrainTexture = null;
    }

    this._disposePoints(this._plantPoints);
    this._disposePoints(this._itemPoints);
    this._disposePoints(this._entityPoints);
    this._plantPoints = null;
    this._itemPoints = null;
    this._entityPoints = null;

    for (const sprite of this._entitySprites.values()) {
      this.worldGroup.remove(sprite);
      sprite.material.dispose();
    }
    for (const sprite of this._entitySpritePool) {
      this.worldGroup.remove(sprite);
      sprite.material.dispose();
    }
    this._entitySprites.clear();
    this._entitySpritePool.length = 0;

    for (const sprite of this._plantSprites.values()) {
      this.worldGroup.remove(sprite);
      sprite.material.dispose();
    }
    for (const sprite of this._plantSpritePool) {
      this.worldGroup.remove(sprite);
      sprite.material.dispose();
    }
    this._plantSprites.clear();
    this._plantSpritePool.length = 0;
    for (const texture of this._plantTextureCache.values()) texture.dispose();
    this._plantTextureCache.clear();

    for (const sprite of this._itemSprites.values()) {
      this.worldGroup.remove(sprite);
      sprite.material.dispose();
    }
    for (const sprite of this._itemSpritePool) {
      this.worldGroup.remove(sprite);
      sprite.material.dispose();
    }
    this._itemSprites.clear();
    this._itemSpritePool.length = 0;
    for (const texture of this._itemTextureCache.values()) texture.dispose();
    this._itemTextureCache.clear();

    this._nightMaterial.dispose();
    this._particleMaterial.dispose();
    this._particleGeometry.dispose();

    for (const texture of this._entityTextureCache.values()) {
      texture.dispose();
    }
    this._entityTextureCache.clear();

    if (this._selectionLine) {
      this.worldGroup.remove(this._selectionLine);
      this._selectionLine.geometry.dispose();
      this._selectionLine.material.dispose();
      this._selectionLine = null;
    }

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
