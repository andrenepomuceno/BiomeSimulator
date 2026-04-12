/**
 * SimulationEngine — tick pipeline, world generation, entity management.
 * No threading — designed to be called from a Web Worker.
 */
import { World, WATER, ROCK } from './world.js';
import { Animal } from './entities.js';
import { SpatialHash } from './spatialHash.js';
import { generateTerrain, computeWaterProximity } from './mapGenerator.js';
import { seedInitialPlants, processPlants, P_APPLE_TREE, P_MANGO_TREE, P_STRAWBERRY, P_BLUEBERRY, P_GRASS, P_CARROT, S_ADULT } from './flora.js';
import { decideAndAct } from './behaviors.js';

export class SimulationEngine {
  constructor(config) {
    this.config = config;
    this.world = null;
    this.spatialHash = new SpatialHash(16);
  }

  /**
   * Generate a new world with terrain, plants, and animals.
   * Returns the seed used.
   */
  generateWorld() {
    this.world = new World(this.config);
    const { terrain, waterProximity, seed } = generateTerrain(this.config);
    this.world.terrain = terrain;
    this.world.waterProximity = waterProximity;

    seedInitialPlants(this.world);
    this._spawnAnimals();
    this.spatialHash.rebuild(this.world.animals);
    return seed;
  }

  /**
   * Reset simulation state (animals, plants, clock, stats) while preserving the terrain map.
   */
  resetSimulation() {
    const w = this.world;
    // Reset plants
    w.plantType.fill(0);
    w.plantStage.fill(0);
    w.plantAge.fill(0);
    w.plantChanges = [];

    // Reset animals
    w.animals = [];
    w._nextId = 1;

    // Reset clock
    w.clock.tick = 0;

    // Reset stats
    w.statsHistory = [];

    // Re-seed plants and animals
    seedInitialPlants(w);
    this._spawnAnimals();
    this.spatialHash.rebuild(w.animals);
  }

  _spawnAnimals() {
    const w = this.world;
    const counts = this.config.initial_animal_counts || {};

    for (const [species, count] of Object.entries(counts)) {
      const speciesConfig = this.config.animal_species[species];
      if (!speciesConfig) continue;
      let placed = 0, attempts = 0;
      while (placed < count && attempts < count * 50) {
        const x = Math.floor(Math.random() * w.width);
        const y = Math.floor(Math.random() * w.height);
        const t = w.terrain[w.idx(x, y)];
        if (t !== WATER && t !== ROCK) {
          const animal = new Animal(w.nextId(), x, y, species, speciesConfig);
          w.animals.push(animal);
          placed++;
        }
        attempts++;
      }
    }
  }

  /**
   * Process one simulation tick.
   */
  tick() {
    const w = this.world;
    w.plantChanges = [];

    // Advance clock
    w.clock.advance();

    // Process flora
    processPlants(w);

    // Process fauna
    for (const animal of w.animals) {
      if (animal.alive) {
        decideAndAct(animal, w, this.spatialHash);
      }
    }

    // Rebuild spatial hash
    this.spatialHash.rebuild(w.animals.filter(a => a.alive));

    // Clean up dead animals that have lingered for 200+ ticks
    if (w.clock.tick % 50 === 0) {
      w.animals = w.animals.filter(a =>
        a.alive || (a._deathTick != null && w.clock.tick - a._deathTick < 200)
      );
    }

    // Record stats every 10 ticks
    if (w.clock.tick % 10 === 0) {
      const stats = w.getStats();
      stats.tick = w.clock.tick;
      w.statsHistory.push(stats);
      if (w.statsHistory.length > 1000) {
        w.statsHistory = w.statsHistory.slice(-1000);
      }
    }
  }

  /**
   * Get state for a viewport rectangle.
   */
  getStateForViewport(vx, vy, vw, vh, buffer = 20) {
    const w = this.world;
    if (!w) return null;

    const x1 = Math.max(0, vx - buffer);
    const y1 = Math.max(0, vy - buffer);
    const x2 = Math.min(w.width, vx + vw + buffer);
    const y2 = Math.min(w.height, vy + vh + buffer);

    const animalsData = [];
    for (const a of w.animals) {
      if (a.x >= x1 && a.x < x2 && a.y >= y1 && a.y < y2) {
        if (a.alive || a.state === 9) {
          animalsData.push(a.toDict());
        }
      }
    }

    return {
      clock: w.clock.toDict(),
      animals: animalsData,
      plantChanges: w.plantChanges.slice(0, 5000),
    };
  }

  /**
   * Get complete state (for initial load or full sync).
   */
  getFullState() {
    const w = this.world;
    if (!w) return null;

    return {
      clock: w.clock.toDict(),
      animals: w.animals.filter(a => a.alive).map(a => a.toDict()),
      stats: w.getStats(),
    };
  }

  /**
   * Apply terrain edits: array of {x, y, terrain}.
   */
  editTerrain(changes) {
    const w = this.world;
    for (const c of changes) {
      const { x, y, terrain } = c;
      if (w.isInBounds(x, y)) {
        w.terrain[w.idx(x, y)] = terrain;
      }
    }
    // Recompute water proximity
    w.waterProximity = computeWaterProximity(w.terrain, w.width, w.height);
  }

  /**
   * Place a new entity at (x, y). Returns dict or null.
   */
  placeEntity(entityType, x, y) {
    const w = this.world;
    if (!w.isInBounds(x, y)) return null;

    // Animal placement
    const speciesConfig = w.config.animal_species[entityType];
    if (speciesConfig) {
      const animal = new Animal(w.nextId(), x, y, entityType, speciesConfig);
      w.animals.push(animal);
      this.spatialHash.insert(animal);
      return animal.toDict();
    }

    // Plant placement
    const TYPE_MAP = {
      APPLE_TREE: P_APPLE_TREE, MANGO_TREE: P_MANGO_TREE,
      STRAWBERRY: P_STRAWBERRY, BLUEBERRY: P_BLUEBERRY,
      GRASS_PLANT: P_GRASS, CARROT: P_CARROT,
    };
    if (TYPE_MAP[entityType] !== undefined) {
      const idx = w.idx(x, y);
      w.plantType[idx] = TYPE_MAP[entityType];
      w.plantStage[idx] = S_ADULT;
      w.plantAge[idx] = 100;
      return { type: entityType, x, y };
    }

    return null;
  }

  /**
   * Remove an entity by ID.
   */
  removeEntity(entityId) {
    const w = this.world;
    for (const a of w.animals) {
      if (a.id === entityId) {
        a.alive = false;
        a.state = 9; // DEAD
        a._deathTick = this.world.clock.tick;
        this.spatialHash.remove(a);
        return true;
      }
    }
    return false;
  }
}
