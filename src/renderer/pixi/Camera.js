/**
 * Camera — viewport control with pan, zoom, and tile coordinate conversion.
 */

const MIN_ZOOM = 1;
const MAX_ZOOM = 120;
const TILE_SIZE = 1; // 1 pixel per tile in the texture, scaled by zoom

export class Camera {
  constructor(worldContainer, screen, onChanged) {
    this.wc = worldContainer;
    this.screen = screen;
    this.onChanged = onChanged;

    this.zoom = 4;
    this.worldW = 1000;
    this.worldH = 1000;

    this.wc.scale.set(this.zoom);
  }

  setWorldBounds(w, h) {
    this.worldW = w;
    this.worldH = h;
    // Center the view
    this.centerOn(w / 2, h / 2);
  }

  pan(dx, dy) {
    this.wc.x += dx;
    this.wc.y += dy;
    this._clamp();
    this.onChanged();
  }

  onWheel(e) {
    e.preventDefault();
    const oldZoom = this.zoom;
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    this.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.zoom * factor));

    // Zoom toward mouse position
    const rect = e.target.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const worldX = (mx - this.wc.x) / oldZoom;
    const worldY = (my - this.wc.y) / oldZoom;

    this.wc.scale.set(this.zoom);
    this.wc.x = mx - worldX * this.zoom;
    this.wc.y = my - worldY * this.zoom;

    this._clamp();
    this.onChanged();
  }

  centerOn(tileX, tileY) {
    this.wc.x = this.screen.width / 2 - tileX * this.zoom;
    this.wc.y = this.screen.height / 2 - tileY * this.zoom;
    this._clamp();
    this.onChanged();
  }

  setZoom(z) {
    this.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
    this.wc.scale.set(this.zoom);
    this._clamp();
    this.onChanged();
  }

  screenToTile(screenX, screenY) {
    const tileX = Math.floor((screenX - this.wc.x) / this.zoom);
    const tileY = Math.floor((screenY - this.wc.y) / this.zoom);
    return { x: tileX, y: tileY };
  }

  getViewportTiles() {
    const x = Math.floor(-this.wc.x / this.zoom);
    const y = Math.floor(-this.wc.y / this.zoom);
    const w = Math.ceil(this.screen.width / this.zoom);
    const h = Math.ceil(this.screen.height / this.zoom);
    return { x, y, w, h };
  }

  _clamp() {
    // Allow some overpan but keep at least part of world visible
    const maxX = this.screen.width * 0.5;
    const maxY = this.screen.height * 0.5;
    const minX = this.screen.width * 0.5 - this.worldW * this.zoom;
    const minY = this.screen.height * 0.5 - this.worldH * this.zoom;

    this.wc.x = Math.max(minX, Math.min(maxX, this.wc.x));
    this.wc.y = Math.max(minY, Math.min(maxY, this.wc.y));
  }
}
