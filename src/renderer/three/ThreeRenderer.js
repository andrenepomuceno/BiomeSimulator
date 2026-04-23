import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TERRAIN_COLORS } from '../../utils/terrainColors.js';
import { ViewCamera } from './ViewCamera.js';
import {
  configureOrbitControls,
  buildOrbitViewportBounds,
  buildOrbitCameraPreset,
  clampCameraAboveGround,
} from './rendererOrbit.js';
import {
  clamp,
  LOD_DETAIL_DIST,
  TERRAIN_HEIGHT_SCALE,
} from './rendererConfig.js';
import { ThreeEmojiAtlas } from './emojiAtlas.js';
import { ThreeParticleSystem } from './particleSystem.js';
import { ThreePlantLayer } from './plantLayer.js';
import { ThreeItemLayer } from './itemLayer.js';
import { ThreeEntityLayer } from './entityLayer.js';
import { ThreeInputHandler } from './inputHandler.js';
import { ThreeTerrainShader } from './terrainShader.js';
import { buildHeightSampler } from './heightSampler.js';
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

    this._hemiLight = new THREE.HemisphereLight(0xd9f6ff, 0x24303f, 0.75);
    this._keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
    this._keyLight.position.set(0.5, -1, 2);
    this._fillLight = new THREE.DirectionalLight(0x89c8ff, 0.35);
    this._fillLight.position.set(-1, 0.8, 1.5);
    this.scene.add(this._hemiLight);
    this.scene.add(this._keyLight);
    this.scene.add(this._fillLight);

    this.cameraGroup = new THREE.Group();
    this.worldGroup = new THREE.Group();
    this.cameraGroup.add(this.worldGroup);
    this.scene.add(this.cameraGroup);

    this._axesHelper = new THREE.AxesHelper(50);
    this._axesHelper.position.set(0, 0, 0);
    this._axesHelper.visible = false; // debug only
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
    this._terrainShader = new ThreeTerrainShader();
    this._heightmap = null;
    this._waterProximity = null;

    // ---- Sub-systems ----
    this._emojiAtlas = new ThreeEmojiAtlas();
    this._particles = new ThreeParticleSystem(this.worldGroup);
    this._plantLayer = new ThreePlantLayer(this.worldGroup, this._emojiAtlas);
    this._itemLayer = new ThreeItemLayer(this.worldGroup, this._emojiAtlas);
    this._entityLayer = new ThreeEntityLayer(this.worldGroup, this._emojiAtlas);

    // ---- Selection ----
    this._selectionLine = null;
    this._selectionMaterial = null;
    this._selectedTile = null;
    this._selectedEntityId = null;

    // ---- Brush preview ----
    this._brushPreviewMesh = null;
    this._brushPreviewMaterial = null;
    this._brushPreviewSignature = '';

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
    this._lastTick = 0;

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
        clampCameraAboveGround(this._orbitCamera3D, this._groundUnderCamera());
      }
      this._particles.tick();
      this._terrainShader.tick(1);
      this._updateBrushPreview();
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
    // Mouse picking wants the actual terrain surface so clicks on hills
    // don't fall through to the plane behind the peak.
    const hit = this._raycastWorldPoint(screenX, screenY, true);
    if (!hit) return null;
    return { x: Math.floor(hit.x), y: Math.floor(hit.y) };
  }

  _orbitScreenToWorld(screenX, screenY) {
    if (!this._orbitControlsEnabled) return null;
    // Viewport-bounds callers (5 per camera-change event) use the flat
    // ground plane — it's cheap and accurate enough to compute which
    // tiles are visible. The terrain-mesh path has ~2M triangles, which
    // would turn every orbit movement into a 5x heavy raycast.
    return this._raycastWorldPoint(screenX, screenY, false);
  }

  /**
   * Ray-cast from the mouse against the world.
   * When `useTerrainMesh` is true, the displaced terrain is tested first so
   * picking on hills/mountains returns the correct tile. Otherwise, only
   * the ground plane is used (cheap, constant-time).
   */
  _raycastWorldPoint(screenX, screenY, useTerrainMesh) {
    this._pointerNdc.set(
      (screenX / this.screen.width) * 2 - 1,
      -((screenY / this.screen.height) * 2 - 1),
    );
    this._raycaster.setFromCamera(this._pointerNdc, this._activeCamera3D);

    if (useTerrainMesh && this._terrainMesh) {
      const hits = this._raycaster.intersectObject(this._terrainMesh, false);
      if (hits && hits.length > 0) {
        this._localHitPoint.copy(hits[0].point);
        this.worldGroup.worldToLocal(this._localHitPoint);
        return { x: this._localHitPoint.x, y: this._localHitPoint.y };
      }
    }

    // Flat ground plane fallback / fast path.
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

      // LOD is measured from the orbit TARGET (look-at point), not camera
      // position — otherwise the culling ring drifts off to wherever the
      // camera sits in the sky instead of staying on the focal tile.
      // The effective radius shrinks as the camera pulls further out so
      // high-altitude overviews transition to colored points earlier.
      let lodCenter = null;
      let lodRadiusSq = 0;
      if (orbit) {
        lodCenter = this._orbitControls.target;
        const camDist = this._orbitCamera3D.position.distanceTo(lodCenter);
        // Radius scales 1.0→down as camera distance grows past the detail
        // budget. Clamped to keep a usable detail bubble even up close.
        const scale = clamp(LOD_DETAIL_DIST / Math.max(camDist, 1), 0.35, 1.0);
        const effective = LOD_DETAIL_DIST * scale;
        lodRadiusSq = effective * effective;
      }

      this._plantLayer.rebuildPoints(vp, zoom);
      this._plantLayer.rebuildSprites(vp, zoom, orbit, onRefresh, lodCenter, lodRadiusSq);
      this._itemLayer.rebuildPoints(vp, zoom);
      this._itemLayer.rebuildSprites(vp, zoom, orbit, onRefresh);
      this._entityLayer.rebuildPoints(vp, zoom);
      this._entityLayer.rebuildSprites(vp, zoom, orbit, onRefresh, this._lastTick, lodCenter, lodRadiusSq);
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

  setTerrain(terrainData, width, height, heightmap, waterProximity) {
    this._terrainData = terrainData;
    this._heightmap = heightmap || null;
    this._waterProximity = waterProximity || null;
    this.mapWidth = width;
    this.mapHeight = height;
    this.camera.setWorldBounds(width, height);

    // Build / refresh the world-space height sampler used by entities,
    // plants, items and any caller that needs the terrain Z at (x,y).
    this._heightSampler = buildHeightSampler(
      this._heightmap,
      this._terrainData,
      width,
      height,
      TERRAIN_HEIGHT_SCALE,
    );
    this._entityLayer.setHeightSampler?.(this._heightSampler);
    this._plantLayer.setHeightSampler?.(this._heightSampler);
    this._itemLayer.setHeightSampler?.(this._heightSampler);

    if (this._terrainMesh) {
      this.worldGroup.remove(this._terrainMesh);
      this._terrainMesh.geometry.dispose();
      // Material disposed by this._terrainShader.build() → destroy() below
      this._terrainMesh = null;
    }

    // Build GPU terrain shader with per-type patterns, noise, coastal & height effects
    const material = this._terrainShader.build(terrainData, width, height, heightmap, waterProximity);

    // Subdivided plane (1 segment per tile) so we can displace each vertex
    // from the heightmap. Vertex count = (w+1)*(h+1) — acceptable up to
    // ~1000×1000 worlds (~1M verts).
    const geometry = new THREE.PlaneGeometry(width, height, width, height);
    const posAttr = geometry.attributes.position;
    const sampler = this._heightSampler;
    const halfW = width / 2;
    const halfH = height / 2;
    for (let k = 0; k < posAttr.count; k++) {
      // Local plane coords -> tile-space corner coords (0..w, 0..h).
      const tileX = posAttr.getX(k) + halfW;
      const tileY = posAttr.getY(k) + halfH;
      const z = sampler.sampleVertex(Math.round(tileX), Math.round(tileY));
      posAttr.setZ(k, z);
    }
    posAttr.needsUpdate = true;
    geometry.computeVertexNormals();

    this._terrainMesh = new THREE.Mesh(geometry, material);
    this._terrainMesh.position.set(width / 2, height / 2, 0);
    this.worldGroup.add(this._terrainMesh);

    this._syncWorldTransform();
    this._emitViewportChanged();
  }

  updateTerrainTiles(changes) {
    if (!Array.isArray(changes) || changes.length === 0) return;
    this._terrainShader.updateTiles(changes, this._terrainData, this._heightmap);
    // Also keep local terrainData in sync
    for (const change of changes) {
      const x = change.x | 0;
      const y = change.y | 0;
      if (x < 0 || y < 0 || x >= this.mapWidth || y >= this.mapHeight) continue;
      const idx = y * this.mapWidth + x;
      if (this._terrainData) this._terrainData[idx] = change.terrain;
    }

    // Re-displace the terrain mesh vertices around each edited tile so
    // water/land toggles reshape the 3D surface live. Each tile touches
    // up to 4 vertices (the 4 corners), so we touch a small 2x2 block.
    if (this._terrainMesh && this._heightSampler) {
      const geo = this._terrainMesh.geometry;
      const posAttr = geo.attributes.position;
      const stride = this.mapWidth + 1;
      const sampler = this._heightSampler;
      const seen = new Set();
      for (const change of changes) {
        const x = change.x | 0;
        const y = change.y | 0;
        for (let dy = 0; dy <= 1; dy++) {
          for (let dx = 0; dx <= 1; dx++) {
            const vx = x + dx;
            const vy = y + dy;
            if (vx < 0 || vy < 0 || vx > this.mapWidth || vy > this.mapHeight) continue;
            // PlaneGeometry rows are stored top-row first (j=0 at +Y), so
            // vertex (vx, vy) maps to array index ((h - vy) * stride + vx).
            const arrayIdx = (this.mapHeight - vy) * stride + vx;
            if (seen.has(arrayIdx)) continue;
            seen.add(arrayIdx);
            posAttr.setZ(arrayIdx, sampler.sampleVertex(vx, vy));
          }
        }
      }
      posAttr.needsUpdate = true;
      geo.computeVertexNormals();
    }
  }

  /** World-space height (Z) at a tile coordinate, following the displaced terrain. */
  getTerrainHeightAt(x, y) {
    return this._heightSampler ? this._heightSampler.sampleAt(x, y) : 0;
  }

  /**
   * Terrain height directly under the orbit camera (clamped to the map),
   * used to keep the camera from crossing the terrain surface.
   */
  _groundUnderCamera() {
    if (!this._heightSampler || this.mapWidth <= 0 || this.mapHeight <= 0) return 0;
    const cx = Math.max(0, Math.min(this.mapWidth, this._orbitCamera3D.position.x));
    const cy = Math.max(0, Math.min(this.mapHeight, this._orbitCamera3D.position.y));
    return this._heightSampler.sampleAt(cx, cy);
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
    this._lastTick = tick || 0;
    // nativeRenderer/zoom are retained for API compatibility with the Pixi
    // renderer surface; Three.js reads zoom from this.camera directly.
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

    // Coalesce the per-entity rebuild into the next scheduled visibility
    // refresh instead of doing the same work twice per frame. The scheduler
    // already coordinates plant, item, and entity rebuilds together.
    this._scheduleVisibilityRefresh();
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
  }

  // ==================================================================
  // Selection
  // ==================================================================

  setSelectedEntity(id) {
    this._selectedEntityId = id;
    this._entityLayer.setSelectedId(id);
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
    this._entityLayer.setSelectedId(null);
    this._refreshSelectionMarker();
  }

  _refreshSelectionMarker() {
    if (!this._selectedTile) {
      if (this._selectionLine) this._selectionLine.visible = false;
      return;
    }

    const { x, y } = this._selectedTile;

    // Lazy-create a reusable unit-square LineLoop; avoid dispose+recreate per tile.
    if (!this._selectionLine) {
      const geometry = new THREE.BufferGeometry();
      const corners = new Float32Array([
        0.04, 0.04, 0,
        0.96, 0.04, 0,
        0.96, 0.96, 0,
        0.04, 0.96, 0,
      ]);
      geometry.setAttribute('position', new THREE.BufferAttribute(corners, 3));
      this._selectionMaterial = new THREE.LineBasicMaterial({
        color: 0xffdd44,
        transparent: true,
        opacity: 0.95,
        depthTest: false,
      });
      this._selectionLine = new THREE.LineLoop(geometry, this._selectionMaterial);
      this._selectionLine.renderOrder = 30;
      this.worldGroup.add(this._selectionLine);
    }

    // Stay flush with ground in orbit mode (was z=4, floated above terrain).
    this._selectionLine.position.set(x, y, 0.04);
    this._selectionLine.visible = true;
  }

  _updateBrushPreview() {
    const hover = this._input.lastHoverTile;
    const state = useSimStore.getState();
    if (!hover || state.tool !== 'PAINT_TERRAIN') {
      if (this._brushPreviewMesh) this._brushPreviewMesh.visible = false;
      this._brushPreviewSignature = '';
      return;
    }

    const brushSize = Math.max(1, state.brushSize || 1);
    const terrainType = state.paintTerrain || 0;
    const sig = `${hover.x}:${hover.y}:${brushSize}:${terrainType}`;
    if (sig === this._brushPreviewSignature && this._brushPreviewMesh?.visible) return;

    const tColor = TERRAIN_COLORS[terrainType] || [83, 168, 182, 255];
    const hexColor = (tColor[0] << 16) | (tColor[1] << 8) | tColor[2];
    const size = brushSize * 2 - 1;
    const startX = hover.x - brushSize + 1;
    const startY = hover.y - brushSize + 1;

    if (!this._brushPreviewMesh) {
      this._brushPreviewMaterial = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.2,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const geo = new THREE.PlaneGeometry(1, 1);
      this._brushPreviewMesh = new THREE.Mesh(geo, this._brushPreviewMaterial);
      this._brushPreviewMesh.renderOrder = 25;
      this.worldGroup.add(this._brushPreviewMesh);
    }

    this._brushPreviewMaterial.color.setHex(hexColor);
    // Flush with ground (was z=3, floated above terrain in orbit mode).
    this._brushPreviewMesh.position.set(startX + size / 2, startY + size / 2, 0.04);
    this._brushPreviewMesh.scale.set(size, size, 1);
    this._brushPreviewMesh.visible = true;
    this._brushPreviewSignature = sig;
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
    // Keep the 2D ortho camera in sync so toggling out of orbit lands on the
    // requested tile too.
    this.camera.centerOn(x, y);

    if (this._orbitControlsEnabled) {
      // Translate the orbit camera by the same delta applied to its target
      // — preserves zoom, rotation, and tilt. Without this the minimap
      // appears to do nothing in 3D (the underlying ortho moves but the
      // active perspective camera stays put).
      const target = this._orbitControls.target;
      const dx = x - target.x;
      const dy = y - target.y;
      target.x = x;
      target.y = y;
      this._orbitCamera3D.position.x += dx;
      this._orbitCamera3D.position.y += dy;
      clampCameraAboveGround(this._orbitCamera3D, this._groundUnderCamera());
      this._orbitControls.update();
      this._emitViewportChanged();
    }
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
    this._terrainShader.destroy();
    if (this._terrainMesh) {
      this.worldGroup.remove(this._terrainMesh);
      this._terrainMesh.geometry.dispose();
      this._terrainMesh = null;
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
      this._selectionLine = null;
    }
    if (this._selectionMaterial) {
      this._selectionMaterial.dispose();
      this._selectionMaterial = null;
    }

    // Brush preview
    if (this._brushPreviewMesh) {
      this.worldGroup.remove(this._brushPreviewMesh);
      this._brushPreviewMesh.geometry.dispose();
      this._brushPreviewMaterial.dispose();
      this._brushPreviewMesh = null;
      this._brushPreviewMaterial = null;
    }

    // WebGL
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
