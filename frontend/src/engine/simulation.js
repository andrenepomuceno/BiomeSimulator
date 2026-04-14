/**
 * SimulationEngine — tick pipeline, world generation, entity management.
 * No threading — designed to be called from a Web Worker.
 */
import { World } from './world.js';
import { Animal, Egg } from './entities.js';
import { SpatialHash } from './spatialHash.js';
import { generateTerrain, computeWaterProximity } from './mapGenerator.js';
import {
  seedInitialPlants,
  processPlants,
  P_APPLE_TREE,
  P_MANGO_TREE,
  P_STRAWBERRY,
  P_BLUEBERRY,
  P_GRASS,
  P_CARROT,
  P_POTATO,
  P_CHILI_PEPPER,
  P_OLIVE_TREE,
  S_ADULT,
} from './flora.js';
import { decideAndAct, giveBirth } from './behaviors.js';
import { BASE_POP_TOTAL } from './animalSpecies.js';
import {
  createBenchmarkCollector,
  resetBenchmarkCollector,
  cloneBenchmarkCollector,
  benchmarkAdd,
} from './benchmarkProfiler.js';

export class SimulationEngine {
  constructor(config) {
    this.config = config;
    this.world = null;
    this.spatialHash = new SpatialHash(16);
    this.profilingEnabled = false;
    this._latestProfile = null;
    this._benchmarkCollector = createBenchmarkCollector();
    this.spatialHash.setBenchmarkCollector(this._benchmarkCollector);
  }

  setProfilingEnabled(enabled) {
    this.profilingEnabled = !!enabled;
  }

  getLatestProfile() {
    return this._latestProfile;
  }

  resetBenchmarkStats() {
    resetBenchmarkCollector(this._benchmarkCollector);
    if (this.world) this.world._benchmarkCollector = this._benchmarkCollector;
    this.spatialHash.setBenchmarkCollector(this._benchmarkCollector);
  }

  getBenchmarkStats() {
    return cloneBenchmarkCollector(this._benchmarkCollector);
  }

