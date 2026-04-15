/**
 * Web Worker entry point — runs SimulationEngine in a background thread.
 *
 * Commands (postMessage to worker):
 *   { cmd: 'generate', config }
 *   { cmd: 'start' }
 *   { cmd: 'pause' }
 *   { cmd: 'resume' }
 *   { cmd: 'step' }
 *   { cmd: 'setSpeed', tps }
 *   { cmd: 'editTerrain', changes }
 *   { cmd: 'placeEntity', entityType, x, y }
 *   { cmd: 'removeEntity', entityId }
 *   { cmd: 'getTileInfo', x, y }
 *   { cmd: 'getAnimalDetail', id }
 *
 * Messages (worker → main):
 *   { type: 'worldReady', terrain, waterProximity, plantType, plantStage, width, height, seed, animals, clock }
 *   { type: 'tick', clock, animals, plantChanges, stats }
 *   { type: 'tileInfo', ... }
 *   { type: 'animalDetail', id, detail }
 *   { type: 'entityPlaced', entity }
 *   { type: 'entityRemoved', entityId, ok }
 */

import { SimulationEngine } from '../engine/simulation.js';
import { DEFAULT_CONFIG } from '../engine/config.js';
import { TERRAIN_NAMES, World } from '../engine/world.js';
import { Animal } from '../engine/entities.js';

let engine = null;
let running = false;
let paused = true;
let tps = 10;
let tickTimeoutId = null;
let profilingEnabled = false;
let pendingPause = false;
const FULL_SYNC_INTERVAL = 30;
const FAUNA_TICK_TIMEOUT_MS = 800;
const MAX_PLANT_CHANGES_PER_TICK = 5000;

// --- Fauna worker pool ---
const MIN_ANIMALS_FOR_PARALLEL = 500;
const MAX_FAUNA_WORKERS = 4;
let faunaWorkers = [];
let faunaWorkersReady = false;
let _ticking = false;

function startLoop() {
  stopLoop();
  running = true;
  paused = false;
  scheduleNextTick();
}

function stopLoop() {
  if (tickTimeoutId !== null) {
    clearTimeout(tickTimeoutId);
    tickTimeoutId = null;
  }
}

function scheduleNextTick() {
  if (!running || paused) return;
  tickTimeoutId = setTimeout(doTick, 1000 / tps);
}

async function doTick() {
  if (!engine || !engine.world) return;
  if (_ticking) {
    // If a long tick is still running, keep the loop alive instead of stalling.
    scheduleNextTick();
    return;
  }
  _ticking = true;
  try {
    const t0 = performance.now();
    const w = engine.world;
    let aliveCount = 0;
    for (const a of w.animals) if (a.alive) aliveCount++;
    const useParallel = faunaWorkersReady && faunaWorkers.length > 0 && aliveCount >= MIN_ANIMALS_FOR_PARALLEL;

    if (useParallel) {
      engine.tickFlora();
      const behaviorStart = performance.now();
      await doParallelFauna();
      engine._phases.behaviorMs = performance.now() - behaviorStart;
      engine._phases.spatialMs = 0;
      engine.tickCleanup();
    } else {
      engine.tick();
    }

    const tickMs = performance.now() - t0;
    postTickState(tickMs);

    // Movement sub-ticks: run N-1 additional movement-only passes for granular movement
    const subTicks = engine.world.config.movement_sub_ticks || 1;
    for (let i = 1; i < subTicks; i++) {
      engine.tickMovementOnly();
      postSubTickState();
    }
  } finally {
    _ticking = false;
  }

  if (pendingPause) {
    pendingPause = false;
    paused = true;
    stopLoop();
  } else {
    scheduleNextTick();
  }
}

