import { DEFAULT_SEASON_LENGTH_DAYS, DEFAULT_TICKS_PER_DAY } from '../../constants/simulation.js';
import { S_ADULT, S_ADULT_SPROUT, S_FRUIT, S_SEED, S_YOUNG_SPROUT } from './constants.js';

export function _seasonGrowthMult(world) {
  return world.config.season_growth_multiplier || [1.2, 1.0, 0.8, 0.5];
}

export function _seasonReproMult(world) {
  return world.config.season_reproduction_multiplier || [1.5, 1.0, 0.7, 0.2];
}

export function _seasonDeathMult(world) {
  return world.config.season_death_multiplier || [0.8, 1.0, 1.2, 2.0];
}

export function _dirtDeathChance(world) {
  return world.config.plant_dirt_death_chance_by_stage || {
    [S_SEED]: 0.003,
    [S_YOUNG_SPROUT]: 0.002,
    [S_ADULT_SPROUT]: 0.001,
    [S_ADULT]: 0.0005,
    [S_FRUIT]: 0.002,
  };
}

export function getSeason(world) {
  const ticksPerDay = world.config.ticks_per_day || DEFAULT_TICKS_PER_DAY;
  const seasonLengthDays = world.config.season_length_days || DEFAULT_SEASON_LENGTH_DAYS;
  const totalDays = Math.floor(world.clock.tick / ticksPerDay);
  return Math.floor(totalDays / seasonLengthDays) % 4;
}

/**
 * Compute the ambient temperature (°C) for the current tick.
 * Uses a seasonal base + a daily sinusoidal cycle peaking around solar noon.
 */
export function computeTemperature(world) {
  const season = getSeason(world);
  const config = world.config;
  const baseTempsBySeason = config.temperature_base ?? [15, 25, 12, 0];
  const amplitudes = config.temperature_amplitude ?? [8, 10, 7, 5];

  const tpd = world.clock.ticksPerDay;
  const tid = world.clock.tickInDay;
  const dayFrac = world.clock.dayFraction;
  const dayPos = tpd > 0 ? tid / tpd : 0;

  // Daytime: sin arc from 0 at dawn to 1 at solar noon and back to 0 at dusk.
  // Nighttime: slight dip below base (~15% of amplitude) using a half-sin arc.
  let thermCurve;
  if (dayPos < dayFrac) {
    thermCurve = Math.sin(Math.PI * dayPos / dayFrac);
  } else {
    const nightPos = (dayPos - dayFrac) / (1 - dayFrac);
    thermCurve = -0.15 * Math.sin(Math.PI * nightPos);
  }

  return (baseTempsBySeason[season] ?? 15) + (amplitudes[season] ?? 8) * thermCurve;
}

/**
 * Growth rate multiplier based on temperature.
 * Returns 1.0 within the optimal range, ramps down toward a floor of 0.1
 * outside the viable growth range.
 */
export function getTemperatureGrowthMult(temp, config) {
  const optimalMin = config.temperature_optimal_min ?? 10;
  const optimalMax = config.temperature_optimal_max ?? 30;
  const growthMin = config.temperature_growth_min ?? 2;
  const growthMax = config.temperature_growth_max ?? 40;

  if (temp >= optimalMin && temp <= optimalMax) return 1.0;

  if (temp < optimalMin) {
    if (temp <= growthMin) return Math.max(0.1, (temp + 5) / (growthMin + 5));
    // Linear ramp from 0.5 at growthMin to 1.0 at optimalMin
    return 0.5 + 0.5 * ((temp - growthMin) / (optimalMin - growthMin));
  }

  // temp > optimalMax
  if (temp >= growthMax) return 0.6;
  // Linear ramp from 1.0 at optimalMax to 0.6 at growthMax
  return 0.6 + 0.4 * ((growthMax - temp) / (growthMax - optimalMax));
}

/**
 * Death rate multiplier based on temperature.
 * Returns 1.0 in the comfortable range; rises up to ~1.8x from frost
 * and ~1.5x from extreme heat.
 */
export function getTemperatureDeathMult(temp, config) {
  const coldThreshold = config.temperature_death_cold_threshold ?? 4;
  const heatThreshold = config.temperature_death_heat_threshold ?? 35;

  if (temp < coldThreshold) {
    const t = Math.max(0, 1 - (temp + 5) / (coldThreshold + 5));
    return 1 + t * 0.8; // up to 1.8x at extreme cold
  }
  if (temp > heatThreshold) {
    const t = Math.min(1, (temp - heatThreshold) / 10);
    return 1 + t * 0.5; // up to 1.5x at extreme heat
  }
  return 1.0;
}

/**
 * Reproduction rate multiplier based on temperature.
 * Mirrors growth multiplier — plants don't reproduce well outside optimal temps.
 */
export function getTemperatureReproMult(temp, config) {
  return getTemperatureGrowthMult(temp, config);
}