import { AnimalState } from '../entities.js';
import { P_NONE, S_ADULT, S_NONE, S_SEED } from '../flora.js';
import { idxToXY } from '../helpers.js';
import { STAGE_LOG_NAMES, STAGE_NUTRITION, _plantEnergyGain, _plantHungerReduction } from './utils.js';

export function _eatPlantTile(animal, world, idx) {
  const preHunger = animal.hunger;
  const preEnergy = animal.energy;
  const preHp = animal.hp;
  const preState = animal.state;
  const ptype = world.plantType[idx];
  const stage = world.plantStage[idx];
  const preAge = world.plantAge[idx];
  const nutr = STAGE_NUTRITION[stage] || { hunger: 20, energy: 3 };
  animal.hunger = Math.max(0, animal.hunger - _plantHungerReduction(animal, nutr.hunger));
  animal.energy = Math.min(animal.maxEnergy, animal.energy + _plantEnergyGain(animal, nutr.energy));

  const hpGain = stage === S_SEED ? 3 : stage === S_ADULT ? 5 : 10;
  animal.hp = Math.min(animal.maxHp, animal.hp + hpGain);
  animal.state = AnimalState.EATING;
  animal.applyEnergyCost('EAT');

  const [x, y] = idxToXY(idx, world.width);
  animal.logAction(world.clock.tick, 'EAT_PLANT', { plantType: ptype, stage: STAGE_LOG_NAMES[stage] || stage, x, y });
  world.logPlantEvent(idx, 'EATEN', { by: animal.species });
  world.plantType[idx] = P_NONE;
  world.plantStage[idx] = S_NONE;
  world.plantAge[idx] = 0;
  world.activePlantTiles.delete(idx);
  world.plantChanges.push([x, y, P_NONE, S_NONE]);
  if (!world.plantConsumptionClaims) world.plantConsumptionClaims = [];
  world.plantConsumptionClaims.push({
    animalId: animal.id,
    idx,
    preHunger,
    preEnergy,
    preHp,
    preState,
    preType: ptype,
    preStage: stage,
    preAge,
  });
  world.plantEvents.deaths_eaten[ptype] = (world.plantEvents.deaths_eaten[ptype] || 0) + 1;
}