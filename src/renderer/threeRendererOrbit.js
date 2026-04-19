import * as THREE from 'three';

const ORBIT_MIN_POLAR_ANGLE = 0;
const ORBIT_MAX_POLAR_ANGLE = Math.PI / 2 - 0.02;

export function configureOrbitControls(controls) {
  controls.enabled = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = true;
  controls.enableRotate = true;
  controls.enableZoom = true;
  controls.minPolarAngle = ORBIT_MIN_POLAR_ANGLE;
  controls.maxPolarAngle = ORBIT_MAX_POLAR_ANGLE;
  controls.screenSpacePanning = false;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  };
  controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN,
  };
}

export function buildOrbitViewportBounds(samples, mapWidth, mapHeight, extra = 0) {
  if (!samples || samples.length === 0) {
    return { x0: 0, y0: 0, x1: mapWidth, y1: mapHeight };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const p of samples) {
    if (!p) continue;
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  const x0 = Math.max(0, Math.floor(minX - extra));
  const y0 = Math.max(0, Math.floor(minY - extra));
  const x1 = Math.min(mapWidth, Math.ceil(maxX + extra));
  const y1 = Math.min(mapHeight, Math.ceil(maxY + extra));

  if (x1 <= x0 || y1 <= y0) {
    return { x0: 0, y0: 0, x1: mapWidth, y1: mapHeight };
  }

  return { x0, y0, x1, y1 };
}

export function buildOrbitCameraPreset(vp, clamp) {
  const diag = Math.hypot(vp.w, vp.h);
  const dist = clamp(diag * 0.68, 42, 300);
  return {
    dist,
    minDistance: Math.max(14, dist * 0.2),
    maxDistance: Math.max(220, dist * 5),
    offsetY: dist * 0.48,
    offsetZ: dist * 0.62,
  };
}
