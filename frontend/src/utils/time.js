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