import * as THREE from 'three';

/**
 * Generic pooled-sprite manager for emoji-based THREE.Sprite objects.
 * Handles acquire, release, texture swapping, and full cleanup.
 *
 * Used by plant, item, and entity layers to avoid duplicating the
 * same acquire/release/dispose pattern.
 */
export class ThreeSpritePool {
  constructor(parentGroup, emojiAtlas) {
    this._parentGroup = parentGroup;
    this._emojiAtlas = emojiAtlas;
    this._active = new Map();   // key → THREE.Sprite
    this._pool = [];            // available sprites
  }

  /** Get or create a sprite for `key`, assign the given emoji texture. */
  acquire(key, emoji) {
    let sprite = this._active.get(key);
    if (!sprite) {
      if (this._pool.length > 0) {
        sprite = this._pool.pop();
        sprite.visible = true;
      } else {
        const material = new THREE.SpriteMaterial({
          transparent: true,
          depthTest: false,
          depthWrite: false,
        });
        sprite = new THREE.Sprite(material);
        this._parentGroup.add(sprite);
      }
      this._active.set(key, sprite);
    }
    const tex = this._emojiAtlas.get(emoji);
    if (sprite.material.map !== tex) {
      sprite.material.map = tex;
      sprite.material.needsUpdate = true;
    }
    return sprite;
  }

  /** Return a sprite to the pool for reuse. */
  release(key) {
    const sprite = this._active.get(key);
    if (!sprite) return;
    sprite.visible = false;
    this._pool.push(sprite);
    this._active.delete(key);
  }

  /** Release all sprites whose keys are NOT in `keepSet`. */
  prune(keepSet) {
    for (const [key, sprite] of this._active) {
      if (!keepSet.has(key)) {
        sprite.visible = false;
        this._pool.push(sprite);
        this._active.delete(key);
      }
    }
  }

  /** Release every active sprite back to the pool. */
  releaseAll() {
    for (const [key, sprite] of this._active) {
      sprite.visible = false;
      this._pool.push(sprite);
    }
    this._active.clear();
  }

  has(key) {
    return this._active.has(key);
  }

  get(key) {
    return this._active.get(key);
  }

  destroy() {
    for (const sprite of this._active.values()) {
      this._parentGroup.remove(sprite);
      sprite.material.dispose();
    }
    for (const sprite of this._pool) {
      this._parentGroup.remove(sprite);
      sprite.material.dispose();
    }
    this._active.clear();
    this._pool.length = 0;
  }
}
