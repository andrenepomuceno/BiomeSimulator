/**
 * Sprite atlas frame registry and loader.
 *
 * Fauna atlas: 18 species × 4 directions × 3 walk frames = 216 walk frames +
 * 4 special states (SLEEPING, DEAD, EGG, PUPA) = 220 total frames.
 * Layout: 12 columns × 19 rows (one row per species, last row for specials).
 *
 * Flora atlas: 15 plant types × 5 stages = 75 frames.
 * Layout: 10 columns × 8 rows.
 *
 * When real pixel-art PNGs exist in public/sprites/, the loader fetches them.
 * Otherwise the fauna atlas is built procedurally via spriteGenerator.js and
 * the flora atlas falls back to emoji rasterisation.
 */
import * as PIXI from 'pixi.js';
import { SPECIES_INFO } from './terrainColors.js';
import { buildPlantEmojiMap } from '../engine/plantSpecies.js';
import { drawSpeciesFrame, DIR_NAMES } from './spriteGenerator.js';

// ── Atlas geometry ──────────────────────────────────────────────────
export const FRAME_SIZE = 64;            // px per frame in the atlas
const FAUNA_COLS = 12;                    // 4 dirs × 3 frames per species row
const FLORA_COLS = 10;                    // grid width for flora atlas

// ── Fauna frame map ─────────────────────────────────────────────────
// Row per species (0..17): 12 cells = DOWN_0..2, LEFT_0..2, RIGHT_0..2, UP_0..2
// Row 18: specials — SLEEPING, DEAD, EGG, PUPA (4 cells)
const FAUNA_SPECIAL_KEYS = ['SLEEPING', 'DEAD', 'EGG', 'PUPA'];
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
function buildFloraFrames() {
  const emojiMap = buildPlantEmojiMap(); // { "1_1": "🌱", … }
  const keys = Object.keys(emojiMap).sort((a, b) => {
    const [at, as] = a.split('_').map(Number);
    const [bt, bs] = b.split('_').map(Number);
    return at !== bt ? at - bt : as - bs;
  });
  const map = {};
  keys.forEach((key, i) => {
    const col = i % FLORA_COLS;
    const row = (i / FLORA_COLS) | 0;
    map[key] = { col, row, x: col * FRAME_SIZE, y: row * FRAME_SIZE };
  });
  return { keys, map, cols: FLORA_COLS, rows: Math.ceil(keys.length / FLORA_COLS) };
}

export const FAUNA_FRAMES = buildFaunaFrames();
export const FLORA_FRAMES = buildFloraFrames();

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
  const cellCtx = cell.getContext('2d');
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

// ── Fallback: build flora atlas from emojis ─────────────────────────
function renderEmojiToCanvas(emoji, size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  const fontSize = Math.round(size * 0.75);
  ctx.font = `${fontSize}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, size / 2, size / 2 + 1);
  return canvas;
}

function buildFloraAtlasCanvas() {
  const emojiMap = buildPlantEmojiMap();
  const { keys, map, cols, rows } = FLORA_FRAMES;
  const w = cols * FRAME_SIZE;
  const h = rows * FRAME_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  for (const key of keys) {
    const emoji = emojiMap[key];
    if (!emoji) continue;
    const frame = map[key];
    const cell = renderEmojiToCanvas(emoji, FRAME_SIZE);
    ctx.drawImage(cell, frame.x, frame.y);
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
    baseTexture = PIXI.BaseTexture.from(canvas, { scaleMode: PIXI.SCALE_MODES.LINEAR });
  }

  _floraTextures = sliceAtlas(baseTexture, FLORA_FRAMES);
  return _floraTextures;
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
  const baseTexture = PIXI.BaseTexture.from(canvas, { scaleMode: PIXI.SCALE_MODES.LINEAR });
  _floraTextures = sliceAtlas(baseTexture, FLORA_FRAMES);
  return _floraTextures;
}
