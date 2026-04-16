export const MIN_AUDIBLE_RADIUS_TILES = 18;
export const MAX_AUDIBLE_RADIUS_TILES = 80;
export const POSITIONAL_SFX_MUTE_ZOOM_THRESHOLD = 2.5;
const POSITIONAL_SFX_FULL_ZOOM = 4;
const POSITIONAL_SFX_MIN_ZOOM = 1.8;

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
  if (!viewport || !Number.isFinite(viewport.zoom)) return baseRadius;
  const zoomNorm = clamp(
    (viewport.zoom - POSITIONAL_SFX_MIN_ZOOM) / (POSITIONAL_SFX_FULL_ZOOM - POSITIONAL_SFX_MIN_ZOOM),
    0,
    1,
  );
  const radiusScale = 0.65 + zoomNorm * 0.75;
  return clamp(
    baseRadius * radiusScale,
    baseRadius * 0.6,
    MAX_AUDIBLE_RADIUS_TILES,
  );
}

export function computeZoomAttenuation(viewport) {
  if (!viewport || !Number.isFinite(viewport.zoom)) return 1;
  if (viewport.zoom >= POSITIONAL_SFX_FULL_ZOOM) return 1;
  if (viewport.zoom <= POSITIONAL_SFX_MIN_ZOOM) return 0;

  const t = clamp(
    (viewport.zoom - POSITIONAL_SFX_MIN_ZOOM) / (POSITIONAL_SFX_FULL_ZOOM - POSITIONAL_SFX_MIN_ZOOM),
    0,
    1,
  );
  // Smoothstep for gradual onset and rollout (no audible step edges).
  return t * t * (3 - 2 * t);
}

export function shouldMutePositionalSfx(viewport) {
  return computeZoomAttenuation(viewport) <= 0.02;
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
  const zoomGain = computeZoomAttenuation(viewport);
  const gain = distanceGain * zoomGain;
  const panRange = Math.max((viewport.w || 0) * 0.4, 8);
  const pan = clamp(dx / panRange, -1, 1);

  return {
    audible: gain > 0.01,
    gain,
    pan,
    distance,
    audibleRadius,
    zoomGain,
    distanceGain,
    centerX: center.x,
    centerY: center.y,
  };
}

/**
 * Compute an ecosystem mood snapshot from simulation stats.
 * Returns { biodiversity: 0–1, population: 0–1, trend: 'stable'|'booming'|'declining' }.
 */
export function computeEcoMood(stats, prevStats = null) {
  if (!stats) return { biodiversity: 0.5, population: 0.5, trend: 'stable' };

  const herbs = stats.herbivores || 0;
  const carns = stats.carnivores || 0;
  const total = herbs + carns;

  // Biodiversity: ratio balance between herbivores and carnivores (1 = perfectly balanced)
  const ratio = total > 0 ? Math.min(herbs, carns) / Math.max(herbs, carns, 1) : 0;
  // Also factor in absolute presence (empty world = low biodiversity)
  const presenceFactor = clamp(total / 200, 0, 1);
  const biodiversity = clamp(ratio * 0.6 + presenceFactor * 0.4, 0, 1);

  // Population: relative to a soft cap of 500
  const population = clamp(total / 500, 0, 1);

  // Trend: compare with previous stats
  let trend = 'stable';
  if (prevStats) {
    const prevTotal = (prevStats.herbivores || 0) + (prevStats.carnivores || 0);
    const delta = total - prevTotal;
    const threshold = Math.max(prevTotal * 0.1, 5);
    if (delta > threshold) trend = 'booming';
    else if (delta < -threshold) trend = 'declining';
  }

  return { biodiversity, population, trend };
}

/**
 * Detect macro ecosystem events by comparing stats snapshots.
 * Returns an array of event type strings to fire (may be empty).
 */
export function detectMacroEvents(prevStats, stats) {
  if (!prevStats || !stats) return [];
  const events = [];

  const prevHerbs = prevStats.herbivores || 0;
  const prevCarns = prevStats.carnivores || 0;
  const herbs = stats.herbivores || 0;
  const carns = stats.carnivores || 0;
  const prevTotal = prevHerbs + prevCarns;
  const total = herbs + carns;

  // Extinction warning: a group dropped to near zero from meaningful numbers
  if (prevHerbs >= 10 && herbs <= 2) events.push('extinctionWarning');
  if (prevCarns >= 10 && carns <= 2) events.push('extinctionWarning');

  // Population boom: total grew by >40% in one check interval
  if (prevTotal >= 20 && total > prevTotal * 1.4) events.push('populationBoom');

  // Ecosystem collapse: total dropped by >50%
  if (prevTotal >= 30 && total < prevTotal * 0.5) events.push('ecosystemCollapse');

  return events;
}