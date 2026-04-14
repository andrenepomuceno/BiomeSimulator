import { describe, expect, it } from 'vitest';
import { buildAudioLogExportLine, buildAudioLogExportText, formatAudioLogEntryMeta } from '../audioLogExport.js';

describe('audioLogExport', () => {
  it('formats one human-readable line per event', () => {
    expect(buildAudioLogExportLine({
      type: 'attack',
      tick: 70,
      at: new Date(2026, 3, 14, 9, 30, 2),
      pan: -0.5,
      distance: 12,
    })).toBe('09:30:02 - Attack | Tick 70 | Left | Near');

    expect(buildAudioLogExportLine({
      type: 'ambience',
      mode: 'night',
      tick: 71,
      at: new Date(2026, 3, 14, 9, 30, 3),
    })).toBe('09:30:03 - Night ambience | Tick 71');
  });

  it('builds a text export with header and one line per event', () => {
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
          tick: 72,
          at: new Date(2026, 3, 14, 9, 30, 4),
        },
        {
          type: 'ambience',
          mode: 'night',
          tick: 71,
          at: new Date(2026, 3, 14, 9, 30, 3),
        },
        {
          type: 'attack',
          tick: 70,
          at: new Date(2026, 3, 14, 9, 30, 2),
          pan: -0.5,
          distance: 12,
        },
      ],
    });

    expect(text.split('\n')).toEqual([
      '=== ECOGAME AUDIO LOG ===',
      'Exported: 2026-04-14 09:30:45',
      'Entries: 3',
      'Order: newest first',
      'Audio: muted=no | master=55% | sfx=on @ 72% | ambience=on @ 32%',
      'Viewport: x=12 y=18 w=40 h=30 zoom=4',
      '',
      '09:30:04 - UI click | Tick 72 | Interface',
      '09:30:03 - Night ambience | Tick 71',
      '09:30:02 - Attack | Tick 70 | Left | Near',
    ]);
  });

  it('keeps the modal-friendly metadata separator configurable', () => {
    expect(formatAudioLogEntryMeta({ type: 'uiClick', tick: 18 }, ' · ')).toBe('Tick 18 · Interface');
  });
});
