import * as THREE from 'three';
import { MAX_PARTICLES, PARTICLE_DEFS } from './threeRendererConfig.js';

/**
 * Self-contained particle system rendered as a single Points object.
 * Owns its own geometry, material, and Float32 buffers.
 */
export class ThreeParticleSystem {
  constructor(parentGroup) {
    this._parentGroup = parentGroup;
    this._list = [];

    const max = MAX_PARTICLES;
    this._positions = new Float32Array(max * 3);
    this._colors = new Float32Array(max * 3);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this._positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this._colors, 3));
    geo.setDrawRange(0, 0);
    this._geometry = geo;

    this._material = new THREE.PointsMaterial({
      size: 5,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      depthTest: false,
      depthWrite: false,
      sizeAttenuation: false,
    });

    this._points = new THREE.Points(geo, this._material);
    this._points.renderOrder = 200;
    parentGroup.add(this._points);
  }

  spawn(type, wx, wy) {
    const def = PARTICLE_DEFS[type];
    if (!def) return;
    const remaining = MAX_PARTICLES - this._list.length;
    const count = Math.min(def.count, remaining);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = def.speed * (0.7 + Math.random() * 0.6);
      this._list.push({
        x: wx + (Math.random() - 0.5) * 0.3,
        y: wy + (Math.random() - 0.5) * 0.3,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: def.gravity,
        life: 0,
        maxLife: def.maxLife * (0.8 + Math.random() * 0.4),
        r: ((def.color >> 16) & 0xff) / 255,
        g: ((def.color >> 8) & 0xff) / 255,
        b: (def.color & 0xff) / 255,
      });
    }
  }

  tick() {
    const list = this._list;
    if (list.length === 0) {
      if (this._geometry.drawRange.count !== 0) {
        this._geometry.setDrawRange(0, 0);
      }
      return;
    }

    let writeIdx = 0;
    let i = 0;
    while (i < list.length) {
      const p = list[i];
      p.life++;
      p.vx *= 0.93;
      p.vy = p.vy * 0.93 + p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      if (p.life >= p.maxLife) {
        list[i] = list[list.length - 1];
        list.pop();
        continue;
      }
      const t = p.life / p.maxLife;
      const alpha = 1 - t;
      const pi = writeIdx * 3;
      this._positions[pi] = p.x;
      this._positions[pi + 1] = p.y;
      this._positions[pi + 2] = 4;
      this._colors[pi] = p.r * alpha;
      this._colors[pi + 1] = p.g * alpha;
      this._colors[pi + 2] = p.b * alpha;
      writeIdx++;
      i++;
    }
    this._geometry.attributes.position.needsUpdate = true;
    this._geometry.attributes.color.needsUpdate = true;
    this._geometry.setDrawRange(0, writeIdx);
  }

  destroy() {
    this._parentGroup.remove(this._points);
    this._material.dispose();
    this._geometry.dispose();
    this._list.length = 0;
  }
}
