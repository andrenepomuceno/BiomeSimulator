/**
 * SimulationEngine — tick pipeline, world generation, entity management.
 * No threading — designed to be called from a Web Worker.
 */
import { World } from './world.js';
import { Animal, LifeStage, AnimalState } from './entities.js';
import { SpatialHash } from './spatialHash.js';
import { createSimulationSupervisor } from './simulationSupervisor.js';
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
import { _walkPath, _randomWalk } from './behaviors/movement.js';
import { getEffectiveAnimalPopulationCap, normalizeAnimalCountsToBudget, buildMassDropMap } from './animalSpecies.js';
import {
  createBenchmarkCollector,
  resetBenchmarkCollector,
  cloneBenchmarkCollector,
  benchmarkEnd,
  benchmarkAdd,
  benchmarkStart,
} from './benchmarkProfiler.js';

function isEggStageSnapshot(snapshot) {
  if (!snapshot) return false;
  if (snapshot.lifeStage != null) return snapshot.lifeStage === LifeStage.EGG;
  return !!snapshot._isEggStage && snapshot.age < (snapshot._incubationPeriod || 0);
}

export class SimulationEngine {
  constructor(config) {
    this.config = config;
    this.world = null;
    this.spatialHash = new SpatialHash(16);
    this.profilingEnabled = false;
    this._latestProfile = null;
    this._benchmarkCollector = createBenchmarkCollector();
    this.supervisor = createSimulationSupervisor(config);
    this._latestSupervisorReport = null;
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
    this.supervisor.reset();
    const { terrain, waterProximity, heightmap, seed } = generateTerrain(this.config);
    this.world.terrain = terrain;
    this.world.waterProximity = waterProximity;
    this.world.heightmap = heightmap;

    seedInitialPlants(this.world);
    this._spawnAnimals();
    this.world._massDropMap = buildMassDropMap();
    this.spatialHash.rebuild(this.world.animals);
    return seed;
  }

  /**
   * Reset simulation state (animals, plants, clock, stats) while preserving the terrain map.
   */
  resetSimulation() {
    const w = this.world;
    w._benchmarkCollector = this._benchmarkCollector;
    this.supervisor.reset();
    // Reset plants
    w.plantType.fill(0);
    w.plantStage.fill(0);
    w.plantAge.fill(0);
    w.plantChanges = [];
    w.activePlantTiles.clear();

    // Reset animals
    w.animals = [];
    w._nextId = 1;
    w.animalGrid.fill(0);
    w.eggGrid.fill(0);

    // Reset clock
    w.clock.tick = 0;

    // Reset stats
    w.statsHistory = [];
    w.resetPlantEvents();

    // Reset items
    w.items = [];
    w.itemChanges = [];
    w._itemById.clear();
    w._itemSpatialHash.clear();
    w._massDropMap = buildMassDropMap();

    // Re-seed plants and animals
    seedInitialPlants(w);
    this._spawnAnimals();
    this.spatialHash.rebuild(w.animals);
  }

