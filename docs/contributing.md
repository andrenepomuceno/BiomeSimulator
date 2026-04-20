# Developer Guide

Navigation: [Documentation Home](README.md) > [Current Document](contributing.md)
Return to [Documentation Home](README.md).

Covers the local workflow, build system, CI gates, performance profiling, and deployment configuration.

---

## Setup

```bash
npm install
npm run dev
```

Vite dev server starts at **http://localhost:3000**.

---

## Build

```bash
npm run build
```

Output goes to `dist/`. For deployment to a GitHub Pages project path, set the base path before building:

```powershell
$env:VITE_BASE_PATH='/BiomeSimulator/'
npm run build
```

If `VITE_BASE_PATH` is not set, the build defaults to `/`.

---

## All Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build (`dist/`) |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run Vitest in watch mode |
| `npm run test:run` | Run engine/store regression suite once |
| `npm run test:perf:small` | Small headless performance gate |
| `npm run test:perf:medium` | Medium headless performance gate |
| `npm run profile:headless` | Run headless profiling scenarios, print metrics, save JSON report |
| `npm run profile:headless:ci` | Headless profiling in CI mode (exits `1` on threshold regression) |
| `npm run profile:cpu:analyze -- --input perf-reports/<file>.cpuprofile --top 20` | Analyze a V8 CPU profile |
| `npm run profile:phase2` | Dense benchmark matrix (500/1000 maps × 10k/20k animals) |

---

## Editor Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` | Select tool |
| `2` | Terrain paint tool |
| `3` | Entity placement tool |
| `4` | Erase tool |
| `Ctrl/Cmd+Z` | Undo latest terrain or entity edit |
| `Ctrl/Cmd+Y` / `Ctrl/Cmd+Shift+Z` | Redo latest undone edit |

Entity placement supports click-to-place and drag brush. While dragging in `PLACE_ENTITY` mode, placement fires once per tile transition to avoid duplicate spawns on the same tile.

---

## Local Regression Workflow

For deterministic engine and store checks:

```bash
npm run test:run
```

For simulation-affecting changes, also run the small performance gate:

```bash
npm run test:perf:small
```

Before a release or a larger refactor, run the medium scenario as well:

```bash
npm run test:perf:medium
```

The test suite is Node-only. It covers engine algorithms and store merge behavior without depending on React DOM or Pixi rendering.

---

## Headless Performance Profiling

Run simulation benchmarks without the React/Pixi front-end:

```bash
npm run profile:headless
```

Executes predefined scenarios, prints per-phase tick metrics, and writes a JSON + text report to `perf-reports/`.

### Common examples

```bash
node scripts/headlessProfile.mjs --scenario stress --ticks 500 --warmup 120
node scripts/headlessProfile.mjs --scenario medium --out perf-reports/medium.json
node scripts/headlessProfile.mjs --ci
node scripts/headlessProfile.mjs --map 500x500 --days 30 --name map500_30d --out perf-reports/map500x500-30d.json
node scripts/headlessProfile.mjs --scenario phase2 --out perf-reports/phase2.json
node scripts/headlessProfile.mjs --map 500x500 --days 30 --plant-density 0.10 --initial-animals 20000 --max-animals 20000 --name initial20k-500x500 --out perf-reports/initial20k-500x500.json
```

### Flag reference

| Flag | Description |
|------|-------------|
| `--scenario` | `small`, `medium`, `stress`, `phase2`, or `all` |
| `--ticks` | Measured ticks per scenario |
| `--warmup` | Warmup ticks before measurement |
| `--out` | Custom output path for the JSON report |
| `--ci` | Exits `1` on threshold regressions |
| `--map` | Map size as `WIDTHxHEIGHT` |
| `--days` | Measured duration in game days (`days × ticks_per_day`) |
| `--ticks-per-day` | Override day length |
| `--animal-scale` | Scale all initial species counts by a factor |
| `--initial-animals` | Scale initial counts to a target total |
| `--max-animals` | Override global animal population cap (cap only, not starting count) |
| `--plant-density` | Override initial plant density |
| `--name` | Custom scenario name for the report |

