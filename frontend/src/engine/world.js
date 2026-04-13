/**
 * World model — terrain, plant grids (parallel TypedArrays), animals, clock.
 */

// Terrain types
export const WATER = 0;
export const SAND = 1;
export const DIRT = 2;
export const SOIL = 3;
export const ROCK = 4;
export const FERTILE_SOIL = 5;
export const DEEP_WATER = 6;
export const MOUNTAIN = 7;
export const MUD = 8;

/** String→number lookup for terrain types (used by species config builders). */
export const TERRAIN_IDS = { WATER, SAND, DIRT, SOIL, ROCK, FERTILE_SOIL, DEEP_WATER, MOUNTAIN, MUD };

export const TERRAIN_NAMES = {
  0: 'water', 1: 'sand', 2: 'dirt', 3: 'soil', 4: 'rock',
  5: 'fertile soil', 6: 'deep water', 7: 'mountain', 8: 'mud',
};

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
    this.plantType = new Uint8Array(size);   // 0=none, 1=grass, 2=strawberry, 3=blueberry, 4=apple_tree, 5=mango_tree, 6=carrot
    this.plantStage = new Uint8Array(size);  // 0=none, 1=seed, 2=youngSprout, 3=adultSprout, 4=adult, 5=fruit, 6=dead
    this.plantAge = new Uint16Array(size);

    // Active plant tile indices — avoids iterating empty tiles
    this.activePlantTiles = new Set();

    // Animal occupancy grid — count of living animals per tile
    this.animalGrid = new Uint8Array(size);

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

    // Plant event counters (accumulated between stats snapshots)
    this.plantEvents = { births: {}, deaths_terrain: {}, deaths_water: {}, deaths_age: {}, deaths_eaten: {}, matured: {} };

    // Per-plant event log (sparse Map: tileIndex → Array of { tick, event, detail })
    this.plantLog = new Map();

    // Global rate multipliers (adjustable at runtime)
    this.hungerMultiplier = 1.0;
    this.thirstMultiplier = 1.0;
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
    return t !== WATER && t !== DEEP_WATER && t !== MOUNTAIN;
  }

  isWalkableFor(x, y, walkableSet) {
    if (!this.isInBounds(x, y)) return false;
    return walkableSet.has(this.terrain[this.idx(x, y)]);
  }

  isTileOccupied(x, y) {
    if (!this.isInBounds(x, y)) return true;
    return this.animalGrid[this.idx(x, y)] > 0;
  }

  placeAnimal(x, y) {
    this.animalGrid[this.idx(x, y)]++;
  }

  vacateAnimal(x, y) {
    const i = this.idx(x, y);
    if (this.animalGrid[i] > 0) this.animalGrid[i]--;
  }

  resetPlantEvents() {
    this.plantEvents = { births: {}, deaths_terrain: {}, deaths_water: {}, deaths_age: {}, deaths_eaten: {}, matured: {} };
  }

  logPlantEvent(idx, event, detail) {
    let log = this.plantLog.get(idx);
    if (!log) {
      log = [];
      this.plantLog.set(idx, log);
    }
    log.push({ tick: this.clock.tick, event, detail });
    if (log.length > 20) log.shift();
  }

  clearPlantLog(idx) {
    this.plantLog.delete(idx);
  }

  isWaterAdjacent(x, y) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx, ny = y + dy;
        if (this.isInBounds(nx, ny)) {
          const t = this.terrain[this.idx(nx, ny)];
          if (t === WATER || t === DEEP_WATER) return true;
        }
      }
    }
    return false;
  }

  getStats() {
    let herbivores = 0, carnivores = 0;
    const speciesCounts = {};
    for (const a of this.animals) {
      if (!a.alive) continue;
      speciesCounts[a.species] = (speciesCounts[a.species] || 0) + 1;
      if (a.diet === 'HERBIVORE') herbivores++;
      else carnivores++;
    }

    let plantsTotal = 0, fruits = 0;
    const plantCounts = {};
    for (const i of this.activePlantTiles) {
      const t = this.plantType[i];
      const s = this.plantStage[i];
      if (t > 0 && s > 0 && s < 6) {
        plantCounts[t] = (plantCounts[t] || 0) + 1;
        plantsTotal++;
        if (s === 5) fruits++;
      }
    }

    return {
      herbivores,
      carnivores,
      species: speciesCounts,
      plants_total: plantsTotal,
      plant_types: plantCounts,
      fruits,
    };
  }
}
