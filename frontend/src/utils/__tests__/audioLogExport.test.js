import { describe, expect, it } from 'vitest';
import { buildAudioLogExportLine, buildAudioLogExportText, formatAudioLogEntryMeta, formatAudioLogEntryLabel, formatAudioLogEntryDetail } from '../audioLogExport.js';

describe('audioLogExport', () => {
  it('formats one human-readable line per event', () => {
    expect(buildAudioLogExportLine({
      type: 'attack',
      tick: 70,
      at: new Date(2026, 3, 14, 9, 30, 2),
      pan: -0.5,
      distance: 12,
      priority: 2,
      gain: 0.150,
      distanceGain: 0.68,
      species: 'Wolf',
    })).toBe('09:30:02.000 - Wolf attack | Tick 70 | Left | Near | Pri:Med | Gain:0.150 | Pan:-0.50 | DistG:0.68');

    expect(buildAudioLogExportLine({
      type: 'ambience',
      mode: 'night',
      tick: 71,
      at: new Date(2026, 3, 14, 9, 30, 3),
    })).toBe('09:30:03.000 - Night ambience | Tick 71');
  });

  it('includes species in label when present', () => {
    expect(formatAudioLogEntryLabel({ type: 'flee', species: 'Rabbit' })).toBe('Rabbit flee');
    expect(formatAudioLogEntryLabel({ type: 'death' })).toBe('Death');
    expect(formatAudioLogEntryLabel({ type: 'uiClick' })).toBe('UI click');
  });

  it('formats detail parts with priority and gain info', () => {
    const detail = formatAudioLogEntryDetail({
      priority: 1,
      gain: 0.280,
      pan: 0.35,
      distanceGain: 0.92,
      nearBoosted: true,
      x: 42.5,
      y: 88.7,
    }, ' · ');
    expect(detail).toBe('Pri:High · Gain:0.280 · Pan:+0.35 · DistG:0.92 · Boosted · @43,89');
  });

  it('includes soundGroup in detail when present', () => {
    const detail = formatAudioLogEntryDetail({
      priority: 2,
      gain: 0.180,
      pan: -0.10,
      distanceGain: 0.75,
      soundGroup: 'bird',
    }, ' · ');
    expect(detail).toContain('Group:bird');
  });

  it('builds a text export with header, summary, and event lines', () => {
    const text = buildAudioLogExportText({
      exportedAt: new Date(2026, 3, 14, 9, 30, 45),
      audioSettings: {
        muted: false,
        masterVolume: 0.55,
        sfxVolume: 0.72,
        ambienceVolume: 0.32,
        sfxEnabled: true,
        ambienceEnabled: true,
      },
      viewport: { x: 12, y: 18, w: 40, h: 30, zoom: 4 },
      entries: [
        {
          type: 'uiClick',
          category: 'ui',
          tick: 72,
          at: new Date(2026, 3, 14, 9, 30, 4),
        },
        {
          type: 'attack',
          category: 'sfx',
          tick: 70,
          at: new Date(2026, 3, 14, 9, 30, 2),
          pan: -0.5,
          distance: 12,
          priority: 2,
          gain: 0.150,
          distanceGain: 0.68,
          species: 'Wolf',
        },
      ],
    });

    const lines = text.split('\n');
    expect(lines[0]).toBe('=== ECOGAME AUDIO LOG ===');
    expect(lines[1]).toBe('Exported: 2026-04-14 09:30:45');
    expect(lines[2]).toBe('Entries: 2');
    // Summary block appears
    expect(text).toContain('--- SUMMARY ---');
    expect(text).toContain('Event types:');
    expect(text).toContain('attack: 1');
    // Events section
    expect(text).toContain('--- EVENTS ---');
    expect(text).toContain('09:30:02.000 - Wolf attack');
  });

  it('keeps the modal-friendly metadata separator configurable', () => {
    expect(formatAudioLogEntryMeta({ type: 'uiClick', tick: 18 }, ' · ')).toBe('Tick 18 · Interface');
  });
});
