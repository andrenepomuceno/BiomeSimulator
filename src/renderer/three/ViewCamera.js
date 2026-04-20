import { MIN_ZOOM, MAX_ZOOM, clamp } from './rendererConfig.js';

export class ViewCamera {
  constructor(screen, onChanged) {
    this.screen = screen;
    this.onChanged = onChanged;
    this.zoom = 4;
    this.worldW = 1000;
    this.worldH = 1000;
    this.centerX = this.worldW / 2;
    this.centerY = this.worldH / 2;
    this.rotation = 0;
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

  setRotation(angle) {
    this.rotation = angle;
    this._clampCenter();
    this.onChanged?.();
  }

  rotateBy(delta) {
    this.setRotation(this.rotation + delta);
  }

  resetRotation() {
    this.setRotation(0);
  }

  onWheel(event) {
    event.preventDefault();
    const oldZoom = this.zoom;
    const factor = event.deltaY < 0 ? 1.18 : 1 / 1.18;
    this.zoom = clamp(this.zoom * factor, MIN_ZOOM, MAX_ZOOM);

    const rect = event.target.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;

    const before = this.screenToWorld(mx, my, oldZoom, this.rotation);
    const after = this.screenToWorld(mx, my, this.zoom, this.rotation);
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

  screenToWorld(screenX, screenY, zoomOverride = null, rotationOverride = null) {
    const zoom = zoomOverride ?? this.zoom;
    const rotation = rotationOverride ?? this.rotation;
    const viewportW = this.screen.width / zoom;
    const viewportH = this.screen.height / zoom;
    const localX = screenX / zoom - viewportW / 2;
    const localY = screenY / zoom - viewportH / 2;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    return {
      x: this.centerX + (cos * localX + sin * localY),
      y: this.centerY + (-sin * localX + cos * localY),
    };
  }

  screenToTile(screenX, screenY, zoomOverride = null) {
    const world = this.screenToWorld(screenX, screenY, zoomOverride, null);
    return {
      x: Math.floor(world.x),
      y: Math.floor(world.y),
    };
  }

  getViewportWorldBounds(extra = 0) {
    const c0 = this.screenToWorld(0, 0);
    const c1 = this.screenToWorld(this.screen.width, 0);
    const c2 = this.screenToWorld(this.screen.width, this.screen.height);
    const c3 = this.screenToWorld(0, this.screen.height);
    const minX = Math.min(c0.x, c1.x, c2.x, c3.x) - extra;
    const maxX = Math.max(c0.x, c1.x, c2.x, c3.x) + extra;
    const minY = Math.min(c0.y, c1.y, c2.y, c3.y) - extra;
    const maxY = Math.max(c0.y, c1.y, c2.y, c3.y) + extra;
    return { minX, maxX, minY, maxY };
  }

  getViewportTiles() {
    const bounds = this.getViewportWorldBounds(0);
    const x = Math.floor(bounds.minX);
    const y = Math.floor(bounds.minY);
    const w = Math.max(1, Math.ceil(bounds.maxX - bounds.minX));
    const h = Math.max(1, Math.ceil(bounds.maxY - bounds.minY));
    return {
      x,
      y,
      w,
      h,
    };
  }

  _clampCenter() {
    const viewportW = this.screen.width / this.zoom;
    const viewportH = this.screen.height / this.zoom;
    const cos = Math.abs(Math.cos(this.rotation));
    const sin = Math.abs(Math.sin(this.rotation));
    const halfW = (cos * viewportW + sin * viewportH) / 2;
    const halfH = (sin * viewportW + cos * viewportH) / 2;
    this.centerX = clamp(this.centerX, halfW, Math.max(halfW, this.worldW - halfW));
    this.centerY = clamp(this.centerY, halfH, Math.max(halfH, this.worldH - halfH));
  }
}
