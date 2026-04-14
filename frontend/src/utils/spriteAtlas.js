/**
 * Sprite atlas frame registry and loader.
 *
 * Defines the layout of fauna and flora atlas sheets and provides
 * functions to slice them into individual PixiJS textures.
 *
 * Atlas layout: square grid, FRAME_SIZE × FRAME_SIZE per cell, packed
 * left-to-right, top-to-bottom. Metadata maps each logical key to a
 * grid column/row so the renderer can look up textures by the same keys
 * used in the emoji-based path (species id or "typeId_stage").
 *
 * When real pixel-art PNGs exist in public/sprites/, the loader fetches
 * them. Otherwise a fallback builder rasterises the current emojis into
 * an in-memory atlas so the rest of the pipeline works identically.
 */
import * as PIXI from 'pixi.js';
import { SPECIES_INFO } from './terrainColors.js';
import { buildPlantEmojiMap } from '../engine/plantSpecies.js';

// ── Atlas geometry ──────────────────────────────────────────────────
export const FRAME_SIZE = 64;            // px per frame in the atlas
const FAUNA_COLS = 8;                     // grid width for fauna atlas
const FLORA_COLS = 10;                    // grid width for flora atlas

// ── Fauna frame map ─────────────────────────────────────────────────
// Order: all 18 species (alphabetical by key in SPECIES_INFO) then specials.
const FAUNA_SPECIAL_KEYS = ['SLEEPING', 'DEAD', 'EGG', 'PUPA'];
const FAUNA_SPECIAL_EMOJI = { SLEEPING: '💤', DEAD: '💀', EGG: '🥚', PUPA: '🫘' };

function buildFaunaFrames() {
  const keys = [...Object.keys(SPECIES_INFO), ...FAUNA_SPECIAL_KEYS];
  const map = {};
  keys.forEach((key, i) => {
    const col = i % FAUNA_COLS;
    const row = (i / FAUNA_COLS) | 0;
    map[key] = { col, row, x: col * FRAME_SIZE, y: row * FRAME_SIZE };
  });
  return { keys, map, cols: FAUNA_COLS, rows: Math.ceil(keys.length / FAUNA_COLS) };
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

// ── Fallback: build atlas canvas from emojis ────────────────────────
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

function buildFaunaAtlasCanvas() {
  const { keys, map, cols, rows } = FAUNA_FRAMES;
  const w = cols * FRAME_SIZE;
  const h = rows * FRAME_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  for (const key of keys) {
    const emoji = SPECIES_INFO[key]?.emoji || FAUNA_SPECIAL_EMOJI[key];
    if (!emoji) continue;
    const frame = map[key];
    const cell = renderEmojiToCanvas(emoji, FRAME_SIZE);
    ctx.drawImage(cell, frame.x, frame.y);
  }
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
    // Fallback: build from emojis
    const canvas = buildFaunaAtlasCanvas();
    baseTexture = PIXI.BaseTexture.from(canvas, { scaleMode: PIXI.SCALE_MODES.LINEAR });
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
 * Synchronous fauna atlas — builds from emojis immediately.
 * Used when async loading isn't practical (EntityLayer._ensureTextures).
 */
export function buildFaunaAtlasSync() {
  if (_faunaTextures) return _faunaTextures;
  const canvas = buildFaunaAtlasCanvas();
  const baseTexture = PIXI.BaseTexture.from(canvas, { scaleMode: PIXI.SCALE_MODES.LINEAR });
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
