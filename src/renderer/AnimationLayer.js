/**
 * AnimationLayer — lightweight particle/tween effects rendered on top of entities.
 *
 * Supports: attack flashes, spawn pop-ins, death bursts, fruit sparkles, mating hearts.
 * All animations are purely visual — no game logic here.
 */
import * as PIXI from 'pixi.js';

// Animation types
const ANIM_ATTACK = 0;
const ANIM_SPAWN = 1;
const ANIM_DEATH = 2;
const ANIM_FRUIT = 3;
const ANIM_MATE = 4;
const ANIM_EAT = 5;
const ANIM_DRINK = 6;
const ANIM_FLEE = 7;
const ANIM_SLEEP = 8;

// Pool limits
const MAX_PARTICLES = 1200;

// Pre-built particle textures (created once lazily)
let _particleTextures = null;

function _buildParticleTextures() {
  if (_particleTextures) return _particleTextures;
  _particleTextures = {};

  // Small circle for generic particles
  const circleCanvas = document.createElement('canvas');
  circleCanvas.width = 16;
  circleCanvas.height = 16;
  const cctx = circleCanvas.getContext('2d');
  cctx.beginPath();
  cctx.arc(8, 8, 7, 0, Math.PI * 2);
  cctx.fillStyle = '#ffffff';
  cctx.fill();
  _particleTextures.circle = PIXI.Texture.from(circleCanvas);

  // Star burst
  const starCanvas = document.createElement('canvas');
  starCanvas.width = 24;
  starCanvas.height = 24;
  const sctx = starCanvas.getContext('2d');
  sctx.translate(12, 12);
  sctx.fillStyle = '#ffffff';
  for (let i = 0; i < 4; i++) {
    sctx.rotate(Math.PI / 4);
    sctx.fillRect(-1.5, -10, 3, 20);
  }
  _particleTextures.star = PIXI.Texture.from(starCanvas);

  // Heart emoji
  const heartCanvas = document.createElement('canvas');
  heartCanvas.width = 32;
  heartCanvas.height = 32;
  const hctx = heartCanvas.getContext('2d');
  hctx.font = '24px serif';
  hctx.textAlign = 'center';
  hctx.textBaseline = 'middle';
  hctx.fillText('❤️', 16, 16);
  _particleTextures.heart = PIXI.Texture.from(heartCanvas);

  // Sparkle
  const sparkCanvas = document.createElement('canvas');
  sparkCanvas.width = 16;
  sparkCanvas.height = 16;
  const spctx = sparkCanvas.getContext('2d');
  spctx.fillStyle = '#ffffff';
  spctx.translate(8, 8);
  spctx.fillRect(-1, -7, 2, 14);
  spctx.fillRect(-7, -1, 14, 2);
  _particleTextures.sparkle = PIXI.Texture.from(sparkCanvas);

  return _particleTextures;
}

/**
 * A single particle with position, velocity, life, color, scale.
 */
class Particle {
  constructor() {
    this.sprite = null;
    this.vx = 0;
    this.vy = 0;
    this.life = 0;
    this.maxLife = 0;
    this.scaleStart = 1;
    this.scaleEnd = 0;
    this.alphaStart = 1;
    this.alphaEnd = 0;
    this.active = false;
    this.gravity = 0;
  }
}

export class AnimationLayer {
  constructor() {
    this.container = new PIXI.Container();
    this._particles = [];
    this._pool = [];
    this._textures = null;
  }

  _ensureTextures() {
    if (this._textures) return;
    this._textures = _buildParticleTextures();
  }

  _acquire(texKey) {
    this._ensureTextures();
    let p;
    if (this._pool.length > 0) {
      p = this._pool.pop();
      p.sprite.texture = this._textures[texKey];
      p.sprite.visible = true;
    } else {
      if (this._particles.length >= MAX_PARTICLES) return null;
      p = new Particle();
      p.sprite = new PIXI.Sprite(this._textures[texKey]);
      p.sprite.anchor.set(0.5);
      this.container.addChild(p.sprite);
    }
    p.active = true;
    p.gravity = 0;
    p.sprite.tint = 0xffffff;
    p.sprite.rotation = 0;
    return p;
  }

  _release(p) {
    p.active = false;
    p.sprite.visible = false;
    this._pool.push(p);
  }

