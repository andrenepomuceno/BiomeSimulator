/**
 * captureScenes — Playwright-driven batch capture of simulation viewport and sprite atlases.
 *
 * Usage:
 *   node scripts/captureScenes.mjs [--mode <mode>] [--scene <name>] [--out <dir>]
 *
 * Modes:
 *   ingame   — in-game scene captures only (default if omitted together with sprites)
 *   sprites  — sprite atlas captures only (fauna + flora + items)
 *   all      — both ingame and sprites (default when no --mode is given)
 *
 * Examples:
 *   node scripts/captureScenes.mjs --mode ingame
 *   node scripts/captureScenes.mjs --mode sprites
 *   node scripts/captureScenes.mjs --mode all --scene closeup-nw
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
    config: { seed: RANDOM_SEED, map_width: 500, map_height: 500 },
    targetTick: 30,
    zoom: 4,                          // used as fallback if fit calc fails
    fitToMap: true,                   // auto-zoom to guarantee whole map visibility
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
  const opts = {
    mode: 'all',   // 'ingame' | 'sprites' | 'all'
    scene: null,
    outDir: path.join(PROJECT_ROOT, 'captures'),
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--mode'  && argv[i + 1]) opts.mode   = argv[++i];
    if (argv[i] === '--scene' && argv[i + 1]) opts.scene  = argv[++i];
    if (argv[i] === '--out'   && argv[i + 1]) opts.outDir = path.resolve(argv[++i]);
  }
  if (!['ingame', 'sprites', 'all'].includes(opts.mode)) {
    console.error(`Unknown --mode "${opts.mode}". Valid values: ingame, sprites, all`);
    process.exit(1);
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

// ── Compute overview zoom to fit full map inside canvas ────────────────────
async function getFitToMapZoom(page, fallbackZoom) {
  return page.evaluate(({ fallback }) => {
    const state = window.__ecoCapture.getState();
    const canvas = document.querySelector('.canvas-area canvas');
    if (!canvas || !state?.mapWidth || !state?.mapHeight) {
      return { zoom: fallback, fits: false, reason: 'missing-canvas-or-map' };
    }

    const rect = canvas.getBoundingClientRect();
    const mapW = Math.max(1, state.mapWidth);
    const mapH = Math.max(1, state.mapHeight);

    // Keep a small margin so border tiles don't get clipped by rounding.
    const fitZoom = Math.min(rect.width / mapW, rect.height / mapH) * 0.98;
    const zoom = Math.max(1, Math.min(120, fitZoom));

    window.__ecoCapture.setZoom(zoom);
    window.__ecoCapture.centerOn(Math.floor(mapW / 2), Math.floor(mapH / 2));

    const viewport = window.__ecoCapture.getState().viewport;
    const fits = !!viewport && viewport.w >= mapW && viewport.h >= mapH;

    return { zoom, fits, mapW, mapH, viewportW: viewport?.w ?? null, viewportH: viewport?.h ?? null };
  }, { fallback: fallbackZoom });
}

// ── In-game scene capture ───────────────────────────────────────────
async function runIngame(page, scenes, runDir, manifest) {
  await page.waitForFunction(() => !!window.__ecoCapture, { timeout: 30_000 });

  for (const scene of scenes) {
    console.log(`\n── Scene: ${scene.name} ──`);

    if (scene.generate) {
      await page.evaluate((cfg) => window.__ecoCapture.postCmd('generate', { config: cfg }), scene.config);
      console.log('  Waiting for world...');
      await page.evaluate(() => new Promise((resolve) => {
        const check = () => { const s = window.__ecoCapture.getState(); return s.worldReady && s.clock.tick === 0; };
        if (check()) { resolve(); return; }
        const unsub = window.__ecoCapture._subscribe((state) => {
          if (state.worldReady && state.clock.tick === 0) { unsub(); resolve(); }
        });
      }));
      await page.evaluate(() => window.__ecoCapture.postCmd('start'));
      await page.evaluate(() => window.__ecoCapture.postCmd('setSpeed', { tps: 60 }));
    }

    const currentTick = await page.evaluate(() => window.__ecoCapture.getState().clock.tick);
    if (currentTick < scene.targetTick) {
      console.log(`  Advancing from tick ${currentTick} → ${scene.targetTick}...`);
      await page.evaluate((tick) => window.__ecoCapture.waitForTick(tick), scene.targetTick);
    }
    await page.evaluate(() => window.__ecoCapture.postCmd('pause'));

    let usedZoom = scene.zoom;
    await page.evaluate((z) => window.__ecoCapture.setZoom(z), usedZoom);

    const mapCenter = await page.evaluate((c) => {
      const state = window.__ecoCapture.getState();
      return { x: Math.floor(state.mapWidth * c.fx), y: Math.floor(state.mapHeight * c.fy) };
    }, scene.center);
    await page.evaluate(({ x, y }) => window.__ecoCapture.centerOn(x, y), mapCenter);

    if (scene.fitToMap) {
      const fit = await getFitToMapZoom(page, scene.zoom);
      usedZoom = fit.zoom;
      if (fit.fits) {
        console.log(`  Fit-to-map zoom: ${usedZoom.toFixed(2)} (map ${fit.mapW}x${fit.mapH}, viewport ${fit.viewportW}x${fit.viewportH})`);
      } else {
        console.warn(`  Could not fully fit map at current constraints; using zoom ${usedZoom.toFixed(2)}`);
      }
    }

    await page.waitForTimeout(300);

    const tick = await page.evaluate(() => window.__ecoCapture.getState().clock.tick);
    const zoomTag = usedZoom.toFixed(2).replace('.', 'p');
    const fileName = `${scene.name}-tick${tick}-z${zoomTag}.png`;
    await page.locator('.canvas-area canvas').screenshot({ path: path.join(runDir, fileName), type: 'png' });
    console.log(`  Saved: ${fileName}`);
    manifest.push({
      scene: scene.name, file: fileName, seed: RANDOM_SEED,
      config: scene.config ?? { seed: RANDOM_SEED }, tick, zoom: usedZoom,
      capturedAt: new Date().toISOString(),
    });

    await page.evaluate(() => window.__ecoCapture.postCmd('start'));
    await page.evaluate(() => window.__ecoCapture.postCmd('setSpeed', { tps: 60 }));
  }
}

// ── Sprite atlas capture ─────────────────────────────────────────────
async function runSprites(page, baseUrl, runDir, manifest) {
  console.log('\n── Sprite Atlas Capture ──');
  await page.goto(`${baseUrl}/sprite-preview.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__ecoAtlasCapture, { timeout: 15_000 });

  const faunaDataUrl = await page.evaluate(() => window.__ecoAtlasCapture.getFaunaDataUrl());
  fs.writeFileSync(path.join(runDir, 'fauna-atlas.png'), dataUrlToBuffer(faunaDataUrl));
  console.log('  Saved: fauna-atlas.png');
  manifest.push({ scene: 'fauna-atlas', file: 'fauna-atlas.png', capturedAt: new Date().toISOString() });

  const floraDataUrl = await page.evaluate(() => window.__ecoAtlasCapture.getFloraDataUrl());
  fs.writeFileSync(path.join(runDir, 'flora-atlas.png'), dataUrlToBuffer(floraDataUrl));
  console.log('  Saved: flora-atlas.png');
  manifest.push({ scene: 'flora-atlas', file: 'flora-atlas.png', capturedAt: new Date().toISOString() });

  const itemsDataUrl = await page.evaluate(() => window.__ecoAtlasCapture.getItemsDataUrl());
  fs.writeFileSync(path.join(runDir, 'items-atlas.png'), dataUrlToBuffer(itemsDataUrl));
  console.log('  Saved: items-atlas.png');
  manifest.push({ scene: 'items-atlas', file: 'items-atlas.png', capturedAt: new Date().toISOString() });
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  const opts = parseArgs(process.argv.slice(2));

  const doIngame  = opts.mode === 'ingame'  || opts.mode === 'all';
  const doSprites = opts.mode === 'sprites' || opts.mode === 'all';

  const scenes = doIngame
    ? (opts.scene ? SCENES.filter((s) => s.name === opts.scene) : SCENES)
    : [];

  if (doIngame && scenes.length === 0) {
    console.error(`Unknown scene: ${opts.scene}. Available: ${SCENES.map((s) => s.name).join(', ')}`);
    process.exit(1);
  }

  fs.mkdirSync(opts.outDir, { recursive: true });

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

    const runTs  = new Date().toISOString().replace(/:/g, '-').replace(/\.\d+Z$/, 'Z');
    const runDir = path.join(opts.outDir, runTs);
    fs.mkdirSync(runDir, { recursive: true });
    console.log(`\nRun output folder: ${runDir}`);
    if (doIngame) console.log(`Random seed for this run: ${RANDOM_SEED}`);
    console.log(`Mode: ${opts.mode}`);

    if (doIngame) {
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
      await runIngame(page, scenes, runDir, manifest);
    }

    if (doSprites) {
      await runSprites(page, baseUrl, runDir, manifest);
    }

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
