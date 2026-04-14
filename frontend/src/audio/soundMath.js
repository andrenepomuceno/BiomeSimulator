export const MIN_AUDIBLE_RADIUS_TILES = 18;
export const MAX_AUDIBLE_RADIUS_TILES = 80;

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function getViewportCenter(viewport) {
  if (!viewport) return { x: 0, y: 0 };
  return {
    x: viewport.x + viewport.w / 2,
    y: viewport.y + viewport.h / 2,
  };
}

export function getAudibleRadius(viewport, baseRadius = MIN_AUDIBLE_RADIUS_TILES) {
  if (!viewport) return baseRadius;
  const diagonal = Math.hypot(viewport.w || 0, viewport.h || 0);
  return clamp(
    Math.max(baseRadius, diagonal * 0.75),
    baseRadius,
    MAX_AUDIBLE_RADIUS_TILES,
  );
}

export function computePositionalMix(source, viewport, baseRadius = MIN_AUDIBLE_RADIUS_TILES) {
  if (!source || !Number.isFinite(source.x) || !Number.isFinite(source.y)) {
    return {
      audible: false,
      gain: 0,
      pan: 0,
      distance: Infinity,
      audibleRadius: baseRadius,
    };
  }

  if (!viewport) {
    return {
      audible: true,
      gain: 1,
      pan: 0,
      distance: 0,
      audibleRadius: baseRadius,
    };
  }

  const center = getViewportCenter(viewport);
  const dx = source.x - center.x;
  const dy = source.y - center.y;
  const distance = Math.hypot(dx, dy);
  const audibleRadius = getAudibleRadius(viewport, baseRadius);
  const normalizedDistance = clamp(distance / audibleRadius, 0, 1);
  const distanceGain = normalizedDistance >= 1
    ? 0
    : Math.pow(1 - normalizedDistance, 1.6);
  const panRange = Math.max((viewport.w || 0) * 0.55, 10);
  const pan = clamp(dx / panRange, -1, 1);

  return {
    audible: distanceGain > 0.02,
    gain: distanceGain,
    pan,
    distance,
    audibleRadius,
    centerX: center.x,
    centerY: center.y,
  };
}