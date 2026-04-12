/**
 * EntityLayer — renders animals as colored circles using a PixiJS sprite pool.
 */
import * as PIXI from 'pixi.js';
import { ANIMAL_COLORS } from '../utils/terrainColors';

// Pre-generate circle textures
function makeCircleTexture(renderer, color, radius) {
  const g = new PIXI.Graphics();
  g.beginFill(color);
  g.drawCircle(radius, radius, radius);
  g.endFill();
  // Outline
  g.lineStyle(0.3, 0xffffff, 0.5);
  g.drawCircle(radius, radius, radius);
  return renderer ? renderer.generateTexture(g) : null;
}

export class EntityLayer {
  constructor() {
    this.container = new PIXI.Container();
    this._sprites = new Map(); // id → PIXI.Sprite
    this._textures = {};
    this._texturesReady = false;
  }

  _ensureTextures(renderer) {
    if (this._texturesReady) return;
    for (const [species, color] of Object.entries(ANIMAL_COLORS)) {
      this._textures[species] = makeCircleTexture(renderer, color, 4);
    }
    // Sleeping texture (gray)
    this._textures['SLEEPING'] = makeCircleTexture(renderer, 0x888888, 4);
    this._texturesReady = true;
  }

  /**
   * Update all visible animals.
   * @param {Array} animals - [{id, x, y, species, state, energy}, ...]
   * @param {PIXI.Renderer} renderer - for texture generation
   */
  update(animals, renderer) {
    if (renderer) {
      this._ensureTextures(renderer);
    }

    const seen = new Set();

    for (const a of animals) {
      seen.add(a.id);
      let sprite = this._sprites.get(a.id);

      if (!sprite) {
        // Create new sprite
        const texKey = a.state === 5 ? 'SLEEPING' : a.species;
        const tex = this._textures[texKey] || this._textures['HERBIVORE'];
        if (!tex) continue;
        sprite = new PIXI.Sprite(tex);
        sprite.anchor.set(0.5);
        sprite.scale.set(0.25);
        this.container.addChild(sprite);
        this._sprites.set(a.id, sprite);
      }

      // Update position (center of tile)
      sprite.x = a.x + 0.5;
      sprite.y = a.y + 0.5;

      // Update tint based on state
      if (a.state === 5) { // sleeping
        sprite.alpha = 0.5;
      } else if (a.state === 9) { // dead
        sprite.alpha = 0.2;
      } else {
        sprite.alpha = 1;
      }

      // Scale by energy
      const scale = 0.15 + (a.energy / 200) * 0.2;
      sprite.scale.set(scale);
    }

    // Remove sprites for animals no longer visible
    for (const [id, sprite] of this._sprites) {
      if (!seen.has(id)) {
        this.container.removeChild(sprite);
        sprite.destroy();
        this._sprites.delete(id);
      }
    }
  }
}
