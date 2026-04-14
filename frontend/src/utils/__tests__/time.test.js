import { describe, expect, it } from 'vitest';
import {
  resolveTicksPerDay,
  ticksToDay,
  buildDayLabel,
  formatTickTimestamp,
  formatTimeOfDay,
} from '../time.js';
import { DEFAULT_TICKS_PER_DAY } from '../../constants/simulation.js';

describe('resolveTicksPerDay', () => {
  it('returns the given value when valid', () => {
    expect(resolveTicksPerDay(100)).toBe(100);
    expect(resolveTicksPerDay(1)).toBe(1);
  });

  it('falls back to DEFAULT_TICKS_PER_DAY for invalid inputs', () => {
    expect(resolveTicksPerDay(0)).toBe(DEFAULT_TICKS_PER_DAY);
    expect(resolveTicksPerDay(-5)).toBe(DEFAULT_TICKS_PER_DAY);
    expect(resolveTicksPerDay(NaN)).toBe(DEFAULT_TICKS_PER_DAY);
    expect(resolveTicksPerDay(undefined)).toBe(DEFAULT_TICKS_PER_DAY);
    expect(resolveTicksPerDay(null)).toBe(DEFAULT_TICKS_PER_DAY);
  });
});

describe('ticksToDay', () => {
  it('returns 0 for ticks within the first day', () => {
    expect(ticksToDay(0)).toBe(0);
    expect(ticksToDay(DEFAULT_TICKS_PER_DAY - 1)).toBe(0);
  });

  it('increments day at exact boundary', () => {
    expect(ticksToDay(DEFAULT_TICKS_PER_DAY)).toBe(1);
    expect(ticksToDay(DEFAULT_TICKS_PER_DAY * 3)).toBe(3);
  });

  it('handles falsy tick as 0', () => {
    expect(ticksToDay(null)).toBe(0);
    expect(ticksToDay(undefined)).toBe(0);
  });
});

describe('buildDayLabel', () => {
  it('returns D0 for the first day', () => {
    expect(buildDayLabel(0)).toBe('D0');
  });

  it('returns the correct day label', () => {
    expect(buildDayLabel(DEFAULT_TICKS_PER_DAY * 5 + 10)).toBe('D5');
  });
});

describe('formatTickTimestamp', () => {
  it('returns D0 00:00 at tick 0', () => {
    expect(formatTickTimestamp(0)).toBe('D0 00:00');
  });

  it('includes hours and minutes within the day', () => {
    // At half a day (tick 130 of 260), dayFrac = 0.5 → 12:00
    const result = formatTickTimestamp(DEFAULT_TICKS_PER_DAY / 2);
    expect(result).toMatch(/^D0 12:00$/);
  });

  it('rolls over to the next day', () => {
    const result = formatTickTimestamp(DEFAULT_TICKS_PER_DAY + 1);
    expect(result).toMatch(/^D1 /);
  });
});

describe('formatTimeOfDay', () => {
  it('returns 05:36 at the start of the day', () => {
    expect(formatTimeOfDay(0, 260)).toBe('05:36');
  });

  it('returns 20:00 at the night boundary', () => {
    // nightStart = 0.6 → tick 156
    expect(formatTimeOfDay(156, 260)).toBe('20:00');
  });

  it('wraps around within 24 hours', () => {
    const result = formatTimeOfDay(259, 260);
    // Near end of night, should be close to 05:36 again
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });

  it('uses default ticksPerDay when omitted', () => {
    const result = formatTimeOfDay(0);
    expect(result).toBe('05:36');
  });
});
