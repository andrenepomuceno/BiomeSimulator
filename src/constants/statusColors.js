export const STATUS_COLORS_HEX = {
  critical: '#dd4444',
  warning: '#ddaa33',
  healthy: '#33bb33',
  herbivore: '#66cc66',
  omnivore: '#cc8844',
};

export const BADGE_TONE_STYLES = {
  neutral: {
    background: 'rgba(122, 138, 160, 0.18)',
    borderColor: 'rgba(161, 177, 200, 0.28)',
    color: '#edf4f8',
  },
  info: {
    background: 'rgba(77, 150, 255, 0.2)',
    borderColor: 'rgba(116, 180, 255, 0.34)',
    color: '#edf7ff',
  },
  success: {
    background: 'rgba(102, 204, 102, 0.2)',
    borderColor: 'rgba(144, 226, 144, 0.34)',
    color: '#effff0',
  },
  warning: {
    background: 'rgba(255, 170, 51, 0.22)',
    borderColor: 'rgba(255, 196, 116, 0.34)',
    color: '#fff7ec',
  },
  danger: {
    background: 'rgba(255, 86, 86, 0.2)',
    borderColor: 'rgba(255, 126, 126, 0.34)',
    color: '#fff0f0',
  },
  accent: {
    background: 'rgba(170, 136, 204, 0.2)',
    borderColor: 'rgba(198, 170, 226, 0.34)',
    color: '#f8f1ff',
  },
  pink: {
    background: 'rgba(255, 102, 170, 0.2)',
    borderColor: 'rgba(255, 153, 202, 0.34)',
    color: '#fff0f7',
  },
};

export const ANIMAL_STATE_TONES = {
  0: 'neutral',
  1: 'info',
  2: 'warning',
  3: 'success',
  4: 'info',
  5: 'accent',
  6: 'danger',
  7: 'warning',
  8: 'pink',
  10: 'info',
};

export function getBadgeToneStyle(tone = 'neutral') {
  return BADGE_TONE_STYLES[tone] || BADGE_TONE_STYLES.neutral;
}

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

export const PLANT_PRESENCE_THRESHOLDS = {
  dominant: 0.2,
  common: 0.08,
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

export function getPopulationStatusTone(ratio) {
  if (ratio > POPULATION_STATUS_THRESHOLDS.critical) return 'danger';
  if (ratio > POPULATION_STATUS_THRESHOLDS.warning) return 'warning';
  return 'success';
}

export function getPresenceStatusTone({ current = 0, peak = 0 }) {
  if (peak === 0) return 'neutral';
  if (current === 0) return 'danger';
  return 'success';
}

export function getPlantPresenceStatus({ current = 0, total = 0 }) {
  if (total <= 0) return { tone: 'neutral', label: 'No data' };
  if (current <= 0) return { tone: 'danger', label: 'Extinct' };

  const ratio = current / total;
  if (ratio >= PLANT_PRESENCE_THRESHOLDS.dominant) {
    return { tone: 'accent', label: 'Dominant' };
  }
  if (ratio >= PLANT_PRESENCE_THRESHOLDS.common) {
    return { tone: 'success', label: 'Common' };
  }
  return { tone: 'warning', label: 'Rare' };
}