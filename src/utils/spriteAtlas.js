/**
 * Sprite atlas frame registry and loader.
 *
 * Fauna atlas: 18 species × (12 walk frames + 1 sleeping frame) = 234 frames +
 * 3 global special states (DEAD, EGG, PUPA) = 237 total frames.
 * Layout: 13 columns × 19 rows (one row per species, last row for specials).
 *
 * Flora atlas: 15 plant types × 6 stages × 3 frames = 270 frames.
 * Layout: 18 columns × 15 rows (one row per species).
 *
 * When real pixel-art PNGs exist in public/sprites/, the loader fetches them.
 * Otherwise both atlases are built procedurally via spriteGenerator.js and
 * plantSpriteGenerator.js respectively.
 */
import * as PIXI from 'pixi.js';
import { SPECIES_INFO } from './terrainColors.js';
import { buildPlantEmojiMap } from '../engine/plantSpecies.js';
import { drawSpeciesFrame, DIR_NAMES } from './spriteGenerator.js';
import { drawPlantFrame } from './plantSpriteGenerator.js';
import { drawItemFrame } from './itemSpriteGenerator.js';
import { ITEM_ORDER } from './sprites/items/catalog.js';

// ── Atlas geometry ──────────────────────────────────────────────────
export const FRAME_SIZE = 256;           // px per frame in the atlas
const FLORA_COLS = 18;                    // 6 stages × 3 frames per species row
const ITEM_COLS = 5;                      // compact grid for 15 items (5 × 3)

// ── Fauna frame map ─────────────────────────────────────────────────
// Row per species (0..17): 13 cells = 12 directional walk frames + SLEEPING
// Row 18: global specials — DEAD, EGG, PUPA
const FAUNA_SPECIAL_KEYS = ['DEAD', 'EGG', 'PUPA'];
const FAUNA_COLS = 13;
const SPECIES_ORDER = Object.keys(SPECIES_INFO);  // 18 species

function buildFaunaFrames() {
  const map = {};
  let idx = 0;
  // Walk frames for each species
  for (let row = 0; row < SPECIES_ORDER.length; row++) {
    const species = SPECIES_ORDER[row];
    let col = 0;
    for (let d = 0; d < 4; d++) {
      for (let f = 0; f < 3; f++) {
        const key = `${species}_${DIR_NAMES[d]}_${f}`;
        map[key] = { col, row, x: col * FRAME_SIZE, y: row * FRAME_SIZE };
        col++;
        idx++;
      }
    }
    const sleepKey = `${species}_SLEEPING`;
    map[sleepKey] = { col: 12, row, x: 12 * FRAME_SIZE, y: row * FRAME_SIZE };
    idx++;
  }
  // Special states (single frame each) on the last row
  const specRow = SPECIES_ORDER.length;
  for (let s = 0; s < FAUNA_SPECIAL_KEYS.length; s++) {
    const key = FAUNA_SPECIAL_KEYS[s];
    map[key] = { col: s, row: specRow, x: s * FRAME_SIZE, y: specRow * FRAME_SIZE };
    idx++;
  }
  const keys = Object.keys(map);
  const rows = specRow + 1;
  return { keys, map, cols: FAUNA_COLS, rows };
}

// ── Flora frame map ─────────────────────────────────────────────────
// 15 species × 6 stages × 3 frames = 270 frames.
// Layout: 18 columns (6 stages × 3 frames) × 15 rows (one per species).
// Keys: "typeId_stage_frame" e.g. "1_1_0", "1_1_1", "1_1_2", "1_2_0" …
const FLORA_FRAMES_PER_STAGE = 3;
const FLORA_STAGES = 6;
const FLORA_SPECIES_COUNT = 16;

function buildFloraFrames() {
  const keys = [];
  const map = {};
  for (let typeId = 1; typeId <= FLORA_SPECIES_COUNT; typeId++) {
    const row = typeId - 1;
    let col = 0;
    for (let stage = 1; stage <= FLORA_STAGES; stage++) {
      for (let frame = 0; frame < FLORA_FRAMES_PER_STAGE; frame++) {
        const key = `${typeId}_${stage}_${frame}`;
        keys.push(key);
        map[key] = { col, row, x: col * FRAME_SIZE, y: row * FRAME_SIZE };
        col++;
      }
    }
  }
  return { keys, map, cols: FLORA_COLS, rows: FLORA_SPECIES_COUNT };
}

export const FAUNA_FRAMES = buildFaunaFrames();
export const FLORA_FRAMES = buildFloraFrames();