  /**
   * Generate a new world with terrain, plants, and animals.
   * Returns the seed used.
   */
  generateWorld() {
    this.world = new World(this.config);
    this.world._benchmarkCollector = this._benchmarkCollector;
    const { terrain, waterProximity, heightmap, seed } = generateTerrain(this.config);
    this.world.terrain = terrain;
    this.world.waterProximity = waterProximity;
    this.world.heightmap = heightmap;

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
    w._benchmarkCollector = this._benchmarkCollector;
    // Reset plants
    w.plantType.fill(0);
    w.plantStage.fill(0);
    w.plantAge.fill(0);
    w.plantChanges = [];
    w.activePlantTiles.clear();

    // Reset animals
    w.animals = [];
    w.eggs = [];
    w._nextId = 1;
    w.animalGrid.fill(0);

    // Reset clock
    w.clock.tick = 0;

    // Reset stats
    w.statsHistory = [];
    w.resetPlantEvents();

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
      const walkableSet = new Set(speciesConfig.walkable_terrain || [1, 2, 3, 5, 8]);
      // Max initial age: 50% of max_age — gives natural age distribution
      // and prevents synchronized mass die-offs
      const maxInitAge = Math.floor((speciesConfig.max_age || 1000) * 0.5);
      let placed = 0, attempts = 0;
      while (placed < count && attempts < count * 50) {
        const x = Math.floor(Math.random() * w.width);
        const y = Math.floor(Math.random() * w.height);
        if (w.isWalkableFor(x, y, walkableSet) && !w.isTileOccupied(x, y)) {
          const animal = new Animal(w.nextId(), x + 0.5, y + 0.5, species, speciesConfig);
          animal.age = Math.floor(Math.random() * maxInitAge);
          w.animals.push(animal);
          w.placeAnimal(x, y);
          placed++;
        }
        attempts++;
      }
    }
  }

  /**
   * Process one simulation tick (sequential, backward-compatible).
   */
  tick() {
    this.tickFlora();
    this.tickFaunaSequential();
    this.tickEggs();
    this.tickCleanup();
  }

  /**
   * Phase 1: Advance clock and process flora.
   */
  tickFlora() {
    const w = this.world;
    w.plantChanges = [];
    this._tickStart = performance.now();
    this._phases = { plantsMs: 0, behaviorMs: 0, spatialMs: 0, cleanupMs: 0, statsMs: 0 };

    w.clock.advance();

    const plantsStart = performance.now();
    processPlants(w);
    this._phases.plantsMs = performance.now() - plantsStart;
  }

  /**
   * Phase 2 (sequential): Process fauna one-by-one in the current thread.
   */
  tickFaunaSequential() {
    const w = this.world;

    const behaviorStart = performance.now();
    this._deadThisTick = [];
    this._processedAnimals = 0;
    for (const animal of w.animals) {
      if (animal.alive) {
        this._processedAnimals++;
        decideAndAct(animal, w, this.spatialHash);
        if (!animal.alive) {
          this._deadThisTick.push(animal);
        }
      }
    }
    this._phases.behaviorMs = performance.now() - behaviorStart;

    // Spatial hash update for moved/dead animals
    const spatialStart = performance.now();
    for (const animal of w.animals) {
      if (animal.alive) this.spatialHash.update(animal);
    }
    this._phases.spatialMs = performance.now() - spatialStart;
  }

  /**
   * Phase 2 (parallel): Apply merged results from fauna sub-workers.
   * @param {Array} results — array of { deltas, births, plantChanges, deadIds } from each sub-worker.
   */
  applyFaunaResults(results) {
    const w = this.world;
    const animalsById = new Map();
    for (const a of w.animals) animalsById.set(a.id, a);

    // Collect and sort all deltas by id for deterministic merge order
    const allDeltas = [];
    for (const r of results) {
      if (!r.deltas) continue;
      for (const d of r.deltas) allDeltas.push(d);
    }
    allDeltas.sort((a, b) => a.id - b.id);

    // Reset occupancy grid — we'll rebuild it
    w.animalGrid.fill(0);

    // Place unchanged animals first (those not in any delta)
    const deltaIds = new Set(allDeltas.map(d => d.id));
    for (const a of w.animals) {
      if (a.alive && !deltaIds.has(a.id)) {
        w.placeAnimal(a.x, a.y);
      }
    }

    // Apply deltas with movement conflict resolution
    this._deadThisTick = [];
    this._processedAnimals = allDeltas.length;
    for (const delta of allDeltas) {
      const animal = animalsById.get(delta.id);
      if (!animal) continue;

      const moved = delta.x !== animal.x || delta.y !== animal.y;
      let finalX = delta.x, finalY = delta.y;

      // Movement conflict: if new tile is occupied, keep old position
      if (moved && delta.alive && w.isTileOccupied(finalX, finalY)) {
        finalX = animal.x;
        finalY = animal.y;
      }

      // Apply state from sub-worker
      animal.x = finalX;
      animal.y = finalY;
      animal.state = delta.state;
      animal.energy = delta.energy;
      animal.hp = delta.hp;
      animal.hunger = delta.hunger;
      animal.thirst = delta.thirst;
      animal.age = delta.age;
      animal.alive = delta.alive;
      animal.mateCooldown = delta.mateCooldown;
      animal.attackCooldown = delta.attackCooldown;
      animal.path = delta.path || [];
      animal.pathIndex = delta.pathIndex || 0;
      animal._pathTick = delta._pathTick || 0;
      animal._deathTick = delta._deathTick;
      animal.consumed = delta.consumed || false;
      animal.targetX = delta.targetX;
      animal.targetY = delta.targetY;
      animal.pregnant = delta.pregnant || false;
      animal.gestationTimer = delta.gestationTimer || 0;
      animal._gestationLitterSize = delta._gestationLitterSize || 0;
      if (delta.actionHistory) animal.actionHistory = delta.actionHistory;
      animal._dirty = true;

      if (animal.alive) {
        w.placeAnimal(animal.x, animal.y);
      } else {
        this._deadThisTick.push(animal);
      }
    }

    // Apply plant changes from sub-workers (first come wins)
    const eatenPlants = new Set();
    for (const r of results) {
      if (!r.plantChanges) continue;
      for (const [x, y, ptype, pstage] of r.plantChanges) {
        const idx = y * w.width + x;
        if (eatenPlants.has(idx)) continue;
        eatenPlants.add(idx);
        w.plantType[idx] = ptype;
        w.plantStage[idx] = pstage;
        w.plantAge[idx] = 0;
        if (ptype === 0) w.activePlantTiles.delete(idx);
        w.plantChanges.push([x, y, ptype, pstage]);
      }
    }

    // Add births — reassign proper IDs from the main world counter (with pop cap)
    for (const r of results) {
      if (!r.births) continue;
      for (const bd of r.births) {
        const sc = w.config.animal_species[bd.species];
        if (!sc) continue;
        if (w.isTileOccupied(bd.x, bd.y)) continue;
        // Enforce population cap at merge time
        const bMax = sc.max_population;
        if (bMax) {
          const gMax = w.config.max_animal_population;
          const eMax = gMax > 0 ? Math.max(2, Math.round(bMax * gMax / BASE_POP_TOTAL)) : bMax;
          if (w.getAliveSpeciesCount(bd.species) >= eMax) continue;
        }
        const baby = new Animal(w.nextId(), bd.x, bd.y, bd.species, sc);
        baby.energy = bd.energy;
        baby.sex = bd.sex;
        baby.age = 0;
        baby.pregnant = bd.pregnant || false;
        baby.gestationTimer = bd.gestationTimer || 0;
        baby._gestationLitterSize = bd._gestationLitterSize || 0;
        baby._dirty = true;
        baby._birthTick = w.clock.tick;
        baby.actionHistory = bd.actionHistory || [];
        w.animals.push(baby);
        w.placeAnimal(bd.x, bd.y);
      }
    }

    // Merge egg births from sub-workers (with pop cap including pending eggs)
    if (!w.eggs) w.eggs = [];
    for (const r of results) {
      if (!r.eggBirths) continue;
      for (const ed of r.eggBirths) {
        const sc = w.config.animal_species[ed.species];
        if (!sc) continue;
        // Check pop cap (alive + pending eggs)
        const bMax = sc.max_population;
        if (bMax) {
          const gMax = w.config.max_animal_population;
          const eMax = gMax > 0 ? Math.max(2, Math.round(bMax * gMax / BASE_POP_TOTAL)) : bMax;
          const alive = w.getAliveSpeciesCount(ed.species);
          const pending = w.eggs.filter(e => e.alive && e.species === ed.species).length;
          if ((alive + pending) >= eMax) continue;
        }
        const egg = new Egg(w.nextId(), ed.x, ed.y, ed.species, sc);
        egg.parentA = ed.parentA;
        egg.parentB = ed.parentB;
        egg._birthTick = w.clock.tick;
        w.eggs.push(egg);
      }
    }

    // Rebuild spatial hash from scratch (cheaper than incremental after full merge)
    this.spatialHash.rebuild(w.animals.filter(a => a.alive));

    // Dead animals are already excluded from animalGrid and spatialHash above,
    // so clear _deadThisTick to prevent tickCleanup from double-removing them.
    this._deadThisTick = [];
  }

  /**
   * Process egg incubation, hatching, and cleanup.
   */
  tickEggs() {
    const w = this.world;
    if (!w.eggs || w.eggs.length === 0) return;

    const hatched = [];
    for (const egg of w.eggs) {
      if (!egg.alive) continue;
      egg.tick();
      if (egg.ready) {
        // Hatch: spawn baby animals
        const speciesConfig = w.config.animal_species[egg.species];
        if (!speciesConfig) continue;
        const walkableSet = new Set(speciesConfig.walkable_terrain || [1, 2, 3, 5, 8]);
        const baseTx = egg.x | 0;
        const baseTy = egg.y | 0;
        // Population cap check (with soft cap like behaviors.js)
        const baseMax = speciesConfig.max_population;
        const globalMax = w.config.max_animal_population;
        const effectiveMax = (baseMax && globalMax > 0)
          ? Math.max(2, Math.round(baseMax * globalMax / BASE_POP_TOTAL))
          : (baseMax || Infinity);
        const count = w.getAliveSpeciesCount(egg.species);
        let capBlocked = count >= effectiveMax;
        if (!capBlocked && effectiveMax > 0) {
          const ratio = count / effectiveMax;
          if (ratio > 0.6) {
            const chance = 1 - ((ratio - 0.6) / 0.4);
            if (Math.random() > chance) capBlocked = true;
          }
        }
        if (!capBlocked) {
          // Find a walkable tile for the baby (prefer the egg's own tile)
          let bx = egg.x, by = egg.y;
          let placed = false;
          if (w.isWalkableFor(baseTx, baseTy, walkableSet) && !w.isTileOccupied(baseTx, baseTy)) {
            placed = true;
          } else {
            for (const [ddx, ddy] of [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
              const ntx = baseTx + ddx, nty = baseTy + ddy;
              if (w.isWalkableFor(ntx, nty, walkableSet) && !w.isTileOccupied(ntx, nty)) {
                bx = ntx + 0.5; by = nty + 0.5; placed = true; break;
              }
            }
          }
          if (placed) {
            const baby = new Animal(w.nextId(), bx, by, egg.species, speciesConfig);
            baby.energy = speciesConfig.max_energy * 0.4;
            baby.age = 0;
            baby._birthTick = w.clock.tick;
            baby._dirty = true;
            baby.logAction(w.clock.tick, 'HATCHED', { eggId: egg.id, parentA: egg.parentA, parentB: egg.parentB });
            w.animals.push(baby);
            w.placeAnimal(bx, by);
            this.spatialHash.insert(baby);
          }
        }
        hatched.push(egg);
      }
    }
    // Remove hatched and destroyed eggs
    if (hatched.length > 0 || w.eggs.some(e => !e.alive)) {
      w.eggs = w.eggs.filter(e => e.alive && !hatched.includes(e));
    }
  }

  /**
   * Phase 3: Cleanup dead animals and record stats.
   */
  tickCleanup() {
    const w = this.world;
    const profiling = this.profilingEnabled;

    const cleanupStart = performance.now();
    const deadThisTick = this._deadThisTick || [];
    for (const dead of deadThisTick) {
      this.spatialHash.remove(dead);
      w.vacateAnimal(dead.x, dead.y);
    }

    const tick = w.clock.tick;
    const totalAnimals = w.animals.length;
    const cleanupInterval = totalAnimals > 1500 ? 10 : totalAnimals > 800 ? 25 : 50;
    if (tick % cleanupInterval === 0) {
      w.animals = w.animals.filter(a =>
        a.alive || (!a.consumed && a._deathTick != null && tick - a._deathTick < 300)
      );
    }
    this._phases.cleanupMs = performance.now() - cleanupStart;

    // Record stats every 10 ticks
    const statsStart = performance.now();
    if (tick % 10 === 0) {
      const stats = w.getStats();
      stats.tick = tick;
      stats.plant_events = w.plantEvents;
      w.resetPlantEvents();
      w.statsHistory.push(stats);
      if (w.statsHistory.length > 1000) {
        w.statsHistory = w.statsHistory.slice(-1000);
      }
    }
    this._phases.statsMs = performance.now() - statsStart;
    const tickMs = performance.now() - this._tickStart;

    this._latestPhases = this._phases;
    this._latestTickMs = tickMs;

    if (profiling) {
      benchmarkAdd(this._benchmarkCollector, 'animalsProcessed', this._processedAnimals || 0);
      let animalsAlive = 0;
      for (const a of w.animals) {
        if (a.alive) animalsAlive++;
      }
      this._latestProfile = {
        tick: tick,
        tickMs,
        phases: this._phases,
        counts: {
          animalsTotal: w.animals.length,
          animalsAlive,
          activePlants: w.activePlantTiles.size,
        },
      };
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

    const eggsData = [];
    for (const egg of (w.eggs || [])) {
      if (egg.alive && egg.x >= x1 && egg.x < x2 && egg.y >= y1 && egg.y < y2) {
        eggsData.push(egg.toDict());
      }
    }

    return {
      clock: w.clock.toDict(),
      animals: animalsData,
      eggs: eggsData,
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
      eggs: (w.eggs || []).filter(e => e.alive).map(e => e.toDict()),
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
      if (w.isTileOccupied(x, y)) return null;
      const animal = new Animal(w.nextId(), x + 0.5, y + 0.5, entityType, speciesConfig);
      w.animals.push(animal);
      w.placeAnimal(x, y);
      this.spatialHash.insert(animal);
      return animal.toDict();
    }

    // Plant placement
    const TYPE_MAP = {
      APPLE_TREE: P_APPLE_TREE, MANGO_TREE: P_MANGO_TREE,
      STRAWBERRY: P_STRAWBERRY, BLUEBERRY: P_BLUEBERRY,
      GRASS_PLANT: P_GRASS, CARROT: P_CARROT,
      POTATO: P_POTATO, CHILI_PEPPER: P_CHILI_PEPPER,
      OLIVE_TREE: P_OLIVE_TREE,
    };
    if (TYPE_MAP[entityType] !== undefined) {
      const idx = w.idx(x, y);
      w.plantType[idx] = TYPE_MAP[entityType];
      w.plantStage[idx] = S_ADULT;
      w.plantAge[idx] = 100;
      w.activePlantTiles.add(idx);
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