  /**
   * Spawn attack slash effect at position.
   */
  spawnAttack(x, y) {
    const cx = x;
    const cy = y;
    for (let i = 0; i < 10; i++) {
      const p = this._acquire('star');
      if (!p) break;
      const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.25;
      const speed = 0.011 + Math.random() * 0.02;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 0;
      p.maxLife = 44 + Math.random() * 20;
      p.scaleStart = 0.02 + Math.random() * 0.012;
      p.scaleEnd = 0.004;
      p.alphaStart = 1;
      p.alphaEnd = 0.05;
      p.sprite.x = cx;
      p.sprite.y = cy;
      p.sprite.tint = 0xff4444;
      p.sprite.rotation = angle;
      p.sprite.scale.set(p.scaleStart);
      p.sprite.alpha = 1;
      this._particles.push(p);
    }
  }

  /**
   * Spawn pop-in effect for a new animal birth.
   */
  spawnBirth(x, y) {
    const cx = x;
    const cy = y;
    // Expanding ring of circles
    for (let i = 0; i < 10; i++) {
      const p = this._acquire('circle');
      if (!p) break;
      const angle = (Math.PI * 2 * i) / 10;
      const speed = 0.01 + Math.random() * 0.008;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 0;
      p.maxLife = 48 + Math.random() * 18;
      p.scaleStart = 0.016 + Math.random() * 0.006;
      p.scaleEnd = 0.005;
      p.alphaStart = 1;
      p.alphaEnd = 0.05;
      p.sprite.x = cx;
      p.sprite.y = cy;
      p.sprite.tint = 0x88ff88;
      p.sprite.scale.set(p.scaleStart);
      p.sprite.alpha = 0.9;
      this._particles.push(p);
    }
  }

  /**
   * Spawn death burst.
   */
  spawnDeath(x, y) {
    const cx = x;
    const cy = y;
    for (let i = 0; i < 12; i++) {
      const p = this._acquire('circle');
      if (!p) break;
      const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.25;
      const speed = 0.008 + Math.random() * 0.02;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 0.01;
      p.gravity = 0.0007;
      p.life = 0;
      p.maxLife = 54 + Math.random() * 22;
      p.scaleStart = 0.014 + Math.random() * 0.01;
      p.scaleEnd = 0.003;
      p.alphaStart = 0.95;
      p.alphaEnd = 0.04;
      p.sprite.x = cx;
      p.sprite.y = cy;
      p.sprite.tint = 0x888888;
      p.sprite.scale.set(p.scaleStart);
      p.sprite.alpha = 0.85;
      this._particles.push(p);
    }
  }

  /**
   * Fruit sparkle effect.
   */
  spawnFruit(x, y) {
    const cx = x;
    const cy = y;
    for (let i = 0; i < 5; i++) {
      const p = this._acquire('sparkle');
      if (!p) break;
      p.vx = (Math.random() - 0.5) * 0.008;
      p.vy = -0.009 - Math.random() * 0.012;
      p.life = 0;
      p.maxLife = 42 + Math.random() * 20;
      p.scaleStart = 0.014 + Math.random() * 0.008;
      p.scaleEnd = 0.004;
      p.alphaStart = 1;
      p.alphaEnd = 0.06;
      p.sprite.x = cx + (Math.random() - 0.5) * 0.4;
      p.sprite.y = cy + (Math.random() - 0.5) * 0.4;
      p.sprite.tint = [0xffee44, 0xff6644, 0x44ddff, 0xff99cc, 0xaaff66][i % 5];
      p.sprite.scale.set(p.scaleStart);
      p.sprite.alpha = 1;
      this._particles.push(p);
    }
  }

  /**
   * Mating heart particles.
   */
  spawnMate(x, y) {
    const cx = x;
    const cy = y;
    for (let i = 0; i < 7; i++) {
      const p = this._acquire('heart');
      if (!p) break;
      p.vx = (Math.random() - 0.5) * 0.006;
      p.vy = -0.009 - Math.random() * 0.007;
      p.life = 0;
      p.maxLife = 52 + Math.random() * 24;
      p.scaleStart = 0.018 + Math.random() * 0.008;
      p.scaleEnd = 0.006;
      p.alphaStart = 1;
      p.alphaEnd = 0.07;
      p.sprite.x = cx + (Math.random() - 0.5) * 0.3;
      p.sprite.y = cy;
      p.sprite.tint = 0xff4488;
      p.sprite.scale.set(p.scaleStart);
      p.sprite.alpha = 1;
      this._particles.push(p);
    }
  }

