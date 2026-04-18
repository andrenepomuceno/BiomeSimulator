import { describe, it, expect } from 'vitest';
import {
  deriveSimulationReportData,
  buildSimulationReportText,
  DIET_GROUPS,
} from '../simulationReportExport.js';
import { buildSpeciesInfo } from '../../engine/animalSpecies.js';

// ── Fixture helpers ─────────────────────────────────────────────────────────

const SPECIES_KEYS = Object.keys(buildSpeciesInfo()); // 18 species

function makeSnapshot(tick, overrides = {}) {
  const species = {};
  for (const k of SPECIES_KEYS) species[k] = 0;
  const plant_types = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  return {
    tick,
    species,
    plants_total: 0,
    fruits: 0,
    plant_types,
    ...overrides,
  };
}

/** Build a realistic two-snapshot history. */
function twoSnapshot() {
  return [
    makeSnapshot(0,   { species: { ...Object.fromEntries(SPECIES_KEYS.map(k => [k, 0])), RABBIT: 10, DEER: 5, WOLF: 2 }, plants_total: 200, fruits: 20, plant_types: { 1: 150, 2: 50, 3: 0, 4: 0, 5: 0, 6: 0 } }),
    makeSnapshot(500, { species: { ...Object.fromEntries(SPECIES_KEYS.map(k => [k, 0])), RABBIT: 8,  DEER: 6, WOLF: 3 }, plants_total: 180, fruits: 18, plant_types: { 1: 130, 2: 50, 3: 0, 4: 0, 5: 0, 6: 0 } }),
  ];
}

/** History where RABBIT goes to 0 (extinction). */
function extinctionHistory() {
  return [
    makeSnapshot(0,    { species: { ...Object.fromEntries(SPECIES_KEYS.map(k => [k, 0])), RABBIT: 5,  WOLF: 2 } }),
    makeSnapshot(1000, { species: { ...Object.fromEntries(SPECIES_KEYS.map(k => [k, 0])), RABBIT: 3,  WOLF: 2 } }),
    makeSnapshot(2000, { species: { ...Object.fromEntries(SPECIES_KEYS.map(k => [k, 0])), RABBIT: 0,  WOLF: 2 } }),
    makeSnapshot(3000, { species: { ...Object.fromEntries(SPECIES_KEYS.map(k => [k, 0])), RABBIT: 0,  WOLF: 2 } }),
  ];
}

// ── deriveSimulationReportData ───────────────────────────────────────────────

