import { describe, expect, it } from 'vitest';
import { computePositionalMix, getAudibleRadius, getViewportCenter, shouldMutePositionalSfx } from '../soundMath.js';

describe('soundMath', () => {
  it('computes the center of the active viewport', () => {
    expect(getViewportCenter({ x: 20, y: 40, w: 10, h: 14 })).toEqual({ x: 25, y: 47 });
  });

  it('expands the audible radius for larger viewports', () => {
    const small = getAudibleRadius({ x: 0, y: 0, w: 10, h: 10 }, 18);
    const large = getAudibleRadius({ x: 0, y: 0, w: 60, h: 60 }, 18);

    expect(large).toBeGreaterThan(small);
  });

  it('centers nearby events and pans left or right by camera-relative position', () => {
    const viewport = { x: 10, y: 10, w: 10, h: 10 };

    const centered = computePositionalMix({ x: 15, y: 15 }, viewport, 18);
    const left = computePositionalMix({ x: 8, y: 15 }, viewport, 18);
    const right = computePositionalMix({ x: 22, y: 15 }, viewport, 18);

    expect(centered.pan).toBe(0);
    expect(centered.gain).toBeGreaterThan(0.95);
    expect(left.pan).toBeLessThan(0);
    expect(right.pan).toBeGreaterThan(0);
  });

  it('drops events outside the audible horizon', () => {
    const mix = computePositionalMix({ x: 120, y: 120 }, { x: 10, y: 10, w: 10, h: 10 }, 18);

    expect(mix.audible).toBe(false);
    expect(mix.gain).toBe(0);
  });

  it('mutes positional SFX when the camera is zoomed far out', () => {
    expect(shouldMutePositionalSfx({ x: 0, y: 0, w: 100, h: 100, zoom: 2.5 })).toBe(true);
    expect(shouldMutePositionalSfx({ x: 0, y: 0, w: 100, h: 100, zoom: 3 })).toBe(false);
  });
});