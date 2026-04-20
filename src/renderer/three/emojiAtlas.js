import * as THREE from 'three';

/**
 * Shared emoji-to-CanvasTexture cache used by plant, item, and entity layers.
 * One global instance is shared to avoid creating duplicate canvases for the
 * same emoji across layers.
 */
export class ThreeEmojiAtlas {
  constructor() {
    this._cache = new Map();
  }

  get(emoji) {
    const existing = this._cache.get(emoji);
    if (existing) return existing;

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 64, 64);
    ctx.font = '52px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 32, 34);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    this._cache.set(emoji, texture);
    return texture;
  }

  destroy() {
    for (const texture of this._cache.values()) texture.dispose();
    this._cache.clear();
  }
}