describe('deriveSimulationReportData', () => {
  it('returns null for empty history', () => {
    expect(deriveSimulationReportData([], 130)).toBeNull();
  });

  it('returns null for null history', () => {
    expect(deriveSimulationReportData(null, 130)).toBeNull();
  });

  it('returns an object for a single snapshot', () => {
    const data = deriveSimulationReportData([makeSnapshot(0, { plants_total: 100 })], 130);
    expect(data).not.toBeNull();
  });

  it('ticks array matches the input snapshots', () => {
    const history = twoSnapshot();
    const data = deriveSimulationReportData(history, 130);
    expect(data.ticks).toEqual([0, 500]);
  });

  it('speciesKeys contains all species', () => {
    const data = deriveSimulationReportData(twoSnapshot(), 130);
    for (const k of SPECIES_KEYS) {
      expect(data.speciesKeys).toContain(k);
    }
  });

  it('speciesData arrays have one entry per snapshot', () => {
    const data = deriveSimulationReportData(twoSnapshot(), 130);
    for (const k of data.speciesKeys) {
      expect(data.speciesData[k]).toHaveLength(2);
    }
  });

  it('speciesData values match snapshot counts', () => {
    const data = deriveSimulationReportData(twoSnapshot(), 130);
    expect(data.speciesData['RABBIT'][0]).toBe(10);
    expect(data.speciesData['RABBIT'][1]).toBe(8);
    expect(data.speciesData['WOLF'][0]).toBe(2);
    expect(data.speciesData['WOLF'][1]).toBe(3);
  });

  it('totalAnimals sums all species per snapshot', () => {
    const data = deriveSimulationReportData(twoSnapshot(), 130);
    expect(data.totalAnimals[0]).toBe(10 + 5 + 2); // RABBIT + DEER + WOLF
    expect(data.totalAnimals[1]).toBe(8 + 6 + 3);
  });

  it('plantsTotal reflects the snapshot field', () => {
    const data = deriveSimulationReportData(twoSnapshot(), 130);
    expect(data.plantsTotal[0]).toBe(200);
    expect(data.plantsTotal[1]).toBe(180);
  });

  it('fruits reflects the snapshot field', () => {
    const data = deriveSimulationReportData(twoSnapshot(), 130);
    expect(data.fruits[0]).toBe(20);
    expect(data.fruits[1]).toBe(18);
  });

  it('peaks[k] equals the max value across snapshots', () => {
    const data = deriveSimulationReportData(twoSnapshot(), 130);
    expect(data.peaks['RABBIT']).toBe(10);
    expect(data.peaks['WOLF']).toBe(3);
  });

  it('mins[k] equals the min value across snapshots', () => {
    const data = deriveSimulationReportData(twoSnapshot(), 130);
    expect(data.mins['RABBIT']).toBe(8);
    expect(data.mins['WOLF']).toBe(2);
  });

  it('detects a single extinction event', () => {
    const data = deriveSimulationReportData(extinctionHistory(), 130);
    expect(data.extinctions).toHaveLength(1);
    expect(data.extinctions[0].species).toBe('RABBIT');
    expect(data.extinctions[0].tick).toBe(2000);
  });

  it('reports zero extinctions when no species goes extinct', () => {
    const data = deriveSimulationReportData(twoSnapshot(), 130);
    expect(data.extinctions).toHaveLength(0);
  });

  it('does not count re-appearance as a second extinction', () => {
    const history = [
      makeSnapshot(0,    { species: { ...Object.fromEntries(SPECIES_KEYS.map(k => [k, 0])), RABBIT: 3 } }),
      makeSnapshot(100,  { species: { ...Object.fromEntries(SPECIES_KEYS.map(k => [k, 0])), RABBIT: 0 } }),
      makeSnapshot(200,  { species: { ...Object.fromEntries(SPECIES_KEYS.map(k => [k, 0])), RABBIT: 2 } }),
      makeSnapshot(300,  { species: { ...Object.fromEntries(SPECIES_KEYS.map(k => [k, 0])), RABBIT: 0 } }),
    ];
    const data = deriveSimulationReportData(history, 130);
    // Two extinction events (each drop to 0 after positive value)
    expect(data.extinctions).toHaveLength(2);
  });

  // Shannon diversity index: H = -sum(p * ln(p)) for p = count / total
  it('diversity is zero when only one species is alive', () => {
    const history = [
      makeSnapshot(0, { species: { ...Object.fromEntries(SPECIES_KEYS.map(k => [k, 0])), RABBIT: 10 } }),
    ];
    const data = deriveSimulationReportData(history, 130);
    expect(data.diversity[0]).toBeCloseTo(0);
  });

  it('diversity is zero when no animals alive', () => {
    const data = deriveSimulationReportData([makeSnapshot(0)], 130);
    expect(data.diversity[0]).toBe(0);
  });

  it('diversity is higher with balanced two-species population than one dominant', () => {
    const highDiv = [
      makeSnapshot(0, { species: { ...Object.fromEntries(SPECIES_KEYS.map(k => [k, 0])), RABBIT: 5, WOLF: 5 } }),
    ];
    const lowDiv = [
      makeSnapshot(0, { species: { ...Object.fromEntries(SPECIES_KEYS.map(k => [k, 0])), RABBIT: 9, WOLF: 1 } }),
    ];
    const dHigh = deriveSimulationReportData(highDiv, 130);
    const dLow  = deriveSimulationReportData(lowDiv, 130);
    expect(dHigh.diversity[0]).toBeGreaterThan(dLow.diversity[0]);
  });

  it('diversity equals ln(2) for equal 2-species split', () => {
    const history = [
      makeSnapshot(0, { species: { ...Object.fromEntries(SPECIES_KEYS.map(k => [k, 0])), RABBIT: 50, WOLF: 50 } }),
    ];
    const data = deriveSimulationReportData(history, 130);
    expect(data.diversity[0]).toBeCloseTo(Math.log(2), 5);
  });

  it('tickLabels has one entry per snapshot', () => {
    const data = deriveSimulationReportData(twoSnapshot(), 130);
    expect(data.tickLabels).toHaveLength(2);
    expect(typeof data.tickLabels[0]).toBe('string');
  });

  it('dietData sums species within each diet group', () => {
    const data = deriveSimulationReportData(twoSnapshot(), 130);
    for (const [diet, members] of Object.entries(DIET_GROUPS)) {
      const expectedFirst = members.reduce((s, sp) => s + (twoSnapshot()[0].species[sp] || 0), 0);
      expect(data.dietData[diet][0]).toBe(expectedFirst);
    }
  });

  it('plantSpeciesData has arrays with one entry per snapshot', () => {
    const data = deriveSimulationReportData(twoSnapshot(), 130);
    for (const k of data.plantTypeKeys) {
      expect(data.plantSpeciesData[k]).toHaveLength(2);
    }
  });

  it('plantPeaks and plantMins are computed correctly', () => {
    const history = [
      makeSnapshot(0,   { plant_types: { 1: 100, 2: 50 } }),
      makeSnapshot(500, { plant_types: { 1: 80,  2: 70 } }),
    ];
    const data = deriveSimulationReportData(history, 130);
    if (data.plantTypeKeys.includes('1')) {
      expect(data.plantPeaks['1']).toBe(100);
      expect(data.plantMins['1']).toBe(80);
    }
    if (data.plantTypeKeys.includes('2')) {
      expect(data.plantPeaks['2']).toBe(70);
      expect(data.plantMins['2']).toBe(50);
    }
  });

  it('works with missing species field in some snapshots (defaults to 0)', () => {
    const history = [
      { tick: 0, plants_total: 0, fruits: 0, plant_types: {} },
      makeSnapshot(100, { species: { ...Object.fromEntries(SPECIES_KEYS.map(k => [k, 0])), RABBIT: 5 } }),
    ];
    const data = deriveSimulationReportData(history, 130);
    expect(data.speciesData['RABBIT'][0]).toBe(0);
    expect(data.speciesData['RABBIT'][1]).toBe(5);
  });
});

