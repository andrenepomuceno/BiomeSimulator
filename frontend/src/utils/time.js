import { DEFAULT_TICKS_PER_DAY } from '../constants/simulation';

export function resolveTicksPerDay(ticksPerDay) {
  return Number.isFinite(ticksPerDay) && ticksPerDay > 0
    ? ticksPerDay
    : DEFAULT_TICKS_PER_DAY;
}

export function ticksToDay(tick, ticksPerDay = DEFAULT_TICKS_PER_DAY) {
  return Math.floor((tick || 0) / resolveTicksPerDay(ticksPerDay));
}

export function buildDayLabel(tick, ticksPerDay = DEFAULT_TICKS_PER_DAY) {
  return `D${ticksToDay(tick, ticksPerDay)}`;
}

export function formatTickTimestamp(tick, ticksPerDay = DEFAULT_TICKS_PER_DAY) {
  const resolvedTicksPerDay = resolveTicksPerDay(ticksPerDay);
  const day = ticksToDay(tick, resolvedTicksPerDay);
  const tickInDay = (tick || 0) % resolvedTicksPerDay;
  const dayFrac = tickInDay / resolvedTicksPerDay;
  const hours = Math.floor(dayFrac * 24);
  const minutes = Math.floor((dayFrac * 24 - hours) * 60);
  return `D${day} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Convert tick count within day to HH:MM format, synced with day/night cycle.
 * Maps game phases to realistic hours:
 * - Day phase (0.0–0.6): 05:36–20:00 (~14.4 hours)
 * - Night phase (0.6–1.0): 20:00–05:36 (~9.6 hours)
 * @param {number} tickInDay - Raw tick count within the day (0 to ticksPerDay-1)
 * @param {number} ticksPerDay - Total ticks per day (e.g., 260)
 * @returns {string} Time in HH:MM format (e.g., "14:30")
 */
export function formatTimeOfDay(tickInDay = 0, ticksPerDay = 260) {
  const dayFraction = tickInDay / ticksPerDay;
  const nightStart = 0.6; // Night starts at 60% of day cycle
  const dayDurationMinutes = 14.4 * 60; // ~864 minutes (14h 24m)
  const nightDurationMinutes = 9.6 * 60; // ~576 minutes (9h 36m)
  const dayStartMinutes = 5 * 60 + 36; // 05:36 in minutes from midnight
  const nightStartMinutes = 20 * 60; // 20:00 in minutes from midnight

  let totalMinutes;

  if (dayFraction < nightStart) {
    // Day phase: scale 0.0–0.6 to 05:36–20:00
    const dayProgress = dayFraction / nightStart;
    totalMinutes = dayStartMinutes + dayProgress * dayDurationMinutes;
  } else {
    // Night phase: scale 0.6–1.0 to 20:00–05:36 (wraps to next day)
    const nightProgress = (dayFraction - nightStart) / (1 - nightStart);
    totalMinutes = nightStartMinutes + nightProgress * nightDurationMinutes;
  }

  // Normalize to 24-hour cycle
  totalMinutes = totalMinutes % (24 * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}