For a dense-start scenario, combine `--initial-animals` with `--max-animals`.

---

## CPU Hotspot Profiling

Capture a V8 CPU profile during headless simulation:

```bash
node --cpu-prof --cpu-prof-dir perf-reports --cpu-prof-name cpu-500x500-30d.cpuprofile scripts/headlessProfile.mjs --map 500x500 --days 30 --name map500_30d
```

Analyze the profile:

```bash
npm run profile:cpu:analyze -- --input perf-reports/cpu-500x500-30d.cpuprofile --top 20
```

---

## CI Quality Gates

Run before every merge to `main`:

```bash
npm run build          # (with VITE_BASE_PATH=/BiomeSimulator/)
npm run test:run
npm run test:perf:small
npm run test:perf:medium
```

Workflows live under `.github/workflows/`:

- `ci.yml` — runs all gates on pull requests and pushes to `main`
- `deploy-pages.yml` — publishes `dist/` to GitHub Pages after CI passes on `main`
- `release.yml` — creates tag `v{package.json version}` and a draft GitHub Release after CI passes on `main`, only when `package.json` version changes

---

## GitHub Pages Deployment

This repository deploys to **project Pages** at `https://<user>.github.io/BiomeSimulator/`.

Required GitHub settings:

1. **Settings → Pages → Source**: `GitHub Actions`
2. Default branch: `main`
3. Workflow write permissions enabled for Pages

Deployment flow: push to `main` → CI passes → `deploy-pages.yml` publishes `dist/`.

Draft release flow: push to `main` with a `package.json` version bump → CI passes → `release.yml` creates `vX.Y.Z` tag and a draft release with auto-generated notes.

---

## Runtime Feature Flags

Flags are read from Vite env vars (`import.meta.env`) in `src/config/featureFlags.js`.

| Flag | Default (dev) | Default (prod) | Effect |
|------|--------------|----------------|--------|
| `VITE_FF_AUDIO_LOG_UI` | `true` | `false` | Show audio log UI and collect log entries |
| `VITE_FF_CAPTURE_BRIDGE` | `true` | `false` | Expose `window.__ecoCapture` debug bridge |

Example — force audio log UI on a production build:

```powershell
$env:VITE_FF_AUDIO_LOG_UI='true'
$env:VITE_BASE_PATH='/BiomeSimulator/'
npm run build
```

---

## Dev Debug Dashboard

A dedicated debug dialog is available **only in development builds** (`import.meta.env.DEV`). It is opened via the **Debug** button in the toolbar (visible only in dev).

The modal is loaded through `React.lazy` + a dynamic import gated by `IS_DEV`, so Rollup/Vite excludes `src/components/DevDebugModal.jsx` from the production bundle entirely.

### Sections

| Section | What it shows |
|---------|--------------|
| **Runtime** | Sim state (running/paused/idle), speed (tps), clock tick/day, world size, live animal and plant counts |
| **Performance** | Engine tick time, per-phase breakdown (plants / AI / spatial / cleanup / stats), renderer FPS and frame time, entity and plant update times |
| **Renderer** | Active renderer mode, camera position, zoom, viewport dimensions |
| **Feature Flags** | Current resolved values of `IS_DEV`, `FF_AUDIO_LOG_UI`, `FF_CAPTURE_BRIDGE` |

> All data is read from the existing Zustand store — no new state or polling is added.

---

## In-App Help Content

Player-facing help is rendered by `src/components/HelpModal.jsx`. The text lives in `src/constants/helpContent.js`. Keep that file focused on short, player-facing explanations — treat `docs/` as the canonical technical source rather than a runtime dependency.

For help-content-only changes, pair `npm run build` with a quick smoke test of modal open/close behavior, keyboard shortcuts, and narrow-width layout.

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | 18.3.1 | UI framework |
| react-dom | 18.3.1 | DOM renderer |
| pixi.js | 7.4.2 | WebGL 2D renderer |
| zustand | 5.0.3 | State management |
| chart.js | 4.4.7 | Charts |
| react-chartjs-2 | 5.2.0 | Chart.js React wrapper |
| bootstrap | 5.3.3 | UI styling |
