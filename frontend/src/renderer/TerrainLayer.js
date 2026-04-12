/**
 * TerrainLayer — renders the terrain grid as a single texture.
 */
import * as PIXI from 'pixi.js';
import { TERRAIN_COLORS } from '../utils/terrainColors';

export class TerrainLayer {
  constructor() {
    this.container = new PIXI.Container();
    this.sprite = null;
    this.width = 0;
    this.height = 0;
    this._pixels = null;
  }

  setTerrain(terrainData, width, height) {
    this.width = width;
    this.height = height;

    // terrainData is a Uint8Array of terrain type values (1 byte per tile)
    const pixels = new Uint8Array(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      const t = terrainData[i];
      const color = TERRAIN_COLORS[t] || [0, 0, 0, 255];
      const pi = i * 4;
      pixels[pi] = color[0];
      pixels[pi + 1] = color[1];
      pixels[pi + 2] = color[2];
      pixels[pi + 3] = color[3];
    }
    this._pixels = pixels;

    // Create texture from pixel data
    const resource = new PIXI.BufferResource(pixels, { width, height });
    const baseTexture = new PIXI.BaseTexture(resource, {
      format: PIXI.FORMATS.RGBA,
      type: PIXI.TYPES.UNSIGNED_BYTE,
      scaleMode: PIXI.SCALE_MODES.NEAREST,
      width,
      height,
    });
    const texture = new PIXI.Texture(baseTexture);

    if (this.sprite) {
      this.container.removeChild(this.sprite);
      this.sprite.destroy();
    }

    this.sprite = new PIXI.Sprite(texture);
    this.container.addChild(this.sprite);
  }

  /**
   * Update individual terrain tiles (for editor).
   */
  updateTiles(changes) {
    if (!this._pixels || !this.sprite) return;

    for (const { x, y, terrain } of changes) {
      const i = (y * this.width + x) * 4;
      const color = TERRAIN_COLORS[terrain] || [0, 0, 0, 255];
      this._pixels[i] = color[0];
      this._pixels[i + 1] = color[1];
      this._pixels[i + 2] = color[2];
      this._pixels[i + 3] = color[3];
    }

    // Re-upload texture
    this.sprite.texture.baseTexture.resource.data = this._pixels;
    this.sprite.texture.baseTexture.resource.update();
    this.sprite.texture.baseTexture.update();
  }
}
