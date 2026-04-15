import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

import { SimulationEngine } from '../src/engine/simulation.js';
import { DEFAULT_CONFIG } from '../src/engine/config.js';
import { deriveSimulationReportData, buildSimulationReportText } from '../src/utils/simulationReportExport.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

function cloneConfig(cfg) {
  if (typeof structuredClone === 'function') return structuredClone(cfg);
  return JSON.parse(JSON.stringify(cfg));
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function mean(values) {
  if (!values.length) return 0;
  let total = 0;
  for (const v of values) total += v;
  return total / values.length;
}

function stddev(values, avg) {
  if (values.length <= 1) return 0;
  let variance = 0;
  for (const v of values) {
    const d = v - avg;
    variance += d * d;
  }
  return Math.sqrt(variance / values.length);
}

function fmtMs(v) {
  return `${v.toFixed(2)} ms`;
}

function scaleAnimalCounts(baseCounts, multiplier) {
  const counts = {};
  for (const [id, value] of Object.entries(baseCounts || {})) {
    counts[id] = Math.max(0, Math.round(value * multiplier));
  }
  return counts;
}

function sumAnimalCounts(counts) {
  return Object.values(counts || {}).reduce((sum, value) => sum + value, 0);
}

function scaleAnimalCountsToTarget(baseCounts, targetTotal) {
  const baseTotal = sumAnimalCounts(baseCounts);
  if (!baseTotal || !targetTotal) return { ...(baseCounts || {}) };
  return scaleAnimalCounts(baseCounts, targetTotal / baseTotal);
}

function buildPhase2Scenarios() {
  const configs = [
    { map: 500, animals: 10000 },
    { map: 500, animals: 20000 },
    { map: 1000, animals: 10000 },
    { map: 1000, animals: 20000 },
  ];

  return configs.map((entry) => ({
    name: `phase2-${entry.map}x${entry.map}-${Math.round(entry.animals / 1000)}k`,
    description: `Phase 2 high-density benchmark (${entry.map}x${entry.map}, target ${entry.animals} animals)` ,
    warmupTicks: 120,
    measureTicks: 600,
    thresholds: { avgTickMs: null, p95TickMs: null },
    config: {
      seed: 20260413 + entry.map + entry.animals,
      map_width: entry.map,
      map_height: entry.map,
      initial_plant_density: 0.10,
      max_animal_population: entry.animals,
      initial_animal_counts: scaleAnimalCountsToTarget(DEFAULT_CONFIG.initial_animal_counts, entry.animals),
    },
  }));
}

function summarizeBenchmark(raw, measureTicks) {
  const calls = raw?.calls || {};
  const totalMs = raw?.totalMs || {};
  const totals = raw?.totals || {};
  const keyedTotals = raw?.keyedTotals || {};
  const hotspots = Object.keys(totalMs)
    .map((name) => {
      const callCount = calls[name] || 0;
      const total = totalMs[name] || 0;
      return {
        name,
        calls: callCount,
        totalMs: total,
        avgMs: callCount > 0 ? total / callCount : 0,
        callsPerTick: measureTicks > 0 ? callCount / measureTicks : 0,
      };
    })
    .sort((a, b) => b.totalMs - a.totalMs);

  return {
    raw,
    hotspots,
    totals,
    cache: {
      pathHitRate: totals.pathCacheHits || totals.pathCacheMisses
        ? (totals.pathCacheHits || 0) / ((totals.pathCacheHits || 0) + (totals.pathCacheMisses || 0))
        : 0,
      threatHitRate: totals.threatCacheHits || totals.threatCacheMisses
        ? (totals.threatCacheHits || 0) / ((totals.threatCacheHits || 0) + (totals.threatCacheMisses || 0))
        : 0,
    },
    species: {
      decisions: keyedTotals.speciesDecisions || {},
      threatChecks: keyedTotals.speciesThreatChecks || {},
      pathRequests: keyedTotals.speciesPathRequests || {},
      seekPlantFood: keyedTotals.speciesSeekPlantFood || {},
      seekWater: keyedTotals.speciesSeekWater || {},
      seekPrey: keyedTotals.speciesSeekPrey || {},
      seekOmnivoreFood: keyedTotals.speciesSeekOmnivoreFood || {},
    },
    topHotspots: hotspots.slice(0, 10),
    topSpeciesByDecisionLoad: Object.entries(keyedTotals.speciesDecisions || {})
      .map(([species, count]) => ({ species, count, perTick: measureTicks > 0 ? count / measureTicks : 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    topSpeciesByPathRequests: Object.entries(keyedTotals.speciesPathRequests || {})
      .map(([species, count]) => ({ species, count, perTick: measureTicks > 0 ? count / measureTicks : 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
  };
}

const SCENARIOS = {
  small: {
    name: 'small',
    description: 'Quick baseline for local feedback',
    warmupTicks: 40,
    measureTicks: 240,
    thresholds: { avgTickMs: 6.0, p95TickMs: 10.0 },
    config: {
      seed: 1337,
      map_width: 180,
      map_height: 180,
      initial_plant_density: 0.08,
      max_animal_population: 3000,
      initial_animal_counts: scaleAnimalCounts(DEFAULT_CONFIG.initial_animal_counts, 0.45),
    },
  },
  medium: {
    name: 'medium',
    description: 'Representative gameplay load',
    warmupTicks: 60,
    measureTicks: 320,
    thresholds: { avgTickMs: 12.0, p95TickMs: 18.0 },
    config: {
      seed: 4242,
      map_width: 260,
      map_height: 260,
      initial_plant_density: 0.09,
      max_animal_population: 7000,
      initial_animal_counts: scaleAnimalCounts(DEFAULT_CONFIG.initial_animal_counts, 0.9),
    },
  },
  stress: {
    name: 'stress',
    description: 'High-load stress profile for regressions',
    warmupTicks: 80,
    measureTicks: 360,
    thresholds: { avgTickMs: 24.0, p95TickMs: 36.0 },
    config: {
      seed: 98765,
      map_width: 340,
      map_height: 340,
      initial_plant_density: 0.1,
      max_animal_population: 15000,
      initial_animal_counts: scaleAnimalCounts(DEFAULT_CONFIG.initial_animal_counts, 1.6),
    },
  },
};

function mergeConfig(overrides) {
  const cfg = cloneConfig(DEFAULT_CONFIG);
  return {
    ...cfg,
    ...overrides,
    initial_animal_counts: {
      ...cfg.initial_animal_counts,
      ...(overrides.initial_animal_counts || {}),
    },
  };
}

function parseArgs(argv) {
  const opts = {
    scenario: 'all',
    warmupTicks: null,
    measureTicks: null,
    mapSize: '',
    days: null,
    ticksPerDay: null,
    animalScale: null,
    initialAnimals: null,
    plantDensity: null,
    maxAnimalPopulation: null,
    runName: '',
    thresholdAvgMs: null,
    thresholdP95Ms: null,
    ci: false,
    outFile: '',
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--scenario' && argv[i + 1]) {
      opts.scenario = String(argv[++i]).toLowerCase();
      continue;
    }
    if (arg === '--warmup' && argv[i + 1]) {
      opts.warmupTicks = Math.max(0, Number(argv[++i]) || 0);
      continue;
    }
    if (arg === '--ticks' && argv[i + 1]) {
      opts.measureTicks = Math.max(1, Number(argv[++i]) || 1);
      continue;
    }
    if (arg === '--map' && argv[i + 1]) {
      opts.mapSize = String(argv[++i]);
      continue;
    }
    if (arg === '--days' && argv[i + 1]) {
      opts.days = Math.max(1, Number(argv[++i]) || 1);
      continue;
    }
    if (arg === '--ticks-per-day' && argv[i + 1]) {
      opts.ticksPerDay = Math.max(1, Number(argv[++i]) || 1);
      continue;
    }
    if (arg === '--animal-scale' && argv[i + 1]) {
      opts.animalScale = Math.max(0, Number(argv[++i]) || 0);
      continue;
    }
    if (arg === '--initial-animals' && argv[i + 1]) {
      opts.initialAnimals = Math.max(0, Number(argv[++i]) || 0);
      continue;
    }
    if (arg === '--plant-density' && argv[i + 1]) {
      opts.plantDensity = Math.max(0, Number(argv[++i]) || 0);
      continue;
    }
    if (arg === '--max-animals' && argv[i + 1]) {
      opts.maxAnimalPopulation = Math.max(0, Number(argv[++i]) || 0);
      continue;
    }
    if (arg === '--name' && argv[i + 1]) {
      opts.runName = String(argv[++i]);
      continue;
    }
    if (arg === '--threshold-avg' && argv[i + 1]) {
      opts.thresholdAvgMs = Math.max(0, Number(argv[++i]) || 0);
      continue;
    }
    if (arg === '--threshold-p95' && argv[i + 1]) {
      opts.thresholdP95Ms = Math.max(0, Number(argv[++i]) || 0);
      continue;
    }
    if (arg === '--ci') {
      opts.ci = true;
      continue;
    }
    if (arg === '--out' && argv[i + 1]) {
      opts.outFile = argv[++i];
      continue;
    }
  }

  return opts;
}

function parseMapSize(mapSize) {
  if (!mapSize) return null;
  const m = String(mapSize).trim().match(/^(\d+)x(\d+)$/i);
  if (!m) return null;
  const width = Number(m[1]);
  const height = Number(m[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return { width, height };
}

function buildCustomScenario(opts) {
  const map = parseMapSize(opts.mapSize || '');
  if (!map) return null;

  const tpd = opts.ticksPerDay || DEFAULT_CONFIG.ticks_per_day || 200;
  const days = opts.days || 30;
  const ticks = opts.measureTicks || (days * tpd);
  const warmupTicks = opts.warmupTicks ?? Math.min(400, Math.max(100, Math.floor(ticks * 0.05)));
  const initialAnimalCounts = opts.initialAnimals
    ? scaleAnimalCountsToTarget(DEFAULT_CONFIG.initial_animal_counts, opts.initialAnimals)
    : scaleAnimalCounts(DEFAULT_CONFIG.initial_animal_counts, opts.animalScale ?? 1.0);

  const thresholds = {
    avgTickMs: opts.thresholdAvgMs,
    p95TickMs: opts.thresholdP95Ms,
  };

  return {
    name: opts.runName || `custom-${map.width}x${map.height}-${days}d`,
    description: `Custom run (${map.width}x${map.height}, ${days} days)`,
    warmupTicks,
    measureTicks: ticks,
    thresholds,
    config: {
      seed: 20260413,
      map_width: map.width,
      map_height: map.height,
      ticks_per_day: tpd,
      initial_plant_density: opts.plantDensity ?? DEFAULT_CONFIG.initial_plant_density,
      max_animal_population: opts.maxAnimalPopulation ?? DEFAULT_CONFIG.max_animal_population,
      initial_animal_counts: initialAnimalCounts,
    },
  };
}

function runScenario(def, options) {
  const warmupTicks = options.warmupTicks ?? def.warmupTicks;
  const measureTicks = options.measureTicks ?? def.measureTicks;
  const config = mergeConfig(def.config);

  const engine = new SimulationEngine(config);
  engine.setProfilingEnabled(true);
  engine.generateWorld();

  for (let i = 0; i < warmupTicks; i++) {
    engine.tick();
  }
  engine.resetBenchmarkStats();

  const tickMs = [];
  const plantsMs = [];
  const behaviorMs = [];
  const cleanupMs = [];
  const supervisorMs = [];
  const statsMs = [];

  const heapStart = process.memoryUsage().heapUsed;
  const t0 = performance.now();
  for (let i = 0; i < measureTicks; i++) {
    engine.tick();
    const profile = engine.getLatestProfile();
    if (!profile) continue;
    tickMs.push(profile.tickMs || 0);
    plantsMs.push(profile.phases?.plantsMs || 0);
    behaviorMs.push(profile.phases?.behaviorMs || 0);
    cleanupMs.push(profile.phases?.cleanupMs || 0);
    supervisorMs.push(profile.phases?.supervisorMs || 0);
    statsMs.push(profile.phases?.statsMs || 0);
  }
  const wallMs = performance.now() - t0;
  const heapEnd = process.memoryUsage().heapUsed;

  const tickAvg = mean(tickMs);
  const tickP95 = percentile(tickMs, 95);
  const tickP99 = percentile(tickMs, 99);

  const latest = engine.getLatestProfile();
  const benchmark = summarizeBenchmark(engine.getBenchmarkStats(), measureTicks);
  const reportData = deriveSimulationReportData(engine.world?.statsHistory || [], config.ticks_per_day);
  const reportText = buildSimulationReportText(reportData, config.ticks_per_day, new Date());
  const result = {
    scenario: def.name,
    description: def.description,
    warmupTicks,
    measureTicks,
    thresholds: def.thresholds,
    tick: {
      avgMs: tickAvg,
      p50Ms: percentile(tickMs, 50),
      p95Ms: tickP95,
      p99Ms: tickP99,
      minMs: tickMs.length ? Math.min(...tickMs) : 0,
      maxMs: tickMs.length ? Math.max(...tickMs) : 0,
      stddevMs: stddev(tickMs, tickAvg),
      estimatedTps: tickAvg > 0 ? 1000 / tickAvg : 0,
    },
    phases: {
      plantsAvgMs: mean(plantsMs),
      behaviorAvgMs: mean(behaviorMs),
      cleanupAvgMs: mean(cleanupMs),
      supervisorAvgMs: mean(supervisorMs),
      statsAvgMs: mean(statsMs),
    },
    wallClock: {
      totalMs: wallMs,
      throughputTicksPerSec: wallMs > 0 ? (measureTicks * 1000) / wallMs : 0,
    },
    memory: {
      heapStartMb: heapStart / (1024 * 1024),
      heapEndMb: heapEnd / (1024 * 1024),
      heapDeltaMb: (heapEnd - heapStart) / (1024 * 1024),
    },
    world: {
      mapWidth: config.map_width,
      mapHeight: config.map_height,
      animalsTotal: latest?.counts?.animalsTotal || 0,
      animalsAlive: latest?.counts?.animalsAlive || 0,
      activePlants: latest?.counts?.activePlants || 0,
    },
    config: {
      ticksPerDay: config.ticks_per_day,
      maxAnimalPopulation: config.max_animal_population,
      initialPlantDensity: config.initial_plant_density,
      initialAnimalCountTarget: sumAnimalCounts(config.initial_animal_counts),
    },
    benchmark,
  };

  const thresholdAvg = def.thresholds?.avgTickMs;
  const thresholdP95 = def.thresholds?.p95TickMs;
  const hasAvgThreshold = Number.isFinite(thresholdAvg);
  const hasP95Threshold = Number.isFinite(thresholdP95);
  const pass =
    (!hasAvgThreshold || result.tick.avgMs <= thresholdAvg) &&
    (!hasP95Threshold || result.tick.p95Ms <= thresholdP95);

  return { result, pass, reportText };
}

function printScenarioResult(result, pass) {
  console.log(`\n[${result.scenario}] ${result.description}`);
  console.log(`  Tick avg/p95/p99: ${fmtMs(result.tick.avgMs)} / ${fmtMs(result.tick.p95Ms)} / ${fmtMs(result.tick.p99Ms)}`);
  console.log(`  Tick min/max     : ${fmtMs(result.tick.minMs)} / ${fmtMs(result.tick.maxMs)}`);
  console.log(`  Tick stddev      : ${fmtMs(result.tick.stddevMs)}`);
  console.log(`  Engine phases avg: plants ${fmtMs(result.phases.plantsAvgMs)}, ai ${fmtMs(result.phases.behaviorAvgMs)}, cleanup ${fmtMs(result.phases.cleanupAvgMs)}, supervisor ${fmtMs(result.phases.supervisorAvgMs)}, stats ${fmtMs(result.phases.statsAvgMs)}`);
  console.log(`  Throughput       : ${result.wallClock.throughputTicksPerSec.toFixed(1)} ticks/s (wall)`);
  console.log(`  Memory delta     : ${result.memory.heapDeltaMb.toFixed(2)} MB`);
  console.log(`  Final world      : animals ${result.world.animalsAlive}/${result.world.animalsTotal}, plants ${result.world.activePlants}`);
  if (result.benchmark?.topHotspots?.length) {
    console.log('  Hotspots         :');
    for (const hotspot of result.benchmark.topHotspots.slice(0, 6)) {
      console.log(`    - ${hotspot.name}: total ${fmtMs(hotspot.totalMs)}, avg ${fmtMs(hotspot.avgMs)}, calls ${hotspot.calls}, calls/tick ${hotspot.callsPerTick.toFixed(2)}`);
    }
  }
  if (result.benchmark?.cache) {
    console.log(`  Cache hit rates  : path ${(result.benchmark.cache.pathHitRate * 100).toFixed(1)}%, threat ${(result.benchmark.cache.threatHitRate * 100).toFixed(1)}%`);
  }
  if (result.benchmark?.topSpeciesByDecisionLoad?.length) {
    console.log('  Species load     :');
    for (const row of result.benchmark.topSpeciesByDecisionLoad.slice(0, 5)) {
      console.log(`    - ${row.species}: decisions/tick ${row.perTick.toFixed(1)}`);
    }
  }
  console.log(`  Thresholds       : avg <= ${defNum(result.thresholds?.avgTickMs)} ms, p95 <= ${defNum(result.thresholds?.p95TickMs)} ms`);
  console.log(`  Status           : ${pass ? 'PASS' : 'FAIL'}`);
}

function defNum(v) {
  return Number.isFinite(v) ? v.toFixed(2) : 'n/a';
}

function resolveOutputPath(outFile) {
  if (outFile) {
    return path.isAbsolute(outFile) ? outFile : path.join(PROJECT_ROOT, outFile);
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(PROJECT_ROOT, 'perf-reports', `headless-profile-${stamp}.json`);
}

function resolveTextOutputPath(jsonPath) {
  const parsed = path.parse(jsonPath);
  return path.join(parsed.dir, `${parsed.name}.txt`);
}

function main() {
  const opts = parseArgs(process.argv.slice(2));

  let scenarioDefs;
  const customScenario = buildCustomScenario(opts);
  if (customScenario) {
    scenarioDefs = [customScenario];
  } else if (opts.scenario === 'phase2') {
    scenarioDefs = buildPhase2Scenarios();
  } else if (opts.scenario === 'all') {
    scenarioDefs = [SCENARIOS.small, SCENARIOS.medium, SCENARIOS.stress];
  } else {
    const chosen = SCENARIOS[opts.scenario];
    if (!chosen) {
      console.error(`Unknown scenario: ${opts.scenario}. Use small|medium|stress|phase2|all.`);
      process.exit(2);
    }
    scenarioDefs = [chosen];
  }

  const startedAt = performance.now();
  const results = [];
  let allPassed = true;

  for (const def of scenarioDefs) {
    const { result, pass, reportText } = runScenario(def, opts);
    results.push(result);
    if (!pass) allPassed = false;
    printScenarioResult(result, pass);

    let perScenarioBase;
    if (opts.outFile) {
      const resolvedOut = path.isAbsolute(opts.outFile)
        ? opts.outFile
        : path.join(PROJECT_ROOT, opts.outFile);
      if (scenarioDefs.length > 1) {
        const parsed = path.parse(resolvedOut);
        perScenarioBase = path.join(parsed.dir, `${parsed.name}-${def.name}${parsed.ext || '.json'}`);
      } else {
        perScenarioBase = resolvedOut;
      }
    } else {
      perScenarioBase = path.join(PROJECT_ROOT, 'perf-reports', `${def.name}.json`);
    }
    const textPath = resolveTextOutputPath(perScenarioBase);
    fs.mkdirSync(path.dirname(textPath), { recursive: true });
    fs.writeFileSync(textPath, `${reportText}\n`, 'utf8');
    result.textReportPath = textPath;
    console.log(`Saved text report: ${textPath}`);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    node: process.version,
    platform: process.platform,
    ciMode: opts.ci,
    scenarios: results,
    durationMs: performance.now() - startedAt,
    success: allPassed,
  };

  const outPath = resolveOutputPath(opts.outFile);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`\nSaved report: ${outPath}`);
  console.log(`Overall status: ${allPassed ? 'PASS' : 'FAIL'}`);

  if (opts.ci && !allPassed) {
    process.exit(1);
  }
}

main();
