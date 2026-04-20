import useSimStore from '../../store/simulationStore.js';

/**
 * Encapsulates pointer, wheel, context-menu, and resize event handling
 * for the Three.js renderer. Binds all listeners on construction and
 * removes them on destroy().
 */
export class ThreeInputHandler {
  /**
   * @param {object} opts
   * @param {HTMLCanvasElement} opts.domElement
   * @param {HTMLElement} opts.container
   * @param {object} opts.camera         - ViewCamera instance
   * @param {Function} opts.screenToTile - (screenX, screenY) → {x,y}|null
   * @param {Function} opts.onTileClick  - (x, y) → void
   * @param {Function} opts.getMapSize   - () → { width, height }
   * @param {Function} opts.isOrbit      - () → boolean
   */
  constructor(opts) {
    this._domElement = opts.domElement;
    this._container = opts.container;
    this._camera = opts.camera;
    this._screenToTile = opts.screenToTile;
    this._onTileClick = opts.onTileClick;
    this._getMapSize = opts.getMapSize;
    this._isOrbit = opts.isOrbit;

    this._lastHoverTile = null;
    this._lastEntityBrushTile = null;
    this._isEntityBrushing = false;

    this._bindPointerEvents();
    this._bindWheelEvent();
    this._bindContextMenu();
    this._bindResize(opts.onResize);
  }

  get lastHoverTile() {
    return this._lastHoverTile;
  }

  // ---- Wheel ----

  _bindWheelEvent() {
    this._wheelHandler = (e) => {
      if (this._isOrbit()) return;
      this._camera.onWheel(e);
    };
    this._domElement.addEventListener('wheel', this._wheelHandler, { passive: false });
  }

  // ---- Context menu ----

  _bindContextMenu() {
    this._contextMenuHandler = (e) => {
      if (this._isOrbit()) e.preventDefault();
    };
    this._domElement.addEventListener('contextmenu', this._contextMenuHandler);
  }

  // ---- Pointer events ----

  _bindPointerEvents() {
    let dragging = false;
    let clickDown = false;
    let lastX = 0;
    let lastY = 0;
    let downX = 0;
    let downY = 0;

    this._pointerDownHandler = (e) => {
      if (this._isOrbit()) {
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
        if (e.button === 0 && tool !== 'SELECT') return;
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
      }
    };
    this._domElement.addEventListener('pointerdown', this._pointerDownHandler);

    this._pointerMoveHandler = (e) => {
      const rect = this._domElement.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      this._lastHoverTile = this._screenToTile(screenX, screenY);

      if (!dragging) return;

      if (this._isEntityBrushing) {
        const tile = this._lastHoverTile;
        if (!tile) return;
        const { width, height } = this._getMapSize();
        if (tile.x >= 0 && tile.y >= 0 && tile.x < width && tile.y < height) {
          const key = `${tile.x}:${tile.y}`;
          if (this._lastEntityBrushTile !== key) {
            this._lastEntityBrushTile = key;
            this._onTileClick?.(tile.x, tile.y);
          }
        }
        return;
      }

      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      this._camera.pan(dx, dy);
    };
    window.addEventListener('pointermove', this._pointerMoveHandler);

    this._pointerUpHandler = (e) => {
      if (!dragging && !clickDown) return;
      if (dragging) dragging = false;
      const wasClickDown = clickDown;
      clickDown = false;
      const dist = Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY);
      const { width, height } = this._getMapSize();

      if (this._isOrbit()) {
        if (wasClickDown && dist < 5 && this._onTileClick) {
          const rect = this._domElement.getBoundingClientRect();
          const tile = this._screenToTile(e.clientX - rect.left, e.clientY - rect.top);
          if (tile && tile.x >= 0 && tile.y >= 0 && tile.x < width && tile.y < height) {
            this._onTileClick(tile.x, tile.y);
          }
        }
        this._isEntityBrushing = false;
        this._lastEntityBrushTile = null;
        return;
      }

      if (wasClickDown && dist < 5 && this._onTileClick && !this._lastEntityBrushTile) {
        const rect = this._domElement.getBoundingClientRect();
        const tile = this._screenToTile(e.clientX - rect.left, e.clientY - rect.top);
        if (tile && tile.x >= 0 && tile.y >= 0 && tile.x < width && tile.y < height) {
          this._onTileClick(tile.x, tile.y);
        }
      }
      this._isEntityBrushing = false;
      this._lastEntityBrushTile = null;
    };
    window.addEventListener('pointerup', this._pointerUpHandler);
  }

  // ---- Resize ----

  _bindResize(onResize) {
    this._resizeObserver = new ResizeObserver(() => {
      onResize();
    });
    this._resizeObserver.observe(this._container);
  }

  // ---- Teardown ----

  destroy() {
    if (this._resizeObserver) this._resizeObserver.disconnect();
    this._domElement.removeEventListener('wheel', this._wheelHandler);
    this._domElement.removeEventListener('contextmenu', this._contextMenuHandler);
    this._domElement.removeEventListener('pointerdown', this._pointerDownHandler);
    window.removeEventListener('pointermove', this._pointerMoveHandler);
    window.removeEventListener('pointerup', this._pointerUpHandler);
  }
}
