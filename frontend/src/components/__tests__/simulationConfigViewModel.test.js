import { describe, expect, it } from 'vitest';
import { buildSimulationConfigSections } from '../simulationConfigViewModel.js';

function findRow(sections, rowId) {
  for (const section of sections) {
    const row = section.rows.find(item => item.id === rowId);
    if (row) return row;
  }
  return null;
}

describe('simulationConfigViewModel', () => {
  it('builds the expected section groups from defaults', () => {
    const sections = buildSimulationConfigSections();

    expect(sections.map(section => section.id)).toEqual([
      'clock',
      'need-rates',
      'vision-population',
      'supervisor',
    ]);
    expect(findRow(sections, 'max-animal-population')).toMatchObject({
      value: '10,000 animals',
      source: 'world',
    });
    expect(findRow(sections, 'supervisor-enabled')).toMatchObject({
      value: 'Enabled',
      source: 'world',
    });
  });

  it('prefers live speed and live multipliers over world config values', () => {
    const sections = buildSimulationConfigSections({
      gameConfig: {
        ticks_per_second: 20,
        hunger_multiplier: 1.6,
        thirst_multiplier: 1.4,
      },
      tps: 42,
      hungerMultiplier: 2.2,
      thirstMultiplier: 1.1,
      clock: {
        day: 3,
        tick: 820,
        tick_in_day: 40,
        is_night: false,
      },
    });

    expect(findRow(sections, 'speed')).toMatchObject({ value: '42 tps', source: 'live' });
    expect(findRow(sections, 'hunger-multiplier')).toMatchObject({ value: '2.20x', source: 'live' });
    expect(findRow(sections, 'thirst-multiplier')).toMatchObject({ value: '1.10x', source: 'live' });
    expect(findRow(sections, 'clock-label')).toMatchObject({ source: 'live' });
  });

  it('formats world-controlled budget and supervisor fallbacks consistently', () => {
    const sections = buildSimulationConfigSections({
      gameConfig: {
        max_animal_population: 0,
        day_fraction: 0.7,
        supervisor_enabled: false,
        supervisor_full_audit_interval_ticks: 45,
        supervisor_sample_limit: 8,
      },
    });

    expect(findRow(sections, 'max-animal-population')).toMatchObject({ value: 'Per-species defaults' });
    expect(findRow(sections, 'day-fraction')).toMatchObject({ value: '70%', source: 'world' });
    expect(findRow(sections, 'supervisor-enabled')).toMatchObject({ value: 'Disabled', source: 'world' });
    expect(findRow(sections, 'full-audit-interval')).toMatchObject({ value: '45 ticks' });
    expect(findRow(sections, 'sample-limit')).toMatchObject({ value: '8' });
  });
});