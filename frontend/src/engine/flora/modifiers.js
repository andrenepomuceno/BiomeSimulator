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