async function doParallelFauna() {
  const w = engine.world;
  const alive = [];
  for (const a of w.animals) if (a.alive) alive.push(a);

  const nWorkers = faunaWorkers.length;
  const chunks = Array.from({ length: nWorkers }, () => []);
  for (let i = 0; i < alive.length; i++) {
    chunks[i % nWorkers].push(alive[i].id);
  }

  const allAnimalStates = alive.map(a => a.toWorkerState());
  const activePlantIndices = Array.from(w.activePlantTiles);

  const resultPromises = chunks.map((chunkIds, i) => {
    return new Promise(resolve => {
      const worker = faunaWorkers[i];
      let settled = false;
      const finish = (result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        worker.removeEventListener('message', handler);
        worker.removeEventListener('error', onError);
        resolve(result);
      };
      const handler = (e) => {
        if (e.data.cmd === 'tickResult') {
          finish(e.data);
        }
      };
      const onError = () => {
        // Fall back to empty result for this chunk instead of hanging the tick.
        finish({ deltas: [], births: [], plantChanges: [], deadIds: [] });
      };
      const timeoutId = setTimeout(() => {
        // Sub-worker may have been terminated during world regeneration.
        finish({ deltas: [], births: [], plantChanges: [], deadIds: [] });
      }, FAUNA_TICK_TIMEOUT_MS);
      worker.addEventListener('message', handler);
      worker.addEventListener('error', onError);

      const ptCopy = new Uint8Array(w.plantType);
      const psCopy = new Uint8Array(w.plantStage);
      const paCopy = new Uint16Array(w.plantAge);
      const agCopy = new Uint8Array(w.animalGrid);

      worker.postMessage({
        cmd: 'tick',
        plantType: ptCopy.buffer,
        plantStage: psCopy.buffer,
        plantAge: paCopy.buffer,
        animalGrid: agCopy.buffer,
        clockTick: w.clock.tick,
        ticksPerDay: w.clock.ticksPerDay,
        dayFraction: w.clock.dayFraction,
        hungerMultiplier: w.hungerMultiplier,
        thirstMultiplier: w.thirstMultiplier,
        activePlantIndices,
        allAnimals: allAnimalStates,
        chunkIds,
        nextIdBase: 900000 + i * 100000,
      }, [ptCopy.buffer, psCopy.buffer, paCopy.buffer, agCopy.buffer]);
    });
  });

  const results = await Promise.all(resultPromises);
  engine.applyFaunaResults(results);
}

function initFaunaWorkers(config, terrain, waterProximity, heightmap) {
  disposeFaunaWorkers();
  const cores = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 2) : 2;
  const count = Math.min(Math.max(1, cores - 2), MAX_FAUNA_WORKERS);
  if (count < 2) return Promise.resolve();

  const readyPromises = [];
  for (let i = 0; i < count; i++) {
    const worker = new Worker(
      new URL('./faunaWorker.js', import.meta.url),
      { type: 'module' }
    );
    const readyPromise = new Promise((resolve, reject) => {
      let handler;
      const timeoutId = setTimeout(() => {
        worker.removeEventListener('message', handler);
        reject(new Error('Fauna worker init timeout'));
      }, 5000);
      handler = (e) => {
        if (e.data.cmd === 'ready') {
          clearTimeout(timeoutId);
          worker.removeEventListener('message', handler);
          resolve();
        }
      };
      worker.addEventListener('message', handler);
    });
    worker.postMessage({
      cmd: 'init',
      config,
      terrain: new Uint8Array(terrain).buffer,
      waterProximity: new Uint8Array(waterProximity).buffer,
      heightmap: heightmap ? new Float32Array(heightmap).buffer : null,
    });
    faunaWorkers.push(worker);
    readyPromises.push(readyPromise);
  }
  return Promise.all(readyPromises)
    .then(() => { faunaWorkersReady = true; })
    .catch((err) => {
      console.warn('[SimWorker] Fauna worker init failed, falling back to serial processing:', err);
      disposeFaunaWorkers();
    });
}

function disposeFaunaWorkers() {
  for (const fw of faunaWorkers) fw.terminate();
  faunaWorkers = [];
  faunaWorkersReady = false;
}

