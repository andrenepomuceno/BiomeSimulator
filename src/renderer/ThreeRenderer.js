import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TERRAIN_COLORS } from '../utils/terrainColors.js';
import { PLANT_COLORS } from '../utils/terrainColors.js';
import { SPECIES_INFO } from '../utils/terrainColors.js';
import { AnimalState, LifeStage } from '../engine/entities.js';
import { buildAnimalColorMap, buildSpeciesVisualScale } from '../engine/animalSpecies.js';
import { buildPlantEmojiMap, buildTreeTypes } from '../engine/plantSpecies.js';
import { createModelAssetLoader } from './modelAssetLoader.js';
import { ViewCamera } from './ViewCamera.js';
import {
  ANIMAL_SPRITE_SCALE_BOOST,
  ANIMAL_MODEL_SCALE_BOOST,
  ORBIT_TREE_SCALE_BOOST,
  ORBIT_ENTITY_SPRITE_BOOST,
  ORBIT_ENTITY_MODEL_BOOST,
  MAX_VISIBLE_PLANT_POINTS,
  MAX_VISIBLE_ENTITY_POINTS,
  MAX_VISIBLE_ITEM_POINTS,
  MAX_VISIBLE_PLANT_SPRITES,
  MAX_VISIBLE_ITEM_SPRITES,
  ENTITY_SPRITE_ZOOM_THRESHOLD,
  MAX_PARTICLES,
  PARTICLE_DEFS,
  PLANT_SPRITE_ZOOM_THRESHOLD,
  ITEM_SPRITE_ZOOM_THRESHOLD,
  ITEM_EMOJIS,
  ITEM_COLORS,
  TREE_MODEL_URLS,
  DEAD_TREE_MODEL_URL,
  ENTITY_MODEL_URLS,
  ENTITY_MODEL_SCALE_MULTIPLIERS,
  clamp,
} from './threeRendererConfig.js';
import useSimStore from '../store/simulationStore.js';

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
    this._orbitCamera3D = new THREE.PerspectiveCamera(55, this.screen.width / this.screen.height, 0.1, 10000);
    this._activeCamera3D = this.camera3D;
    this._orbitControlsEnabled = false;

    // GLTF assets use lit materials; keep a lightweight neutral rig so trees/fauna
    // don't appear as dark silhouettes in the top-down orthographic view.
    this._ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    this._directionalLight = new THREE.DirectionalLight(0xffffff, 0.65);
    this._directionalLight.position.set(0.5, -1, 2);
    this.scene.add(this._ambientLight);
    this.scene.add(this._directionalLight);

    this.cameraGroup = new THREE.Group();
    this.worldGroup = new THREE.Group();
    this.cameraGroup.add(this.worldGroup);
    this.scene.add(this.cameraGroup);

    this._orbitControls = new OrbitControls(this._orbitCamera3D, this.renderer.domElement);
    this._orbitControls.enabled = false;
    this._orbitControls.enableDamping = true;
    this._orbitControls.dampingFactor = 0.08;
    this._orbitControls.enablePan = true;
    this._orbitControls.enableRotate = true;
    this._orbitControls.enableZoom = true;
    this._orbitControls.minPolarAngle = 0;
    this._orbitControls.maxPolarAngle = Math.PI;
    this._orbitControls.screenSpacePanning = false;
    this._orbitControls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    this._orbitControls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };

    this._raycaster = new THREE.Raycaster();
    this._pickPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    this._pointerNdc = new THREE.Vector2();
    this._rayHitPoint = new THREE.Vector3();
    this._localHitPoint = new THREE.Vector3();
    this._orbitTargetTmp = new THREE.Vector3();

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
    this._treeTypeIds = buildTreeTypes();
    this._plantSprites = new Map(); // cellIdx → THREE.Sprite
    this._plantSpritePool = [];
    this._plantTextureCache = new Map();
    this._treeAssetLoader = createModelAssetLoader();
    this._treeModelInstances = new Map(); // cellIdx -> THREE.Object3D
    this._treeModelPool = new Map(); // typeId -> Array<THREE.Object3D>

    // Item sprites (zoom >= ITEM_SPRITE_ZOOM_THRESHOLD)
    this._itemSprites = new Map(); // item.id → THREE.Sprite
    this._itemSpritePool = [];
    this._itemTextureCache = new Map();

    // Entity sprites
    this._entitySprites = new Map();
    this._entitySpritePool = [];
    this._entityTextureCache = new Map();
    this._entityAssetLoader = createModelAssetLoader();
    this._entityModelInstances = new Map(); // entityId -> THREE.Object3D
    this._entityModelPool = new Map(); // species -> Array<THREE.Object3D>
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
      if (this._orbitControlsEnabled) this._orbitControls.update();
      this._tickParticles();
      this._tickFps();
      this.renderer.render(this.scene, this._activeCamera3D);
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
    let clickDown = false; // tracks button-0 press independently from pan-drag
    let lastX = 0;
    let lastY = 0;
    let downX = 0;
    let downY = 0;

    this._wheelHandler = (e) => {
      if (this._orbitControlsEnabled) return;
      this.camera.onWheel(e);
    };
    this.renderer.domElement.addEventListener('wheel', this._wheelHandler, { passive: false });

    this._contextMenuHandler = (e) => {
      if (this._orbitControlsEnabled) e.preventDefault();
    };
    this.renderer.domElement.addEventListener('contextmenu', this._contextMenuHandler);

    this._pointerDownHandler = (e) => {
      if (this._orbitControlsEnabled) {
        if (e.button === 0) {
          clickDown = true;
          downX = e.clientX;
          downY = e.clientY;
        }
        this._lastEntityBrushTile = null;
        return;
      }

      if (e.button === 0 || e.button === 1) {
        const tool = useSimStore.getState().tool;
        this._lastEntityBrushTile = null;
        // Always record click-down position and flag for all button-0 presses
        // so pointerup can detect short clicks regardless of tool
        if (e.button === 0) {
          clickDown = true;
          downX = e.clientX;
          downY = e.clientY;
        }
        if (e.button === 0 && tool === 'PLACE_ENTITY') {
          dragging = true;
          this._isEntityBrushing = true;
          lastX = e.clientX;
          lastY = e.clientY;
          return;
        }
        // Paint/Erase: fire tile click on pointerup, but do not pan camera
        if (e.button === 0 && tool !== 'SELECT') {
          return;
        }
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
      }
    };
    this.renderer.domElement.addEventListener('pointerdown', this._pointerDownHandler);

    this._pointerMoveHandler = (e) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      this._lastHoverTile = this._screenToTile(screenX, screenY);

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
      if (!dragging && !clickDown) return;
      if (dragging) dragging = false;
      const wasClickDown = clickDown;
      clickDown = false;
      const dist = Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY);
      const inOrbit = this._orbitControlsEnabled;

      if (inOrbit) {
        if (wasClickDown && dist < 5 && this.onTileClick) {
          const rect = this.renderer.domElement.getBoundingClientRect();
          const tile = this._screenToTile(e.clientX - rect.left, e.clientY - rect.top);
          if (tile && tile.x >= 0 && tile.y >= 0 && tile.x < this.mapWidth && tile.y < this.mapHeight) {
            this.onTileClick(tile.x, tile.y);
          }
        }
        this._isEntityBrushing = false;
        this._lastEntityBrushTile = null;
        return;
      }

      // Compute tile from the actual release coordinates, not stale hover state
      if (wasClickDown && dist < 5 && this.onTileClick && !this._lastEntityBrushTile) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const tile = this._screenToTile(e.clientX - rect.left, e.clientY - rect.top);
        if (tile.x >= 0 && tile.y >= 0 && tile.x < this.mapWidth && tile.y < this.mapHeight) {
          this.onTileClick(tile.x, tile.y);
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
      this._orbitCamera3D.aspect = width / height;
      this._orbitCamera3D.updateProjectionMatrix();
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
    if (this._orbitControlsEnabled) {
      this.cameraGroup.position.set(0, 0, 0);
      this.cameraGroup.rotation.z = 0;
      this.cameraGroup.scale.set(1, 1, 1);
      this.worldGroup.position.set(0, 0, 0);
      return;
    }

    this.cameraGroup.position.set(this.screen.width / 2, this.screen.height / 2, 0);
    this.cameraGroup.rotation.z = this.camera.rotation;
    this.cameraGroup.scale.set(this.camera.zoom, -this.camera.zoom, 1);
    this.worldGroup.position.set(-this.camera.centerX, -this.camera.centerY, 0);
  }

  _screenToTile(screenX, screenY) {
    if (!this._orbitControlsEnabled) {
      return this.camera.screenToTile(screenX, screenY);
    }

    this._pointerNdc.set(
      (screenX / this.screen.width) * 2 - 1,
      -((screenY / this.screen.height) * 2 - 1),
    );
    this._raycaster.setFromCamera(this._pointerNdc, this._activeCamera3D);
    const hit = this._raycaster.ray.intersectPlane(this._pickPlane, this._rayHitPoint);
    if (!hit) return null;

    this._localHitPoint.copy(this._rayHitPoint);
    this.worldGroup.worldToLocal(this._localHitPoint);
    return {
      x: Math.floor(this._localHitPoint.x),
      y: Math.floor(this._localHitPoint.y),
    };
  }

  _orbitScreenToWorld(screenX, screenY) {
    if (!this._orbitControlsEnabled) return null;
    this._pointerNdc.set(
      (screenX / this.screen.width) * 2 - 1,
      -((screenY / this.screen.height) * 2 - 1),
    );
    this._raycaster.setFromCamera(this._pointerNdc, this._activeCamera3D);
    const hit = this._raycaster.ray.intersectPlane(this._pickPlane, this._rayHitPoint);
    if (!hit) return null;
    this._localHitPoint.copy(this._rayHitPoint);
    this.worldGroup.worldToLocal(this._localHitPoint);
    return { x: this._localHitPoint.x, y: this._localHitPoint.y };
  }

  _getOrbitViewportBounds(extra = 0) {
    const samples = [
      this._orbitScreenToWorld(0, 0),
      this._orbitScreenToWorld(this.screen.width, 0),
      this._orbitScreenToWorld(this.screen.width, this.screen.height),
      this._orbitScreenToWorld(0, this.screen.height),
      this._orbitScreenToWorld(this.screen.width * 0.5, this.screen.height * 0.5),
    ].filter(Boolean);

    if (samples.length === 0) {
      return { x0: 0, y0: 0, x1: this.mapWidth, y1: this.mapHeight };
    }

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const p of samples) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }

    const x0 = Math.max(0, Math.floor(minX - extra));
    const y0 = Math.max(0, Math.floor(minY - extra));
    const x1 = Math.min(this.mapWidth, Math.ceil(maxX + extra));
    const y1 = Math.min(this.mapHeight, Math.ceil(maxY + extra));

    if (x1 <= x0 || y1 <= y0) {
      return { x0: 0, y0: 0, x1: this.mapWidth, y1: this.mapHeight };
    }
    return { x0, y0, x1, y1 };
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
    ctx.font = '52px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
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
    if (this._orbitControlsEnabled) {
      return this._getOrbitViewportBounds(extra);
    }
    const bounds = this.camera.getViewportWorldBounds(extra);
    const x0 = Math.max(0, Math.floor(bounds.minX));
    const y0 = Math.max(0, Math.floor(bounds.minY));
    const x1 = Math.min(this.mapWidth, Math.ceil(bounds.maxX));
    const y1 = Math.min(this.mapHeight, Math.ceil(bounds.maxY));
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
        if (this._isTreeRenderable(t, s)) continue;
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
    if (stage > 5) return '🪵';
    return this._plantEmojiMap[`${typeId}_${stage}`] || '🌿';
  }

  _getPlantTexture(emoji) {
    return this._getEmojiTexture(this._plantTextureCache, emoji);
  }

  _isTreeRenderable(typeId, stage) {
    return this._treeTypeIds.has(typeId) && stage >= 3;
  }

  _getTreeModelKey(typeId, stage) {
    return stage > 5 ? 'DEAD_STUMP' : typeId;
  }

  _getTreeModelUrl(typeId, stage) {
    if (stage > 5) return DEAD_TREE_MODEL_URL;
    return TREE_MODEL_URLS[typeId] || null;
  }

  _getTreeScale(typeId, stage) {
    if (stage > 5) return 0.62;
    const stageScale = stage === 3 ? 0.75 : stage === 4 ? 1.05 : 1.2;
    const orbitBoost = this._orbitControlsEnabled ? ORBIT_TREE_SCALE_BOOST : 1;
    if (typeId === 4) return stageScale * 1.05 * orbitBoost;   // Apple
    if (typeId === 5) return stageScale * 1.1 * orbitBoost;    // Mango
    if (typeId === 10) return stageScale * 1.2 * orbitBoost;   // Oak
    if (typeId === 12) return stageScale * 1.35 * orbitBoost;  // Coconut palm
    return stageScale * orbitBoost;
  }

  _normalizeTreeMesh(mesh) {
    // Some assets are authored Y-up, others are effectively Z-up after export.
    // Detect dominant height axis and only rotate when needed.
    mesh.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(mesh);
    if (box.isEmpty()) return;

    const size = new THREE.Vector3();
    box.getSize(size);
    if (size.y > size.z * 1.15) {
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

  _ensureTreeModelLoaded(typeId, stage) {
    const modelKey = this._getTreeModelKey(typeId, stage);
    const url = this._getTreeModelUrl(typeId, stage);
    this._treeAssetLoader.ensureLoaded(modelKey, url, () => {
      this._scheduleVisibilityRefresh();
    });
  }

  _acquireTreeModel(typeId, stage) {
    const modelKey = this._getTreeModelKey(typeId, stage);
    let pool = this._treeModelPool.get(modelKey);
    if (!pool) {
      pool = [];
      this._treeModelPool.set(modelKey, pool);
    }
    if (pool.length > 0) {
      const reused = pool.pop();
      reused.visible = true;
      this.worldGroup.add(reused);
      return reused;
    }
    const template = this._treeAssetLoader.getTemplate(modelKey);
    if (!template) return null;

    const mesh = template.clone(true);
    this._normalizeTreeMesh(mesh);

    const root = new THREE.Group();
    root.add(mesh);
    this.worldGroup.add(root);
    return root;
  }

  _releaseTreeModel(modelKey, model) {
    model.visible = false;
    this.worldGroup.remove(model);
    let pool = this._treeModelPool.get(modelKey);
    if (!pool) {
      pool = [];
      this._treeModelPool.set(modelKey, pool);
    }
    pool.push(model);
  }

  _releaseAllTreeModels() {
    for (const [idx, model] of this._treeModelInstances) {
      const modelKey = model.userData?.treeModelKey ?? model.userData?.treeTypeId;
      if (modelKey != null) {
        this._releaseTreeModel(modelKey, model);
      } else {
        this.worldGroup.remove(model);
      }
      this._treeModelInstances.delete(idx);
    }
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
    const show = (this._orbitControlsEnabled || this.camera.zoom >= PLANT_SPRITE_ZOOM_THRESHOLD)
      && this._plantType
      && this._plantStage
      && this.mapWidth > 0;
    if (!show) {
      for (const sprite of this._plantSprites.values()) this._releasePlantSprite(sprite);
      this._plantSprites.clear();
      this._releaseAllTreeModels();
      return;
    }
    const { x0, y0, x1, y1 } = this._getViewportBounds(1);
    const seenSprites = new Set();
    const seenTrees = new Set();
    const scale = 0.82;
    let count = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const idx = y * this.mapWidth + x;
        const t = this._plantType[idx];
        const s = this._plantStage[idx];
        if (t === 0 || s === 0) continue;

        if (this._isTreeRenderable(t, s)) {
          this._ensureTreeModelLoaded(t, s);

          let model = this._treeModelInstances.get(idx);
          const modelKey = this._getTreeModelKey(t, s);
          if (!model && this._treeAssetLoader.getTemplate(modelKey)) {
            model = this._acquireTreeModel(t, s);
            if (model) {
              model.userData = { treeTypeId: t, treeModelKey: modelKey };
              this._treeModelInstances.set(idx, model);
            }
          }

          if (model) {
            const existingSprite = this._plantSprites.get(idx);
            if (existingSprite) {
              this._releasePlantSprite(existingSprite);
              this._plantSprites.delete(idx);
            }

            const modelScale = this._getTreeScale(t, s);
            model.position.set(x + 0.5, y + 0.5, 0.02);
            model.scale.set(modelScale, modelScale, modelScale);
            model.visible = true;
            seenTrees.add(idx);
            count++;
            if (count >= MAX_VISIBLE_PLANT_SPRITES) break;
            continue;
          }
        }

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
        seenSprites.add(idx);
        count++;
        if (count >= MAX_VISIBLE_PLANT_SPRITES) break;
      }
      if (count >= MAX_VISIBLE_PLANT_SPRITES) break;
    }
    for (const [idx, sprite] of this._plantSprites) {
      if (!seenSprites.has(idx)) {
        this._releasePlantSprite(sprite);
        this._plantSprites.delete(idx);
      }
    }
    for (const [idx, model] of this._treeModelInstances) {
      if (seenTrees.has(idx)) continue;
      const modelKey = model.userData?.treeModelKey ?? model.userData?.treeTypeId;
      if (modelKey != null) {
        this._releaseTreeModel(modelKey, model);
      } else {
        this.worldGroup.remove(model);
      }
      this._treeModelInstances.delete(idx);
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
    const show = (this._orbitControlsEnabled || this.camera.zoom >= ITEM_SPRITE_ZOOM_THRESHOLD)
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

  _canUseEntityModel(a) {
    if (!a || !a.species) return false;
    if (a.state === AnimalState.DEAD) return false;
    if (a.lifeStage === LifeStage.EGG || a.lifeStage === LifeStage.PUPA) return false;
    return Boolean(this._getEntityModelUrl(a.species));
  }

  _getEntityModelUrl(species) {
    return ENTITY_MODEL_URLS[species] || null;
  }

  _getEntityModelScale(a, spriteScale) {
    const speciesFactor = (this._entityVisualScale[a.species] || 0.85) / 0.85;
    const base = 0.26;
    const stageFactor = a.lifeStage === LifeStage.BABY ? 0.6
      : a.lifeStage === LifeStage.YOUNG ? 0.78
      : a.lifeStage === LifeStage.YOUNG_ADULT ? 0.9
      : 1.0;
    const fallbackFromSprite = Number.isFinite(spriteScale) ? spriteScale * 0.28 : 1;
    const orbitBoost = this._orbitControlsEnabled ? ORBIT_ENTITY_MODEL_BOOST : 1;
    const speciesModelBoost = ENTITY_MODEL_SCALE_MULTIPLIERS[a.species] || 1;
    return Math.max(0.14, Math.min(1.55, base * speciesFactor * stageFactor * fallbackFromSprite * ANIMAL_MODEL_SCALE_BOOST * orbitBoost * speciesModelBoost));
  }

  _ensureEntityModelLoaded(species) {
    const url = this._getEntityModelUrl(species);
    this._entityAssetLoader.ensureLoaded(species, url, () => {
      this._scheduleVisibilityRefresh();
    });
  }

  _acquireEntityModel(species) {
    let pool = this._entityModelPool.get(species);
    if (!pool) {
      pool = [];
      this._entityModelPool.set(species, pool);
    }
    if (pool.length > 0) {
      const reused = pool.pop();
      reused.visible = true;
      this.worldGroup.add(reused);
      return reused;
    }

    const template = this._entityAssetLoader.getTemplate(species);
    if (!template) return null;
    const model = template.clone(true);
    this.worldGroup.add(model);
    return model;
  }

  _releaseEntityModel(species, model) {
    model.visible = false;
    this.worldGroup.remove(model);
    let pool = this._entityModelPool.get(species);
    if (!pool) {
      pool = [];
      this._entityModelPool.set(species, pool);
    }
    pool.push(model);
  }

  _rebuildEntitySprites() {
    const showSprites = this._orbitControlsEnabled || this.camera.zoom >= ENTITY_SPRITE_ZOOM_THRESHOLD;
    if (!showSprites) {
      for (const sprite of this._entitySprites.values()) {
        this._releaseEntitySprite(sprite);
      }
      this._entitySprites.clear();
      for (const [entityId, model] of this._entityModelInstances) {
        const species = model.userData?.species;
        if (species) this._releaseEntityModel(species, model);
        else this.worldGroup.remove(model);
        this._entityModelInstances.delete(entityId);
      }
      return;
    }

    const { x0, y0, x1, y1 } = this._getViewportBounds(1);
    const seenSprites = new Set();
    const seenModels = new Set();

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
      const orbitBoost = this._orbitControlsEnabled ? ORBIT_ENTITY_SPRITE_BOOST : 1;
      const finalScale = Math.max(0.42, Math.min(2.4, speciesScale * stageFactor * ANIMAL_SPRITE_SCALE_BOOST * orbitBoost));

      if (this._canUseEntityModel(a)) {
        this._ensureEntityModelLoaded(a.species);
        let model = this._entityModelInstances.get(a.id);
        if (!model && this._entityAssetLoader.getTemplate(a.species)) {
          model = this._acquireEntityModel(a.species);
          if (model) {
            model.userData = { species: a.species };
            this._entityModelInstances.set(a.id, model);
          }
        }
        if (model) {
          const existingSprite = this._entitySprites.get(a.id);
          if (existingSprite) {
            this._releaseEntitySprite(existingSprite);
            this._entitySprites.delete(a.id);
          }
          const modelScale = this._getEntityModelScale(a, finalScale);
          model.position.set(a.x, a.y, 0.4);
          model.scale.set(modelScale, modelScale, modelScale);
          model.visible = true;
          seenModels.add(a.id);
          continue;
        }
      }

      sprite.position.set(a.x, a.y, 0);
      sprite.scale.set(finalScale, finalScale, 1);
      sprite.material.opacity = a.state === AnimalState.DEAD ? 0.75
        : a.state === AnimalState.SLEEPING ? 0.68
        : 1;
      sprite.material.color.setHex(this._animalColorMap[a.species] || 0xffffff);
      sprite.renderOrder = 100 + Math.round(a.y * 1000);
      sprite.visible = true;
      seenSprites.add(a.id);
    }

    for (const [id, sprite] of this._entitySprites) {
      if (!seenSprites.has(id)) {
        this._releaseEntitySprite(sprite);
        this._entitySprites.delete(id);
      }
    }
    for (const [entityId, model] of this._entityModelInstances) {
      if (seenModels.has(entityId)) continue;
      const species = model.userData?.species;
      if (species) this._releaseEntityModel(species, model);
      else this.worldGroup.remove(model);
      this._entityModelInstances.delete(entityId);
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
    if (this._orbitControlsEnabled) {
      return { x: 0, y: 0, w: this.mapWidth, h: this.mapHeight, zoom: this.camera.zoom };
    }
    return { ...this.camera.getViewportTiles(), zoom: this.camera.zoom };
  }

  centerOn(x, y) {
    this.camera.centerOn(x, y);
  }

  setZoom(z) {
    this.camera.setZoom(z);
  }

  isOrbitControlsEnabled() {
    return this._orbitControlsEnabled;
  }

  _syncOrbitCameraFromView() {
    this._orbitTargetTmp.set(this.camera.centerX, this.camera.centerY, 0);
    this._orbitControls.target.copy(this._orbitTargetTmp);

    const vp = this.camera.getViewportTiles();
    const diag = Math.hypot(vp.w, vp.h);
    const dist = clamp(diag * 0.9, 60, 420);
    this._orbitControls.minDistance = Math.max(18, dist * 0.25);
    this._orbitControls.maxDistance = Math.max(260, dist * 6);
    this._orbitCamera3D.position.set(this._orbitTargetTmp.x, this._orbitTargetTmp.y - dist * 0.8, dist * 0.9);
    this._orbitCamera3D.up.set(0, 0, 1);
    this._orbitCamera3D.lookAt(this._orbitTargetTmp);
    this._orbitCamera3D.updateProjectionMatrix();
    this._orbitControls.update();
  }

  setOrbitControlsEnabled(enabled) {
    const nextEnabled = Boolean(enabled);
    if (nextEnabled === this._orbitControlsEnabled) return;
    this._orbitControlsEnabled = nextEnabled;
    if (nextEnabled) {
      this._syncWorldTransform();
      this._syncOrbitCameraFromView();
      this._activeCamera3D = this._orbitCamera3D;
      this._orbitControls.enabled = true;
    } else {
      this._orbitControls.enabled = false;
      this._activeCamera3D = this.camera3D;
      this._syncWorldTransform();
    }
    this._emitViewportChanged();
  }

  toggleOrbitControls() {
    this.setOrbitControlsEnabled(!this._orbitControlsEnabled);
    return this._orbitControlsEnabled;
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
    if (this._contextMenuHandler) {
      this.renderer.domElement.removeEventListener('contextmenu', this._contextMenuHandler);
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
    for (const [entityId, model] of this._entityModelInstances) {
      const species = model.userData?.species;
      if (species) this._releaseEntityModel(species, model);
      else this.worldGroup.remove(model);
      this._entityModelInstances.delete(entityId);
    }
    for (const pool of this._entityModelPool.values()) {
      for (const model of pool) {
        this.worldGroup.remove(model);
      }
    }
    this._entityModelPool.clear();
    this._entityModelInstances.clear();
    this._entityAssetLoader.clear();

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

    this._releaseAllTreeModels();
    for (const pool of this._treeModelPool.values()) {
      for (const model of pool) {
        this.worldGroup.remove(model);
      }
    }
    this._treeModelPool.clear();
    this._treeModelInstances.clear();
    this._treeAssetLoader.clear();

    if (this._orbitControls) {
      this._orbitControls.dispose();
    }

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