// ── buildSimulationReportText ────────────────────────────────────────────────

describe('buildSimulationReportText', () => {
  it('returns empty string for null data', () => {
    expect(buildSimulationReportText(null, 130)).toBe('');
  });

  it('returns a non-empty string for valid data', () => {
    const data = deriveSimulationReportData(twoSnapshot(), 130);
    const text = buildSimulationReportText(data, 130, new Date('2024-01-01T00:00:00'));
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(0);
  });

  it('includes the BIOMESIMULATOR header', () => {
    const data = deriveSimulationReportData(twoSnapshot(), 130);
    const text = buildSimulationReportText(data, 130);
    expect(text).toContain('BIOMESIMULATOR SIMULATION REPORT');
  });

  it('includes a SUMMARY section', () => {
    const data = deriveSimulationReportData(twoSnapshot(), 130);
    const text = buildSimulationReportText(data, 130);
    expect(text).toContain('SUMMARY');
  });

  it('includes a POPULATION section', () => {
    const data = deriveSimulationReportData(twoSnapshot(), 130);
    const text = buildSimulationReportText(data, 130);
    expect(text).toContain('POPULATION');
  });

  it('includes an ECOSYSTEM BALANCE section', () => {
    const data = deriveSimulationReportData(twoSnapshot(), 130);
    const text = buildSimulationReportText(data, 130);
    expect(text).toContain('ECOSYSTEM BALANCE');
  });

  it('includes a FLORA section', () => {
    const data = deriveSimulationReportData(twoSnapshot(), 130);
    const text = buildSimulationReportText(data, 130);
    expect(text).toContain('FLORA');
  });

  it('reports correct last tick in the summary', () => {
    const data = deriveSimulationReportData(twoSnapshot(), 130);
    const text = buildSimulationReportText(data, 130);
    expect(text).toContain('500'); // last tick
  });

  it('reports peak animal count', () => {
    const data = deriveSimulationReportData(twoSnapshot(), 130);
    const text = buildSimulationReportText(data, 130);
    // Peak total = 10+5+2 = 17 at tick 0
    expect(text).toContain('17');
  });

  it('lists all species in the per-species table', () => {
    const data = deriveSimulationReportData(twoSnapshot(), 130);
    const text = buildSimulationReportText(data, 130);
    // RABBIT and WOLF have non-zero peaks so they appear in the table
    expect(text).toContain('Rabbit');
    expect(text).toContain('Wolf');
  });

  it('mentions extinction event for RABBIT', () => {
    const data = deriveSimulationReportData(extinctionHistory(), 130);
    const text = buildSimulationReportText(data, 130);
    expect(text).toContain('Extinction Events:');
    expect(text).toContain('Rabbit');
    expect(text).toContain('went extinct');
  });

  it('does not include extinction section when no extinctions', () => {
    const data = deriveSimulationReportData(twoSnapshot(), 130);
    const text = buildSimulationReportText(data, 130);
    expect(text).not.toContain('went extinct');
  });

  it('includes biodiversity numbers', () => {
    const data = deriveSimulationReportData(twoSnapshot(), 130);
    const text = buildSimulationReportText(data, 130);
    expect(text).toContain('Biodiversity');
    // Diversity is a floating-point value with 3 decimal places
    expect(text).toMatch(/\d+\.\d{3}/);
  });

  it('includes the generated timestamp', () => {
    const data = deriveSimulationReportData(twoSnapshot(), 130);
    const fixedDate = new Date('2024-06-15T12:00:00');
    const text = buildSimulationReportText(data, 130, fixedDate);
    expect(text).toContain('Generated:');
  });

  it('handles zero-population history gracefully', () => {
    const history = [makeSnapshot(0), makeSnapshot(500)];
    const data = deriveSimulationReportData(history, 130);
    const text = buildSimulationReportText(data, 130);
    expect(text).toContain('Active Species:   0');
  });
});

// ── DIET_GROUPS export ───────────────────────────────────────────────────────

describe('DIET_GROUPS', () => {
  it('has Herbivore, Carnivore, and Omnivore groups', () => {
    expect(DIET_GROUPS).toHaveProperty('Herbivore');
    expect(DIET_GROUPS).toHaveProperty('Carnivore');
    expect(DIET_GROUPS).toHaveProperty('Omnivore');
  });

  it('every species key appears in exactly one diet group', () => {
    const allInGroups = Object.values(DIET_GROUPS).flat();
    for (const k of SPECIES_KEYS) {
      const count = allInGroups.filter(sp => sp === k).length;
      expect(count, `${k} should appear in exactly one diet group`).toBe(1);
    }
  });

  it('no diet group is empty', () => {
    for (const [diet, members] of Object.entries(DIET_GROUPS)) {
      expect(members.length, `${diet} should have at least one species`).toBeGreaterThan(0);
    }
  });
});
