import * as THREE from 'three';

const ORBIT_MIN_POLAR_ANGLE = 0.15;
// ~50° from zenith — keeps the camera tilted but prevents it from descending
// toward the horizon (which overloads rendering and reveals LOD/fog cutoffs).
const ORBIT_MAX_POLAR_ANGLE = Math.PI * (50 / 180);
/** Minimum camera Z height above the ground plane. */
const MIN_CAMERA_HEIGHT = 4;

/**
 * Configure OrbitControls for the 3D orbit mode.
 *
 * Mouse binding convention: **RTS / City-Builder** (project standard).
 *   LEFT   = pan (primary map-exploration gesture)
 *   MIDDLE = dolly/zoom
 *   RIGHT  = rotate
 * This matches genre conventions players expect and is intentionally
 * the permanent default — do not change without project-wide agreement.
 */
export function configureOrbitControls(controls) {
  controls.enabled = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.15;
  controls.enablePan = true;
  controls.enableRotate = true;
  controls.enableZoom = true;
  controls.zoomSpeed = 1.4;
  controls.panSpeed = 1.4;
  controls.rotateSpeed = 0.6;
  controls.minPolarAngle = ORBIT_MIN_POLAR_ANGLE;
  controls.maxPolarAngle = ORBIT_MAX_POLAR_ANGLE;
  controls.screenSpacePanning = false;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.PAN,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.ROTATE,
  };
  controls.touches = {
    ONE: THREE.TOUCH.PAN,
    TWO: THREE.TOUCH.DOLLY_ROTATE,
  };
}

/**
 * Clamp the orbit camera position so it never goes below the ground plane.
 * Call this after OrbitControls.update() each frame.
 */
export function clampCameraAboveGround(camera) {
  if (camera.position.z < MIN_CAMERA_HEIGHT) {
    camera.position.z = MIN_CAMERA_HEIGHT;
  }
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
  const dist = clamp(diag * 0.68, 42, 500);
  return {
    dist,
    minDistance: Math.max(4, dist * 0.05),
    maxDistance: Math.min(1600, Math.max(500, dist * 5)),
    offsetY: dist * 0.48,
    offsetZ: dist * 0.62,
  };
}
