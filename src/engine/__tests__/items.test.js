import { describe, expect, it, vi } from 'vitest';
import { GroundItem, ITEM_TYPE, ITEM_NUTRITION, nextItemId, resetItemIdCounter } from '../items.js';
import { World } from '../world.js';
import { Animal, AnimalState } from '../entities.js';
import { _eatGroundItem } from '../behaviors/eating.js';
import { SimulationEngine } from '../simulation.js';
import { createAnimalConfig } from '../../test/testUtils.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides = {}) {
  return {
    map_width: 5,
    map_height: 5,
    ticks_per_day: 100,
    day_fraction: 0.6,
    animal_species: {},
    max_animal_population: 0,
    ...overrides,
  };
}

function makeWorld(configOverrides = {}) {
  return new World(makeConfig(configOverrides));
}

/** Register a pre-built GroundItem into all world data structures. */
function registerItem(world, item) {
  world.items.push(item);
  world._itemById.set(item.id, item);
  world._itemSpatialHash.insert(item);
  world._itemTiles.add(item.y * world.width + item.x);
}

function makeAnimal(overrides = {}) {
  const cfg = createAnimalConfig({
    diet: 'CARNIVORE',
    max_energy: 100,
    max_hp: 50,
    energy_costs: { EAT: 2 },
    initial_state: { energy_fraction: 0.5, hunger_range: [0, 0], thirst_range: [0, 0] },
  });
  const a = new Animal(overrides.id ?? 1, overrides.x ?? 1, overrides.y ?? 1, 'TEST', cfg);
  Object.assign(a, overrides);
  return a;
}

// ---------------------------------------------------------------------------
// 1. GroundItem class & toDelta
// ---------------------------------------------------------------------------