function postTickState(tickMs = 0) {
  const w = engine.world;
  const tick = w.clock.tick;
  const isFullSync = tick % FULL_SYNC_INTERVAL === 0;
  const plantChangesOverflow = w.plantChanges.length > MAX_PLANT_CHANGES_PER_TICK;

  let animals;
  let animalsDead;
  if (isFullSync) {
    // Full sync: send all animals with complete data
    animals = [];
    for (const a of w.animals) {
      if (a.alive || a.state === 9) animals.push(a.toDict());
      a.clearDirty();
    }
  } else {
    // Incremental: only dirty animals send delta, plus newly dead
    animals = [];
    animalsDead = [];
    for (const a of w.animals) {
      if (!a._dirty) continue;
      if (a.alive) {
        animals.push(a.toDelta());
      } else if (a.state === 9) {
        animalsDead.push(a.id);
      }
      a.clearDirty();
    }
  }

  const msg = {
    type: 'tick',
    clock: w.clock.toDict(),
    animals,
    plantChanges: plantChangesOverflow ? [] : w.plantChanges,
    incremental: !isFullSync,
  };

  if (plantChangesOverflow) {
    msg.plantsFullSync = {
      width: w.width,
      height: w.height,
      plantType: new Uint8Array(w.plantType).buffer,
      plantStage: new Uint8Array(w.plantStage).buffer,
    };
  }

  if (!isFullSync && animalsDead && animalsDead.length > 0) {
    msg.animalsDead = animalsDead;
  }

  // Always include phase timing
  if (engine._latestPhases) {
    msg.phases = engine._latestPhases;
  }

  if (profilingEnabled) {
    const profile = engine.getLatestProfile ? engine.getLatestProfile() : null;
    if (profile) {
      msg.profiling = {
        engine: {
          ...profile,
          tickMs,
        },
      };
    }
  }

  // Include full stats every 10 ticks
  if (tick % 10 === 0) {
    msg.stats = w.getStats();
    msg.stats.tick = tick;
    msg.stats.tickMs = tickMs;
    msg.stats.animalCount = w.animals.length;
    msg.stats.activePlants = w.activePlantTiles.size;
    msg.statsHistory = w.statsHistory;
  }

  self.postMessage(msg);
}

function postSubTickState() {
  const w = engine.world;
  // Lightweight message: only position deltas for moved animals
  const animals = [];
  for (const a of w.animals) {
    if (!a._dirty) continue;
    if (a.alive) {
      // Minimal delta: just position and direction for sub-ticks
      animals.push({
        id: a.id,
        x: a.x,
        y: a.y,
        direction: a.direction,
      });
    }
    a.clearDirty();
  }

  if (animals.length === 0) return; // Skip if nothing moved

  const msg = {
    type: 'tick',
    clock: w.clock.toDict(),
    animals,
    plantChanges: [],
    incremental: true,
  };

  self.postMessage(msg);
}

