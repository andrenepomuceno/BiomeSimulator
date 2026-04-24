import * as THREE from 'three';

/**
 * Pre-allocated Points object with fixed-capacity Float32 buffers.
 * Uses setDrawRange to control visible count — no geometry/material
 * allocation on every viewport change.
 */
export class ThreePointLayer {
  constructor(parentGroup, maxCount, size, z, opacity = 1) {
    this._parentGroup = parentGroup;
    this._maxCount = maxCount;

    const positions = new Float32Array(maxCount * 3);
    const colors = new Float32Array(maxCount * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setDrawRange(0, 0);
    this._posAttr = geometry.getAttribute('position');
    this._colAttr = geometry.getAttribute('color');

    const material = new THREE.PointsMaterial({
      size,
      vertexColors: true,
      transparent: true,
      opacity,
      depthTest: false,
      depthWrite: false,
      sizeAttenuation: false,
      // Points act as a colored mini-map overlay at any distance — they
      // must stay vivid and not fade into orbit fog.
      fog: false,
    });

    this._points = new THREE.Points(geometry, material);
    this._points.position.set(0, 0, z);
    this._points.renderOrder = 10 + z;
    parentGroup.add(this._points);
  }

  /** Overwrite buffer contents and adjust draw range. */
  update(positionsArr, colorsArr, size) {
    const posAttr = this._posAttr;
    const colAttr = this._colAttr;
    const count = positionsArr.length / 3;

    posAttr.array.set(positionsArr);
    colAttr.array.set(colorsArr);
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    this._points.geometry.setDrawRange(0, count);
    this._points.material.size = size;
  }

  /**
   * Zero-allocation update path. Returns the internal Float32Arrays so the
   * caller can write `count * 3` floats directly, then call `commit(count, size)`
   * to flip needsUpdate/drawRange. Avoids building throwaway JS arrays.
   */
  beginUpdate() {
    return {
      positions: this._posAttr.array,
      colors: this._colAttr.array,
      capacity: this._maxCount,
    };
  }

  commit(count, size) {
    this._posAttr.needsUpdate = true;
    this._colAttr.needsUpdate = true;
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
