/**
 * GameRenderer — PixiJS Application init and layer management.
 */
import * as PIXI from 'pixi.js';
import { Camera } from './Camera';
import { TerrainLayer } from './TerrainLayer';
import { PlantLayer } from './PlantLayer';
import { EntityLayer } from './EntityLayer';

export class GameRenderer {
  constructor(container, onViewportChange, onTileClick) {
    this.container = container;
    this.onViewportChange = onViewportChange;
    this.onTileClick = onTileClick;

    this.app = new PIXI.Application({
      resizeTo: container,
      backgroundColor: 0x0a0a1a,
      antialias: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    container.appendChild(this.app.view);

    // World container (panned/zoomed)
    this.worldContainer = new PIXI.Container();
    this.app.stage.addChild(this.worldContainer);

    // Night overlay
    this.nightOverlay = new PIXI.Graphics();
    this.nightOverlay.alpha = 0;
    this.app.stage.addChild(this.nightOverlay);

    // Layers
    this.terrainLayer = new TerrainLayer();
    this.plantLayer = new PlantLayer();
    this.entityLayer = new EntityLayer();

    this.worldContainer.addChild(this.terrainLayer.container);
    this.worldContainer.addChild(this.plantLayer.container);
    this.worldContainer.addChild(this.entityLayer.container);

    // Camera
    this.camera = new Camera(this.worldContainer, this.app.screen, () => {
      this._onViewportChanged();
    });

    this.mapWidth = 0;
    this.mapHeight = 0;

    // Input handling
    this.app.view.addEventListener('wheel', (e) => this.camera.onWheel(e), { passive: false });
    this._setupDrag();
    this._setupClick();

    // Resize handling
    this._resizeObserver = new ResizeObserver(() => {
      this.app.resize();
      this._updateNightOverlay();
      this._onViewportChanged();
    });
    this._resizeObserver.observe(container);
  }

  setTerrain(terrainData, width, height) {
    this.mapWidth = width;
    this.mapHeight = height;
    this.terrainLayer.setTerrain(terrainData, width, height);
    this.plantLayer.init(width, height);
    this.camera.setWorldBounds(width, height);
    this._onViewportChanged();
  }

  updatePlants(plantChanges) {
    this.plantLayer.applyChanges(plantChanges);
    this._updatePlantEmojis();
  }

  updateEntities(animals) {
    this.entityLayer.update(animals);
  }

  setNight(isNight) {
    const targetAlpha = isNight ? 0.35 : 0;
    // Simple lerp
    this.nightOverlay.alpha += (targetAlpha - this.nightOverlay.alpha) * 0.1;
    this._updateNightOverlay();
  }

  _updateNightOverlay() {
    const { width, height } = this.app.screen;
    this.nightOverlay.clear();
    this.nightOverlay.beginFill(0x0a0a3e);
    this.nightOverlay.drawRect(0, 0, width, height);
    this.nightOverlay.endFill();
  }

  _onViewportChanged() {
    const vp = this.camera.getViewportTiles();
    if (this.onViewportChange) {
      this.onViewportChange(vp);
    }
    this._updatePlantEmojis();
  }

  _updatePlantEmojis() {
    const vp = this.camera.getViewportTiles();
    this.plantLayer.updateEmojis(vp.x, vp.y, vp.w, vp.h, this.camera.zoom);
  }

  _setupDrag() {
    let dragging = false;
    let lastX = 0, lastY = 0;

    this.app.view.addEventListener('pointerdown', (e) => {
      if (e.button === 0 || e.button === 1) {
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      this.camera.pan(dx, dy);
    });

    window.addEventListener('pointerup', () => {
      dragging = false;
    });
  }

  _setupClick() {
    let downX = 0, downY = 0;

    this.app.view.addEventListener('pointerdown', (e) => {
      downX = e.clientX;
      downY = e.clientY;
    });

    this.app.view.addEventListener('pointerup', (e) => {
      // Only count as click if didn't drag
      const dist = Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY);
      if (dist < 5 && this.onTileClick) {
        const rect = this.app.view.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const tileCoords = this.camera.screenToTile(screenX, screenY);
        if (tileCoords.x >= 0 && tileCoords.y >= 0 &&
            tileCoords.x < this.mapWidth && tileCoords.y < this.mapHeight) {
          this.onTileClick(tileCoords.x, tileCoords.y);
        }
      }
    });
  }

  getViewportTiles() {
    return this.camera.getViewportTiles();
  }

  centerOn(x, y) {
    this.camera.centerOn(x, y);
  }

  destroy() {
    this._resizeObserver.disconnect();
    this.app.destroy(true, { children: true });
  }
}
