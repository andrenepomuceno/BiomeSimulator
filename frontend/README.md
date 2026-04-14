# EcoGame Frontend

React + Pixi.js frontend for EcoGame. The simulation engine runs in a Web Worker.

For architecture and engine internals, see [../docs/README.md](../docs/README.md).

---

## Setup

```bash
cd frontend
npm install
npm run dev
```

Vite dev server starts on **http://localhost:3000**.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production (`dist/`) |
| `npm run preview` | Preview production build locally |
| `npm run profile:headless` | Run headless profiling scenarios and save JSON report |
| `npm run profile:headless:ci` | Run headless profiling in CI mode (fails on threshold regression) |
| `npm run profile:cpu:analyze -- --input perf-reports/<file>.cpuprofile --top 20` | Analyze a saved V8 CPU profile |
| `npm run profile:phase2` | Run dense benchmark matrix (500/1000 maps with 10k/20k animals) |

---

## Headless Performance Profiling

Run simulation benchmarks without React/Pixi rendering:

```bash
npm run profile:headless
```

This executes predefined scenarios, prints tick/phase metrics, and writes a JSON report under `perf-reports/`. It also saves a text report using the same format as the in-app export.

### Advanced examples

```bash
node scripts/headlessProfile.mjs --scenario stress --ticks 500 --warmup 120
node scripts/headlessProfile.mjs --scenario medium --out perf-reports/medium.json
node scripts/headlessProfile.mjs --ci
node scripts/headlessProfile.mjs --map 500x500 --days 30 --name map500_30d --out perf-reports/map500x500-30d.json
node scripts/headlessProfile.mjs --scenario phase2 --out perf-reports/phase2.json
node scripts/headlessProfile.mjs --map 500x500 --days 30 --plant-density 0.10 --initial-animals 20000 --max-animals 20000 --name initial20k-500x500 --out perf-reports/initial20k-500x500.json
```

### Important flags

- `--scenario`: `small`, `medium`, `stress`, `phase2`, or `all`
- `--ticks`: measured ticks per scenario
- `--warmup`: warmup ticks before measurement
- `--out`: custom output path for JSON report
- `--ci`: exits with code `1` on threshold regressions
- `--map`: map size in `WIDTHxHEIGHT`
- `--days`: converts to measured ticks via `days * ticks_per_day`
- `--ticks-per-day`: override day length
- `--animal-scale`: scales all initial species counts
- `--initial-animals`: scales initial species counts to a target total
- `--max-animals`: override global animal population cap
- `--plant-density`: override initial plant density
- `--name`: custom scenario name

### Notes

- `--max-animals` only changes cap, not starting population.
- For dense starts, combine `--initial-animals` with `--max-animals`.
- `npm run profile:phase2` runs the default heavy-load matrix.

---

## CPU Hotspot Profiling

Capture V8 CPU profile during headless simulation:

```bash
node --cpu-prof --cpu-prof-dir perf-reports --cpu-prof-name cpu-500x500-30d.cpuprofile scripts/headlessProfile.mjs --map 500x500 --days 30 --name map500_30d
```

Analyze the generated profile:

```bash
npm run profile:cpu:analyze -- --input perf-reports/cpu-500x500-30d.cpuprofile --top 20
```

---

## Dependencies

| Package | Version | Purpose |
|---|---|---|
| react | 18.3.1 | UI framework |
| react-dom | 18.3.1 | DOM renderer |
| pixi.js | 7.4.2 | WebGL 2D renderer |
| zustand | 5.0.3 | State management |
| chart.js | 4.4.7 | Charts |
| react-chartjs-2 | 5.2.0 | Chart.js React wrapper |
| bootstrap | 5.3.3 | UI styling |
