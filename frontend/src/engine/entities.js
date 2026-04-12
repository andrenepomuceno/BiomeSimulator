/**
 * Animal entity with state machine.
 */

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

export class Animal {
  constructor(id, x, y, species, config) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.species = species; // "HERBIVORE" or "CARNIVORE"
    this.state = AnimalState.IDLE;
    this._config = config;

    this.energy = config.max_energy * 0.8;
    this.hunger = 10 + Math.random() * 20;
    this.thirst = 10 + Math.random() * 20;
    this.age = 0;
    this.alive = true;

    this.targetX = null;
    this.targetY = null;
    this.path = [];
    this.pathIndex = 0;

    this.mateCooldown = 0;
    this.attackCooldown = 0;
  }

  get speed() { return this._config.speed; }
  get visionRange() { return this._config.vision_range; }
  get maxEnergy() { return this._config.max_energy; }
  get maxAge() { return this._config.max_age; }
  get matureAge() { return this._config.mature_age; }

  energyCost(actionName) {
    return this._config.energy_costs[actionName] || 0;
  }

  applyEnergyCost(actionName) {
    const cost = this.energyCost(actionName);
    this.energy = Math.max(0, Math.min(this._config.max_energy, this.energy - cost));
  }

  tickNeeds() {
    this.hunger = Math.min(this._config.max_hunger, this.hunger + this._config.hunger_rate);
    this.thirst = Math.min(this._config.max_thirst, this.thirst + this._config.thirst_rate);
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
      state: this.state,
      energy: Math.round(this.energy * 10) / 10,
      hunger: Math.round(this.hunger * 10) / 10,
      thirst: Math.round(this.thirst * 10) / 10,
      age: this.age,
      alive: this.alive,
    };
  }
}
