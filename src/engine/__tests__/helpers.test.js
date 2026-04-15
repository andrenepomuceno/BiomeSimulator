import { describe, expect, it } from 'vitest';
import { idxToXY, tileOf, shuffleInPlace } from '../helpers.js';

describe('idxToXY', () => {
  it('converts index 0 to [0, 0]', () => {
    expect(idxToXY(0, 10)).toEqual([0, 0]);
  });

  it('wraps correctly within a row', () => {
    expect(idxToXY(7, 10)).toEqual([7, 0]);
  });

  it('moves to the next row at the width boundary', () => {
    expect(idxToXY(10, 10)).toEqual([0, 1]);
    expect(idxToXY(15, 10)).toEqual([5, 1]);
  });

  it('handles a single-column grid', () => {
    expect(idxToXY(3, 1)).toEqual([0, 3]);
  });
});

describe('tileOf', () => {
  it('floors positive fractional values', () => {
    expect(tileOf(3.7)).toBe(3);
    expect(tileOf(0.999)).toBe(0);
  });

  it('returns integers unchanged', () => {
    expect(tileOf(5)).toBe(5);
    expect(tileOf(0)).toBe(0);
  });

  it('floors negative values correctly', () => {
    expect(tileOf(-0.1)).toBe(-1);
  });
});

describe('shuffleInPlace', () => {
  it('returns the same array reference', () => {
    const arr = [1, 2, 3];
    expect(shuffleInPlace(arr)).toBe(arr);
  });

  it('preserves all elements', () => {
    const arr = [10, 20, 30, 40, 50];
    shuffleInPlace(arr);
    expect(arr.sort((a, b) => a - b)).toEqual([10, 20, 30, 40, 50]);
  });

  it('handles an empty array', () => {
    expect(shuffleInPlace([])).toEqual([]);
  });

  it('handles a single-element array', () => {
    expect(shuffleInPlace([42])).toEqual([42]);
  });
});
