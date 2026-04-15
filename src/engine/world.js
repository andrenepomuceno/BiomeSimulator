/**
 * World model — terrain, plant grids (parallel TypedArrays), animals, clock.
 */
import { DEFAULT_DAY_FRACTION, DEFAULT_TICKS_PER_DAY } from '../constants/simulation.js';
import { DIET } from './animalSpecies.js';

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
  constructor(ticksPerDay = DEFAULT_TICKS_PER_DAY, dayFraction = DEFAULT_DAY_FRACTION) {
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

    // Egg occupancy grid — count of egg-stage animals per tile
    this.eggGrid = new Uint8Array(size);

    // Animals
    this.animals = [];

    // Entity ID counter
    this._nextId = 1;

    // Clock
    this.clock = new Clock(
      config.ticks_per_day || DEFAULT_TICKS_PER_DAY,
      config.day_fraction || DEFAULT_DAY_FRACTION,
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
    this.hungerMultiplier = config.hunger_multiplier ?? 1.2;
    this.thirstMultiplier = config.thirst_multiplier ?? 1.25;

    // Per-species alive population cache (lazy, rebuilt once per tick on demand)
    this._speciesPopCache = null;
    this._speciesPopTick = -1;

    // Optional benchmark collector used by headless profiling.
    this._benchmarkCollector = null;

    // Entities that died during the current fauna phase.
    this._deathsThisTick = [];
  }

  nextId() {
    return this._nextId++;
  }

  idx(x, y) {
    return (y | 0) * this.width + (x | 0);
  }

  isInBounds(x, y) {
    const ix = x | 0, iy = y | 0;
    return ix >= 0 && iy >= 0 && ix < this.width && iy < this.height;
  }

  isWalkable(x, y) {
    const ix = x | 0, iy = y | 0;
    if (ix < 0 || iy < 0 || ix >= this.width || iy >= this.height) return false;
    const t = this.terrain[iy * this.width + ix];
    return t !== WATER && t !== DEEP_WATER && t !== MOUNTAIN;
  }

  isWalkableFor(x, y, walkableSet) {
    const ix = x | 0, iy = y | 0;
    if (ix < 0 || iy < 0 || ix >= this.width || iy >= this.height) return false;
    return walkableSet.has(this.terrain[iy * this.width + ix]);
  }

  isTileOccupied(x, y) {
    const ix = x | 0, iy = y | 0;
    if (ix < 0 || iy < 0 || ix >= this.width || iy >= this.height) return true;
    return this.animalGrid[iy * this.width + ix] > 0;
  }

  isTileBlocked(x, y) {
    const ix = x | 0, iy = y | 0;
    if (ix < 0 || iy < 0 || ix >= this.width || iy >= this.height) return true;
    const idx = iy * this.width + ix;
    return this.animalGrid[idx] > 0 || this.eggGrid[idx] > 0;
  }

  placeAnimal(x, y) {
    this.animalGrid[(y | 0) * this.width + (x | 0)]++;
  }

  vacateAnimal(x, y) {
    const i = (y | 0) * this.width + (x | 0);
    if (this.animalGrid[i] > 0) this.animalGrid[i]--;
  }

  placeEgg(x, y) {
    this.eggGrid[(y | 0) * this.width + (x | 0)]++;
  }

  vacateEgg(x, y) {
    const i = (y | 0) * this.width + (x | 0);
    if (this.eggGrid[i] > 0) this.eggGrid[i]--;
  }

  getAliveSpeciesCount(species) {
    const tick = this.clock.tick;
    if (this._speciesPopTick !== tick || !this._speciesPopCache) {
      this._speciesPopCache = {};
      for (const a of this.animals) {
        if (a.alive) {
          this._speciesPopCache[a.species] = (this._speciesPopCache[a.species] || 0) + 1;
        }
      }
      this._speciesPopTick = tick;
    }
    return this._speciesPopCache[species] || 0;
  }

  resetPlantEvents() {
    this.plantEvents = { births: {}, deaths_terrain: {}, deaths_water: {}, deaths_age: {}, deaths_eaten: {}, matured: {} };
  }

  resetDeathsThisTick() {
    this._deathsThisTick.length = 0;
  }

  consumeDeathsThisTick() {
    const deaths = this._deathsThisTick;
    this._deathsThisTick = [];
    return deaths;
  }

  markEntityDead(entity) {
    if (!entity || !entity.alive) return false;
    entity.alive = false;
    entity.state = 9;
    entity._deathTick = this.clock.tick;
    if (entity.lifeStage === -1) this.vacateEgg(entity.x, entity.y);
    else this.vacateAnimal(entity.x, entity.y);
    this._deathsThisTick.push(entity);
    return true;
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

  rebuildAnimalGrid() {
    this.animalGrid.fill(0);
    for (const animal of this.animals) {
      if (animal.alive && animal.lifeStage !== -1) this.placeAnimal(animal.x, animal.y);
    }
  }

  rebuildEggGrid() {
    this.eggGrid.fill(0);
    for (const animal of this.animals) {
      if (animal.alive && animal.lifeStage === -1) this.placeEgg(animal.x, animal.y);
    }
  }

  rebuildActivePlantTiles() {
    this.activePlantTiles.clear();
    for (let i = 0; i < this.plantType.length; i++) {
      if (this.plantType[i] !== 0 && this.plantStage[i] !== 0) {
        this.activePlantTiles.add(i);
      }
    }
  }

  rebuildDerivedState() {
    this.rebuildAnimalGrid();
    this.rebuildEggGrid();
    this.rebuildActivePlantTiles();
  }

  isWaterAdjacent(x, y) {
    const ix = x | 0, iy = y | 0;
    // Standing on water counts (flying animals over water)
    const selfTerrain = this.terrain[iy * this.width + ix];
    if (selfTerrain === WATER || selfTerrain === DEEP_WATER) return true;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = ix + dx, ny = iy + dy;
        if (nx >= 0 && ny >= 0 && nx < this.width && ny < this.height) {
          const t = this.terrain[ny * this.width + nx];
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
      if (a.diet === DIET.HERBIVORE) herbivores++;
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

    // Count egg-stage animals
    let eggCount = 0;
    const eggSpeciesCounts = {};
    for (const a of this.animals) {
      if (a.alive && a._isEggStage && a.lifeStage === -1) {
        eggCount++;
        eggSpeciesCounts[a.species] = (eggSpeciesCounts[a.species] || 0) + 1;
      }
    }

    return {
      herbivores,
      carnivores,
      species: speciesCounts,
      plants_total: plantsTotal,
      plant_types: plantCounts,
      fruits,
      eggs_total: eggCount,
      egg_species: eggSpeciesCounts,
    };
  }
}
