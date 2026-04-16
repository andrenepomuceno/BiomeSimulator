import { describe, expect, it, vi } from 'vitest';

import { AnimalState } from '../entities.js';
import { _doSleep } from '../behaviors/states.js';

function makeSleepingAnimal(overrides = {}) {
  const animal = {
    state: AnimalState.SLEEPING,
    energy: 40,
    hp: 10,
    maxHp: 15,
    maxEnergy: 45,
    _config: {
      recovery: {
        sleep_hp: 0.8,
        sleep_exit_energy: 70,
      },
      ...overrides._config,
    },
    applyEnergyCost(action) {
      if (action === 'SLEEP') {
        this.energy = Math.min(this.maxEnergy, this.energy + 2.2);
      }
    },
    logAction: vi.fn(),
    ...overrides,
  };
  return animal;
}

describe('_doSleep', () => {
  it('wakes species with low maxEnergy once energy reaches maxEnergy', () => {
    const animal = makeSleepingAnimal({ energy: 44.5 });
    const world = { clock: { tick: 12 } };

    _doSleep(animal, world);

    expect(animal.state).toBe(AnimalState.IDLE);
    expect(animal.logAction).toHaveBeenCalledWith(12, 'WOKE_UP', { energy: 45 });
  });

  it('keeps sleeping when below wake threshold', () => {
    const animal = makeSleepingAnimal({ energy: 30, maxEnergy: 80 });
    const world = { clock: { tick: 20 } };

    _doSleep(animal, world);

    expect(animal.state).toBe(AnimalState.SLEEPING);
    expect(animal.logAction).not.toHaveBeenCalled();
  });
});