self.onmessage = function (e) {
  const { cmd } = e.data;

  switch (cmd) {
    case 'generate': {
      // New game can be triggered while previous world is running.
      // Enter a known-safe loop state before rebuilding engine/workers.
      stopLoop();
      running = false;
      paused = true;
      pendingPause = false;

      const config = { ...DEFAULT_CONFIG, ...e.data.config };
      engine = new SimulationEngine(config);
      engine.setProfilingEnabled(profilingEnabled);
      const seed = engine.generateWorld();
      const w = engine.world;
      tps = config.ticks_per_second || 10;

      // Initialize fauna sub-workers for parallel processing
      initFaunaWorkers(config, w.terrain, w.waterProximity, w.heightmap);

      // Send copies of typed arrays (don't transfer — engine still needs them)
      self.postMessage({
        type: 'worldReady',
        width: w.width,
        height: w.height,
        seed,
        config: w.config,
        terrain: new Uint8Array(w.terrain).buffer,
        waterProximity: new Uint8Array(w.waterProximity).buffer,
        heightmap: w.heightmap ? new Float32Array(w.heightmap).buffer : null,
        plantType: new Uint8Array(w.plantType).buffer,
        plantStage: new Uint8Array(w.plantStage).buffer,
        animals: w.animals.filter(a => a.alive).map(a => a.toDict()),
        clock: w.clock.toDict(),
        hungerMultiplier: w.hungerMultiplier,
        thirstMultiplier: w.thirstMultiplier,
        max_animal_population: config.max_animal_population || 0,
      });
      break;
    }

    case 'start':
      if (!engine) break;
      startLoop();
      break;

    case 'reset': {
      if (!engine) break;
      stopLoop();
      running = false;
      paused = true;
      engine.resetSimulation();
      const rw = engine.world;

      // Re-init fauna workers with same terrain
      initFaunaWorkers(rw.config, rw.terrain, rw.waterProximity, rw.heightmap);

      self.postMessage({
        type: 'worldReady',
        width: rw.width,
        height: rw.height,
        seed: 0,
        config: rw.config,
        terrain: new Uint8Array(rw.terrain).buffer,
        waterProximity: new Uint8Array(rw.waterProximity).buffer,
        heightmap: rw.heightmap ? new Float32Array(rw.heightmap).buffer : null,
        plantType: new Uint8Array(rw.plantType).buffer,
        plantStage: new Uint8Array(rw.plantStage).buffer,
        animals: rw.animals.filter(a => a.alive).map(a => a.toDict()),
        clock: rw.clock.toDict(),
        hungerMultiplier: rw.hungerMultiplier,
        thirstMultiplier: rw.thirstMultiplier,
        max_animal_population: rw.config.max_animal_population || 0,
      });
      break;
    }

    case 'pause':
      // If already paused or not running, stop immediately
      if (paused || !running) {
        paused = true;
        stopLoop();
      } else {
        // Otherwise, set flag to pause after current tick completes
        // This prevents interrupting a heavy tick mid-execution
        pendingPause = true;
      }
      break;

    case 'resume':
      if (!engine) break;
      pendingPause = false;  // Clear any pending pause
      paused = false;
      startLoop();
      break;

    case 'step':
      if (!engine) break;
      doTick();
      break;

    case 'setSpeed':
      tps = Math.max(1, Math.min(120, e.data.tps));
      if (running && !paused) {
        stopLoop();
        scheduleNextTick();
      }
      break;

    case 'editTerrain':
      if (!engine) break;
      engine.editTerrain(e.data.changes);
      break;

    case 'setMultipliers':
      if (!engine || !engine.world) break;
      if (e.data.hungerMultiplier != null) engine.world.hungerMultiplier = e.data.hungerMultiplier;
      if (e.data.thirstMultiplier != null) engine.world.thirstMultiplier = e.data.thirstMultiplier;
      break;

    case 'placeEntity': {
      if (!engine) break;
      const result = engine.placeEntity(e.data.entityType, e.data.x, e.data.y);
      self.postMessage({ type: 'entityPlaced', entity: result });
      break;
    }

    case 'removeEntity': {
      if (!engine) break;
      const ok = engine.removeEntity(e.data.entityId);
      self.postMessage({ type: 'entityRemoved', entityId: e.data.entityId, ok });
      break;
    }

    case 'getTileInfo': {
      if (!engine) break;
      const w = engine.world;
      const { x, y } = e.data;
      if (!w.isInBounds(x, y)) {
        self.postMessage({ type: 'tileInfo', x, y, info: null });
        break;
      }
      const idx = w.idx(x, y);
      const info = {
        terrain: TERRAIN_NAMES[w.terrain[idx]] || 'unknown',
        terrainId: w.terrain[idx],
        waterProximity: w.waterProximity[idx],
        plant: {
          type: w.plantType[idx],
          stage: w.plantStage[idx],
          age: w.plantAge[idx],
          log: w.plantLog.get(idx) || [],
        },
      };
      // Adjacent plant count (crowding)
      {
        const width = w.width;
        const height = w.height;
        let adjPlants = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < width && ny < height && w.plantType[ny * width + nx] !== 0) {
              adjPlants++;
            }
          }
        }
        info.adjacentPlants = adjPlants;
      }
      // 3×3 neighborhood terrain + water adjacency
      {
        const width = w.width;
        const height = w.height;
        const neighbors = [];
        let waterAdjacent = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
              const nIdx = ny * width + nx;
              const tid = w.terrain[nIdx];
              neighbors.push(tid);
              if ((dx !== 0 || dy !== 0) && (tid === 0 || tid === 6)) waterAdjacent = true; // WATER or DEEP_WATER
            } else {
              neighbors.push(-1); // out-of-bounds
            }
          }
        }
        info.neighbors = neighbors; // 9 elements, row-major from (-1,-1)
        info.waterAdjacent = waterAdjacent;
      }
      // Find animals on this tile (include fresh corpses so skulls are inspectable)
      info.animals = [];
      for (const a of w.animals) {
        if ((a.alive || a.state === 9) && (a.x | 0) === x && (a.y | 0) === y) {
          info.animals.push(a.toDict());
        }
      }
      self.postMessage({ type: 'tileInfo', x, y, info, refreshOnly: !!e.data.refreshOnly });
      break;
    }

    case 'getAnimalDetail': {
      if (!engine) break;
      const w = engine.world;
      const animalId = e.data.id;
      const animal = w.animals.find(a => a.id === animalId);
      if (animal) {
        const detail = animal.toInspectDict();
        // Add tile context under the animal
        const ax = animal.x | 0;
        const ay = animal.y | 0;
        if (w.isInBounds(ax, ay)) {
          const aIdx = w.idx(ax, ay);
          detail._tileTerrain = TERRAIN_NAMES[w.terrain[aIdx]] || 'unknown';
          detail._tileTerrainId = w.terrain[aIdx];
          detail._tileWaterProximity = w.waterProximity[aIdx];
        }
        self.postMessage({ type: 'animalDetail', id: animalId, detail });
      } else {
        self.postMessage({ type: 'animalDetail', id: animalId, detail: null });
      }
      break;
    }

    case 'saveState': {
      if (!engine || !engine.world) {
        self.postMessage({ type: 'savedState', data: null });
        break;
      }
      const sw = engine.world;
      const saveData = {
        config: sw.config,
        width: sw.width,
        height: sw.height,
        clock: sw.clock.toDict(),
        terrain: Array.from(sw.terrain),
        waterProximity: Array.from(sw.waterProximity),
        plantType: Array.from(sw.plantType),
        plantStage: Array.from(sw.plantStage),
        plantAge: Array.from(sw.plantAge),
        animals: sw.animals.filter(a => a.alive).map(a => a.toDict()),
        nextAnimalId: sw._nextId,
        hungerMultiplier: sw.hungerMultiplier,
        thirstMultiplier: sw.thirstMultiplier,
        statsHistory: sw.statsHistory,
      };
      self.postMessage({ type: 'savedState', data: saveData });
      break;
    }

    case 'loadState': {
      const d = e.data.state;
      if (!d) break;
      const loadConfig = d.config || DEFAULT_CONFIG;
      engine = new SimulationEngine(loadConfig);
      engine.setProfilingEnabled(profilingEnabled);

      const lw = new World(loadConfig);
      lw.width = d.width;
      lw.height = d.height;
      const size = d.width * d.height;
      lw.terrain = new Uint8Array(d.terrain);
      lw.waterProximity = new Uint8Array(d.waterProximity);
      lw.plantType = new Uint8Array(d.plantType);
      lw.plantStage = new Uint8Array(d.plantStage);
      lw.plantAge = new Uint16Array(d.plantAge);
      lw.clock.tick = d.clock.tick;
      lw.clock.ticksPerDay = d.clock.ticks_per_day || lw.clock.ticksPerDay;
      lw._nextId = d.nextAnimalId || 1000;
      lw.hungerMultiplier = d.hungerMultiplier ?? lw.hungerMultiplier;
      lw.thirstMultiplier = d.thirstMultiplier ?? lw.thirstMultiplier;
      lw.statsHistory = d.statsHistory || [];

      // Restore animals
      for (const ad of d.animals) {
        const speciesConfig = loadConfig.animal_species[ad.species];
        if (!speciesConfig) continue;
        const animal = new Animal(ad.id, ad.x, ad.y, ad.species, speciesConfig);
        animal.energy = ad.energy;
        animal.hunger = ad.hunger;
        animal.thirst = ad.thirst;
        animal.age = ad.age;
        animal.alive = ad.alive;
        animal.state = ad.state;
        if (ad.sex) animal.sex = ad.sex;
        if (ad.diet) animal.diet = ad.diet;
        lw.animals.push(animal);
      }
      if (lw._nextId <= Math.max(...lw.animals.map(a => a.id), 0)) {
        lw._nextId = Math.max(...lw.animals.map(a => a.id), 0) + 1;
      }
      lw.rebuildDerivedState();

      engine.world = lw;
      engine.spatialHash.rebuild(lw.animals.filter(a => a.alive));

      // Re-init fauna workers with loaded terrain
      initFaunaWorkers(loadConfig, lw.terrain, lw.waterProximity, lw.heightmap);

      running = false;
      paused = true;
      stopLoop();

      self.postMessage({
        type: 'worldReady',
        width: lw.width,
        height: lw.height,
        seed: 0,
        config: lw.config,
        terrain: new Uint8Array(lw.terrain).buffer,
        waterProximity: new Uint8Array(lw.waterProximity).buffer,
        heightmap: lw.heightmap ? new Float32Array(lw.heightmap).buffer : null,
        plantType: new Uint8Array(lw.plantType).buffer,
        plantStage: new Uint8Array(lw.plantStage).buffer,
        animals: lw.animals.filter(a => a.alive).map(a => a.toDict()),
        clock: lw.clock.toDict(),
        hungerMultiplier: lw.hungerMultiplier,
        thirstMultiplier: lw.thirstMultiplier,
      });
      break;
    }

    case 'setProfiling': {
      profilingEnabled = !!e.data.enabled;
      if (engine && engine.setProfilingEnabled) {
        engine.setProfilingEnabled(profilingEnabled);
      }
      break;
    }

    default:
      console.warn('[SimWorker] Unknown command:', cmd);
  }
};
