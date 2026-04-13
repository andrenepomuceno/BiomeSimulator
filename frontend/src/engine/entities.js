/**
 * Animal entity with state machine and sex system.
 */
import { SEX_MALE, SEX_FEMALE, SEX_ASEXUAL, SEX_HERMAPHRODITE, REPRO_SEXUAL, REPRO_HERMAPHRODITE } from './config.js';

export const AnimalState = {
  IDLE: 0,
  WALKING: 1,
  RUNNING: 2,
  EATING: 3,
  DRINKING: 4,
  SLEEPING: 5,
  ATTACKING: 6,
  FLEEING: 7,
  MATING: 8,
  DEAD: 9,
};

export const LifeStage = {
  BABY: 0,
  YOUNG: 1,
  YOUNG_ADULT: 2,
  ADULT: 3,
};

export class Animal {
  constructor(id, x, y, species, config) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.species = species; // "RABBIT", "WOLF", etc.
    this.diet = config.diet || 'HERBIVORE'; // "HERBIVORE" or "CARNIVORE"
    this.state = AnimalState.IDLE;
    this._config = config;

    // Assign sex based on reproduction mode
    const repro = config.reproduction || REPRO_SEXUAL;
    if (repro === REPRO_SEXUAL) {
      this.sex = Math.random() < 0.5 ? SEX_MALE : SEX_FEMALE;
    } else if (repro === REPRO_HERMAPHRODITE) {
      this.sex = SEX_HERMAPHRODITE;
    } else {
      this.sex = SEX_ASEXUAL;
    }

    this.energy = config.max_energy * 0.8;
    this.hunger = 10 + Math.random() * 20;
    this.thirst = 10 + Math.random() * 20;
    this.age = 0;
    this.alive = true;

    this.targetX = null;
    this.targetY = null;
    this.path = [];
    this.pathIndex = 0;
    this._pathTick = 0; // tick when path was last computed

    this.mateCooldown = 0;
    this.attackCooldown = 0;
    this._deathTick = null;
    this.consumed = false;
    this.homeX = x;
    this.homeY = y;
  }

  get speed() { return this._config.speed; }
  get visionRange() { return this._config.vision_range; }
  get maxEnergy() { return this._config.max_energy; }
  get maxAge() { return this._config.max_age; }
  get matureAge() { return this._config.mature_age; }

  get lifeStage() {
    const ages = this._config.life_stage_ages;
    if (!ages) return this.age >= this.matureAge ? LifeStage.ADULT : LifeStage.YOUNG;
    if (this.age < ages[0]) return LifeStage.BABY;
    if (this.age < ages[1]) return LifeStage.YOUNG;
    if (this.age < ages[2]) return LifeStage.YOUNG_ADULT;
    return LifeStage.ADULT;
  }

  energyCost(actionName) {
    return this._config.energy_costs[actionName] || 0;
  }

  applyEnergyCost(actionName) {
    const cost = this.energyCost(actionName);
    this.energy = Math.max(0, Math.min(this._config.max_energy, this.energy - cost));
  }

  tickNeeds(hungerMult, thirstMult) {
    // Babies and young animals have lower metabolic rates
    const stage = this.lifeStage;
    const hMult = stage === LifeStage.BABY ? 0.5 : stage === LifeStage.YOUNG ? 0.75 : 1;
    const tMult = stage === LifeStage.BABY ? 0.6 : stage === LifeStage.YOUNG ? 0.8 : 1;
    this.hunger = Math.min(this._config.max_hunger, this.hunger + this._config.hunger_rate * hungerMult * hMult);
    this.thirst = Math.min(this._config.max_thirst, this.thirst + this._config.thirst_rate * thirstMult * tMult);
    this.age++;
    if (this.mateCooldown > 0) this.mateCooldown--;
    if (this.attackCooldown > 0) this.attackCooldown--;
  }

  toDict() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      species: this.species,
      diet: this.diet,
      sex: this.sex,
      state: this.state,
      energy: Math.round(this.energy * 10) / 10,
      hunger: Math.round(this.hunger * 10) / 10,
      thirst: Math.round(this.thirst * 10) / 10,
      age: this.age,
      alive: this.alive,
      lifeStage: this.lifeStage,
      mateCooldown: this.mateCooldown,
      attackCooldown: this.attackCooldown,
      targetX: this.targetX,
      targetY: this.targetY,
      _deathTick: this._deathTick,
    };
  }
}
