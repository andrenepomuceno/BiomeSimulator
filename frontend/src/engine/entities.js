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
  FLYING: 10,
};

export const LifeStage = {
  BABY: 0,
  YOUNG: 1,
  YOUNG_ADULT: 2,
  ADULT: 3,
};

// Pre-computed reverse lookup: stage number → stage key string
const LIFE_STAGE_KEYS = Object.keys(LifeStage).reduce((acc, key) => {
  acc[LifeStage[key]] = key;
  return acc;
}, []);

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

    const initialState = config.initial_state || {};
    const hungerRange = initialState.hunger_range || [10, 30];
    const thirstRange = initialState.thirst_range || [10, 30];
    this.energy = config.max_energy * (initialState.energy_fraction ?? 0.8);
    this.hp = config.max_hp;
    this.hunger = hungerRange[0] + Math.random() * Math.max(0, hungerRange[1] - hungerRange[0]);
    this.thirst = thirstRange[0] + Math.random() * Math.max(0, thirstRange[1] - thirstRange[0]);
    this.age = 0;
    this.alive = true;

    this.targetX = null;
    this.targetY = null;
    this.path = [];
    this.pathIndex = 0;
    this._pathTick = 0; // tick when path was last computed
    this._cachedThreat = null;
    this._cachedThreatTick = -1;
    this._nextThreatCheckTick = 0;

    this.mateCooldown = 0;
    this.gestationTicksRemaining = 0;
    this.gestationPartnerId = null;
    this.attackCooldown = 0;
    this._deathTick = null;
    this.consumed = false;
    this.homeX = x;
    this.homeY = y;

    // Terrain / diet sets for fast O(1) lookups
    this._walkableSet = new Set(config.walkable_terrain || [1, 2, 3, 5, 8]);
    this._ediblePlants = new Set(config.edible_plants || []);
    this._preySpecies = new Set(config.prey_species || []);

    // Recent action history — ring buffer (capped at action_history_max_size)
    this._actionBuf = [];
    this._actionBufIdx = 0;
    this._actionBufFull = false;
    this._actionMaxSize = config.action_history_max_size || 100;

    // Dirty tracking for incremental serialization
    this._dirty = true;
    this._birthTick = 0;
  }

  /** Ordered action history (oldest first). */
  get actionHistory() {
    if (!this._actionBufFull) return this._actionBuf;
    // Ring is full — return in chronological order
    return this._actionBuf.slice(this._actionBufIdx).concat(this._actionBuf.slice(0, this._actionBufIdx));
  }

  set actionHistory(arr) {
    if (!arr || arr.length === 0) {
      this._actionBuf = [];
      this._actionBufIdx = 0;
      this._actionBufFull = false;
      return;
    }
    const max = this._actionMaxSize;
    if (arr.length <= max) {
      this._actionBuf = arr.slice();
      this._actionBufIdx = 0;
      this._actionBufFull = false;
    } else {
      this._actionBuf = arr.slice(-max);
      this._actionBufIdx = 0;
      this._actionBufFull = false;
    }
  }

  /** Log an important action (O(1) ring buffer). */
  logAction(tick, action, detail) {
    const entry = { tick, action, detail };
    const max = this._actionMaxSize;
    if (!this._actionBufFull) {
      this._actionBuf.push(entry);
      if (this._actionBuf.length >= max) {
        this._actionBufFull = true;
        this._actionBufIdx = 0;
      }
    } else {
      this._actionBuf[this._actionBufIdx] = entry;
      this._actionBufIdx = (this._actionBufIdx + 1) % max;
    }
  }

  get speed() { return this._config.speed; }
  get visionRange() { return this._config.vision_range; }
  get maxEnergy() { return this._config.max_energy; }
  get maxHp() { return this._config.max_hp; }
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
    this._dirty = true;
  }

  tickNeeds(hungerMult, thirstMult) {
    const stage = this.lifeStage;
    const stageKey = LIFE_STAGE_KEYS[stage] || 'ADULT';
    const hMult = this._config.metabolic_multipliers?.hunger?.[stageKey] ?? 1;
    const tMult = this._config.metabolic_multipliers?.thirst?.[stageKey] ?? 1;
    this.hunger = Math.min(this._config.max_hunger, this.hunger + this._config.hunger_rate * hungerMult * hMult);
    this.thirst = Math.min(this._config.max_thirst, this.thirst + this._config.thirst_rate * thirstMult * tMult);

    const healthPenalty = this._config.health_penalty || {};
    const thresholdFraction = healthPenalty.threshold_fraction ?? 0.8;
    const maxPenalty = healthPenalty.max_penalty ?? 0.5;
    const hungerThreshold = this._config.max_hunger * thresholdFraction;
    const thirstThreshold = this._config.max_thirst * thresholdFraction;
    if (this.hunger > hungerThreshold) {
      const penalty = maxPenalty * (this.hunger - hungerThreshold) / (this._config.max_hunger - hungerThreshold);
      this.hp -= penalty;
    }
    if (this.thirst > thirstThreshold) {
      const penalty = maxPenalty * (this.thirst - thirstThreshold) / (this._config.max_thirst - thirstThreshold);
      this.hp -= penalty;
    }

    this.age++;
    if (this.mateCooldown > 0) this.mateCooldown--;
    if (this.gestationTicksRemaining > 0) this.gestationTicksRemaining--;
    if (this.attackCooldown > 0) this.attackCooldown--;
    this._dirty = true;
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
      hp: Math.round(this.hp * 10) / 10,
      maxHp: this.maxHp,
      hunger: Math.round(this.hunger * 10) / 10,
      thirst: Math.round(this.thirst * 10) / 10,
      age: this.age,
      alive: this.alive,
      lifeStage: this.lifeStage,
      mateCooldown: this.mateCooldown,
      gestationTicksRemaining: this.gestationTicksRemaining,
      attackCooldown: this.attackCooldown,
      targetX: this.targetX,
      targetY: this.targetY,
      _deathTick: this._deathTick,
      actionHistory: this.actionHistory,
    };
  }

  /** Lightweight delta for incremental updates (only changed fields). */
  toDelta() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      state: this.state,
      energy: Math.round(this.energy * 10) / 10,
      hp: Math.round(this.hp * 10) / 10,
      hunger: Math.round(this.hunger * 10) / 10,
      thirst: Math.round(this.thirst * 10) / 10,
      age: this.age,
      alive: this.alive,
      lifeStage: this.lifeStage,
      mateCooldown: this.mateCooldown,
      gestationTicksRemaining: this.gestationTicksRemaining,
      targetX: this.targetX,
      targetY: this.targetY,
      _deathTick: this._deathTick,
    };
  }

  /** Full internal state for sub-worker transfer. */
  toWorkerState() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      species: this.species,
      diet: this.diet,
      sex: this.sex,
      state: this.state,
      energy: this.energy,
      hp: this.hp,
      hunger: this.hunger,
      thirst: this.thirst,
      age: this.age,
      alive: this.alive,
      mateCooldown: this.mateCooldown,
      gestationTicksRemaining: this.gestationTicksRemaining,
      gestationPartnerId: this.gestationPartnerId,
      attackCooldown: this.attackCooldown,
      path: this.path,
      pathIndex: this.pathIndex,
      _pathTick: this._pathTick,
      _cachedThreatTick: this._cachedThreatTick,
      _nextThreatCheckTick: this._nextThreatCheckTick,
      _deathTick: this._deathTick,
      consumed: this.consumed,
      homeX: this.homeX,
      homeY: this.homeY,
      targetX: this.targetX,
      targetY: this.targetY,
      _birthTick: this._birthTick,
      actionHistory: this.actionHistory,
    };
  }

  /** Clear dirty flag after serialization. */
  clearDirty() {
    this._dirty = false;
  }
}
