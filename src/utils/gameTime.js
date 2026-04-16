import {
  DEFAULT_TICKS_PER_DAY,
  DEFAULT_TICKS_PER_GAME_MINUTE,
  GAME_DAY,
  GAME_HOUR,
} from '../constants/simulation.js';

export function resolveTicksPerGameMinute(ticksPerDay = DEFAULT_TICKS_PER_DAY) {
  if (!Number.isFinite(ticksPerDay) || ticksPerDay <= 0) {
    return DEFAULT_TICKS_PER_GAME_MINUTE;
  }
  return ticksPerDay / GAME_DAY;
}

export function gameMinutesToTicks(value, ticksPerGameMinute = DEFAULT_TICKS_PER_GAME_MINUTE) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value * ticksPerGameMinute));
}

export function gameMinuteArrayToTicks(values, ticksPerGameMinute = DEFAULT_TICKS_PER_GAME_MINUTE) {
  return Array.isArray(values)
    ? values.map(value => gameMinutesToTicks(value, ticksPerGameMinute))
    : [];
}

/**
 * Scale a per-tick rate that was tuned at DEFAULT_TICKS_PER_GAME_MINUTE
 * so it produces the same per-game-minute effect at any tick rate.
 *
 * At the default tick rate the factor is 1.0 — existing tuned values are unchanged.
 */
export function scaleRateForTicks(value, ticksPerGameMinute = DEFAULT_TICKS_PER_GAME_MINUTE) {
  if (!Number.isFinite(value) || ticksPerGameMinute <= 0) return value;
  return value * (DEFAULT_TICKS_PER_GAME_MINUTE / ticksPerGameMinute);
}

export function convertGameTimeFieldsToTicks(source, options = {}, ticksPerGameMinute = DEFAULT_TICKS_PER_GAME_MINUTE) {
  const { fields = [], arrayFields = [], nestedFields = {} } = options;
  const converted = { ...source };

  for (const field of fields) {
    if (converted[field] != null) {
      converted[field] = gameMinutesToTicks(converted[field], ticksPerGameMinute);
    }
  }

  for (const field of arrayFields) {
    if (Array.isArray(converted[field])) {
      converted[field] = gameMinuteArrayToTicks(converted[field], ticksPerGameMinute);
    }
  }

  for (const [parentField, childFields] of Object.entries(nestedFields)) {
    if (!converted[parentField]) continue;
    converted[parentField] = { ...converted[parentField] };
    for (const childField of childFields) {
      if (converted[parentField][childField] != null) {
        converted[parentField][childField] = gameMinutesToTicks(converted[parentField][childField], ticksPerGameMinute);
      }
    }
  }

  return converted;
}

export function formatGameMinutes(totalMinutes = 0) {
  const roundedMinutes = Math.max(0, Math.round(totalMinutes || 0));
  if (roundedMinutes === 0) return '0m';

  const parts = [];
  const days = Math.floor(roundedMinutes / GAME_DAY);
  const hours = Math.floor((roundedMinutes % GAME_DAY) / GAME_HOUR);
  const minutes = roundedMinutes % GAME_HOUR;

  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

  return parts.join(' ');
}

export function ticksToGameMinutes(ticks = 0, ticksPerDay = DEFAULT_TICKS_PER_DAY) {
  return Math.round((ticks || 0) / resolveTicksPerGameMinute(ticksPerDay));
}