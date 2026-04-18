/**
 * Year-long simulation stability tests.
 *
 * Simulates 4 seasons × 14 days = 56 in-game days (1 full year) at a reduced
 * tick rate (130 ticks/day → 7 280 ticks total). A single module-level
 * beforeAll runs the engine once; all five describe blocks share the completed
 * engine state and four end-of-season snapshots.
 *
 * Season schedule (getSeason uses day-based arithmetic):
 *   Spring  days  0–13  ticks     0–1819
 *   Summer  days 14–27  ticks  1820–3639
 *   Autumn  days 28–41  ticks  3640–5459
 *   Winter  days 42–55  ticks  5460–7279
 * Snapshots are captured on the LAST tick of each season so that
 * world.currentSeason still reflects the season that just ended.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { SimulationEngine } from '../simulation.js';
import { createSimulationConfig } from '../config.js';
import { getSeason, computeTemperature } from '../flora/modifiers.js';
import { DEFAULT_SEASON_LENGTH_DAYS } from '../../constants/simulation.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Reduced ticks-per-day — keeps the 7 280-tick loop well under 120 s. */
const TPD = 130;
const SEASON_DAYS  = DEFAULT_SEASON_LENGTH_DAYS;   // 14
const YEAR_DAYS    = SEASON_DAYS * 4;              // 56
const SEASON_TICKS = SEASON_DAYS * TPD;            // 1 820
const YEAR_TICKS   = YEAR_DAYS   * TPD;            // 7 280
const MAX_POP      = 200;
const TIMEOUT      = 120_000;

// ---------------------------------------------------------------------------
// Engine factory
// ---------------------------------------------------------------------------

function createYearEngine() {
  const config = createSimulationConfig({
    map_width:  80,
    map_height: 80,
    seed: 42,
    ticks_per_day: TPD,
    season_length_days: SEASON_DAYS,
    max_animal_population: MAX_POP,
    initial_population_fraction: 0.1,
    supervisor_enabled: true,
    supervisor_full_audit_interval_ticks: TPD, // once per in-game day
  });
  const engine = new SimulationEngine(config);
  engine.generateWorld();
  return engine;
}

// ---------------------------------------------------------------------------
// Shared year-long run
// ---------------------------------------------------------------------------

/** @type {SimulationEngine} */
let sharedEngine;

/**
 * One snapshot per season, captured on the last tick of that season.
 * Tick values (after engine.tick()): 1819, 3639, 5459, 7279.
 * At those ticks, world.clock.tick equals the index and
 * world.currentSeason equals 0, 1, 2, 3 respectively.
 *
 * @type {Array<{season:number, day:number, aliveCount:number, plantsActive:number, tempAtSample:number}>}
 */
const seasonSnapshots = [];

/** Set of world.currentSeason values observed at snapshot moments. */
const seasonsObserved = new Set();

/** Highest alive (non-egg) count seen at any season snapshot. */
let maxAliveObserved = 0;

// Last tick within each season where world.currentSeason still matches that season.
const SEASON_SAMPLE_TICKS = new Set([
  SEASON_TICKS     - 1,  // 1819 — Spring
  2 * SEASON_TICKS - 1,  // 3639 — Summer
  3 * SEASON_TICKS - 1,  // 5459 — Autumn
  YEAR_TICKS       - 1,  // 7279 — Winter
]);

beforeAll(() => {
  sharedEngine = createYearEngine();
  const world = sharedEngine.world;

  for (let t = 1; t <= YEAR_TICKS; t++) {
    sharedEngine.tick();

    if (SEASON_SAMPLE_TICKS.has(t)) {
      const aliveCount = world.animals.filter(a => a.alive && !a._isEggStage).length;
      maxAliveObserved = Math.max(maxAliveObserved, aliveCount);
      seasonsObserved.add(world.currentSeason);
      seasonSnapshots.push({
        season:       world.currentSeason,
        day:          world.clock.dayNumber,
        aliveCount,
        plantsActive: world.activePlantTiles.size,
        tempAtSample: computeTemperature(world),
      });
    }
  }
}, TIMEOUT);

