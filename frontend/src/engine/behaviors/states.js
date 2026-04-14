import { AnimalState } from '../entities.js';
import { _recoveryConfig } from './utils.js';

export function _doSleep(animal, world) {
  const recovery = _recoveryConfig(animal);
  animal.applyEnergyCost('SLEEP');
  animal.hp = Math.min(animal.maxHp, animal.hp + (recovery.sleep_hp ?? 0.8));
  if (animal.energy >= (recovery.sleep_exit_energy ?? 70)) {
    animal.state = AnimalState.IDLE;
    animal.logAction(world.clock.tick, 'WOKE_UP', { energy: Math.round(animal.energy) });
  }
}

export function _doEat(animal) {
  const recovery = _recoveryConfig(animal);
  animal.hunger = Math.max(0, animal.hunger - (recovery.eat_hunger ?? 45));
  animal.energy = Math.min(animal.maxEnergy, animal.energy + (recovery.eat_energy ?? 5));
  animal.hp = Math.min(animal.maxHp, animal.hp + (recovery.eat_hp ?? 2));
  animal.applyEnergyCost('EAT');
  animal.state = AnimalState.IDLE;
}

export function _doDrink(animal, world) {
  const recovery = _recoveryConfig(animal);
  const thirstBefore = animal.thirst;
  animal.thirst = Math.max(0, animal.thirst - (recovery.drink_thirst ?? 55));
  animal.applyEnergyCost('DRINK');
  animal.state = AnimalState.IDLE;
  animal.logAction(world.clock.tick, 'DRANK', { thirstReduced: Math.round(thirstBefore - animal.thirst) });
}