describe('GroundItem', () => {
  it('stores all constructor fields', () => {
    const item = new GroundItem(42, 3, 7, ITEM_TYPE.MEAT, 'WOLF', 10, 0);
    expect(item.id).toBe(42);
    expect(item.x).toBe(3);
    expect(item.y).toBe(7);
    expect(item.type).toBe(ITEM_TYPE.MEAT);
    expect(item.source).toBe('WOLF');
    expect(item.createdTick).toBe(10);
    expect(item.germinationTicks).toBe(0);
    expect(item.consumed).toBe(false);
  });

  it('toDelta returns all fields needed for serialisation', () => {
    const item = new GroundItem(7, 2, 4, ITEM_TYPE.SEED, 5, 20, 300);
    const d = item.toDelta();
    expect(d).toMatchObject({ id: 7, x: 2, y: 4, type: ITEM_TYPE.SEED, source: 5, createdTick: 20, germinationTicks: 300, consumed: false });
  });

  it('ITEM_NUTRITION covers every item type', () => {
    for (const type of [ITEM_TYPE.MEAT, ITEM_TYPE.FRUIT, ITEM_TYPE.SEED]) {
      const n = ITEM_NUTRITION[type];
      expect(n).toBeDefined();
      expect(n.hunger).toBeGreaterThan(0);
      expect(n.energy).toBeGreaterThan(0);
      expect(n.hp).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. spawnItem — world data-structure integrity
// ---------------------------------------------------------------------------

describe('World.spawnItem', () => {
  it('adds item to all four data structures', () => {
    const w = makeWorld();
    // Terrain is all 0 (water by default). Make tile (2,2) walkable = GRASS (1).
    w.terrain.fill(1);
    const item = w.spawnItem(2, 2, ITEM_TYPE.MEAT, 'WOLF');
    expect(item).not.toBeNull();
    expect(w.items).toContain(item);
    expect(w._itemById.get(item.id)).toBe(item);
    expect(w._itemTiles.has(item.y * w.width + item.x)).toBe(true);
    expect(w.itemChanges.some(c => c.op === 'add' && c.item.id === item.id)).toBe(true);
  });

  it('returns null when no walkable tile is available', () => {
    const w = makeWorld();
    // Leave terrain as 0 (water) — no walkable tile
    const item = w.spawnItem(2, 2, ITEM_TYPE.FRUIT, 'MANGO');
    expect(item).toBeNull();
  });

  it('anti-stacking: second spawn on same tile returns null if no free adjacent tile', () => {
    const w = makeWorld({ map_width: 1, map_height: 1 });
    w.terrain.fill(1);
    const first = w.spawnItem(0, 0, ITEM_TYPE.MEAT, 'X');
    // 1x1 map with only one tile — second spawn must fail
    const second = w.spawnItem(0, 0, ITEM_TYPE.MEAT, 'X');
    expect(first).not.toBeNull();
    expect(second).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. removeItem — normal mode
// ---------------------------------------------------------------------------

describe('World.removeItem (normal mode)', () => {
  it('removes item from all data structures and emits remove change', () => {
    const w = makeWorld();
    w.terrain.fill(1);
    const item = w.spawnItem(2, 2, ITEM_TYPE.MEAT, 'WOLF');
    w.itemChanges = []; // clear add change
    w.removeItem(item);
    expect(w.items).not.toContain(item);
    expect(w._itemById.has(item.id)).toBe(false);
    expect(w._itemTiles.has(item.y * w.width + item.x)).toBe(false);
    expect(item.consumed).toBe(true);
    expect(w.itemChanges.some(c => c.op === 'remove' && c.item.id === item.id)).toBe(true);
  });

  it('is idempotent — second call on consumed item is a no-op', () => {
    const w = makeWorld();
    w.terrain.fill(1);
    const item = w.spawnItem(2, 2, ITEM_TYPE.MEAT, 'WOLF');
    w.removeItem(item);
    w.itemChanges = [];
    w.removeItem(item); // should not throw or double-remove
    expect(w.itemChanges).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 4. removeItem — claim mode (parallel workers)
// ---------------------------------------------------------------------------

describe('World.removeItem (claim mode)', () => {
  it('records a claim instead of removing, marks item consumed locally', () => {
    const w = makeWorld();
    w.terrain.fill(1);
    const item = w.spawnItem(2, 2, ITEM_TYPE.MEAT, 'WOLF');
    w._itemClaimMode = true;
    const claimData = { animalId: 99, preHunger: 80, preEnergy: 30, preHp: 40, preState: AnimalState.IDLE };
    w.removeItem(item, claimData);

    // Item must still be in the world arrays (claim, not actual removal)
    expect(w.items).toContain(item);
    expect(item.consumed).toBe(true); // locally consumed so same worker won't try again
    expect(w.itemConsumptionClaims).toHaveLength(1);
    const claim = w.itemConsumptionClaims[0];
    expect(claim.itemId).toBe(item.id);
    expect(claim.animalId).toBe(99);
    expect(claim.preHunger).toBe(80);
    expect(claim.preEnergy).toBe(30);
    expect(claim.preHp).toBe(40);
    expect(claim.preState).toBe(AnimalState.IDLE);
  });
});

// ---------------------------------------------------------------------------
// 5. _eatGroundItem — applies nutrition and captures pre-state in claim
// ---------------------------------------------------------------------------

describe('_eatGroundItem', () => {
  function makeEatWorld() {
    const w = makeWorld();
    w._itemClaimMode = true;
    w.itemConsumptionClaims = [];
    return w;
  }

  it('applies meat nutrition to animal stats', () => {
    const w = makeEatWorld();
    const item = new GroundItem(1, 1, 1, ITEM_TYPE.MEAT, 'WOLF', 0);
    w.items.push(item);
    w._itemById.set(item.id, item);

    const a = makeAnimal({ id: 10, hunger: 90, energy: 30, hp: 20 });
    const preHunger = a.hunger;
    _eatGroundItem(a, w, item);

    const nutr = ITEM_NUTRITION[ITEM_TYPE.MEAT];
    expect(a.hunger).toBe(Math.max(0, preHunger - nutr.hunger));
    expect(a.energy).toBeGreaterThan(30);
    expect(a.hp).toBeGreaterThan(20);
    expect(a.state).toBe(AnimalState.EATING);
  });

  it('records pre-state in claim when in claim mode', () => {
    const w = makeEatWorld();
    const item = new GroundItem(2, 1, 1, ITEM_TYPE.FRUIT, 'MANGO', 0);
    w.items.push(item);
    w._itemById.set(item.id, item);

    const a = makeAnimal({ id: 11, hunger: 60, energy: 50, hp: 30, state: AnimalState.IDLE });
    _eatGroundItem(a, w, item);

    expect(w.itemConsumptionClaims).toHaveLength(1);
    const claim = w.itemConsumptionClaims[0];
    expect(claim.animalId).toBe(11);
    expect(claim.preHunger).toBe(60);
    expect(claim.preEnergy).toBe(50);
    expect(claim.preHp).toBe(30);
    expect(claim.preState).toBe(AnimalState.IDLE);
  });
});

// ---------------------------------------------------------------------------
// 6. tickItemLifecycle — decay, transform, germination
// ---------------------------------------------------------------------------

describe('World.tickItemLifecycle', () => {
  const cfg = {
    item_meat_decay_ticks: 10,
    item_fruit_to_seed_ticks: 20,
    item_seed_germination_ticks: 50,
    item_seed_germination_chance: 1.0, // always germinates when conditions met
  };

  function makeLifecycleWorld() {
    const w = makeWorld();
    w.terrain.fill(1);
    return w;
  }

  it('removes meat after decay ticks', () => {
    const w = makeLifecycleWorld();
    const item = new GroundItem(1, 2, 2, ITEM_TYPE.MEAT, 'WOLF', 0);
    registerItem(w, item);
    w.clock.tick = 10; // age == meatDecay
    w.tickItemLifecycle(cfg);
    expect(w.items).not.toContain(item);
    expect(item.consumed).toBe(true);
  });

  it('does not remove meat before decay ticks', () => {
    const w = makeLifecycleWorld();
    const item = new GroundItem(1, 2, 2, ITEM_TYPE.MEAT, 'WOLF', 0);
    registerItem(w, item);
    w.clock.tick = 9; // age < meatDecay
    w.tickItemLifecycle(cfg);
    expect(w.items).toContain(item);
  });

  it('transforms fruit into seed after fruitToSeed ticks', () => {
    const w = makeLifecycleWorld();
    const item = new GroundItem(2, 2, 2, ITEM_TYPE.FRUIT, 5, 0, 0);
    registerItem(w, item);
    w.clock.tick = 20; // age == fruitToSeed
    w.tickItemLifecycle(cfg);
    expect(item.type).toBe(ITEM_TYPE.SEED);
    expect(item.germinationTicks).toBe(cfg.item_seed_germination_ticks);
    expect(w.items).toContain(item); // still in world as seed
    expect(w.itemChanges.some(c => c.op === 'update' && c.item.id === item.id)).toBe(true);
  });

  it('removes seed and germinates plant when chance=1 and tile is free', () => {
    const w = makeLifecycleWorld();
    const plantTypeId = 5; // any valid plant type > 0
    const item = new GroundItem(3, 2, 2, ITEM_TYPE.SEED, plantTypeId, 0, 50);
    registerItem(w, item);
    w.clock.tick = 50; // age == germinationTicks
    w.tickItemLifecycle(cfg);
    expect(w.items).not.toContain(item); // seed consumed
    const tileIdx = 2 * w.width + 2;
    expect(w.plantType[tileIdx]).toBe(plantTypeId);
    expect(w.activePlantTiles.has(tileIdx)).toBe(true);
  });

  it('removes seed without planting if tile already occupied', () => {
    const w = makeLifecycleWorld();
    const tileIdx = 2 * w.width + 2;
    w.plantType[tileIdx] = 3; // tile already has a plant
    const item = new GroundItem(4, 2, 2, ITEM_TYPE.SEED, 5, 0, 50);
    registerItem(w, item);
    w.clock.tick = 50;
    w.tickItemLifecycle(cfg);
    expect(w.items).not.toContain(item);
    expect(w.plantType[tileIdx]).toBe(3); // unchanged
  });
});

// ---------------------------------------------------------------------------
// 7. Parallel merge — contested item claim rollback via applyFaunaResults
// ---------------------------------------------------------------------------

describe('applyFaunaResults — item claim rollback', () => {
  function createDelta(overrides) {
    return {
      id: overrides.id,
      x: overrides.x ?? 1,
      y: overrides.y ?? 1,
      state: overrides.state ?? AnimalState.IDLE,
      energy: overrides.energy ?? 50,
      hp: overrides.hp ?? 20,
      hunger: overrides.hunger ?? 40,
      thirst: overrides.thirst ?? 0,
      age: overrides.age ?? 1,
      alive: overrides.alive ?? true,
      mateCooldown: 0,
      attackCooldown: 0,
      path: [],
      pathIndex: 0,
      _pathTick: 0,
      _deathTick: undefined,
      consumed: false,
      targetX: undefined,
      targetY: undefined,
      pregnant: false,
      gestationTimer: 0,
      _gestationLitterSize: 0,
      _isEggStage: false,
      _incubationPeriod: 0,
      _eggMaxHp: 0,
      parentA: null,
      parentB: null,
      direction: 0,
      actionHistory: [],
      ...overrides,
    };
  }

  function makeParallelEngine(animals, items = []) {
    const width = 5, height = 5, size = width * height;
    const engine = new SimulationEngine({ map_width: width, map_height: height, max_animal_population: 0, animal_species: {} });
    const world = {
      width, height,
      config: { max_animal_population: 0, animal_species: {} },
      clock: { tick: 5 },
      animals,
      animalGrid: new Uint8Array(size),
      eggGrid: new Uint8Array(size),
      plantType: new Uint8Array(size),
      plantStage: new Uint8Array(size),
      plantAge: new Uint16Array(size),
      activePlantTiles: new Set(),
      plantChanges: [],
      items,
      _itemById: new Map(items.map(i => [i.id, i])),
      placeAnimal() {},
      placeEgg() {},
      isTileBlocked() { return false; },
      getAliveSpeciesCount() { return 0; },
      nextId() { return 9999; },
      _spawnMeatDrops() {},
      removeItem(item) { item.consumed = true; },
    };
    engine.world = world;
    engine.spatialHash = { rebuild() {} };
    return { engine, world };
  }

  it('accepts first claim and removes the item; second claim rolls back animal delta', () => {
    const winner = { id: 1, x: 1, y: 1, alive: true, hunger: 80, energy: 30, hp: 20, state: AnimalState.IDLE };
    const loser  = { id: 2, x: 2, y: 2, alive: true, hunger: 75, energy: 35, hp: 22, state: AnimalState.IDLE };
    const item = new GroundItem(100, 2, 2, ITEM_TYPE.MEAT, 'WOLF', 0);
    const { engine, world } = makeParallelEngine([winner, loser], [item]);

    const results = [
      {
        deltas: [createDelta({ ...winner, hunger: 15, energy: 50, hp: 32, state: AnimalState.EATING })],
        births: [], plantChanges: [], plantConsumptionClaims: [], deadIds: [],
        itemConsumptionClaims: [{ itemId: 100, animalId: 1, preHunger: 80, preEnergy: 30, preHp: 20, preState: AnimalState.IDLE }],
      },
      {
        deltas: [createDelta({ ...loser, hunger: 10, energy: 55, hp: 34, state: AnimalState.EATING })],
        births: [], plantChanges: [], plantConsumptionClaims: [], deadIds: [],
        itemConsumptionClaims: [{ itemId: 100, animalId: 2, preHunger: 75, preEnergy: 35, preHp: 22, preState: AnimalState.IDLE }],
      },
    ];

    engine.applyFaunaResults(results);

    // Winner's nutrition stands
    expect(winner.hunger).toBe(15);
    expect(winner.energy).toBe(50);
    expect(winner.state).toBe(AnimalState.EATING);

    // Loser is rolled back to pre-eat state
    expect(loser.hunger).toBe(75);
    expect(loser.energy).toBe(35);
    expect(loser.hp).toBe(22);
    expect(loser.state).toBe(AnimalState.IDLE);

    // Item is marked consumed by the winner
    expect(item.consumed).toBe(true);
  });

  it('single claim (no contest) is accepted and animal delta is kept', () => {
    const animal = { id: 3, x: 1, y: 1, alive: true, hunger: 70, energy: 40, hp: 25, state: AnimalState.IDLE };
    const item = new GroundItem(200, 2, 2, ITEM_TYPE.FRUIT, 'MANGO', 0);
    const { engine } = makeParallelEngine([animal], [item]);

    const results = [
      {
        deltas: [createDelta({ ...animal, hunger: 30, energy: 46, hp: 31, state: AnimalState.EATING })],
        births: [], plantChanges: [], plantConsumptionClaims: [], deadIds: [],
        itemConsumptionClaims: [{ itemId: 200, animalId: 3, preHunger: 70, preEnergy: 40, preHp: 25, preState: AnimalState.IDLE }],
      },
    ];

    engine.applyFaunaResults(results);

    expect(animal.hunger).toBe(30);
    expect(animal.energy).toBe(46);
    expect(item.consumed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 8. toDelta snapshot round-trip
// ---------------------------------------------------------------------------

describe('GroundItem toDelta round-trip', () => {
  it('reconstructing from toDelta produces an equivalent item', () => {
    resetItemIdCounter();
    const original = new GroundItem(nextItemId(), 3, 4, ITEM_TYPE.SEED, 7, 15, 200);
    const d = original.toDelta();
    const restored = new GroundItem(d.id, d.x, d.y, d.type, d.source, d.createdTick, d.germinationTicks);
    expect(restored.id).toBe(original.id);
    expect(restored.x).toBe(original.x);
    expect(restored.y).toBe(original.y);
    expect(restored.type).toBe(original.type);
    expect(restored.source).toBe(original.source);
    expect(restored.createdTick).toBe(original.createdTick);
    expect(restored.germinationTicks).toBe(original.germinationTicks);
    expect(restored.consumed).toBe(false);
  });
});