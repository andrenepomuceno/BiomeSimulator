import { describe, expect, it } from 'vitest';
import { computeEcoMood, computePositionalMix, detectMacroEvents, getAudibleRadius, getViewportCenter, shouldMutePositionalSfx } from '../soundMath.js';

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

describe('computeEcoMood', () => {
  it('returns default mood for null stats', () => {
    const mood = computeEcoMood(null);
    expect(mood.trend).toBe('stable');
    expect(mood.biodiversity).toBe(0.5);
  });

  it('reports high biodiversity when herbivores and carnivores are balanced', () => {
    const mood = computeEcoMood({ herbivores: 100, carnivores: 100 });
    expect(mood.biodiversity).toBeGreaterThan(0.7);
  });

  it('reports low biodiversity when one group dominates', () => {
    const mood = computeEcoMood({ herbivores: 200, carnivores: 2 });
    expect(mood.biodiversity).toBeLessThan(0.5);
  });

  it('detects booming trend when population grows significantly', () => {
    const prev = { herbivores: 50, carnivores: 50 };
    const curr = { herbivores: 80, carnivores: 80 };
    const mood = computeEcoMood(curr, prev);
    expect(mood.trend).toBe('booming');
  });

  it('detects declining trend when population drops', () => {
    const prev = { herbivores: 100, carnivores: 100 };
    const curr = { herbivores: 60, carnivores: 60 };
    const mood = computeEcoMood(curr, prev);
    expect(mood.trend).toBe('declining');
  });
});

describe('detectMacroEvents', () => {
  it('returns empty array when stats are stable', () => {
    const prev = { herbivores: 50, carnivores: 50 };
    const curr = { herbivores: 52, carnivores: 49 };
    expect(detectMacroEvents(prev, curr)).toEqual([]);
  });

  it('detects extinction warning when a group drops to near zero', () => {
    const prev = { herbivores: 50, carnivores: 20 };
    const curr = { herbivores: 50, carnivores: 1 };
    const events = detectMacroEvents(prev, curr);
    expect(events).toContain('extinctionWarning');
  });

  it('detects population boom when total grows >40%', () => {
    const prev = { herbivores: 50, carnivores: 50 };
    const curr = { herbivores: 80, carnivores: 80 };
    const events = detectMacroEvents(prev, curr);
    expect(events).toContain('populationBoom');
  });

  it('detects ecosystem collapse when total drops >50%', () => {
    const prev = { herbivores: 50, carnivores: 50 };
    const curr = { herbivores: 15, carnivores: 15 };
    const events = detectMacroEvents(prev, curr);
    expect(events).toContain('ecosystemCollapse');
  });
});