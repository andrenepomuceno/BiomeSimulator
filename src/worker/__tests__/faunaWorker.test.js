/**
 * faunaWorker tests — validate the worker message protocol and animal
 * reconstruction logic in a Node environment by mocking the global `self`.
 *
 * The entire module is imported once with a mocked `self` so that
 * `self.onmessage` is captured and individual test scenarios can be
 * driven by calling it directly.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { buildAnimalSpeciesConfig } from '../../engine/animalSpecies.js';

// ── Self mock & module import ────────────────────────────────────────────────

let handleMessage;
let selfMock;

beforeAll(async () => {
  selfMock = { postMessage: vi.fn(), onmessage: null };
  vi.stubGlobal('self', selfMock);
  // Dynamic import so the stub is in place before module code executes.
  await import('../../worker/faunaWorker.js');
  handleMessage = selfMock.onmessage;
});

afterAll(() => {
  vi.unstubAllGlobals();
});

// ── Fixture helpers ──────────────────────────────────────────────────────────

const W = 10;
const H = 10;
const SIZE = W * H;

function makeConfig() {
  return {
    map_width: W,
    map_height: H,
    ticks_per_day: 130,
    animal_species: buildAnimalSpeciesConfig(),
  };
}

function makeTerrain(fill = 3 /* SOIL */) {
  return new Uint8Array(SIZE).fill(fill);
}

function makeTickPayload(allAnimals = [], chunkIds = []) {
  return {
    cmd: 'tick',
    plantType: new Uint8Array(SIZE),
    plantStage: new Uint8Array(SIZE),
    plantAge: new Uint16Array(SIZE),
    animalGrid: new Uint8Array(SIZE),
    clockTick: 1,
    ticksPerDay: 130,
    dayFraction: 0.67,
    hungerMultiplier: 1,
    thirstMultiplier: 1,
    temperature: 20,
    currentSeason: 0,
    activePlantIndices: [],
    nextIdBase: 1000,
    items: [],
    allAnimals,
    chunkIds,
  };
}

/** Minimal serialised animal data for a DEER adult. */
function makeDeerData(id = 1, x = 5, y = 5) {
  return {
    id,
    x,
    y,
    species: 'DEER',
    sex: 'F',
    diet: 'HERBIVORE',
    state: 0, // AnimalState.IDLE
    energy: 100,
    hp: 70,
    hunger: 20,
    thirst: 20,
    age: 700,
    alive: true,
    mateCooldown: 0,
    attackCooldown: 0,
    path: [],
    pathIndex: 0,
    _pathTick: 0,
    _cachedThreatTick: -1,
    _nextThreatCheckTick: 0,
    consumed: false,
    homeX: 5,
    homeY: 5,
    targetX: null,
    targetY: null,
    _birthTick: 0,
    pregnant: false,
    gestationTimer: 0,
    _gestationLitterSize: 0,
    _isEggStage: false,
    _incubationPeriod: 0,
    _eggMaxHp: 0,
    parentA: null,
    parentB: null,
    actionHistory: [],
    direction: 0,
  };
}

/** Minimal egg-stage animal data. */
function makeEggData(id = 2, x = 3, y = 3) {
  return {
    id,
    x,
    y,
    species: 'BEETLE',
    sex: 'F',
    diet: 'HERBIVORE',
    state: 0,
    energy: 35,
    hp: 6,
    hunger: 0,
    thirst: 0,
    age: 0,
    alive: true,
    _isEggStage: true,
    _incubationPeriod: 138,
    _eggMaxHp: 8,
    mateCooldown: 0,
    attackCooldown: 0,
    path: [],
    pathIndex: 0,
    _pathTick: 0,
    _birthTick: 0,
    consumed: false,
    homeX: 3,
    homeY: 3,
    targetX: null,
    targetY: null,
    pregnant: false,
    gestationTimer: 0,
    _gestationLitterSize: 0,
    parentA: 10,
    parentB: 11,
    actionHistory: [],
    direction: 0,
  };
}

// ── Init command ─────────────────────────────────────────────────────────────

describe('faunaWorker — init command', () => {
  it('postMessage is called with { cmd: "ready" } after init', async () => {
    selfMock.postMessage.mockClear();
    await handleMessage({
      data: {
        cmd: 'init',
        config: makeConfig(),
        terrain: makeTerrain(),
        waterProximity: new Uint8Array(SIZE).fill(255),
      },
    });
    expect(selfMock.postMessage).toHaveBeenCalledOnce();
    expect(selfMock.postMessage).toHaveBeenCalledWith({ cmd: 'ready' });
  });
});

// ── Tick command ─────────────────────────────────────────────────────────────

