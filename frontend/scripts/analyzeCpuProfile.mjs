import fs from 'node:fs';
import path from 'node:path';

function fmtMs(v) {
  return `${v.toFixed(2)} ms`;
}

function shortName(frame) {
  const fn = frame.functionName || '(anonymous)';
  const url = frame.url || '';
  if (!url) return fn;
  const file = path.basename(url);
  const line = Number.isFinite(frame.lineNumber) ? frame.lineNumber + 1 : 0;
  return `${fn} (${file}${line ? `:${line}` : ''})`;
}

function getSourceType(url) {
  if (!url) return 'internal';
  if (url.includes('/src/engine/')) return 'engine';
  if (url.includes('/src/worker/')) return 'worker';
  if (url.includes('/node_modules/')) return 'node_modules';
  if (url.startsWith('node:') || url.startsWith('internal/')) return 'node_internal';
  return 'other';
}

function parseArgs(argv) {
  const opts = { input: '', top: 20 };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if ((arg === '--input' || arg === '-i') && argv[i + 1]) {
      opts.input = argv[++i];
      continue;
    }
    if ((arg === '--top' || arg === '-n') && argv[i + 1]) {
      opts.top = Math.max(1, Number(argv[++i]) || 20);
      continue;
    }
  }
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.input) {
    console.error('Usage: node scripts/analyzeCpuProfile.mjs --input perf-reports/file.cpuprofile [--top 20]');
    process.exit(2);
  }

  const raw = fs.readFileSync(opts.input, 'utf8');
  const profile = JSON.parse(raw);
  const nodes = profile.nodes || [];
  const sampleCount = (profile.samples || []).length;
  const rawDuration = (profile.endTime || 0) - (profile.startTime || 0);
  // V8 CPU profile timestamps are microseconds; convert to ms.
  const duration = rawDuration / 1000;
  const sampleMs = sampleCount > 0 ? duration / sampleCount : 0;

  const nodeById = new Map();
  const parentById = new Map();
  for (const node of nodes) {
    nodeById.set(node.id, node);
  }
  for (const node of nodes) {
    const children = node.children || [];
    for (const childId of children) {
      if (!parentById.has(childId)) parentById.set(childId, node.id);
    }
  }

  const selfMsById = new Map();
  const totalMsById = new Map();

  for (const node of nodes) {
    const hitCount = node.hitCount || 0;
    const selfMs = hitCount * sampleMs;
    selfMsById.set(node.id, (selfMsById.get(node.id) || 0) + selfMs);

    let cur = node.id;
    while (cur != null) {
      totalMsById.set(cur, (totalMsById.get(cur) || 0) + selfMs);
      cur = parentById.get(cur);
    }
  }

  const rows = [];
  for (const node of nodes) {
    const frame = node.callFrame || {};
    const selfMs = selfMsById.get(node.id) || 0;
    const totalMs = totalMsById.get(node.id) || 0;
    if (selfMs <= 0 && totalMs <= 0) continue;
    rows.push({
      id: node.id,
      name: shortName(frame),
      url: frame.url || '',
      sourceType: getSourceType(frame.url || ''),
      selfMs,
      totalMs,
    });
  }

  const topSelf = [...rows].sort((a, b) => b.selfMs - a.selfMs).slice(0, opts.top);
  const topTotal = [...rows].sort((a, b) => b.totalMs - a.totalMs).slice(0, opts.top);

  const byType = new Map();
  for (const r of rows) {
    byType.set(r.sourceType, (byType.get(r.sourceType) || 0) + r.selfMs);
  }
  const typeRows = [...byType.entries()]
    .map(([sourceType, selfMs]) => ({ sourceType, selfMs }))
    .sort((a, b) => b.selfMs - a.selfMs);

  const totalSelf = rows.reduce((acc, r) => acc + r.selfMs, 0);

  console.log(`Profile file: ${opts.input}`);
  console.log(`Samples: ${sampleCount}, approx sample interval: ${sampleMs.toFixed(4)} ms, duration: ${duration.toFixed(2)} ms`);

  console.log('\nTop functions by self time:');
  for (const r of topSelf) {
    const pct = totalSelf > 0 ? (100 * r.selfMs) / totalSelf : 0;
    console.log(`  ${fmtMs(r.selfMs).padStart(10)}  ${pct.toFixed(2).padStart(6)}%  ${r.name}`);
  }

  console.log('\nTop functions by total time (inclusive):');
  for (const r of topTotal) {
    const pct = totalSelf > 0 ? (100 * r.totalMs) / totalSelf : 0;
    console.log(`  ${fmtMs(r.totalMs).padStart(10)}  ${pct.toFixed(2).padStart(6)}%  ${r.name}`);
  }

  console.log('\nSelf time by source type:');
  for (const r of typeRows) {
    const pct = totalSelf > 0 ? (100 * r.selfMs) / totalSelf : 0;
    console.log(`  ${r.sourceType.padEnd(14)} ${fmtMs(r.selfMs).padStart(10)}  ${pct.toFixed(2).padStart(6)}%`);
  }
}

main();
