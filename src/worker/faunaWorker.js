/**
 * Fauna processing sub-worker.
 *
 * Receives a snapshot of world state + a chunk of animal IDs to process.
 * Runs decideAndAct() for each assigned animal and returns deltas
 * for the main simulation worker to merge.
 *
 * Commands:
 *   { cmd: 'init', config, terrain, waterProximity, heightmap }
 *   { cmd: 'tick', plantType, plantStage, plantAge, animalGrid,
 *     clockTick, ticksPerDay, dayFraction, hungerMultiplier, thirstMultiplier,
 *     activePlantIndices, allAnimals, chunkIds, nextIdBase }
 *
 * Responses:
 *   { cmd: 'ready' }
 *   { cmd: 'tickResult', deltas, births, plantChanges, deadIds, plantConsumptionClaims }
 */

import { World } from '../engine/world.js';
import { Animal, LifeStage } from '../engine/entities.js';
import { SpatialHash } from '../engine/spatialHash.js';
import { decideAndAct } from '../engine/behaviors.js';

let world = null;
let spatialHash = new SpatialHash(16);

/**
 * Reconstruct an Animal instance from serialized worker state.
 */
function reconstructAnimal(ad, speciesConfig) {
  const a = new Animal(ad.id, ad.x, ad.y, ad.species, speciesConfig);
  a.sex = ad.sex;
  a.diet = ad.diet;
  a.state = ad.state;
  a.energy = ad.energy;
  a.hp = ad.hp;
  a.hunger = ad.hunger;
  a.thirst = ad.thirst;
  a.age = ad.age;
  a.alive = ad.alive;
  a.mateCooldown = ad.mateCooldown || 0;
  a.attackCooldown = ad.attackCooldown || 0;
  a.path = ad.path || [];
  a.pathIndex = ad.pathIndex || 0;
  a._pathTick = ad._pathTick || 0;
  a._cachedThreat = null;
  a._cachedThreatTick = ad._cachedThreatTick || -1;
  a._nextThreatCheckTick = ad._nextThreatCheckTick || 0;
  a._deathTick = ad._deathTick;
  a.consumed = ad.consumed || false;
  a.homeX = ad.homeX ?? ad.x;
  a.homeY = ad.homeY ?? ad.y;
  a.targetX = ad.targetX;
  a.targetY = ad.targetY;
  a._birthTick = ad._birthTick || 0;
  a.pregnant = ad.pregnant || false;
  a.gestationTimer = ad.gestationTimer || 0;
  a._gestationLitterSize = ad._gestationLitterSize || 0;
  a._isEggStage = ad._isEggStage || false;
  a._incubationPeriod = ad._incubationPeriod || 0;
  a._eggMaxHp = ad._eggMaxHp || 0;
  a.parentA = ad.parentA ?? null;
  a.parentB = ad.parentB ?? null;
  if (a._isEggStage && a._eggMaxHp > 0) {
    a.hp = ad.hp ?? a._eggMaxHp;
  }
  a.actionHistory = ad.actionHistory || [];
  a.direction = ad.direction || 0;
  return a;
}

self.onmessage = function (e) {
  const { cmd } = e.data;

  switch (cmd) {
    case 'init': {
      // Create persistent World with immutable terrain (sent once)
      world = new World(e.data.config);
      world.terrain = new Uint8Array(e.data.terrain);
      world.waterProximity = new Uint8Array(e.data.waterProximity);
      if (e.data.heightmap) {
        world.heightmap = new Float32Array(e.data.heightmap);
      }
      self.postMessage({ cmd: 'ready' });
      break;
    }

    case 'tick': {
      if (!world) {
        self.postMessage({ cmd: 'tickResult', error: 'not initialized' });
        return;
      }

      // Sync per-tick mutable state (transferred ArrayBuffers → wrap as TypedArrays)
      world.plantType = new Uint8Array(e.data.plantType);
      world.plantStage = new Uint8Array(e.data.plantStage);
      world.plantAge = new Uint16Array(e.data.plantAge);
      world.animalGrid = new Uint8Array(e.data.animalGrid);
      world.clock.tick = e.data.clockTick;
      world.clock.ticksPerDay = e.data.ticksPerDay;
      world.clock.dayFraction = e.data.dayFraction;
      world.hungerMultiplier = e.data.hungerMultiplier;
      world.thirstMultiplier = e.data.thirstMultiplier;
      world.resetDeathsThisTick();
      world.plantChanges = [];
      world.plantConsumptionClaims = [];
      world.resetPlantEvents();
      world.activePlantTiles = new Set(e.data.activePlantIndices);

      // Set up local ID counter (partition-safe range for births)
      world._nextId = e.data.nextIdBase || 900000;

      // Reconstruct ALL animals (needed for spatial queries, threat/mate detection)
      const speciesConfigs = world.config.animal_species;
      const allAnimals = [];
      for (const ad of e.data.allAnimals) {
        const sc = speciesConfigs[ad.species];
        if (!sc) continue;
        allAnimals.push(reconstructAnimal(ad, sc));
      }
      world.animals = allAnimals;
      world.eggGrid.fill(0);
      for (const animal of allAnimals) {
        if (animal.alive && animal.lifeStage === LifeStage.EGG) {
          world.placeEgg(animal.x, animal.y);
        }
      }

      // Build spatial hash from all alive animals
      spatialHash.rebuild(allAnimals.filter(a => a.alive));

      // Process only the assigned chunk
      const chunkIds = new Set(e.data.chunkIds);

      for (const animal of allAnimals) {
        if (!animal.alive || !chunkIds.has(animal.id)) continue;
        decideAndAct(animal, world, spatialHash);
        spatialHash.update(animal);
      }

      const deadIds = world.consumeDeathsThisTick().map(entity => entity.id);

      // Collect deltas for processed chunk animals
      const deltas = [];
      for (const animal of allAnimals) {
        if (!chunkIds.has(animal.id)) continue;
        deltas.push({
          id: animal.id,
          x: animal.x,
          y: animal.y,
          state: animal.state,
          energy: animal.energy,
          hp: animal.hp,
          hunger: animal.hunger,
          thirst: animal.thirst,
          age: animal.age,
          alive: animal.alive,
          mateCooldown: animal.mateCooldown,
          attackCooldown: animal.attackCooldown,
          path: animal.path,
          pathIndex: animal.pathIndex,
          _pathTick: animal._pathTick,
          _deathTick: animal._deathTick,
          consumed: animal.consumed,
          targetX: animal.targetX,
          targetY: animal.targetY,
          pregnant: animal.pregnant,
          gestationTimer: animal.gestationTimer,
          _gestationLitterSize: animal._gestationLitterSize,
          _isEggStage: animal._isEggStage,
          _incubationPeriod: animal._incubationPeriod,
          _eggMaxHp: animal._eggMaxHp,
          parentA: animal.parentA,
          parentB: animal.parentB,
          direction: animal.direction,
          actionHistory: animal.actionHistory,
        });
      }

      // Collect births — animals created during _doMate that weren't in the original list
      const originalIds = new Set(e.data.allAnimals.map(a => a.id));
      const births = [];
      for (const animal of world.animals) {
        if (!originalIds.has(animal.id)) {
          births.push(animal.toWorkerState());
        }
      }

      self.postMessage({
        cmd: 'tickResult',
        deltas,
        births,
        plantChanges: world.plantChanges,
        plantConsumptionClaims: world.plantConsumptionClaims,
        deadIds,
      });
      break;
    }
  }
};
