/**
 * captureScenes — Playwright-driven batch capture of simulation viewport and sprite atlases.
 *
 * Usage:  node scripts/captureScenes.mjs [--scene <name>] [--out <dir>]
 *
 * Starts a Vite dev server, opens Chromium, runs deterministic scenarios through
 * the window.__ecoCapture bridge, saves PNGs + manifest.json to the output folder.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ── Random seed (new each run) ─────────────────────────────────────
const RANDOM_SEED = Math.floor(Math.random() * 999_999) + 1;

// ── Scene definitions ───────────────────────────────────────────────
// `generate: true`  → start a fresh world at tick 0 before advancing.
// `generate: false` → continue the existing world from its current tick.
// `center: { fx, fy }` → fractional position within the map (0–1).
const SCENES = [
  {
    name: 'overview-full',
    generate: true,
    config: { seed: RANDOM_SEED, map_width: 200, map_height: 200 },
    targetTick: 30,
    zoom: 4,                          // wide overview — enough to see the whole map
    center: { fx: 0.50, fy: 0.50 },
  },
  // ── Close-ups at incrementing ticks so each shot is a different moment ──
  {
    name: 'closeup-nw',
    generate: false,
    targetTick: 30,   // already at 30 — no extra advance
    zoom: 20,
    center: { fx: 0.18, fy: 0.18 },
  },
  {
    name: 'closeup-ne',
    generate: false,
    targetTick: 50,
    zoom: 28,
    center: { fx: 0.82, fy: 0.18 },
  },
  {
    name: 'closeup-center',
    generate: false,
    targetTick: 70,
    zoom: 24,
    center: { fx: 0.50, fy: 0.50 },
  },
  {
    name: 'closeup-sw',
    generate: false,
    targetTick: 90,
    zoom: 32,
    center: { fx: 0.18, fy: 0.82 },
  },
  {
    name: 'closeup-se',
    generate: false,
    targetTick: 110,
    zoom: 20,
    center: { fx: 0.82, fy: 0.82 },
  },
  {
    name: 'closeup-detail',
    generate: false,
    targetTick: 130,
    zoom: 36,                         // most zoomed — individual sprite detail
    center: { fx: 0.55, fy: 0.38 },
  },
];

// ── CLI args ────────────────────────────────────────────────────────
function parseArgs(argv) {
  const opts = { scene: null, outDir: path.join(PROJECT_ROOT, 'captures') };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--scene' && argv[i + 1]) opts.scene = argv[++i];
    if (argv[i] === '--out' && argv[i + 1]) opts.outDir = path.resolve(argv[++i]);
  }
  return opts;
}

// ── Vite dev server (JS API) ────────────────────────────────────────
async function startVite(port) {
  const server = await createServer({
    root: PROJECT_ROOT,
    server: { port, strictPort: true },
    logLevel: 'silent',
  });
  await server.listen();
  return server;
}

// ── Data URL → Buffer ───────────────────────────────────────────────
function dataUrlToBuffer(dataUrl) {
  const base64 = dataUrl.split(',')[1];
  return Buffer.from(base64, 'base64');
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const scenes = opts.scene
    ? SCENES.filter((s) => s.name === opts.scene)
    : SCENES;

  if (scenes.length === 0) {
    console.error(`Unknown scene: ${opts.scene}. Available: ${SCENES.map((s) => s.name).join(', ')}`);
    process.exit(1);
  }

  fs.mkdirSync(opts.outDir, { recursive: true }); // base dir; run subdir created after timestamp is known

  const PORT = 5199;
  console.log('Starting Vite dev server...');
  const viteServer = await startVite(PORT);
  const baseUrl = `http://localhost:${PORT}`;

  let browser;
  const manifest = [];

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 2,  // HiDPI — 2× pixel density for sharper screenshots
    });
    const page = await context.newPage();

    // ── Viewport captures ─────────────────────────────────────────
  // ── Per-run timestamped subfolder ─────────────────────────────────────────
  const runTs   = new Date().toISOString().replace(/:/g, '-').replace(/\.\d+Z$/, 'Z');
  const runDir  = path.join(opts.outDir, runTs);
  fs.mkdirSync(runDir, { recursive: true });
  console.log(`\nRun output folder: ${runDir}`);
  console.log(`Random seed for this run: ${RANDOM_SEED}`);
  console.log(`Navigating to ${baseUrl}...`);
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

    // Wait for the automation bridge to be available
    await page.waitForFunction(() => !!window.__ecoCapture, { timeout: 30_000 });

    for (const scene of scenes) {
      console.log(`\n── Scene: ${scene.name} ──`);

      if (scene.generate) {
        // Start a fresh world
        await page.evaluate((cfg) => {
          window.__ecoCapture.postCmd('generate', { config: cfg });
        }, scene.config);
        console.log('  Waiting for world...');
        await page.evaluate(() => new Promise((resolve) => {
          const check = () => {
            const s = window.__ecoCapture.getState();
            return s.worldReady && s.clock.tick === 0;
          };
          if (check()) { resolve(); return; }
          const unsub = window.__ecoCapture._subscribe((state) => {
            if (state.worldReady && state.clock.tick === 0) { unsub(); resolve(); }
          });
        }));
        // Start sim at high speed
        await page.evaluate(() => window.__ecoCapture.postCmd('start'));
        await page.evaluate(() => window.__ecoCapture.postCmd('setSpeed', { tps: 60 }));
      }

      // Advance to target tick (no-op if we're already there)
      const currentTick = await page.evaluate(() => window.__ecoCapture.getState().clock.tick);
      if (currentTick < scene.targetTick) {
        console.log(`  Advancing from tick ${currentTick} → ${scene.targetTick}...`);
        await page.evaluate((tick) => window.__ecoCapture.waitForTick(tick), scene.targetTick);
      }
      await page.evaluate(() => window.__ecoCapture.postCmd('pause'));

      // Position camera using fractional map coordinates
      await page.evaluate((z) => window.__ecoCapture.setZoom(z), scene.zoom);
      const mapCenter = await page.evaluate((c) => {
        const state = window.__ecoCapture.getState();
        const w = state.mapWidth;
        const h = state.mapHeight;
        return { x: Math.floor(w * c.fx), y: Math.floor(h * c.fy) };
      }, scene.center);
      await page.evaluate(({ x, y }) => window.__ecoCapture.centerOn(x, y), mapCenter);

      // Small delay to let the renderer settle
      await page.waitForTimeout(300);

      // ── Canvas-only screenshot (captures just the game canvas, no UI) ──
      const tick = await page.evaluate(() => window.__ecoCapture.getState().clock.tick);
      const fileName = `${scene.name}-tick${tick}-z${scene.zoom}.png`;
      const filePath = path.join(runDir, fileName);
      await page.locator('.canvas-area canvas').screenshot({ path: filePath, type: 'png' });
      console.log(`  Saved: ${fileName}`);

      manifest.push({
        scene: scene.name,
        file: fileName,
        seed: RANDOM_SEED,
        config: scene.config ?? { seed: RANDOM_SEED },
        tick,
        zoom: scene.zoom,
        capturedAt: new Date().toISOString(),
      });

      // Resume the sim (so the next scene can keep advancing from this tick)
      await page.evaluate(() => window.__ecoCapture.postCmd('start'));
      await page.evaluate(() => window.__ecoCapture.postCmd('setSpeed', { tps: 60 }));
    }

    // ── Atlas captures ────────────────────────────────────────────
    console.log('\n── Sprite Atlas Capture ──');
    await page.goto(`${baseUrl}/sprite-preview.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.__ecoAtlasCapture, { timeout: 15_000 });

    const faunaDataUrl = await page.evaluate(() => window.__ecoAtlasCapture.getFaunaDataUrl());
    const faunaPath = path.join(runDir, 'fauna-atlas.png');
    fs.writeFileSync(faunaPath, dataUrlToBuffer(faunaDataUrl));
    console.log('  Saved: fauna-atlas.png');
    manifest.push({ scene: 'fauna-atlas', file: 'fauna-atlas.png', capturedAt: new Date().toISOString() });

    const floraDataUrl = await page.evaluate(() => window.__ecoAtlasCapture.getFloraDataUrl());
    const floraPath = path.join(runDir, 'flora-atlas.png');
    fs.writeFileSync(floraPath, dataUrlToBuffer(floraDataUrl));
    console.log('  Saved: flora-atlas.png');
    manifest.push({ scene: 'flora-atlas', file: 'flora-atlas.png', capturedAt: new Date().toISOString() });

    // ── Write manifest ────────────────────────────────────────────
    const manifestPath = path.join(runDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`\nManifest written to ${manifestPath}`);
    console.log(`Total captures: ${manifest.length}`);
    console.log(`Run folder: ${runDir}`);

  } finally {
    if (browser) await browser.close();
    await viteServer.close();
  }
}

main().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
