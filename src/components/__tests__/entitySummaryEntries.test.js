import { describe, expect, it } from 'vitest';
import { buildAnimalEntry, buildPlantEntry } from '../entitySummaryEntries.js';

// ─── buildAnimalEntry ────────────────────────────────────────────────────────

describe('buildAnimalEntry', () => {
  it('produces well-formed entry for a known species', () => {
    const animal = { id: 42, species: 'RABBIT', x: 10, y: 5, state: 0, hp: 37.8 };
    const entry = buildAnimalEntry(animal);

    expect(entry).toMatchObject({
      key: 'A-42',
      entityType: 'animal',
      groupKey: 'animal:RABBIT',
      idLabel: '#42',
      x: 10,
      y: 5,
    });
    expect(entry.raw).toBe(animal);
  });

  it('rounds hp to nearest integer in summary', () => {
    const entry = buildAnimalEntry({ id: 1, species: 'RABBIT', x: 0, y: 0, state: 0, hp: 17.6 });
    expect(entry.summary).toContain('HP 18');
  });

  it('includes state label in summary', () => {
    const entry = buildAnimalEntry({ id: 1, species: 'RABBIT', x: 0, y: 0, state: 3, hp: 20 });
    expect(entry.summary).toMatch(/^Eating/);
  });

  it('falls back to "Unknown" state when state number is unrecognized', () => {
    const entry = buildAnimalEntry({ id: 1, species: 'RABBIT', x: 0, y: 0, state: 999, hp: 10 });
    expect(entry.summary).toMatch(/^Unknown/);
  });

  it('falls back gracefully for unknown species', () => {
    const entry = buildAnimalEntry({ id: 99, species: 'CRYPTID', x: 0, y: 0, state: 0, hp: 5 });
    expect(entry.groupKey).toBe('animal:CRYPTID');
    expect(entry.speciesLabel).toBe('CRYPTID');
    expect(entry.emoji).toBe('🐾');
  });

  it('uses "Unknown" as speciesLabel when species is absent', () => {
    const entry = buildAnimalEntry({ id: 1, species: undefined, x: 0, y: 0, state: 0, hp: 0 });
    expect(entry.speciesLabel).toBe('Unknown');
    expect(entry.groupKey).toBe('animal:Unknown');
  });

  it('produces a lowercase searchable string containing name and id', () => {
    const entry = buildAnimalEntry({ id: 7, species: 'RABBIT', x: 0, y: 0, state: 0, hp: 20 });
    expect(entry.searchable).toContain('rabbit');
    expect(entry.searchable).toContain('7');
    expect(entry.searchable).toBe(entry.searchable.toLowerCase());
  });
});

// ─── buildPlantEntry ─────────────────────────────────────────────────────────

describe('buildPlantEntry', () => {
  it('produces well-formed entry for a known plant type', () => {
    // typeId 1 = Grass
    const entry = buildPlantEntry(1, 4, 3, 7);

    expect(entry).toMatchObject({
      key: 'P-3-7',
      entityType: 'plant',
      groupKey: 'plant:1',
      idLabel: 'P(3,7)',
      x: 3,
      y: 7,
    });
    expect(entry.raw).toEqual({ type: 1, stage: 4 });
  });

  it('shows the Seed emoji for stage 1', () => {
    // typeId 4 = Apple Tree: { seed: '🌱', youngSprout: '🌿', adultSprout: '🌳', adult: '🌳', fruit: '🍎' }
    const entry = buildPlantEntry(4, 1, 0, 0);
    expect(entry.emoji).toBe('🌱');
  });

  it('shows the youngSprout emoji for stage 2', () => {
    const entry = buildPlantEntry(4, 2, 0, 0);
    expect(entry.emoji).toBe('🌿');
  });

  it('shows the adultSprout emoji for stage 3', () => {
    // Sunflower (typeId 7): adultSprout: '🌼', adult: '🌻'
    const entry = buildPlantEntry(7, 3, 0, 0);
    expect(entry.emoji).toBe('🌼');
  });

  it('shows the adult emoji for stage 4', () => {
    const entry = buildPlantEntry(7, 4, 0, 0);
    expect(entry.emoji).toBe('🌻');
  });

  it('shows the fruit emoji for stage 5', () => {
    // Apple Tree (typeId 4): fruit: '🍎'
    const entry = buildPlantEntry(4, 5, 0, 0);
    expect(entry.emoji).toBe('🍎');
  });

  it('falls back to adult emoji for dead stage (6) since no dead key exists', () => {
    const entry = buildPlantEntry(4, 6, 0, 0);
    // No 'dead' key → falls back to plant.emoji.adult = '🌳'
    expect(entry.emoji).toBe('🌳');
  });

  it('uses "Plant {typeId}" as speciesLabel for unknown typeId', () => {
    const entry = buildPlantEntry(999, 4, 0, 0);
    expect(entry.speciesLabel).toBe('Plant 999');
    expect(entry.groupKey).toBe('plant:999');
    expect(entry.emoji).toBe('🌿');
  });

  it('includes stage name in summary', () => {
    const entry = buildPlantEntry(1, 4, 0, 0);
    expect(entry.summary).toContain('Adult');
  });

  it('falls back to "Stage N" label for unrecognized stage number', () => {
    const entry = buildPlantEntry(1, 99, 0, 0);
    expect(entry.summary).toContain('Stage 99');
  });

  it('includes coordinates in summary', () => {
    const entry = buildPlantEntry(1, 4, 12, 34);
    expect(entry.summary).toContain('Tile (12, 34)');
  });

  it('produces a lowercase searchable string containing species name and coordinates', () => {
    const entry = buildPlantEntry(1, 4, 5, 9);
    expect(entry.searchable).toBe(entry.searchable.toLowerCase());
    expect(entry.searchable).toContain('5');
    expect(entry.searchable).toContain('9');
  });
});
