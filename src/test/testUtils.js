import { REPRO_SEXUAL } from '../engine/config.js';

export function createAnimalConfig(overrides = {}) {
  const base = {
    diet: 'HERBIVORE',
    reproduction: REPRO_SEXUAL,
    speed: 1,
    vision_range: 6,
    max_energy: 100,
    max_hp: 20,
    max_age: 100,
    mature_age: 10,
    life_stage_ages: [5, 10, 15],
    energy_costs: { IDLE: 0, WALK: 1, RUN: 2, FLY: 3 },
    initial_state: {
      energy_fraction: 0.8,
      hunger_range: [0, 0],
      thirst_range: [0, 0],
    },
    walkable_terrain: [1],
    edible_plants: [],
    prey_species: [],
    action_history_max_size: 10,
    max_hunger: 100,
    max_thirst: 100,
    hunger_rate: 4,
    thirst_rate: 6,
    health_penalty: {
      threshold_fraction: 0.8,
      max_penalty: 0.5,
    },
    metabolic_multipliers: {
      hunger: {
        BABY: 1,
        YOUNG: 1,
        YOUNG_ADULT: 1,
        ADULT: 1,
        PUPA: 1,
      },
      thirst: {
        BABY: 1,
        YOUNG: 1,
        YOUNG_ADULT: 1,
        ADULT: 1,
        PUPA: 1,
      },
    },
  };

  return {
    ...base,
    ...overrides,
    energy_costs: {
      ...base.energy_costs,
      ...(overrides.energy_costs || {}),
    },
    initial_state: {
      ...base.initial_state,
      ...(overrides.initial_state || {}),
    },
    health_penalty: {
      ...base.health_penalty,
      ...(overrides.health_penalty || {}),
    },
    metabolic_multipliers: {
      hunger: {
        ...base.metabolic_multipliers.hunger,
        ...(overrides.metabolic_multipliers?.hunger || {}),
      },
      thirst: {
        ...base.metabolic_multipliers.thirst,
        ...(overrides.metabolic_multipliers?.thirst || {}),
      },
    },
  };
}

export function createGridWorld({ width = 5, height = 5, blocked = [], terrainId = 1 } = {}) {
  const blockedSet = new Set(blocked.map(([x, y]) => `${x},${y}`));

  return {
    width,
    height,
    _benchmarkCollector: null,
    isWalkable(x, y) {
      return x >= 0 && y >= 0 && x < width && y < height && !blockedSet.has(`${x},${y}`);
    },
    isWalkableFor(x, y, walkableSet) {
      return this.isWalkable(x, y) && walkableSet.has(terrainId);
    },
  };
}