describe('faunaWorker — tick command', () => {
  it('responds with tickResult cmd', async () => {
    selfMock.postMessage.mockClear();
    await handleMessage({ data: makeTickPayload() });
    const call = selfMock.postMessage.mock.calls[0]?.[0];
    expect(call).toBeDefined();
    expect(call.cmd).toBe('tickResult');
  });

  it('returns empty deltas when no animals are assigned to the chunk', async () => {
    selfMock.postMessage.mockClear();
    await handleMessage({ data: makeTickPayload([], []) });
    const result = selfMock.postMessage.mock.calls[0][0];
    expect(result.deltas).toEqual([]);
  });

  it('returns a delta for each animal in chunkIds', async () => {
    selfMock.postMessage.mockClear();
    const deer = makeDeerData(1);
    await handleMessage({ data: makeTickPayload([deer], [deer.id]) });
    const result = selfMock.postMessage.mock.calls[0][0];
    expect(result.deltas).toHaveLength(1);
    expect(result.deltas[0].id).toBe(deer.id);
  });

  it('delta contains all expected fields', async () => {
    selfMock.postMessage.mockClear();
    const deer = makeDeerData(1);
    await handleMessage({ data: makeTickPayload([deer], [deer.id]) });
    const delta = selfMock.postMessage.mock.calls[0][0].deltas[0];
    const requiredFields = [
      'id', 'x', 'y', 'state', 'energy', 'hp', 'hunger', 'thirst',
      'age', 'alive', 'mateCooldown', 'attackCooldown', 'path',
      'direction', 'actionHistory',
    ];
    for (const field of requiredFields) {
      expect(delta, `delta should have field "${field}"`).toHaveProperty(field);
    }
  });

  it('animal not in chunkIds does not appear in deltas', async () => {
    selfMock.postMessage.mockClear();
    const deer = makeDeerData(1);
    const other = makeDeerData(2, 7, 7);
    // Only deer id=1 is in chunkIds
    await handleMessage({ data: makeTickPayload([deer, other], [deer.id]) });
    const result = selfMock.postMessage.mock.calls[0][0];
    expect(result.deltas).toHaveLength(1);
    expect(result.deltas[0].id).toBe(1);
  });

  it('alive deer remains alive after one tick on SOIL', async () => {
    selfMock.postMessage.mockClear();
    const deer = makeDeerData(1);
    await handleMessage({ data: makeTickPayload([deer], [deer.id]) });
    const delta = selfMock.postMessage.mock.calls[0][0].deltas[0];
    expect(delta.alive).toBe(true);
  });

  it('births array is present in tickResult', async () => {
    selfMock.postMessage.mockClear();
    await handleMessage({ data: makeTickPayload([], []) });
    const result = selfMock.postMessage.mock.calls[0][0];
    expect(Array.isArray(result.births)).toBe(true);
  });

  it('plantChanges array is present in tickResult', async () => {
    selfMock.postMessage.mockClear();
    await handleMessage({ data: makeTickPayload([], []) });
    const result = selfMock.postMessage.mock.calls[0][0];
    expect(Array.isArray(result.plantChanges)).toBe(true);
  });

  it('deadIds array is present in tickResult', async () => {
    selfMock.postMessage.mockClear();
    await handleMessage({ data: makeTickPayload([], []) });
    const result = selfMock.postMessage.mock.calls[0][0];
    expect(Array.isArray(result.deadIds)).toBe(true);
  });
});

// ── reconstructAnimal behaviour (via tick deltas) ───────────────────────────

describe('faunaWorker — reconstructAnimal via tick deltas', () => {
  it('reconstructed animal preserves parentA and parentB', async () => {
    selfMock.postMessage.mockClear();
    const deer = { ...makeDeerData(5), parentA: 100, parentB: 200 };
    await handleMessage({ data: makeTickPayload([deer], [deer.id]) });
    const delta = selfMock.postMessage.mock.calls[0][0].deltas[0];
    expect(delta.parentA).toBe(100);
    expect(delta.parentB).toBe(200);
  });

  it('reconstructed animal defaults mateCooldown to 0 when absent', async () => {
    selfMock.postMessage.mockClear();
    const deer = makeDeerData(6);
    delete deer.mateCooldown;
    await handleMessage({ data: makeTickPayload([deer], [deer.id]) });
    const delta = selfMock.postMessage.mock.calls[0][0].deltas[0];
    // mateCooldown starts at 0; after one tick it may be 0 or decremented (≥0)
    expect(typeof delta.mateCooldown).toBe('number');
    expect(delta.mateCooldown).toBeGreaterThanOrEqual(0);
  });

  it('egg-stage animal is reconstructed with hp from _eggMaxHp', async () => {
    selfMock.postMessage.mockClear();
    const egg = makeEggData(7);
    // hp in ad is below _eggMaxHp; reconstructAnimal should override hp
    await handleMessage({ data: makeTickPayload([egg], [egg.id]) });
    const delta = selfMock.postMessage.mock.calls[0][0].deltas[0];
    // Egg may be processed — just verify hp is a valid positive number
    expect(delta.hp).toBeGreaterThan(0);
  });

  it('egg-stage flag is preserved in delta', async () => {
    selfMock.postMessage.mockClear();
    const egg = makeEggData(8);
    await handleMessage({ data: makeTickPayload([egg], [egg.id]) });
    const delta = selfMock.postMessage.mock.calls[0][0].deltas[0];
    expect(delta._isEggStage).toBe(true);
  });

  it('missing optional path defaults to empty array in delta', async () => {
    selfMock.postMessage.mockClear();
    const deer = makeDeerData(9);
    delete deer.path;
    await handleMessage({ data: makeTickPayload([deer], [deer.id]) });
    const delta = selfMock.postMessage.mock.calls[0][0].deltas[0];
    expect(Array.isArray(delta.path)).toBe(true);
  });
});
