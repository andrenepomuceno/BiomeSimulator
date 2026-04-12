/**
 * World model — terrain, plant grids (parallel TypedArrays), animals, clock.
 */

// Terrain types
export const WATER = 0;
export const SAND = 1;
export const DIRT = 2;
export const GRASS = 3;
export const ROCK = 4;

export const TERRAIN_NAMES = { 0: 'water', 1: 'sand', 2: 'dirt', 3: 'grass', 4: 'rock' };

export class Clock {
  constructor(ticksPerDay = 200, dayFraction = 0.6) {
    this.tick = 0;
    this.ticksPerDay = ticksPerDay;
    this.dayFraction = dayFraction;
  }

  get dayNumber() {
    return Math.floor(this.tick / this.ticksPerDay);
  }

  get tickInDay() {
    return this.tick % this.ticksPerDay;
  }

  get isNight() {
    return this.tickInDay >= Math.floor(this.ticksPerDay * this.dayFraction);
  }

  advance() {
    this.tick++;
  }

  toDict() {
    return {
      tick: this.tick,
      day: this.dayNumber,
      tick_in_day: this.tickInDay,
      is_night: this.isNight,
      ticks_per_day: this.ticksPerDay,
    };
  }
}

export class World {
  constructor(config) {
    this.config = config;
    this.width = config.map_width;
    this.height = config.map_height;
    const size = this.width * this.height;

    // Terrain: flat Uint8Array [h * w], row-major (index = y * w + x)
    this.terrain = new Uint8Array(size);

    // Water proximity: distance to nearest water tile (capped at 255)
    this.waterProximity = new Uint8Array(size).fill(255);

    // Plant grid: parallel typed arrays for performance
    this.plantType = new Uint8Array(size);   // 0=none, 1=grass, 2=bush, 3=tree
    this.plantStage = new Uint8Array(size);  // 0=none, 1=seed, 2=sprout, 3=mature, 4=fruiting, 5=dead
    this.plantAge = new Uint16Array(size);
    this.plantFruit = new Uint8Array(size);  // 0 or 1

    // Animals
    this.animals = [];

    // Entity ID counter
    this._nextId = 1;

    // Clock
    this.clock = new Clock(
      config.ticks_per_day || 200,
      config.day_fraction || 0.6,
    );

    // Stats history
    this.statsHistory = [];

    // Plant changes per tick (delta for renderer)
    this.plantChanges = [];
  }

  nextId() {
    return this._nextId++;
  }

  idx(x, y) {
    return y * this.width + x;
  }

  isInBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  isWalkable(x, y) {
    if (!this.isInBounds(x, y)) return false;
    const t = this.terrain[this.idx(x, y)];
    return t !== WATER && t !== ROCK;
  }

  isWaterAdjacent(x, y) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx, ny = y + dy;
        if (this.isInBounds(nx, ny) && this.terrain[this.idx(nx, ny)] === WATER) {
          return true;
        }
      }
    }
    return false;
  }

  getStats() {
    let herbivores = 0, carnivores = 0;
    for (const a of this.animals) {
      if (!a.alive) continue;
      if (a.species === 'HERBIVORE') herbivores++;
      else carnivores++;
    }

    let grassCount = 0, bushCount = 0, treeCount = 0, fruits = 0;
    const size = this.width * this.height;
    for (let i = 0; i < size; i++) {
      const t = this.plantType[i];
      const s = this.plantStage[i];
      if (t > 0 && s > 0 && s < 5) {
        if (t === 1) grassCount++;
        else if (t === 2) bushCount++;
        else if (t === 3) treeCount++;
      }
      if (this.plantFruit[i]) fruits++;
    }

    return {
      herbivores,
      carnivores,
      plants_grass: grassCount,
      plants_bush: bushCount,
      plants_tree: treeCount,
      plants_total: grassCount + bushCount + treeCount,
      fruits,
    };
  }
}