  /**
   * Eating crumb particles.
   */
  spawnEat(x, y) {
    const cx = x;
    const cy = y;
    for (let i = 0; i < 5; i++) {
      const p = this._acquire('circle');
      if (!p) break;
      p.vx = (Math.random() - 0.5) * 0.02;
      p.vy = -0.004 - Math.random() * 0.008;
      p.gravity = 0.0012;
      p.life = 0;
      p.maxLife = 32 + Math.random() * 14;
      p.scaleStart = 0.009 + Math.random() * 0.006;
      p.scaleEnd = 0.003;
      p.alphaStart = 0.95;
      p.alphaEnd = 0.05;
      p.sprite.x = cx + (Math.random() - 0.5) * 0.3;
      p.sprite.y = cy;
      p.sprite.tint = 0x99cc55;
      p.sprite.scale.set(p.scaleStart);
      p.sprite.alpha = 0.9;
      this._particles.push(p);
    }
  }

  /**
   * Drinking water droplet particles.
   */
  spawnDrink(x, y) {
    const cx = x;
    const cy = y;
    for (let i = 0; i < 5; i++) {
      const p = this._acquire('circle');
      if (!p) break;
      p.vx = (Math.random() - 0.5) * 0.008;
      p.vy = -0.01 - Math.random() * 0.007;
      p.life = 0;
      p.maxLife = 32 + Math.random() * 16;
      p.scaleStart = 0.009 + Math.random() * 0.006;
      p.scaleEnd = 0.003;
      p.alphaStart = 0.95;
      p.alphaEnd = 0.05;
      p.sprite.x = cx + (Math.random() - 0.5) * 0.3;
      p.sprite.y = cy;
      p.sprite.tint = 0x44aaff;
      p.sprite.scale.set(p.scaleStart);
      p.sprite.alpha = 0.9;
      this._particles.push(p);
    }
  }

  /**
   * Fleeing dust puff particles.
   */
  spawnFlee(x, y) {
    const cx = x;
    const cy = y;
    for (let i = 0; i < 6; i++) {
      const p = this._acquire('circle');
      if (!p) break;
      p.vx = (Math.random() - 0.5) * 0.03;
      p.vy = -0.005 - Math.random() * 0.008;
      p.gravity = 0.0008;
      p.life = 0;
      p.maxLife = 28 + Math.random() * 14;
      p.scaleStart = 0.01 + Math.random() * 0.007;
      p.scaleEnd = 0.003;
      p.alphaStart = 0.82;
      p.alphaEnd = 0.05;
      p.sprite.x = cx + (Math.random() - 0.5) * 0.3;
      p.sprite.y = cy;
      p.sprite.tint = 0xccbb99;
      p.sprite.scale.set(p.scaleStart);
      p.sprite.alpha = 0.7;
      this._particles.push(p);
    }
  }

  /**
   * Sleeping Zzz sparkle (call sparingly — throttle externally).
   */
  spawnSleep(x, y) {
    const p = this._acquire('sparkle');
    if (!p) return;
    p.vx = (Math.random() - 0.5) * 0.004;
    p.vy = -0.006 - Math.random() * 0.004;
    p.life = 0;
    p.maxLife = 48 + Math.random() * 22;
    p.scaleStart = 0.01 + Math.random() * 0.005;
    p.scaleEnd = 0.003;
    p.alphaStart = 0.85;
    p.alphaEnd = 0.05;
    p.sprite.x = x + (Math.random() - 0.5) * 0.2;
    p.sprite.y = y - 0.3;
    p.sprite.tint = 0xaaaaff;
    p.sprite.scale.set(p.scaleStart);
    p.sprite.alpha = 0.75;
    this._particles.push(p);
  }

  /**
   * Advance all active particles by one frame.
   */
  tick() {
    let writeIdx = 0;
    for (let i = 0; i < this._particles.length; i++) {
      const p = this._particles[i];
      if (!p.active) continue;

      p.life++;
      if (p.life >= p.maxLife) {
        this._release(p);
        continue;
      }

      const t = p.life / p.maxLife;
      p.sprite.x += p.vx;
      p.sprite.y += p.vy;
      p.vy += p.gravity;
      p.sprite.scale.set(p.scaleStart + (p.scaleEnd - p.scaleStart) * t);
      p.sprite.alpha = p.alphaStart + (p.alphaEnd - p.alphaStart) * t;

      this._particles[writeIdx++] = p;
    }
    this._particles.length = writeIdx;
  }
}
