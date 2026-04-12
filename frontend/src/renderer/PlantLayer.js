/**
 * PlantLayer — renders plants as a texture overlay with delta updates.
 */
import * as PIXI from 'pixi.js';
import { PLANT_COLORS } from '../utils/terrainColors';

export class PlantLayer {
  constructor() {
    this.container = new PIXI.Container();
    this.sprite = null;
    this.width = 0;
    this.height = 0;
    this._pixels = null;
    this._baseTexture = null;
  }

  init(width, height) {
    this.width = width;
    this.height = height;
    this._pixels = new Uint8Array(width * height * 4); // all transparent

    const resource = new PIXI.BufferResource(this._pixels, { width, height });
    this._baseTexture = new PIXI.BaseTexture(resource, {
      format: PIXI.FORMATS.RGBA,
      type: PIXI.TYPES.UNSIGNED_BYTE,
      scaleMode: PIXI.SCALE_MODES.NEAREST,
      width,
      height,
    });
    const texture = new PIXI.Texture(this._baseTexture);

    if (this.sprite) {
      this.container.removeChild(this.sprite);
      this.sprite.destroy();
    }

    this.sprite = new PIXI.Sprite(texture);
    this.container.addChild(this.sprite);
  }

  /**
   * Apply plant changes: array of [x, y, plantType, stage]
   */
  applyChanges(changes) {
    if (!this._pixels || !changes || changes.length === 0) return;

    for (const change of changes) {
      const [x, y, ptype, stage] = change;
      const i = (y * this.width + x) * 4;

      if (ptype === 0 || stage === 0 || stage === 5) {
        // No plant or dead — transparent
        this._pixels[i] = 0;
        this._pixels[i + 1] = 0;
        this._pixels[i + 2] = 0;
        this._pixels[i + 3] = 0;
      } else {
        const key = `${ptype}_${stage}`;
        const color = PLANT_COLORS[key] || [100, 200, 100, 150];
        this._pixels[i] = color[0];
        this._pixels[i + 1] = color[1];
        this._pixels[i + 2] = color[2];
        this._pixels[i + 3] = color[3];
      }
    }

    // Re-upload texture
    if (this._baseTexture && this._baseTexture.resource) {
      this._baseTexture.resource.data = this._pixels;
      this._baseTexture.resource.update();
      this._baseTexture.update();
    }
  }

  /**
   * Full plant grid update from initial load using flat binary arrays.
   */
  setFromArrays(types, stages, width, height) {
    if (!this._pixels) return;
    this._pixels.fill(0);

    for (let i = 0; i < types.length; i++) {
      const t = types[i];
      const s = stages[i];
      if (t === 0 || s === 0 || s === 5) continue;
      const key = `${t}_${s}`;
      const color = PLANT_COLORS[key] || [100, 200, 100, 150];
      const pi = i * 4;
      this._pixels[pi] = color[0];
      this._pixels[pi + 1] = color[1];
      this._pixels[pi + 2] = color[2];
      this._pixels[pi + 3] = color[3];
    }

    if (this._baseTexture && this._baseTexture.resource) {
      this._baseTexture.resource.data = this._pixels;
      this._baseTexture.resource.update();
      this._baseTexture.update();
    }
  }
}
