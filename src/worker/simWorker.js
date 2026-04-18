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
import { createSimulationConfig, DEFAULT_CONFIG } from '../engine/config.js';
import { TERRAIN_NAMES, World } from '../engine/world.js';
import { Animal } from '../engine/entities.js';
import { GroundItem } from '../engine/items.js';

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
// Cap the postMessage rate to main thread regardless of TPS.
// At TPS > MAX_UI_UPDATE_HZ the loop batches multiple sim ticks per iteration.
const MAX_UI_UPDATE_HZ = 30;

// --- Fauna worker pool ---
const MIN_ANIMALS_FOR_PARALLEL = 500;
const MAX_FAUNA_WORKERS = 4;
let faunaWorkers = [];
let faunaWorkersReady = false;
let _ticking = false;
let tickBatchCarry = 0;

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
  // Fire at most MAX_UI_UPDATE_HZ times/sec; each call may batch multiple sim ticks.
  const intervalMs = Math.max(1000 / tps, 1000 / MAX_UI_UPDATE_HZ);
  tickTimeoutId = setTimeout(doTick, intervalMs);
}

function computeTicksPerLoop() {
  // At low TPS we run one simulation tick per loop and clear any carry
  // from previous high-speed batching.
  if (tps <= MAX_UI_UPDATE_HZ) {
    tickBatchCarry = 0;
    return 1;
  }

  // Keep average TPS accurate by carrying fractional ticks between loops.
  const exactTicksPerLoop = (tps / MAX_UI_UPDATE_HZ) + tickBatchCarry;
  const ticksPerLoop = Math.max(1, Math.floor(exactTicksPerLoop));
  tickBatchCarry = exactTicksPerLoop - ticksPerLoop;
  return ticksPerLoop;
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
    // Number of sim ticks to run per loop iteration.
    // When TPS > MAX_UI_UPDATE_HZ we batch multiple ticks and post once,
    // keeping the main thread message rate capped at MAX_UI_UPDATE_HZ.
    const ticksPerLoop = computeTicksPerLoop();
    // Aggregate flora/item deltas across all simulated ticks in this UI loop.
    // Without this, at high TPS only the last tick's deltas are posted.
    const batchedPlantChanges = [];
    const batchedItemChanges = [];
    // Pin the engine for this loop; async awaits can interleave with generate/load/reset.
    const tickEngine = engine;
    let aborted = false;

    // Detect if any full-sync boundary is crossed in this batch.
    const tickBefore = tickEngine.world.clock.tick;

    for (let i = 0; i < ticksPerLoop; i++) {
      // Respect pending pause between individual ticks for fast response.
      if (pendingPause) break;

      if (engine !== tickEngine || !tickEngine.world) {
        aborted = true;
        break;
      }

      const w = tickEngine.world;
      let aliveCount = 0;
      for (const a of w.animals) if (a.alive) aliveCount++;
      const useParallel = faunaWorkersReady
        && faunaWorkers.length > 0
        && aliveCount >= MIN_ANIMALS_FOR_PARALLEL;

      if (useParallel) {
        tickEngine.tickFlora();
        const behaviorStart = performance.now();
        const merged = await doParallelFauna(tickEngine);
        if (!merged || engine !== tickEngine || !tickEngine.world || !tickEngine._phases) {
          aborted = true;
          break;
        }
        tickEngine._phases.behaviorMs = performance.now() - behaviorStart;
        tickEngine._phases.spatialMs = 0;
        tickEngine.tickCleanup();
      } else {
        tickEngine.tick();
      }

      if (engine !== tickEngine || !tickEngine.world) {
        aborted = true;
        break;
      }

      if (tickEngine.world.plantChanges.length > 0) {
        batchedPlantChanges.push(...tickEngine.world.plantChanges);
      }
      if (tickEngine.world.itemChanges.length > 0) {
        batchedItemChanges.push(...tickEngine.world.itemChanges);
      }

      // Movement sub-ticks: only post for the last sim tick in the batch to avoid
      // flooding the main thread with intermediate position updates.
      const isLastInBatch = (i === ticksPerLoop - 1) || pendingPause;
      const subTicks = tickEngine.world.config.movement_sub_ticks || 1;
      for (let s = 1; s < subTicks; s++) {
        tickEngine.tickMovementOnly();
        if (isLastInBatch) postSubTickState();
      }
    }

    if (aborted || engine !== tickEngine || !tickEngine.world) {
      return;
    }

    // If a full-sync boundary was crossed during the batch, force full sync now.
    const tickAfter = tickEngine.world.clock.tick;
    const hadFullSync =
      Math.floor(tickAfter / FULL_SYNC_INTERVAL) > Math.floor(tickBefore / FULL_SYNC_INTERVAL);

    const tickMs = performance.now() - t0;
    postTickState(tickMs, hadFullSync, batchedPlantChanges, batchedItemChanges);
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

async function doParallelFauna(targetEngine = engine) {
  if (!targetEngine || !targetEngine.world) return false;
  const w = targetEngine.world;
  const alive = [];
  for (const a of w.animals) if (a.alive) alive.push(a);

  const nWorkers = faunaWorkers.length;
  const chunks = Array.from({ length: nWorkers }, () => []);
  for (let i = 0; i < alive.length; i++) {
    chunks[i % nWorkers].push(alive[i].id);
  }

  const allAnimalStates = alive.map(a => a.toWorkerState());
  const activePlantIndices = Array.from(w.activePlantTiles);
  // Snapshot of non-consumed items for fauna workers to read (claim-mode, not mutated)
  const itemsSnapshot = w.items.filter(i => !i.consumed).map(i => i.toDelta());

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
        finish({ deltas: [], births: [], plantChanges: [], deadIds: [], plantConsumptionClaims: [] });
      };
      const timeoutId = setTimeout(() => {
        // Sub-worker may have been terminated during world regeneration.
        finish({ deltas: [], births: [], plantChanges: [], deadIds: [], plantConsumptionClaims: [] });
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
        items: itemsSnapshot,
      }, [ptCopy.buffer, psCopy.buffer, paCopy.buffer, agCopy.buffer]);
    });
  });

  const results = await Promise.all(resultPromises);
  if (engine !== targetEngine || !targetEngine.world) {
    return false;
  }
  targetEngine.applyFaunaResults(results);
  return true;
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

