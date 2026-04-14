import { describe, expect, it } from 'vitest';
import ANIMAL_SPECIES, {
  buildAnimalSpeciesConfig,
  buildDecisionIntervals,
  buildInitialAnimalCounts,
  buildProportionalAnimalCounts,
  buildAnimalColorMap,
  buildCanFlySet,
  buildSpeciesInfo,
  buildAnimalHexColors,
  buildDietGroups,
  buildSpeciesVisualScale,
  buildSpeciesAudioScale,
  buildSpeciesSoundGroup,
} from '../animalSpecies.js';

const ALL_KEYS = Object.keys(ANIMAL_SPECIES);

describe('animalSpecies builder functions', () => {
  it('buildAnimalSpeciesConfig returns sim params for every species', () => {
    const cfg = buildAnimalSpeciesConfig();
    for (const key of ALL_KEYS) {
      expect(cfg).toHaveProperty(key);
      expect(cfg[key]).toHaveProperty('max_energy');
      expect(cfg[key]).toHaveProperty('speed');
    }
  });

  it('buildDecisionIntervals has an entry for every species', () => {
    const intervals = buildDecisionIntervals();
    for (const key of ALL_KEYS) {
      expect(intervals[key]).toBeGreaterThan(0);
    }
  });

  it('buildInitialAnimalCounts has an entry for every species', () => {
    const counts = buildInitialAnimalCounts();
    for (const key of ALL_KEYS) {
      expect(typeof counts[key]).toBe('number');
    }
  });

  it('buildProportionalAnimalCounts respects a global budget', () => {
    const budget = 500;
    const counts = buildProportionalAnimalCounts(budget, budget);
    const total = Object.values(counts).reduce((s, v) => s + v, 0);
    expect(total).toBeLessThanOrEqual(budget);
    expect(total).toBeGreaterThan(0);
  });

  it('buildProportionalAnimalCounts returns zeroes for population 0', () => {
    const counts = buildProportionalAnimalCounts(0);
    expect(Object.values(counts).every(v => v === 0)).toBe(true);
  });

  it('buildAnimalColorMap returns hex-int colors for every species', () => {
    const map = buildAnimalColorMap();
    for (const key of ALL_KEYS) {
      expect(typeof map[key]).toBe('number');
    }
  });

  it('buildCanFlySet returns a Set of flying species', () => {
    const flySet = buildCanFlySet();
    expect(flySet).toBeInstanceOf(Set);
    for (const key of flySet) {
      expect(ANIMAL_SPECIES[key].can_fly).toBe(true);
    }
  });

  it('buildSpeciesInfo includes emoji, name, and diet for every species', () => {
    const info = buildSpeciesInfo();
    for (const key of ALL_KEYS) {
      expect(info[key]).toHaveProperty('emoji');
      expect(info[key]).toHaveProperty('name');
      expect(info[key]).toHaveProperty('diet');
    }
  });

  it('buildAnimalHexColors returns 6-char hex strings', () => {
    const hexColors = buildAnimalHexColors();
    for (const key of ALL_KEYS) {
      expect(hexColors[key]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('buildDietGroups categorises all species', () => {
    const groups = buildDietGroups();
    expect(groups).toHaveProperty('Herbivore');
    expect(groups).toHaveProperty('Carnivore');
    expect(groups).toHaveProperty('Omnivore');
    const allGrouped = [...groups.Herbivore, ...groups.Carnivore, ...groups.Omnivore];
    for (const key of ALL_KEYS) {
      expect(allGrouped).toContain(key);
    }
  });

  it('buildSpeciesVisualScale defaults to a positive number', () => {
    const scales = buildSpeciesVisualScale();
    for (const key of ALL_KEYS) {
      expect(scales[key]).toBeGreaterThan(0);
    }
  });

  it('buildSpeciesAudioScale returns numeric values keyed by display name', () => {
    const scales = buildSpeciesAudioScale();
    for (const sp of Object.values(ANIMAL_SPECIES)) {
      expect(typeof scales[sp.name]).toBe('number');
    }
  });

  it('buildSpeciesSoundGroup returns string groups keyed by display name', () => {
    const groups = buildSpeciesSoundGroup();
    for (const sp of Object.values(ANIMAL_SPECIES)) {
      expect(typeof groups[sp.name]).toBe('string');
    }
  });
});
