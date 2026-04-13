/**
 * GameRenderer — PixiJS Application init and layer management.
 */
import * as PIXI from 'pixi.js';
import { Camera } from './Camera';
import { TerrainLayer } from './TerrainLayer';
import { PlantLayer } from './PlantLayer';
import { EntityLayer } from './EntityLayer';
import { AnimationLayer } from './AnimationLayer';

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
    this.animationLayer = new AnimationLayer();
    this.entityLayer = new EntityLayer(this.animationLayer);

    this.worldContainer.addChild(this.terrainLayer.container);
    this.worldContainer.addChild(this.plantLayer.container);
    this.worldContainer.addChild(this.entityLayer.container);
    this.worldContainer.addChild(this.animationLayer.container);

    // Tile selection marker
    this._tileSelectionGfx = new PIXI.Graphics();
    this._tileSelectionGfx.visible = false;
    this._tileSelectionTick = 0;
    this.worldContainer.addChild(this._tileSelectionGfx);

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

    // Continuous selection marker update (works even when simulation is paused)
    this._selectedTile = null;
    this.app.ticker.add(() => {
      this.entityLayer._updateSelectionMarker();
      this._updateTileSelectionMarker();
      this.animationLayer.tick();
    });

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

    // Fruit spawn sparkles only in viewport (stage 5 = fruit)
    const vp = this.camera.getViewportTiles();
    const x1 = vp.x - 1, y1 = vp.y - 1;
    const x2 = vp.x + vp.w + 1, y2 = vp.y + vp.h + 1;
    let fruitCount = 0;
    for (const change of plantChanges) {
      if (change[3] === 5 && change[0] >= x1 && change[0] <= x2 && change[1] >= y1 && change[1] <= y2) {
        this.animationLayer.spawnFruit(change[0], change[1]);
        if (++fruitCount >= 30) break; // Cap per tick
      }
    }
  }

  updateEntities(animals) {
    this.entityLayer.update(animals);
  }

  setSelectedEntity(id) {
    this.entityLayer.setSelectedId(id);
    this._tileSelectionGfx.visible = false;
    this._selectedTile = null;
  }

  setSelectedTile(x, y) {
    this.entityLayer.setSelectedId(null);
    if (x == null || y == null) {
      this._tileSelectionGfx.visible = false;
      this._selectedTile = null;
    } else {
      this._selectedTile = { x, y };
      this._tileSelectionTick = 0;
      this._updateTileSelectionMarker();
    }
  }

  clearSelection() {
    this.entityLayer.setSelectedId(null);
    this._tileSelectionGfx.visible = false;
    this._selectedTile = null;
  }

  _updateTileSelectionMarker() {
    const gfx = this._tileSelectionGfx;
    if (!this._selectedTile) {
      gfx.visible = false;
      return;
    }
    this._tileSelectionTick++;
    // Only redraw every 4th tick for pulse animation
    if (this._tileSelectionTick % 4 !== 0 && gfx.visible) return;
    const pulse = 0.85 + 0.15 * Math.sin(this._tileSelectionTick * 0.1);

    gfx.clear();
    gfx.lineStyle(0.08 * pulse, 0xffdd44, 0.85);
    gfx.drawRect(
      this._selectedTile.x + 0.04,
      this._selectedTile.y + 0.04,
      0.92,
      0.92
    );
    gfx.visible = true;
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