function postTickState(tickMs = 0, forceFullSync = false, batchedPlantChanges = null, batchedItemChanges = null) {
  const w = engine.world;
  const tick = w.clock.tick;
  const isFullSync = forceFullSync || tick % FULL_SYNC_INTERVAL === 0;
  const plantChanges = batchedPlantChanges || w.plantChanges;
  const itemChanges = batchedItemChanges || w.itemChanges;
  const plantChangesOverflow = plantChanges.length > MAX_PLANT_CHANGES_PER_TICK;
  const itemMaxChanges = w.config.item_max_changes_per_tick ?? 2000;
  const itemChangesOverflow = itemChanges.length > itemMaxChanges;

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
        if (a.consumed) {
          animals.push(a.toDelta());
        }
        animalsDead.push(a.id);
      }
      a.clearDirty();
    }
  }

  const msg = {
    type: 'tick',
    clock: w.clock.toDict(),
    animals,
    plantChanges: plantChangesOverflow ? [] : plantChanges,
    itemChanges: itemChangesOverflow ? [] : (itemChanges.length > 0 ? itemChanges : undefined),
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

  if (itemChangesOverflow) {
    msg.itemsFullSync = w.items.filter(item => !item.consumed).map(item => item.toDelta());
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

  // Include supervisor report when it has issues worth logging
  const supervisorReport = engine._latestSupervisorReport;
  if (supervisorReport && supervisorReport.shouldLog && supervisorReport.issueCount > 0) {
    msg.supervisorReport = {
      tick: supervisorReport.tick,
      issueCount: supervisorReport.issueCount,
      countsByType: supervisorReport.countsByType,
      samples: supervisorReport.samples,
    };
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

      const config = createSimulationConfig(e.data.config);
      engine = new SimulationEngine(config);
      engine.setProfilingEnabled(profilingEnabled);
      const seed = engine.generateWorld();
      const w = engine.world;
      tps = config.ticks_per_second || 10;
      tickBatchCarry = 0;

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
      tickBatchCarry = 0;
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
            if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
              const nIdx = ny * width + nx;
              const nType = w.plantType[nIdx];
              const nStage = w.plantStage[nIdx];
              if (nType !== 0 && nStage > 0 && nStage < 6) {
                adjPlants++;
              }
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
        const neighborPlants = [];
        let waterAdjacent = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
              const nIdx = ny * width + nx;
              const tid = w.terrain[nIdx];
              neighbors.push(tid);
              const pType = w.plantType[nIdx];
              const pStage = w.plantStage[nIdx];
              if (pType !== 0 && pStage > 0 && pStage < 6) {
                neighborPlants.push({ type: pType, stage: pStage });
              } else {
                neighborPlants.push(null);
              }
              if ((dx !== 0 || dy !== 0) && (tid === 0 || tid === 6)) waterAdjacent = true; // WATER or DEEP_WATER
            } else {
              neighbors.push(-1); // out-of-bounds
              neighborPlants.push(null);
            }
          }
        }
        info.neighbors = neighbors; // 9 elements, row-major from (-1,-1)
        info.neighborPlants = neighborPlants; // 9 elements aligned with neighbors
        info.waterAdjacent = waterAdjacent;
      }
      // Find animals on this tile (include fresh corpses so skulls are inspectable)
      info.animals = [];
      for (const a of w.animals) {
        if ((a.alive || a.state === 9) && (a.x | 0) === x && (a.y | 0) === y) {
          info.animals.push(a.toDict());
        }
      }
      // Ground items on this tile
      info.items = [];
      for (const item of w.items) {
        if (!item.consumed && (item.x | 0) === x && (item.y | 0) === y) {
          info.items.push(item.toDelta());
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
        items: sw.items.filter(i => !i.consumed).map(i => i.toDelta()),
      };
      self.postMessage({ type: 'savedState', data: saveData });
      break;
    }

    case 'loadState': {
      const d = e.data.state;
      if (!d) break;
      const loadConfig = createSimulationConfig(d.config || DEFAULT_CONFIG);
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

      // Restore ground items
      if (d.items) {
        for (const id of d.items) {
          const item = new GroundItem(id.id, id.x, id.y, id.type, id.source, id.createdTick, id.germinationTicks || 0);
          lw.items.push(item);
          lw._itemById.set(item.id, item);
          lw._itemSpatialHash.insert(item);
          lw._itemTiles.add(item.y * lw.width + item.x);
        }
      }

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
