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

// ── Scene definitions ───────────────────────────────────────────────
const SCENES = [
  {
    name: 'day-medium',
    config: { seed: 1337, map_width: 180, map_height: 180 },
    targetTick: 100,
    zoom: 8,
    center: null, // null = map center
  },
  {
    name: 'night-medium',
    config: { seed: 1337, map_width: 180, map_height: 180 },
    targetTick: 250,
    zoom: 8,
    center: null,
  },
  {
    name: 'crowded-close',
    config: { seed: 4242, map_width: 260, map_height: 260 },
    targetTick: 60,
    zoom: 20,
    center: (w, h) => ({ x: Math.floor(w / 3), y: Math.floor(h / 3) }),
  },
  {
    name: 'overview-far',
    config: { seed: 1337, map_width: 180, map_height: 180 },
    targetTick: 100,
    zoom: 2,
    center: null,
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

  fs.mkdirSync(opts.outDir, { recursive: true });

  const PORT = 5199;
  console.log('Starting Vite dev server...');
  const viteServer = await startVite(PORT);
  const baseUrl = `http://localhost:${PORT}`;

  let browser;
  const manifest = [];

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();

    // ── Viewport captures ─────────────────────────────────────────
    console.log(`Navigating to ${baseUrl}...`);
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

    // Wait for the automation bridge to be available
    await page.waitForFunction(() => !!window.__ecoCapture, { timeout: 30_000 });

    for (const scene of scenes) {
      console.log(`\n── Scene: ${scene.name} ──`);

      // Generate world with specific config — clear stale state first
      await page.evaluate((cfg) => {
        const store = window.__ecoCapture.getState;
        // Mark worldReady as null so waitForWorld won't resolve on stale data
        window.__ecoCapture.postCmd('generate', { config: cfg });
      }, scene.config);
      console.log('  Waiting for world...');
      // Wait until worldReady is set AND clock.tick is 0 (fresh world)
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

      // Start and advance to target tick
      await page.evaluate(() => window.__ecoCapture.postCmd('start'));
      await page.evaluate(() => window.__ecoCapture.postCmd('setSpeed', { tps: 60 }));
      console.log(`  Advancing to tick ${scene.targetTick}...`);
      await page.evaluate((tick) => window.__ecoCapture.waitForTick(tick), scene.targetTick);
      await page.evaluate(() => window.__ecoCapture.postCmd('pause'));

      // Position camera
      await page.evaluate((z) => window.__ecoCapture.setZoom(z), scene.zoom);
      const center = await page.evaluate((sceneDef) => {
        const state = window.__ecoCapture.getState();
        const w = state.mapWidth;
        const h = state.mapHeight;
        if (sceneDef.centerFn) {
          // Can't pass functions through evaluate; compute from map size
          return { x: Math.floor(w / 3), y: Math.floor(h / 3) };
        }
        return { x: Math.floor(w / 2), y: Math.floor(h / 2) };
      }, { centerFn: !!scene.center });
      await page.evaluate(({ x, y }) => window.__ecoCapture.centerOn(x, y), center);

      // Small delay to let the renderer settle
      await page.waitForTimeout(200);

      // Capture
      const result = await page.evaluate(() => window.__ecoCapture.capture());
      const fileName = `${scene.name}-tick${result.meta.tick}-z${scene.zoom}.png`;
      const filePath = path.join(opts.outDir, fileName);
      fs.writeFileSync(filePath, dataUrlToBuffer(result.dataUrl));
      console.log(`  Saved: ${fileName} (${result.meta.width}×${result.meta.height})`);

      manifest.push({
        scene: scene.name,
        file: fileName,
        config: scene.config,
        ...result.meta,
        capturedAt: new Date().toISOString(),
      });
    }

    // ── Atlas captures ────────────────────────────────────────────
    console.log('\n── Sprite Atlas Capture ──');
    await page.goto(`${baseUrl}/sprite-preview.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.__ecoAtlasCapture, { timeout: 15_000 });

    const faunaDataUrl = await page.evaluate(() => window.__ecoAtlasCapture.getFaunaDataUrl());
    const faunaPath = path.join(opts.outDir, 'fauna-atlas.png');
    fs.writeFileSync(faunaPath, dataUrlToBuffer(faunaDataUrl));
    console.log('  Saved: fauna-atlas.png');
    manifest.push({ scene: 'fauna-atlas', file: 'fauna-atlas.png', capturedAt: new Date().toISOString() });

    const floraDataUrl = await page.evaluate(() => window.__ecoAtlasCapture.getFloraDataUrl());
    const floraPath = path.join(opts.outDir, 'flora-atlas.png');
    fs.writeFileSync(floraPath, dataUrlToBuffer(floraDataUrl));
    console.log('  Saved: flora-atlas.png');
    manifest.push({ scene: 'flora-atlas', file: 'flora-atlas.png', capturedAt: new Date().toISOString() });

    // ── Write manifest ────────────────────────────────────────────
    const manifestPath = path.join(opts.outDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`\nManifest written to ${manifestPath}`);
    console.log(`Total captures: ${manifest.length}`);

  } finally {
    if (browser) await browser.close();
    await viteServer.close();
  }
}

main().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