// ── Item frame map ──────────────────────────────────────────────────
// 15 drops (6 fruits + 6 seeds + 3 meats), 1 frame each.
// Layout: 5 columns × 3 rows.
function buildItemFrames() {
  const keys = [];
  const map = {};
  for (let i = 0; i < ITEM_ORDER.length; i++) {
    const item = ITEM_ORDER[i];
    const col = i % ITEM_COLS;
    const row = Math.floor(i / ITEM_COLS);
    const key = `${item}_0`;
    keys.push(key);
    map[key] = { col, row, x: col * FRAME_SIZE, y: row * FRAME_SIZE };
  }
  const rows = Math.ceil(ITEM_ORDER.length / ITEM_COLS);
  return { keys, map, cols: ITEM_COLS, rows };
}

export const ITEMS_FRAMES = buildItemFrames();

// ── Fallback: build fauna atlas procedurally ────────────────────────
function buildFaunaAtlasCanvas() {
  const { keys, map, cols, rows } = FAUNA_FRAMES;
  const w = cols * FRAME_SIZE;
  const h = rows * FRAME_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // Temporary single-frame canvas for the generator to draw into
  const cell = document.createElement('canvas');
  cell.width = FRAME_SIZE;
  cell.height = FRAME_SIZE;
  const cellCtx = cell.getContext('2d', { willReadFrequently: true });
  cellCtx.imageSmoothingEnabled = false;

  // Draw walk frames for each species
  for (let row = 0; row < SPECIES_ORDER.length; row++) {
    const species = SPECIES_ORDER[row];
    for (let d = 0; d < 4; d++) {
      for (let f = 0; f < 3; f++) {
        const key = `${species}_${DIR_NAMES[d]}_${f}`;
        const frame = map[key];
        if (!frame) continue;
        drawSpeciesFrame(cellCtx, species, d, f);
        ctx.drawImage(cell, frame.x, frame.y);
      }
    }

    const sleepKey = `${species}_SLEEPING`;
    const sleepFrame = map[sleepKey];
    if (sleepFrame) {
      drawSpeciesFrame(cellCtx, sleepKey, 0, 0);
      ctx.drawImage(cell, sleepFrame.x, sleepFrame.y);
    }
  }

  // Draw special states
  for (const key of FAUNA_SPECIAL_KEYS) {
    const frame = map[key];
    if (!frame) continue;
    drawSpeciesFrame(cellCtx, key, 0, 0);
    ctx.drawImage(cell, frame.x, frame.y);
  }
  return canvas;
}

// ── Fallback: build flora atlas procedurally ────────────────────────
function buildFloraAtlasCanvas() {
  const { keys, map, cols, rows } = FLORA_FRAMES;
  const w = cols * FRAME_SIZE;
  const h = rows * FRAME_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const cell = document.createElement('canvas');
  cell.width = FRAME_SIZE;
  cell.height = FRAME_SIZE;
  const cellCtx = cell.getContext('2d', { willReadFrequently: true });
  cellCtx.imageSmoothingEnabled = false;

  for (const key of keys) {
    const [typeId, stage, frame] = key.split('_').map(Number);
    const pos = map[key];
    if (!pos) continue;
    drawPlantFrame(cellCtx, typeId, stage, frame);
    ctx.drawImage(cell, pos.x, pos.y);
  }
  return canvas;
}

// ── Fallback: build items atlas procedurally ───────────────────────
function buildItemAtlasCanvas() {
  const { keys, map, cols, rows } = ITEMS_FRAMES;
  const w = cols * FRAME_SIZE;
  const h = rows * FRAME_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const cell = document.createElement('canvas');
  cell.width = FRAME_SIZE;
  cell.height = FRAME_SIZE;
  const cellCtx = cell.getContext('2d', { willReadFrequently: true });
  cellCtx.imageSmoothingEnabled = false;

  for (const key of keys) {
    const [itemKey, frameRaw] = key.split(/_(?=[^_]+$)/);
    const frame = Number(frameRaw);
    const pos = map[key];
    if (!pos) continue;
    drawItemFrame(cellCtx, itemKey, frame);
    ctx.drawImage(cell, pos.x, pos.y);
  }
  return canvas;
}

// ── Slice atlas BaseTexture into individual Textures ────────────────
function sliceAtlas(baseTexture, frames) {
  const textures = {};
  for (const [key, frame] of Object.entries(frames.map)) {
    const rect = new PIXI.Rectangle(frame.x, frame.y, FRAME_SIZE, FRAME_SIZE);
    textures[key] = new PIXI.Texture(baseTexture, rect);
  }
  return textures;
}

// ── Public API ──────────────────────────────────────────────────────

let _faunaTextures = null;
let _floraTextures = null;
let _itemTextures = null;

/**
 * Load or build the fauna atlas and return { RABBIT: Texture, …, DEAD: Texture }.
 * Tries loading public/sprites/fauna.png first; falls back to emoji-built atlas.
 */
