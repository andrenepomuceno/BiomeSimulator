import { afterEach, describe, expect, it, vi } from 'vitest';
import { REPRO_HERMAPHRODITE, REPRO_SEXUAL, SEX_HERMAPHRODITE, SEX_MALE } from '../config.js';
import { Animal, LifeStage } from '../entities.js';
import { createAnimalConfig } from '../../test/testUtils.js';

describe('Animal', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('assigns sex from the reproduction mode at construction time', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.25);

    const sexual = new Animal(1, 0.5, 0.5, 'TEST', createAnimalConfig({ reproduction: REPRO_SEXUAL }));
    const hermaphrodite = new Animal(2, 0.5, 0.5, 'TEST', createAnimalConfig({ reproduction: REPRO_HERMAPHRODITE }));

    expect(sexual.sex).toBe(SEX_MALE);
    expect(hermaphrodite.sex).toBe(SEX_HERMAPHRODITE);
  });

  it('transitions from egg stage into hatchling stats when incubation completes', () => {
    const animal = new Animal(1, 0.5, 0.5, 'TEST', createAnimalConfig());
    animal._isEggStage = true;
    animal._incubationPeriod = 3;
    animal.age = 2;
    animal.hp = 1;
    animal.energy = 5;
    animal.hunger = 10;
    animal.thirst = 20;

    animal.tickNeeds(1, 1);

    expect(animal.age).toBe(3);
    expect(animal.lifeStage).toBe(LifeStage.BABY);
    expect(animal.hp).toBe(animal.maxHp);
    expect(animal.energy).toBe(animal.maxEnergy * 0.5);
    expect(animal.hunger).toBe(0);
    expect(animal.thirst).toBe(0);
  });

  it('keeps pupa metabolism suspended while still aging and reducing cooldowns', () => {
    const animal = new Animal(1, 0.5, 0.5, 'TEST', createAnimalConfig({
      life_stage_ages: [2, 4, 6],
      pupa_age: 5,
      pupa_duration: 3,
    }));
    animal.age = 5;
    animal.hunger = 12;
    animal.thirst = 14;
    animal.mateCooldown = 2;
    animal.attackCooldown = 1;

    animal.tickNeeds(2, 2);

    expect(animal.lifeStage).toBe(LifeStage.PUPA);
    expect(animal.age).toBe(6);
    expect(animal.hunger).toBe(12);
    expect(animal.thirst).toBe(14);
    expect(animal.mateCooldown).toBe(1);
    expect(animal.attackCooldown).toBe(0);
  });

  it('applies gestation metabolism and reduces the gestation timer', () => {
    const animal = new Animal(1, 0.5, 0.5, 'TEST', createAnimalConfig());
    animal.age = 20;
    animal.pregnant = true;
    animal.gestationTimer = 4;

    animal.tickNeeds(1, 1);

    expect(animal.hunger).toBe(5);
    expect(animal.thirst).toBe(7.5);
    expect(animal.gestationTimer).toBe(3);
  });
});