import { describe, expect, it } from 'vitest';
import {
  buildEntitySummaryGroups,
  matchesActiveSelection,
  reconcileExpandedGroups,
} from '../entitySummaryGroups.js';

function createAnimalEntry(overrides = {}) {
  return {
    key: 'A-1',
    entityType: 'animal',
    groupKey: 'animal:RABBIT',
    groupLabel: 'Rabbit',
    groupEmoji: '🐇',
    speciesLabel: 'Rabbit',
    emoji: '🐇',
    idLabel: '#1',
    x: 4,
    y: 6,
    summary: 'Idle · HP 20',
    searchable: 'rabbit 1',
    raw: { id: 1, species: 'RABBIT' },
    ...overrides,
  };
}

function createPlantEntry(overrides = {}) {
  return {
    key: 'P-2-3',
    entityType: 'plant',
    groupKey: 'plant:1',
    groupLabel: 'Grass',
    groupEmoji: '🌱',
    speciesLabel: 'Grass',
    emoji: '🌱',
    idLabel: 'P(2,3)',
    x: 2,
    y: 3,
    summary: 'Adult · Tile (2, 3)',
    searchable: 'grass 2 3',
    raw: { type: 1, stage: 3 },
    ...overrides,
  };
}

describe('entitySummaryGroups', () => {
  it('groups visible entries by species and orders groups by label', () => {
    const entries = [
      createAnimalEntry({ key: 'A-9', groupKey: 'animal:WOLF', groupLabel: 'Wolf', speciesLabel: 'Wolf', emoji: '🐺', groupEmoji: '🐺', raw: { id: 9, species: 'WOLF' } }),
      createPlantEntry(),
      createAnimalEntry(),
      createAnimalEntry({ key: 'A-2', raw: { id: 2, species: 'RABBIT' }, idLabel: '#2' }),
    ];

    const groups = buildEntitySummaryGroups(entries, { id: 2 }, null);

    expect(groups.map(group => group.label)).toEqual(['Grass', 'Rabbit', 'Wolf']);
    expect(groups[1]).toMatchObject({
      key: 'animal:RABBIT',
      count: 2,
      hasActive: true,
    });
    expect(groups[1].entries.map(entry => entry.key)).toEqual(['A-1', 'A-2']);
  });

  it('keeps animal and plant groups separate even when labels match', () => {
    const entries = [
      createAnimalEntry({ groupKey: 'animal:FERN', groupLabel: 'Fern', speciesLabel: 'Fern', raw: { id: 3, species: 'FERN' } }),
      createPlantEntry({ groupKey: 'plant:9', groupLabel: 'Fern', speciesLabel: 'Fern', raw: { type: 9, stage: 2 } }),
    ];

    const groups = buildEntitySummaryGroups(entries, null, null);

    expect(groups).toHaveLength(2);
    expect(groups.map(group => group.key)).toEqual(['animal:FERN', 'plant:9']);
  });

  it('matches active selection for animals and plants', () => {
    const animalEntry = createAnimalEntry({ raw: { id: 99, species: 'RABBIT' } });
    const plantEntry = createPlantEntry({ x: 7, y: 4 });

    expect(matchesActiveSelection(animalEntry, { id: 99 }, null)).toBe(true);
    expect(matchesActiveSelection(plantEntry, null, { x: 7, y: 4, plant: { type: 1 } })).toBe(true);
    expect(matchesActiveSelection(plantEntry, null, { x: 7, y: 4, plant: { type: 0 } })).toBe(false);
  });

  it('drops stale expanded groups while preserving current ones', () => {
    const current = {
      'animal:RABBIT': true,
      'animal:FOX': true,
      stale: true,
    };
    const groups = [
      { key: 'animal:RABBIT' },
      { key: 'plant:1' },
    ];

    expect(reconcileExpandedGroups(current, groups)).toEqual({ 'animal:RABBIT': true });
    expect(reconcileExpandedGroups({ 'plant:1': true }, groups)).toEqual({ 'plant:1': true });
  });
});