export async function loadFaunaAtlas() {
  if (_faunaTextures) return _faunaTextures;

  let baseTexture;
  try {
    // Try loading a pre-built pixel-art atlas from the public folder
    baseTexture = await PIXI.BaseTexture.from('/sprites/fauna.png', {
      scaleMode: PIXI.SCALE_MODES.NEAREST,
    });
    // Wait for the resource to actually load
    if (!baseTexture.valid) {
      await new Promise((resolve, reject) => {
        baseTexture.once('loaded', resolve);
        baseTexture.once('error', reject);
      });
    }
    const expectedW = FAUNA_FRAMES.cols * FRAME_SIZE;
    const expectedH = FAUNA_FRAMES.rows * FRAME_SIZE;
    if (baseTexture.width < expectedW || baseTexture.height < expectedH) {
      throw new Error('fauna atlas dimensions do not match current frame map');
    }
  } catch {
    // Fallback: build procedurally
    const canvas = buildFaunaAtlasCanvas();
    baseTexture = PIXI.BaseTexture.from(canvas, { scaleMode: PIXI.SCALE_MODES.NEAREST });
  }

  _faunaTextures = sliceAtlas(baseTexture, FAUNA_FRAMES);
  return _faunaTextures;
}

/**
 * Load or build the flora atlas and return { "1_1": Texture, … }.
 * Tries loading public/sprites/flora.png first; falls back to emoji-built atlas.
 */
export async function loadFloraAtlas() {
  if (_floraTextures) return _floraTextures;

  let baseTexture;
  try {
    baseTexture = await PIXI.BaseTexture.from('/sprites/flora.png', {
      scaleMode: PIXI.SCALE_MODES.NEAREST,
    });
    if (!baseTexture.valid) {
      await new Promise((resolve, reject) => {
        baseTexture.once('loaded', resolve);
        baseTexture.once('error', reject);
      });
    }
  } catch {
    const canvas = buildFloraAtlasCanvas();
    baseTexture = PIXI.BaseTexture.from(canvas, { scaleMode: PIXI.SCALE_MODES.NEAREST });
  }

  _floraTextures = sliceAtlas(baseTexture, FLORA_FRAMES);
  return _floraTextures;
}

/**
 * Load or build the items atlas and return { "ITEM_FOO_0": Texture, ... }.
 * Tries loading public/sprites/items.png first; falls back to procedural atlas.
 */
export async function loadItemAtlas() {
  if (_itemTextures) return _itemTextures;

  let baseTexture;
  try {
    baseTexture = await PIXI.BaseTexture.from('/sprites/items.png', {
      scaleMode: PIXI.SCALE_MODES.NEAREST,
    });
    if (!baseTexture.valid) {
      await new Promise((resolve, reject) => {
        baseTexture.once('loaded', resolve);
        baseTexture.once('error', reject);
      });
    }
    const expectedW = ITEMS_FRAMES.cols * FRAME_SIZE;
    const expectedH = ITEMS_FRAMES.rows * FRAME_SIZE;
    if (baseTexture.width < expectedW || baseTexture.height < expectedH) {
      throw new Error('items atlas dimensions do not match current frame map');
    }
  } catch {
    const canvas = buildItemAtlasCanvas();
    baseTexture = PIXI.BaseTexture.from(canvas, { scaleMode: PIXI.SCALE_MODES.NEAREST });
  }

  _itemTextures = sliceAtlas(baseTexture, ITEMS_FRAMES);
  return _itemTextures;
}

/**
 * Synchronous fauna atlas — builds procedurally.
 * Used when async loading isn't practical (EntityLayer._ensureTextures).
 */
export function buildFaunaAtlasSync() {
  if (_faunaTextures) return _faunaTextures;
  const canvas = buildFaunaAtlasCanvas();
  const baseTexture = PIXI.BaseTexture.from(canvas, { scaleMode: PIXI.SCALE_MODES.NEAREST });
  _faunaTextures = sliceAtlas(baseTexture, FAUNA_FRAMES);
  return _faunaTextures;
}

/**
 * Synchronous flora atlas — builds from emojis immediately.
 * Used when async loading isn't practical (PlantLayer.updateEmojis).
 */
export function buildFloraAtlasSync() {
  if (_floraTextures) return _floraTextures;
  const canvas = buildFloraAtlasCanvas();
  const baseTexture = PIXI.BaseTexture.from(canvas, { scaleMode: PIXI.SCALE_MODES.NEAREST });
  _floraTextures = sliceAtlas(baseTexture, FLORA_FRAMES);
  return _floraTextures;
}

/**
 * Synchronous items atlas — builds procedurally.
 */
export function buildItemAtlasSync() {
  if (_itemTextures) return _itemTextures;
  const canvas = buildItemAtlasCanvas();
  const baseTexture = PIXI.BaseTexture.from(canvas, { scaleMode: PIXI.SCALE_MODES.NEAREST });
  _itemTextures = sliceAtlas(baseTexture, ITEMS_FRAMES);
  return _itemTextures;
}
