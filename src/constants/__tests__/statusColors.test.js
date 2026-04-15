import { describe, expect, it } from 'vitest';
import {
  STATUS_COLORS_INT,
  STATUS_COLORS_HEX,
  ENERGY_STATUS_THRESHOLDS,
  POPULATION_STATUS_THRESHOLDS,
  getEnergyStatusColorInt,
  getPopulationStatusColor,
} from '../statusColors.js';

describe('getEnergyStatusColorInt', () => {
  it('returns critical below the critical threshold', () => {
    expect(getEnergyStatusColorInt(0)).toBe(STATUS_COLORS_INT.critical);
    expect(getEnergyStatusColorInt(0.1)).toBe(STATUS_COLORS_INT.critical);
    expect(getEnergyStatusColorInt(ENERGY_STATUS_THRESHOLDS.critical - 0.01)).toBe(STATUS_COLORS_INT.critical);
  });

  it('returns warning between critical and warning thresholds', () => {
    expect(getEnergyStatusColorInt(ENERGY_STATUS_THRESHOLDS.critical)).toBe(STATUS_COLORS_INT.warning);
    expect(getEnergyStatusColorInt(ENERGY_STATUS_THRESHOLDS.warning - 0.01)).toBe(STATUS_COLORS_INT.warning);
  });

  it('returns healthy at or above the warning threshold', () => {
    expect(getEnergyStatusColorInt(ENERGY_STATUS_THRESHOLDS.warning)).toBe(STATUS_COLORS_INT.healthy);
    expect(getEnergyStatusColorInt(1.0)).toBe(STATUS_COLORS_INT.healthy);
  });
});

describe('getPopulationStatusColor', () => {
  it('returns default color when below the warning threshold', () => {
    expect(getPopulationStatusColor(0)).toBe(STATUS_COLORS_HEX.herbivore);
    expect(getPopulationStatusColor(POPULATION_STATUS_THRESHOLDS.warning)).toBe(STATUS_COLORS_HEX.herbivore);
  });

  it('returns warning color between warning and critical', () => {
    expect(getPopulationStatusColor(POPULATION_STATUS_THRESHOLDS.warning + 0.01)).toBe(STATUS_COLORS_HEX.warning);
    expect(getPopulationStatusColor(POPULATION_STATUS_THRESHOLDS.critical)).toBe(STATUS_COLORS_HEX.warning);
  });

  it('returns critical color above the critical threshold', () => {
    expect(getPopulationStatusColor(POPULATION_STATUS_THRESHOLDS.critical + 0.01)).toBe(STATUS_COLORS_HEX.critical);
    expect(getPopulationStatusColor(1.0)).toBe(STATUS_COLORS_HEX.critical);
  });

  it('accepts a custom defaultColor', () => {
    expect(getPopulationStatusColor(0, '#ffffff')).toBe('#ffffff');
  });
});
