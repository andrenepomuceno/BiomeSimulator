export function createBenchmarkCollector() {
  return {
    calls: {},
    totalMs: {},
    totals: {},
    keyedTotals: {},
  };
}

export function resetBenchmarkCollector(collector) {
  collector.calls = {};
  collector.totalMs = {};
  collector.totals = {};
   collector.keyedTotals = {};
}

export function benchmarkStart(collector) {
  return collector ? performance.now() : 0;
}

export function benchmarkEnd(collector, name, startedAt) {
  if (!collector) return 0;
  const elapsed = performance.now() - startedAt;
  collector.calls[name] = (collector.calls[name] || 0) + 1;
  collector.totalMs[name] = (collector.totalMs[name] || 0) + elapsed;
  return elapsed;
}

export function benchmarkCount(collector, name, increment = 1) {
  if (!collector) return;
  collector.calls[name] = (collector.calls[name] || 0) + increment;
}

export function benchmarkAdd(collector, name, value) {
  if (!collector) return;
  collector.totals[name] = (collector.totals[name] || 0) + value;
}

export function benchmarkAddKeyed(collector, group, key, value = 1) {
  if (!collector) return;
  if (!collector.keyedTotals[group]) collector.keyedTotals[group] = {};
  collector.keyedTotals[group][key] = (collector.keyedTotals[group][key] || 0) + value;
}

export function cloneBenchmarkCollector(collector) {
  return {
    calls: { ...collector.calls },
    totalMs: { ...collector.totalMs },
    totals: { ...collector.totals },
    keyedTotals: Object.fromEntries(
      Object.entries(collector.keyedTotals || {}).map(([group, values]) => [group, { ...values }])
    ),
  };
}