import { describe, expect, it } from 'vitest';
import {
  buildEntitySummaryGroups,
  matchesActiveSelection,
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

  it('marks the selected group as active without affecting unrelated groups', () => {
    const entries = [
      createAnimalEntry({ key: 'A-7', groupKey: 'animal:BEAR', groupLabel: 'Bear', speciesLabel: 'Bear', emoji: '🐻', groupEmoji: '🐻', raw: { id: 7, species: 'BEAR' } }),
      createPlantEntry(),
    ];

    const groups = buildEntitySummaryGroups(entries, { id: 7 }, null);

    expect(groups.find(group => group.key === 'animal:BEAR')?.hasActive).toBe(true);
    expect(groups.find(group => group.key === 'plant:1')?.hasActive).toBe(false);
  });
});

describe('buildEntitySummaryGroups — edge cases', () => {
  it('returns an empty array when entries is empty', () => {
    expect(buildEntitySummaryGroups([], null, null)).toEqual([]);
  });

  it('falls back to entityType:speciesLabel as groupKey when entry has no groupKey', () => {
    const entry = createAnimalEntry({ groupKey: undefined });
    const groups = buildEntitySummaryGroups([entry], null, null);
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe('animal:Rabbit');
  });

  it('orders same-label groups by key as secondary sort', () => {
    // animal:FERN and plant:9 both have label "Fern"; secondary sort by key
    const entries = [
      createPlantEntry({ groupKey: 'plant:9', groupLabel: 'Fern', speciesLabel: 'Fern', raw: { type: 9, stage: 2 } }),
      createAnimalEntry({ groupKey: 'animal:FERN', groupLabel: 'Fern', speciesLabel: 'Fern', raw: { id: 3, species: 'FERN' } }),
    ];
    const groups = buildEntitySummaryGroups(entries, null, null);
    expect(groups.map(g => g.key)).toEqual(['animal:FERN', 'plant:9']);
  });

  it('groups a single entry into one group with count 1', () => {
    const groups = buildEntitySummaryGroups([createAnimalEntry()], null, null);
    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(1);
    expect(groups[0].entries).toHaveLength(1);
  });

  it('sets hasActive true when selected plant tile coordinates match', () => {
    const entries = [
      createPlantEntry({ x: 5, y: 8 }),
    ];
    const selectedTile = { x: 5, y: 8, plant: { type: 1 } };
    const groups = buildEntitySummaryGroups(entries, null, selectedTile);
    expect(groups[0].hasActive).toBe(true);
  });

  it('does not set hasActive when tile coordinates do not match', () => {
    const entries = [createPlantEntry({ x: 5, y: 8 })];
    const selectedTile = { x: 0, y: 0, plant: { type: 1 } };
    const groups = buildEntitySummaryGroups(entries, null, selectedTile);
    expect(groups[0].hasActive).toBe(false);
  });

  it('preserves insertion order within a group', () => {
    const entries = [
      createAnimalEntry({ key: 'A-10', raw: { id: 10, species: 'RABBIT' }, idLabel: '#10' }),
      createAnimalEntry({ key: 'A-1', raw: { id: 1, species: 'RABBIT' }, idLabel: '#1' }),
      createAnimalEntry({ key: 'A-5', raw: { id: 5, species: 'RABBIT' }, idLabel: '#5' }),
    ];
    const groups = buildEntitySummaryGroups(entries, null, null);
    expect(groups[0].entries.map(e => e.key)).toEqual(['A-10', 'A-1', 'A-5']);
  });
});

describe('matchesActiveSelection — edge cases', () => {
  it('returns false for animal when selectedEntity is null', () => {
    const entry = createAnimalEntry({ raw: { id: 1 } });
    expect(matchesActiveSelection(entry, null, null)).toBe(false);
  });

  it('returns false for animal when id does not match', () => {
    const entry = createAnimalEntry({ raw: { id: 1 } });
    expect(matchesActiveSelection(entry, { id: 99 }, null)).toBe(false);
  });

  it('returns false for plant when selectedTile is null', () => {
    const entry = createPlantEntry({ x: 2, y: 3 });
    expect(matchesActiveSelection(entry, null, null)).toBe(false);
  });

  it('returns false for plant when selectedTile has no plant property', () => {
    const entry = createPlantEntry({ x: 2, y: 3 });
    expect(matchesActiveSelection(entry, null, { x: 2, y: 3 })).toBe(false);
  });

  it('returns false for plant when selectedTile.plant.type is 0 (empty tile)', () => {
    const entry = createPlantEntry({ x: 2, y: 3 });
    expect(matchesActiveSelection(entry, null, { x: 2, y: 3, plant: { type: 0 } })).toBe(false);
  });

  it('returns false for plant when x coordinate does not match', () => {
    const entry = createPlantEntry({ x: 2, y: 3 });
    expect(matchesActiveSelection(entry, null, { x: 9, y: 3, plant: { type: 1 } })).toBe(false);
  });

  it('returns false for plant when y coordinate does not match', () => {
    const entry = createPlantEntry({ x: 2, y: 3 });
    expect(matchesActiveSelection(entry, null, { x: 2, y: 9, plant: { type: 1 } })).toBe(false);
  });

  it('returns false when both selectedEntity and selectedTile are null and entry type is neither animal nor plant', () => {
    const entry = { ...createAnimalEntry(), entityType: 'unknown' };
    expect(matchesActiveSelection(entry, { id: 1 }, null)).toBe(false);
  });
});