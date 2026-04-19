import * as THREE from 'three';
import { TERRAIN_COLORS } from '../utils/terrainColors.js';
import { PLANT_COLORS } from '../utils/terrainColors.js';
import { buildAnimalColorMap } from '../engine/animalSpecies.js';
import useSimStore from '../store/simulationStore.js';

const MIN_ZOOM = 1;
const MAX_ZOOM = 120;
const MAX_VISIBLE_PLANT_POINTS = 18000;
const MAX_VISIBLE_ENTITY_POINTS = 5000;
const MAX_VISIBLE_ITEM_POINTS = 5000;

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
    this._itemsById = new Map();

    this._plantPoints = null;
    this._itemPoints = null;
    this._entityPoints = null;
    this._selectionLine = null;

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
      this.renderer.render(this.scene, this.camera3D);
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
    texture.flipY = true;
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

  _scheduleVisibilityRefresh() {
    if (this._refreshQueued) return;
    this._refreshQueued = true;
    requestAnimationFrame(() => {
      this._refreshQueued = false;
      this._rebuildPlantPoints();
      this._rebuildItemPoints();
      this._rebuildEntityPoints();
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
      if (!a || a.alive === false) continue;
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
    if (!Array.isArray(plantChanges) || plantChanges.length === 0 || !this._plantType || !this._plantStage) return;
    for (const change of plantChanges) {
      const [x, y, ptype, stage] = change;
      if (x < 0 || y < 0 || x >= this.mapWidth || y >= this.mapHeight) continue;
      const idx = y * this.mapWidth + x;
      this._plantType[idx] = ptype;
      this._plantStage[idx] = stage;
    }
    this._rebuildPlantPoints();
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
    this._animals = Array.isArray(animals) ? animals : [];
    void nativeRenderer;
    void tick;
    void zoom;
    this._rebuildEntityPoints();
    this._refreshSelectionMarker();
  }

  updateDayNight(clock) {
    const alpha = clock?.is_night ? 0.15 : 0;
    const base = 0x0a0a1a;
    const tint = 0x0a0a3e;
    const color = alpha > 0
      ? ((base & 0xfefefe) >> 1) + ((tint & 0xfefefe) >> 1)
      : base;
    this.renderer.setClearColor(color, 1);
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