  _spawnAnimals() {
    const w = this.world;
    const counts = normalizeAnimalCountsToBudget(
      this.config.initial_animal_counts || {},
      this.config.max_animal_population,
    );

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
        if (w.isWalkableFor(x, y, walkableSet) && !w.isTileBlocked(x, y)) {
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
    this.tickCleanup();
  }

  /**
   * Phase 1: Advance clock and process flora.
   */
  tickFlora() {
    const w = this.world;
    w.plantChanges = [];
    w.itemChanges = [];
    this._tickStart = performance.now();
    this._phases = { plantsMs: 0, behaviorMs: 0, spatialMs: 0, cleanupMs: 0, supervisorMs: 0, statsMs: 0 };

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
    w.resetDeathsThisTick();
    this._deadThisTick = [];
    this._processedAnimals = 0;
    for (const animal of w.animals) {
      if (animal.alive) {
        this._processedAnimals++;
        decideAndAct(animal, w, this.spatialHash);
      }
    }
    this._deadThisTick = w.consumeDeathsThisTick();
    this._phases.behaviorMs = performance.now() - behaviorStart;

    // Spatial hash update for moved/dead animals
    const spatialStart = performance.now();
    for (const animal of w.animals) {
      if (animal.alive) this.spatialHash.update(animal);
    }
    this._phases.spatialMs = performance.now() - spatialStart;
  }

  /**
   * Movement-only tick: processes path following and random walk for movement sub-ticks.
   * Does NOT evaluate decisions or advance the clock.
   * Used to increase movement granularity: N movement sub-ticks per decision tick.
   */
  tickMovementOnly() {
    const w = this.world;

    // Process animals with valid cached paths
    for (const animal of w.animals) {
      if (!animal.alive) continue;

      const hasValidPath = animal.path && animal.path.length > 0 && animal.pathIndex < animal.path.length;
      if (hasValidPath) {
        // Preserve state to avoid overwriting pursuit/flee states
        const origState = animal.state;
        _walkPath(animal, w);
        // Restore state unless _walkPath explicitly changed it (shouldn't happen, but be safe)
        if (animal.state === AnimalState.WALKING) {
          animal.state = origState;
        }
      } else if (animal.state === AnimalState.WALKING) {
        // Continue random walking
        _randomWalk(animal, w);
      }
    }

    // Update spatial hash for all moved animals
    for (const animal of w.animals) {
      if (animal.alive) this.spatialHash.update(animal);
    }
  }

  /**
   * Phase 2 (parallel): Apply merged results from fauna sub-workers.
  * @param {Array} results — array of { deltas, births, plantChanges, deadIds, plantConsumptionClaims } from each sub-worker.
   */
  applyFaunaResults(results) {
    const w = this.world;
    const animalsById = new Map();
    for (const a of w.animals) animalsById.set(a.id, a);

    // Collect all deltas from sub-workers.
    const allDeltas = [];
    for (const r of results) {
      if (!r.deltas) continue;
      for (const d of r.deltas) allDeltas.push(d);
    }

    // Resolve contested plant consumption before applying deltas.
    const rejectedPlantClaims = [];
    const claimedPlants = new Set();
    for (const r of results) {
      if (!r.plantConsumptionClaims) continue;
      for (const claim of r.plantConsumptionClaims) {
        if (claim?.idx == null) continue;
        if (claimedPlants.has(claim.idx)) {
          rejectedPlantClaims.push(claim);
          continue;
        }
        claimedPlants.add(claim.idx);
      }
    }

    // Resolve contested item consumption (first-claim-wins per itemId).
    // Accepted claims: actually remove the item from the main world.
    // Rejected claims: the item stays; animal keeps its updated state (it "thought" it ate).
    // Note: item nutrition already applied in the worker — rejected animal just got a free meal
    // this tick, which is acceptable (rare conflict, cheaper than full rollback).
    const claimedItems = new Set();
    for (const r of results) {
      if (!r.itemConsumptionClaims) continue;
      for (const claim of r.itemConsumptionClaims) {
        if (!claim?.itemId || claimedItems.has(claim.itemId)) continue;
        claimedItems.add(claim.itemId);
        const item = w._itemById.get(claim.itemId);
        if (item && !item.consumed) w.removeItem(item);
      }
    }

    // Any reported death wins globally, even if another chunk returned stale alive state.
    const mergedDeadIds = new Set();
    for (const r of results) {
      if (!r.deadIds) continue;
      for (const id of r.deadIds) mergedDeadIds.add(id);
    }

    const deltaById = new Map(allDeltas.map(delta => [delta.id, delta]));

    for (const claim of rejectedPlantClaims) {
      const delta = deltaById.get(claim.animalId);
      if (!delta) continue;
      // Restore animal state (claimed consumption is rejected)
      delta.hunger = claim.preHunger;
      delta.energy = claim.preEnergy;
      delta.hp = claim.preHp;
      delta.state = claim.preState;
      // Restore plant state (claimed consumption is rejected)
      if (claim.idx != null) {
        w.plantType[claim.idx] = claim.preType;
        w.plantStage[claim.idx] = claim.preStage;
        w.plantAge[claim.idx] = claim.preAge;
        if (claim.preType !== 0) w.activePlantTiles.add(claim.idx);
      }
    }

    for (const id of mergedDeadIds) {
      const delta = deltaById.get(id);
      if (!delta) continue;
      delta.alive = false;
      delta.state = AnimalState.DEAD;
      if (delta._deathTick == null) delta._deathTick = w.clock.tick;
    }

    // Sort by id for deterministic merge order.
    allDeltas.sort((a, b) => a.id - b.id);

    // Reset occupancy grids — we'll rebuild them
    w.animalGrid.fill(0);
    w.eggGrid.fill(0);

    // Pre-place all egg-stage occupants so movement conflict resolution respects egg tiles.
    for (const a of w.animals) {
      const delta = deltaById.get(a.id);
      if (delta) {
        if (delta.alive && isEggStageSnapshot(delta)) {
          w.placeEgg(delta.x, delta.y);
        }
      } else if (a.alive && a.lifeStage === LifeStage.EGG) {
        w.placeEgg(a.x, a.y);
      }
    }

    // Place unchanged animals first (those not in any delta)
    const deltaIds = new Set(allDeltas.map(d => d.id));
    for (const a of w.animals) {
      if (a.alive && !deltaIds.has(a.id)) {
        if (a.lifeStage !== LifeStage.EGG) w.placeAnimal(a.x, a.y);
      }
    }

    // Apply deltas with movement conflict resolution
    this._deadThisTick = [];
    this._processedAnimals = allDeltas.length;
    for (const delta of allDeltas) {
      const animal = animalsById.get(delta.id);
      if (!animal) continue;

      const deltaIsEgg = isEggStageSnapshot(delta);
      const moved = delta.x !== animal.x || delta.y !== animal.y;
      let finalX = delta.x, finalY = delta.y;

      // Eggs should remain fixed in place until hatching.
      if (deltaIsEgg) {
        finalX = animal.x;
        finalY = animal.y;
      }

      // Movement conflict: if new tile is occupied, keep old position
      if (!deltaIsEgg && moved && delta.alive && w.isTileBlocked(finalX, finalY)) {
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
      animal._isEggStage = delta._isEggStage || false;
      animal._incubationPeriod = delta._incubationPeriod || 0;
      animal._eggMaxHp = delta._eggMaxHp || 0;
      animal.parentA = delta.parentA ?? null;
      animal.parentB = delta.parentB ?? null;
      animal.direction = delta.direction || 0;
      animal._dirty = true;

      if (animal.alive) {
        if (animal.lifeStage !== LifeStage.EGG) w.placeAnimal(animal.x, animal.y);
      } else {
        this._deadThisTick.push(animal);
        // Spawn meat drops for parallel-mode deaths (sequential mode handles in markEntityDead)
        if (!isEggStageSnapshot(delta)) w._spawnMeatDrops(animal);
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
        // Only reset age if plant is removed; otherwise preserve growth progress
        if (ptype === 0 || pstage === 0) {
          w.plantAge[idx] = 0;
          w.activePlantTiles.delete(idx);
        } else {
          w.activePlantTiles.add(idx);
        }
        w.plantChanges.push([x, y, ptype, pstage]);
      }
    }

    // Add births — reassign proper IDs from the main world counter (with pop cap)
    for (const wantsEggBirths of [true, false]) {
      for (const r of results) {
          if (!r.births) continue;
        for (const bd of r.births) {
          if (isEggStageSnapshot(bd) !== wantsEggBirths) continue;
        const sc = w.config.animal_species[bd.species];
        if (!sc) continue;
          if (w.isTileBlocked(bd.x, bd.y)) continue;
        // Enforce population cap at merge time
        const effectiveMax = getEffectiveAnimalPopulationCap(bd.species, w.config.max_animal_population);
        if (effectiveMax && w.getAliveSpeciesCount(bd.species) >= effectiveMax) {
          continue;
        }
        const baby = new Animal(w.nextId(), bd.x, bd.y, bd.species, sc);
        baby.energy = bd.energy;
        baby.sex = bd.sex;
        baby.age = 0;
        baby.pregnant = bd.pregnant || false;
        baby.gestationTimer = bd.gestationTimer || 0;
        baby._gestationLitterSize = bd._gestationLitterSize || 0;
        baby._isEggStage = bd._isEggStage || false;
        baby._incubationPeriod = bd._incubationPeriod || 0;
        baby._eggMaxHp = bd._eggMaxHp || 0;
        baby.parentA = bd.parentA ?? null;
        baby.parentB = bd.parentB ?? null;
        if (baby._isEggStage) {
          baby.hp = baby._eggMaxHp;
        }
        baby._dirty = true;
        baby._birthTick = w.clock.tick;
        baby.actionHistory = bd.actionHistory || [];
        w.animals.push(baby);
          if (isEggStageSnapshot(bd)) w.placeEgg(bd.x, bd.y);
          else w.placeAnimal(bd.x, bd.y);
        }
      }
    }

    // Rebuild spatial hash from scratch (cheaper than incremental after full merge)
    this.spatialHash.rebuild(w.animals.filter(a => a.alive));

    // Dead animals are already excluded from animalGrid and spatialHash above,
    // so clear _deadThisTick to prevent tickCleanup from double-removing them.
    this._deadThisTick = [];
  }

  /**
   * Phase 3: Cleanup dead animals and record stats.
   */
  tickCleanup() {
    const w = this.world;
    const profiling = this.profilingEnabled;

    // Advance item lifecycle (decay, fruit→seed transform, seed germination)
    w.tickItemLifecycle(this.config);

    const cleanupStart = performance.now();
    const deadThisTick = this._deadThisTick || [];
    for (const dead of deadThisTick) {
      this.spatialHash.remove(dead);
    }

    // Remove consumed corpses/eggs promptly so they disappear after being eaten.
    w.animals = w.animals.filter(a => a.alive || !a.consumed);

    const tick = w.clock.tick;
    const totalAnimals = w.animals.length;
    const cleanupInterval = totalAnimals > 1500 ? 10 : totalAnimals > 800 ? 25 : 50;
    if (tick % cleanupInterval === 0) {
      w.animals = w.animals.filter(a =>
        a.alive || (!a.consumed && a._deathTick != null && tick - a._deathTick < 300)
      );
    }
    this._phases.cleanupMs = performance.now() - cleanupStart;

    let supervisorReport = this.supervisor.skipAudit(tick, 'tickCleanup');
    if (this.supervisor.shouldAudit(tick)) {
      const supervisorStart = benchmarkStart(this._benchmarkCollector);
      supervisorReport = this.supervisor.audit(w, this.spatialHash, 'tickCleanup');
      this._phases.supervisorMs = benchmarkEnd(this._benchmarkCollector, 'supervisorAudit', supervisorStart);
      benchmarkAdd(this._benchmarkCollector, 'supervisorAudits', 1);
      benchmarkAdd(this._benchmarkCollector, 'supervisorIssues', supervisorReport.issueCount);
      benchmarkAdd(this._benchmarkCollector, 'supervisorAnimalsAudited', supervisorReport.animalsAudited);
      benchmarkAdd(this._benchmarkCollector, 'supervisorCellsAudited', supervisorReport.cellsAudited);
      if (supervisorReport.shouldLog) {
        console.warn('[SimulationSupervisor] Inconsistencies detected:', supervisorReport);
      }
    }
    this._latestSupervisorReport = supervisorReport;

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
      if (w.isTileBlocked(x, y)) return null;
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
        w.markEntityDead(a);
        this.spatialHash.remove(a);
        return true;
      }
    }
    return false;
  }
}
