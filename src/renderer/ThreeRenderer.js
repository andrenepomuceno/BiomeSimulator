import * as THREE from 'three';
import { TERRAIN_COLORS } from '../utils/terrainColors.js';

const MIN_ZOOM = 1;
const MAX_ZOOM = 120;

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
      updateTiles: () => {},
    };
    this.plantLayer = {
      setFromArrays: () => {},
    };

    this.mapWidth = 0;
    this.mapHeight = 0;
    this._terrainMesh = null;
    this._terrainTexture = null;

    this._selectedTile = null;
    this._selectedEntityId = null;
    this._lastHoverTile = null;

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
      if (dist < 5 && this.onTileClick && this._lastHoverTile) {
        const { x, y } = this._lastHoverTile;
        if (x >= 0 && y >= 0 && x < this.mapWidth && y < this.mapHeight) {
          this.onTileClick(x, y);
        }
      }
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
    return texture;
  }

  setTerrain(terrainData, width, height) {
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
    void plantType;
    void plantStage;
    void width;
    void height;
  }

  updatePlants(plantChanges) {
    void plantChanges;
  }

  updateItems(itemChanges) {
    void itemChanges;
  }

  setItems(items) {
    void items;
  }

  updateEntities(animals, nativeRenderer, tick, zoom) {
    void animals;
    void nativeRenderer;
    void tick;
    void zoom;
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
    this._selectedTile = null;
  }

  setSelectedTile(x, y) {
    if (x == null || y == null) {
      this._selectedTile = null;
    } else {
      this._selectedTile = { x, y };
    }
    this._selectedEntityId = null;
  }

  clearSelection() {
    this._selectedEntityId = null;
    this._selectedTile = null;
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
    void changes;
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

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
