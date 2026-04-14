import { S_ADULT, S_FRUIT, S_SEED } from '../flora.js';
import { buildDecisionIntervals } from '../animalSpecies.js';
import { buildEdibleStagesMap } from '../plantSpecies.js';

export const DECISION_INTERVALS = buildDecisionIntervals();

const EDIBLE_STAGES = buildEdibleStagesMap();

export const STAGE_NUTRITION = {
  [S_SEED]: { hunger: 15, energy: 2 },
  [S_ADULT]: { hunger: 35, energy: 4 },
  [S_FRUIT]: { hunger: 55, energy: 8 },
};

export const STAGE_LOG_NAMES = { 1: 'seed', 2: 'sprout', 3: 'bush', 4: 'adult', 5: 'fruit' };

export function _canEatPlant(animal, plantType) {
  return animal._ediblePlants.size === 0 || animal._ediblePlants.has(plantType);
}

export function _canHunt(animal, target) {
  return animal._preySpecies.size === 0 || animal._preySpecies.has(target.species);
}

export function _canFly(animal) {
  return !!animal._config.can_fly;
}

export function _plantHungerReduction(animal, base) {
  if (animal.diet === 'CARNIVORE') return Math.round(base * 0.45);
  return animal.diet === 'OMNIVORE' ? Math.round(base * 0.55) : base;
}

export function _plantEnergyGain(animal, base) {
  if (animal.diet === 'CARNIVORE') return Math.round(base * 0.4);
  return animal.diet === 'OMNIVORE' ? Math.round(base * 0.5) : base;
}

export function _decisionThresholds(animal) {
  return animal._config.decision_thresholds || {};
}

export function _recoveryConfig(animal) {
  return animal._config.recovery || {};
}

export function _combatConfig(animal) {
  return animal._config.combat || {};
}

export function _idleRecover(animal) {
  const recovery = _recoveryConfig(animal);
  animal.energy = Math.min(animal.maxEnergy, animal.energy + (recovery.idle_energy ?? 0.01));
  animal.hp = Math.min(animal.maxHp, animal.hp + (recovery.idle_hp ?? 0.01));
}

export function _calculateEffectiveSleepThreshold(animal, isNight, config) {
  const baseThreshold = _decisionThresholds(animal).sleep_energy_min ?? 20;
  const nocturnal = animal._config.nocturnal || false;
  const offset = config.sleep_threshold_offset_wrong_period ?? 10;
  const isWrongPeriod = (nocturnal && !isNight) || (!nocturnal && isNight);
  return isWrongPeriod ? baseThreshold + offset : baseThreshold;
}

export function _applyEnergyCostWithModifier(animal, actionName, isNight, config) {
  const baseCost = animal.energyCost(actionName);
  const nocturnal = animal._config.nocturnal || false;
  const penaltyMultiplier = config.activity_energy_penalty_wrong_period ?? 1.3;
  const isWrongPeriod = (nocturnal && !isNight) || (!nocturnal && isNight);
  const finalCost = isWrongPeriod ? baseCost * penaltyMultiplier : baseCost;

  animal.energy = Math.max(0, Math.min(animal.maxEnergy, animal.energy - finalCost));
  animal._dirty = true;
}

export function _isEdibleStage(plantType, stage) {
  const stages = EDIBLE_STAGES[plantType];
  return stages != null && stages.has(stage);
}