// ---------------------------------------------------------------------------
// 1. Clock and calendar
// ---------------------------------------------------------------------------

describe('year-long — clock and calendar', () => {
  it('clock.tick advances to YEAR_TICKS after a full year', () => {
    expect(sharedEngine.world.clock.tick).toBe(YEAR_TICKS);
  });

  it('clock.dayNumber equals 56 after a full year', () => {
    expect(sharedEngine.world.clock.dayNumber).toBe(YEAR_DAYS);
  });

  it('getSeason correctly identifies each season start from tick alone', () => {
    const stub = (tick) => ({
      clock: { tick },
      config: { ticks_per_day: TPD, season_length_days: SEASON_DAYS },
    });
    expect(getSeason(stub(0))).toBe(0);                    // Spring
    expect(getSeason(stub(SEASON_TICKS))).toBe(1);         // Summer  (tick 1820)
    expect(getSeason(stub(2 * SEASON_TICKS))).toBe(2);     // Autumn  (tick 3640)
    expect(getSeason(stub(3 * SEASON_TICKS))).toBe(3);     // Winter  (tick 5460)
  });

  it('all 4 seasons are observed during the year', () => {
    expect(seasonsObserved.size).toBe(4);
  });

  it('season snapshots follow Spring → Summer → Autumn → Winter order', () => {
    expect(seasonSnapshots.map(s => s.season)).toEqual([0, 1, 2, 3]);
  });

  it('each season snapshot is captured at the expected day', () => {
    // At end-of-season sample ticks, dayNumber = floor(tick / tpd).
    // tick 1819 → day 13, 3639 → 27, 5459 → 41, 7279 → 55.
    expect(seasonSnapshots[0].day).toBe(SEASON_DAYS - 1);
    expect(seasonSnapshots[1].day).toBe(2 * SEASON_DAYS - 1);
    expect(seasonSnapshots[2].day).toBe(3 * SEASON_DAYS - 1);
    expect(seasonSnapshots[3].day).toBe(YEAR_DAYS - 1);
  });

  it('exactly 4 season snapshots are collected', () => {
    expect(seasonSnapshots).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// 2. Crash-free and numeric validity
// ---------------------------------------------------------------------------

describe('year-long — crash-free and numeric validity', () => {
  it('simulation completed without throwing', () => {
    // If beforeAll threw, the shared engine would be undefined.
    expect(sharedEngine).toBeDefined();
    expect(sharedEngine.world.clock.tick).toBe(YEAR_TICKS);
  });

  it('no alive animal has NaN or Infinity in position or needs', () => {
    for (const animal of sharedEngine.world.animals) {
      if (!animal.alive) continue;
      expect(Number.isFinite(animal.x)).toBe(true);
      expect(Number.isFinite(animal.y)).toBe(true);
      expect(Number.isFinite(animal.energy)).toBe(true);
      expect(Number.isFinite(animal.hunger)).toBe(true);
      expect(Number.isFinite(animal.thirst)).toBe(true);
    }
  });

  it('all alive animals are within world bounds', () => {
    const { width, height } = sharedEngine.world;
    for (const animal of sharedEngine.world.animals) {
      if (!animal.alive) continue;
      expect(animal.x).toBeGreaterThanOrEqual(0);
      expect(animal.x).toBeLessThan(width);
      expect(animal.y).toBeGreaterThanOrEqual(0);
      expect(animal.y).toBeLessThan(height);
    }
  });

  it('no animalGrid tile has a count that exceeds the population cap', () => {
    const { animalGrid } = sharedEngine.world;
    for (let i = 0; i < animalGrid.length; i++) {
      expect(animalGrid[i]).toBeLessThanOrEqual(MAX_POP);
    }
  });

  it('all animal IDs in the roster are unique', () => {
    const ids = sharedEngine.world.animals.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ---------------------------------------------------------------------------
// 3. Population dynamics
// ---------------------------------------------------------------------------

describe('year-long — population dynamics', () => {
  it('alive count at each season snapshot never exceeds the population budget', () => {
    expect(maxAliveObserved).toBeLessThanOrEqual(MAX_POP);
    for (const snap of seasonSnapshots) {
      expect(snap.aliveCount).toBeLessThanOrEqual(MAX_POP);
    }
  });

  it('animals were alive during Spring (day 0–13)', () => {
    // Spring is the first season; animals must still be alive well before food pressure peaks.
    expect(seasonSnapshots[0].aliveCount).toBeGreaterThan(0);
  });

  it('animals were alive during Summer (day 14–27)', () => {
    // Summer is the warmest, most productive season; survival here is very reliable.
    expect(seasonSnapshots[1].aliveCount).toBeGreaterThan(0);
  });

  it('at least one season snapshot had a positive population', () => {
    // Catches complete-before-start failure regardless of RNG outcome.
    const anyAlive = seasonSnapshots.some(s => s.aliveCount > 0);
    expect(anyAlive).toBe(true);
  });

  it('population peaked above zero during the year', () => {
    expect(maxAliveObserved).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Ecosystem across 4 seasons
// ---------------------------------------------------------------------------

describe('year-long — ecosystem across 4 seasons', () => {
  it('active plant tiles are present at the end of Spring', () => {
    expect(seasonSnapshots[0].plantsActive).toBeGreaterThan(0);
  });

  it('active plant tiles are present at the end of Summer', () => {
    expect(seasonSnapshots[1].plantsActive).toBeGreaterThan(0);
  });

  it('active plant tiles are present at the end of Autumn', () => {
    expect(seasonSnapshots[2].plantsActive).toBeGreaterThan(0);
  });

  it('active plant tiles are present at the end of Winter', () => {
    expect(seasonSnapshots[3].plantsActive).toBeGreaterThan(0);
  });

  it('plant tiles are still present at the very end of the year', () => {
    expect(sharedEngine.world.activePlantTiles.size).toBeGreaterThan(0);
  });

  it('statsHistory does not exceed 1000 entries after a full year', () => {
    expect(sharedEngine.world.statsHistory.length).toBeLessThanOrEqual(1000);
  });
});

// ---------------------------------------------------------------------------
// 5. Seasonal climate
// ---------------------------------------------------------------------------

describe('year-long — seasonal climate', () => {
  it('all sampled temperatures are finite and within a plausible range', () => {
    for (const snap of seasonSnapshots) {
      expect(Number.isFinite(snap.tempAtSample)).toBe(true);
      expect(snap.tempAtSample).toBeGreaterThan(-30);
      expect(snap.tempAtSample).toBeLessThan(60);
    }
  });

  it('Spring is warmer than Winter', () => {
    const springTemp = seasonSnapshots[0].tempAtSample;
    const winterTemp = seasonSnapshots[3].tempAtSample;
    expect(springTemp).toBeGreaterThan(winterTemp);
  });

  it('Summer is warmer than Autumn', () => {
    const summerTemp = seasonSnapshots[1].tempAtSample;
    const autumnTemp = seasonSnapshots[2].tempAtSample;
    expect(summerTemp).toBeGreaterThan(autumnTemp);
  });

  it('Summer is the hottest and Winter is the coldest season', () => {
    const [sp, su, au, wi] = seasonSnapshots.map(s => s.tempAtSample);
    expect(su).toBeGreaterThan(sp);
    expect(su).toBeGreaterThan(au);
    expect(wi).toBeLessThan(sp);
    expect(wi).toBeLessThan(au);
  });

  it('temperature at end of Summer exceeds 20 °C', () => {
    expect(seasonSnapshots[1].tempAtSample).toBeGreaterThan(20);
  });

  it('temperature at end of Winter is below 5 °C', () => {
    expect(seasonSnapshots[3].tempAtSample).toBeLessThan(5);
  });
});
