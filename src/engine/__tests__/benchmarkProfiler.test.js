import { describe, expect, it } from 'vitest';
import {
  createBenchmarkCollector,
  resetBenchmarkCollector,
  benchmarkStart,
  benchmarkEnd,
  benchmarkCount,
  benchmarkAdd,
  benchmarkAddKeyed,
  cloneBenchmarkCollector,
} from '../benchmarkProfiler.js';

describe('createBenchmarkCollector', () => {
  it('creates an empty collector with all required buckets', () => {
    const c = createBenchmarkCollector();
    expect(c).toEqual({ calls: {}, totalMs: {}, totals: {}, keyedTotals: {} });
  });
});

describe('resetBenchmarkCollector', () => {
  it('clears all buckets', () => {
    const c = createBenchmarkCollector();
    c.calls.tick = 5;
    c.totalMs.tick = 12.5;
    c.totals.animals = 100;
    c.keyedTotals.diet = { herb: 3 };
    resetBenchmarkCollector(c);
    expect(c.calls).toEqual({});
    expect(c.totalMs).toEqual({});
    expect(c.totals).toEqual({});
    expect(c.keyedTotals).toEqual({});
  });
});

describe('benchmarkCount', () => {
  it('increments the call counter', () => {
    const c = createBenchmarkCollector();
    benchmarkCount(c, 'tick');
    benchmarkCount(c, 'tick');
    benchmarkCount(c, 'tick', 3);
    expect(c.calls.tick).toBe(5);
  });

  it('no-ops when collector is null', () => {
    expect(() => benchmarkCount(null, 'tick')).not.toThrow();
  });
});

describe('benchmarkAdd', () => {
  it('accumulates values into totals', () => {
    const c = createBenchmarkCollector();
    benchmarkAdd(c, 'animals', 50);
    benchmarkAdd(c, 'animals', 30);
    expect(c.totals.animals).toBe(80);
  });

  it('no-ops when collector is null', () => {
    expect(() => benchmarkAdd(null, 'animals', 5)).not.toThrow();
  });
});

describe('benchmarkAddKeyed', () => {
  it('accumulates grouped values', () => {
    const c = createBenchmarkCollector();
    benchmarkAddKeyed(c, 'diet', 'RABBIT', 3);
    benchmarkAddKeyed(c, 'diet', 'RABBIT', 2);
    benchmarkAddKeyed(c, 'diet', 'WOLF', 1);
    expect(c.keyedTotals.diet).toEqual({ RABBIT: 5, WOLF: 1 });
  });

  it('defaults increment to 1', () => {
    const c = createBenchmarkCollector();
    benchmarkAddKeyed(c, 'events', 'spawn');
    expect(c.keyedTotals.events.spawn).toBe(1);
  });
});

describe('benchmarkStart / benchmarkEnd', () => {
  it('returns 0 when collector is null', () => {
    expect(benchmarkStart(null)).toBe(0);
  });

  it('tracks elapsed time and call count', () => {
    const c = createBenchmarkCollector();
    const t = benchmarkStart(c);
    const elapsed = benchmarkEnd(c, 'tick', t);
    expect(elapsed).toBeGreaterThanOrEqual(0);
    expect(c.calls.tick).toBe(1);
    expect(c.totalMs.tick).toBeGreaterThanOrEqual(0);
  });
});

describe('cloneBenchmarkCollector', () => {
  it('creates a deep copy of the collector', () => {
    const c = createBenchmarkCollector();
    benchmarkCount(c, 'tick', 3);
    benchmarkAdd(c, 'total', 10);
    benchmarkAddKeyed(c, 'group', 'a', 5);

    const clone = cloneBenchmarkCollector(c);
    expect(clone).toEqual(c);
    expect(clone).not.toBe(c);
    expect(clone.calls).not.toBe(c.calls);
    expect(clone.keyedTotals.group).not.toBe(c.keyedTotals.group);
  });
});
