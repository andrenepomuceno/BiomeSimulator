import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TERRAIN_COLORS } from '../../utils/terrainColors.js';
import { ViewCamera } from './ViewCamera.js';
import {
  configureOrbitControls,
  buildOrbitViewportBounds,
  buildOrbitCameraPreset,
  clampCameraAboveGround,
} from './threeRendererOrbit.js';
import {
  ENTITY_SPRITE_ZOOM_THRESHOLD,
  clamp,
} from './threeRendererConfig.js';
import { ThreeEmojiAtlas } from './threeEmojiAtlas.js';
import { ThreeParticleSystem } from './threeParticleSystem.js';
import { ThreePlantLayer } from './threePlantLayer.js';
import { ThreeItemLayer } from './threeItemLayer.js';
import { ThreeEntityLayer } from './threeEntityLayer.js';
import { ThreeInputHandler } from './threeInputHandler.js';
import useSimStore from '../../store/simulationStore.js';

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

    // ---- WebGL renderer ----
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setSize(this.screen.width, this.screen.height, false);
    this.renderer.setClearColor(0x0a0a1a, 1);
    container.appendChild(this.renderer.domElement);

    // ---- Scene graph ----
    this.scene = new THREE.Scene();
    this.camera3D = new THREE.OrthographicCamera(0, this.screen.width, this.screen.height, 0, -1000, 1000);
    this.camera3D.position.z = 10;
    this._orbitCamera3D = new THREE.PerspectiveCamera(55, this.screen.width / this.screen.height, 0.1, 10000);
    this._activeCamera3D = this.camera3D;
    this._orbitControlsEnabled = false;

    this._ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    this._directionalLight = new THREE.DirectionalLight(0xffffff, 0.65);
    this._directionalLight.position.set(0.5, -1, 2);
    this.scene.add(this._ambientLight);
    this.scene.add(this._directionalLight);

    this.cameraGroup = new THREE.Group();
    this.worldGroup = new THREE.Group();
    this.cameraGroup.add(this.worldGroup);
    this.scene.add(this.cameraGroup);

    this._axesHelper = new THREE.AxesHelper(50);
    this._axesHelper.position.set(0, 0, 0);
    this.worldGroup.add(this._axesHelper);

    // ---- Orbit controls ----
    this._orbitControls = new OrbitControls(this._orbitCamera3D, this.renderer.domElement);
    configureOrbitControls(this._orbitControls);
    this._orbitControls.addEventListener('change', () => {
      if (this._orbitControlsEnabled) this._emitViewportChanged();
    });

    // ---- Raycasting temps ----
    this._raycaster = new THREE.Raycaster();
    this._pickPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    this._pointerNdc = new THREE.Vector2();
    this._rayHitPoint = new THREE.Vector3();
    this._localHitPoint = new THREE.Vector3();
    this._orbitTargetTmp = new THREE.Vector3();

    // ---- Compatibility shims for external callers ----
    this.terrainLayer = {
      updateTiles: (changes) => this.updateTerrainTiles(changes),
    };
    this.plantLayer = {
      setFromArrays: (plantType, plantStage, width, height) =>
        this.setPlantSnapshot(plantType, plantStage, width, height),
    };

    // ---- Terrain state ----
    this.mapWidth = 0;
    this.mapHeight = 0;
    this._terrainData = null;
    this._terrainMesh = null;
    this._terrainTexture = null;
    this._terrainPixels = null;

    // ---- Sub-systems ----
    this._emojiAtlas = new ThreeEmojiAtlas();
    this._particles = new ThreeParticleSystem(this.worldGroup);
    this._plantLayer = new ThreePlantLayer(this.worldGroup, this._emojiAtlas);
    this._itemLayer = new ThreeItemLayer(this.worldGroup, this._emojiAtlas);
    this._entityLayer = new ThreeEntityLayer(this.worldGroup, this._emojiAtlas);

    // ---- Selection ----
    this._selectionLine = null;
    this._selectedTile = null;
    this._selectedEntityId = null;

    // ---- FPS tracking ----
    this._frameLastAt = performance.now();
    this._frameWindow = { frames: 0, startedAt: this._frameLastAt };

    // ---- Night overlay ----
    this._overlayScene = new THREE.Scene();
    this._overlayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this._nightMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
    });
    this._overlayMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this._nightMaterial);
    this._overlayScene.add(this._overlayMesh);

    // ---- Refresh flag ----
    this._refreshQueued = false;

    // ---- Camera ----
    this.camera = new ViewCamera(this.screen, () => {
      this._syncWorldTransform();
      this._emitViewportChanged();
    });

    // ---- Input ----
    this._input = new ThreeInputHandler({
      domElement: this.renderer.domElement,
      container,
      camera: this.camera,
      screenToTile: (sx, sy) => this._screenToTile(sx, sy),
      onTileClick,
      getMapSize: () => ({ width: this.mapWidth, height: this.mapHeight }),
      isOrbit: () => this._orbitControlsEnabled,
      onResize: () => this._handleResize(),
    });

    // ---- Animation loop ----
    this._running = true;
    this._animate = () => {
      if (!this._running) return;
      if (this._orbitControlsEnabled) {
        this._orbitControls.update();
        clampCameraAboveGround(this._orbitCamera3D);
      }
      this._particles.tick();
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

  // ==================================================================
  // Viewport & transform
  // ==================================================================

  _handleResize() {
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

  // ==================================================================
  // Hit-testing
  // ==================================================================

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
    return { x: Math.floor(this._localHitPoint.x), y: Math.floor(this._localHitPoint.y) };
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
    return buildOrbitViewportBounds(samples, this.mapWidth, this.mapHeight, extra);
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

  // ==================================================================
  // Visibility refresh orchestration
  // ==================================================================

  _scheduleVisibilityRefresh() {
    if (this._refreshQueued) return;
    this._refreshQueued = true;
    requestAnimationFrame(() => {
      this._refreshQueued = false;
      const vp = this._getViewportBounds(1);
      const zoom = this.camera.zoom;
      const orbit = this._orbitControlsEnabled;
      const onRefresh = () => this._scheduleVisibilityRefresh();

      this._plantLayer.rebuildPoints(vp, zoom);
      this._plantLayer.rebuildSprites(vp, zoom, orbit, onRefresh);
      this._itemLayer.rebuildPoints(vp, zoom);
      this._itemLayer.rebuildSprites(vp, zoom, orbit, onRefresh);
      this._entityLayer.rebuildPoints(vp, zoom);
      this._entityLayer.rebuildSprites(vp, zoom, orbit, onRefresh);
      this._refreshSelectionMarker();
    });
  }

  // ==================================================================
  // FPS profiling
  // ==================================================================

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

  // ==================================================================
  // Terrain
  // ==================================================================

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
    texture.flipY = false;
    texture.needsUpdate = true;
    this._terrainPixels = pixels;
    return texture;
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

  // ==================================================================
  // Plants
  // ==================================================================

  setPlantSnapshot(plantType, plantStage, width, height) {
    if (width !== this.mapWidth || height !== this.mapHeight) {
      this.mapWidth = width;
      this.mapHeight = height;
      this.camera.setWorldBounds(width, height);
    }
    this._plantLayer.setData(plantType, plantStage, width, height);
    this._plantLayer.rebuildPoints(this._getViewportBounds(1), this.camera.zoom);
  }

  updatePlants(plantChanges) {
    const store = useSimStore.getState();
    const profiling = store.profilingEnabled;
    const t0 = profiling ? performance.now() : 0;

    if (!Array.isArray(plantChanges) || plantChanges.length === 0) return;

    const vp = this._getViewportBounds(2);
    for (const change of plantChanges) {
      const [x, y, , stage] = change;
      if (x >= vp.x0 && x < vp.x1 && y >= vp.y0 && y < vp.y1) {
        // Check fruiting transition before updating data
        const oldStage = this._plantLayer.getStageAt(x, y);
        if (stage === 5 && oldStage !== 5) {
          this._particles.spawn('fruit', x + 0.5, y + 0.5);
          this._emitEffectEvent({ type: 'fruit', x: x + 0.5, y: y + 0.5 });
        }
      }
    }

    this._plantLayer.applyChanges(plantChanges);
    this._plantLayer.rebuildPoints(this._getViewportBounds(1), this.camera.zoom);

    if (profiling) {
      store.setRendererProfile({
        ...store.profiling.renderer,
        plantUpdateMs: performance.now() - t0,
        lastTickAt: Date.now(),
      });
    }
  }

  // ==================================================================
  // Items
  // ==================================================================

  updateItems(itemChanges) {
    if (!Array.isArray(itemChanges) || itemChanges.length === 0) return;
    this._itemLayer.applyChanges(itemChanges);
    this._itemLayer.rebuildPoints(this._getViewportBounds(1), this.camera.zoom);
  }

  setItems(items) {
    this._itemLayer.setAll(items);
    this._itemLayer.rebuildPoints(this._getViewportBounds(1), this.camera.zoom);
  }

  // ==================================================================
  // Entities
  // ==================================================================

  updateEntities(animals, nativeRenderer, tick, zoom) {
    const store = useSimStore.getState();
    const profiling = store.profilingEnabled;
    const t0 = profiling ? performance.now() : 0;

    this._entityLayer.setAnimals(animals);
    void nativeRenderer;
    void zoom;

    // Process state transitions → particles + effect events
    const vp = this._getViewportBounds(2);
    const effects = this._entityLayer.processStateTransitions(tick || 0, vp, this._particles);
    for (const evt of effects) this._emitEffectEvent(evt);

    if (profiling) {
      store.setRendererProfile({
        ...store.profiling.renderer,
        entityUpdateMs: performance.now() - t0,
        lastTickAt: Date.now(),
      });
    }

    const vpVis = this._getViewportBounds(1);
    if (this.camera.zoom >= ENTITY_SPRITE_ZOOM_THRESHOLD) {
      this._entityLayer.rebuildSprites(
        vpVis, this.camera.zoom, this._orbitControlsEnabled,
        () => this._scheduleVisibilityRefresh(),
      );
    } else {
      this._entityLayer.rebuildPoints(vpVis, this.camera.zoom);
    }
    this._refreshSelectionMarker();
  }

  _emitEffectEvent(event) {
    if (!this.onEffectEvent || !event) return;
    this.onEffectEvent(event);
  }

  // ==================================================================
  // Day/Night
  // ==================================================================

  updateDayNight(clock) {
    if (!clock || !clock.ticks_per_day) return;
    const tpd = clock.ticks_per_day;
    const tid = clock.tick_in_day;

    const dawnEnd = tpd * 0.08;
    const dayEnd = tpd * 0.52;
    const duskEnd = tpd * 0.60;

    let targetColor, targetAlpha;
    if (tid < dawnEnd) {
      targetColor = 0x443355;
      targetAlpha = 0.20 * (1 - tid / dawnEnd);
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

  // ==================================================================
  // Selection
  // ==================================================================

  setSelectedEntity(id) {
    this._selectedEntityId = id;
    const selected = this._entityLayer.animals?.find((a) => a.id === id);
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
    const material = new THREE.LineBasicMaterial({
      color: 0xffdd44,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
    });
    this._selectionLine = new THREE.LineLoop(geometry, material);
    this._selectionLine.position.set(0, 0, 4);
    this._selectionLine.renderOrder = 30;
    this.worldGroup.add(this._selectionLine);
  }

  // ==================================================================
  // Orbit controls
  // ==================================================================

  isOrbitControlsEnabled() {
    return this._orbitControlsEnabled;
  }

  _syncOrbitCameraFromView() {
    this._orbitTargetTmp.set(this.camera.centerX, this.camera.centerY, 0);
    this._orbitControls.target.copy(this._orbitTargetTmp);

    const vp = this.camera.getViewportTiles();
    const preset = buildOrbitCameraPreset(vp, clamp);
    this._orbitControls.minDistance = preset.minDistance;
    this._orbitControls.maxDistance = preset.maxDistance;
    this._orbitCamera3D.position.set(
      this._orbitTargetTmp.x,
      this._orbitTargetTmp.y - preset.offsetY,
      preset.offsetZ,
    );
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

  // ==================================================================
  // Public API
  // ==================================================================

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

  // ==================================================================
  // Destroy
  // ==================================================================

  destroy() {
    this._running = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);

    this._input.destroy();

    // Terrain
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

    // Axes
    if (this._axesHelper) {
      this.worldGroup.remove(this._axesHelper);
      this._axesHelper.geometry.dispose();
      this._axesHelper.material.dispose();
      this._axesHelper = null;
    }

    // Sub-systems (each handles their own sprite/model/texture cleanup)
    this._plantLayer.destroy();
    this._itemLayer.destroy();
    this._entityLayer.destroy();
    this._particles.destroy();
    this._emojiAtlas.destroy();

    // Orbit controls
    if (this._orbitControls) this._orbitControls.dispose();

    // Night overlay
    this._nightMaterial.dispose();
    if (this._overlayMesh) {
      this._overlayMesh.geometry.dispose();
      this._overlayMesh = null;
    }

    // Selection
    if (this._selectionLine) {
      this.worldGroup.remove(this._selectionLine);
      this._selectionLine.geometry.dispose();
      this._selectionLine.material.dispose();
      this._selectionLine = null;
    }

    // WebGL
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
