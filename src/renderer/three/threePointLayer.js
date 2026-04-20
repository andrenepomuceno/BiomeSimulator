import * as THREE from 'three';

/**
 * Pre-allocated Points object with fixed-capacity Float32 buffers.
 * Uses setDrawRange to control visible count — no geometry/material
 * allocation on every viewport change.
 */
export class ThreePointLayer {
  constructor(parentGroup, maxCount, size, z, opacity = 1) {
    this._parentGroup = parentGroup;

    const positions = new Float32Array(maxCount * 3);
    const colors = new Float32Array(maxCount * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setDrawRange(0, 0);

    const material = new THREE.PointsMaterial({
      size,
      vertexColors: true,
      transparent: true,
      opacity,
      depthTest: false,
      depthWrite: false,
      sizeAttenuation: false,
    });

    this._points = new THREE.Points(geometry, material);
    this._points.position.set(0, 0, z);
    this._points.renderOrder = 10 + z;
    parentGroup.add(this._points);
  }

  /** Overwrite buffer contents and adjust draw range. */
  update(positionsArr, colorsArr, size) {
    const posAttr = this._points.geometry.getAttribute('position');
    const colAttr = this._points.geometry.getAttribute('color');
    const count = positionsArr.length / 3;

    for (let i = 0, len = positionsArr.length; i < len; i++) {
      posAttr.array[i] = positionsArr[i];
      colAttr.array[i] = colorsArr[i];
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    this._points.geometry.setDrawRange(0, count);
    this._points.material.size = size;
  }

  /** Hide all points without disposing resources. */
  clear() {
    this._points.geometry.setDrawRange(0, 0);
  }

  destroy() {
    this._parentGroup.remove(this._points);
    this._points.geometry.dispose();
    this._points.material.dispose();
  }
}
