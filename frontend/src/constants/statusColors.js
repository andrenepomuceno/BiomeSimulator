export const STATUS_COLORS_HEX = {
  critical: '#dd4444',
  warning: '#ddaa33',
  healthy: '#33bb33',
  herbivore: '#66cc66',
  omnivore: '#cc8844',
};

export const STATUS_COLORS_INT = {
  critical: 0xdd4444,
  warning: 0xddaa33,
  healthy: 0x33bb33,
};

export const ENERGY_STATUS_THRESHOLDS = {
  critical: 0.25,
  warning: 0.6,
};

export const POPULATION_STATUS_THRESHOLDS = {
  warning: 0.6,
  critical: 0.8,
};

export const DIET_COLORS = {
  Herbivore: STATUS_COLORS_HEX.herbivore,
  Carnivore: STATUS_COLORS_HEX.critical,
  Omnivore: STATUS_COLORS_HEX.omnivore,
};

export function getEnergyStatusColorInt(ratio) {
  if (ratio < ENERGY_STATUS_THRESHOLDS.critical) return STATUS_COLORS_INT.critical;
  if (ratio < ENERGY_STATUS_THRESHOLDS.warning) return STATUS_COLORS_INT.warning;
  return STATUS_COLORS_INT.healthy;
}

export function getPopulationStatusColor(ratio, defaultColor = STATUS_COLORS_HEX.herbivore) {
  if (ratio > POPULATION_STATUS_THRESHOLDS.critical) return STATUS_COLORS_HEX.critical;
  if (ratio > POPULATION_STATUS_THRESHOLDS.warning) return STATUS_COLORS_HEX.warning;
  return defaultColor;
}