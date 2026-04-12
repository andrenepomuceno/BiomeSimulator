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
 *
 * Messages (worker → main):
 *   { type: 'worldReady', terrain, waterProximity, plantType, plantStage, width, height, seed, animals, clock }
 *   { type: 'tick', clock, animals, plantChanges, stats }
 *   { type: 'tileInfo', ... }
 *   { type: 'entityPlaced', entity }
 *   { type: 'entityRemoved', entityId, ok }
 */

import { SimulationEngine } from '../engine/simulation.js';
import { DEFAULT_CONFIG } from '../engine/config.js';
import { TERRAIN_NAMES } from '../engine/world.js';

let engine = null;
let running = false;
let paused = true;
let tps = 10;
let intervalId = null;

function startLoop() {
  stopLoop();
  running = true;
  paused = false;
  intervalId = setInterval(doTick, 1000 / tps);
}

function stopLoop() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function doTick() {
  if (!engine || !engine.world) return;
  engine.tick();
  postTickState();
}

function postTickState() {
  const w = engine.world;
  const animals = [];
  for (const a of w.animals) {
    if (a.alive) animals.push(a.toDict());
  }

  const msg = {
    type: 'tick',
    clock: w.clock.toDict(),
    animals,
    plantChanges: w.plantChanges.slice(0, 5000),
  };

  // Include full stats every 10 ticks
  if (w.clock.tick % 10 === 0) {
    msg.stats = w.getStats();
    msg.stats.tick = w.clock.tick;
    msg.statsHistory = w.statsHistory;
  }

  self.postMessage(msg);
}

self.onmessage = function (e) {
  const { cmd } = e.data;

  switch (cmd) {
    case 'generate': {
      const config = { ...DEFAULT_CONFIG, ...e.data.config };
      engine = new SimulationEngine(config);
      const seed = engine.generateWorld();
      const w = engine.world;
      tps = config.ticks_per_second || 10;

      // Send copies of typed arrays (don't transfer — engine still needs them)
      self.postMessage({
        type: 'worldReady',
        width: w.width,
        height: w.height,
        seed,
        terrain: new Uint8Array(w.terrain).buffer,
        waterProximity: new Uint8Array(w.waterProximity).buffer,
        plantType: new Uint8Array(w.plantType).buffer,
        plantStage: new Uint8Array(w.plantStage).buffer,
        animals: w.animals.filter(a => a.alive).map(a => a.toDict()),
        clock: w.clock.toDict(),
      });
      break;
    }

    case 'start':
      if (!engine) break;
      startLoop();
      break;

    case 'pause':
      paused = true;
      stopLoop();
      break;

    case 'resume':
      if (!engine) break;
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
        intervalId = setInterval(doTick, 1000 / tps);
      }
      break;

    case 'editTerrain':
      if (!engine) break;
      engine.editTerrain(e.data.changes);
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
        waterProximity: w.waterProximity[idx],
        plant: {
          type: w.plantType[idx],
          stage: w.plantStage[idx],
          age: w.plantAge[idx],
          fruit: w.plantFruit[idx],
        },
      };
      // Find animals on this tile
      info.animals = [];
      for (const a of w.animals) {
        if (a.alive && a.x === x && a.y === y) {
          info.animals.push(a.toDict());
        }
      }
      self.postMessage({ type: 'tileInfo', x, y, info });
      break;
    }
  }
};
