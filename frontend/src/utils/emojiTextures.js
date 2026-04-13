/**
 * Emoji-based texture generator — renders emoji onto offscreen canvas,
 * converts to PixiJS textures for animal and plant sprites.
 */
import * as PIXI from 'pixi.js';
import { SPECIES_INFO } from './terrainColors';
import { buildPlantEmojiMap } from '../engine/plantSpecies';

const TEX_SIZE = 96;
const FONT_SIZE = 72;

/**
 * Render a single emoji onto an offscreen canvas and return it.
 */
function emojiToCanvas(emoji) {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, TEX_SIZE, TEX_SIZE);
  ctx.font = `${FONT_SIZE}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, TEX_SIZE / 2, TEX_SIZE / 2 + 2);
  return canvas;
}

function canvasToTexture(canvas) {
  return PIXI.Texture.from(canvas, { scaleMode: PIXI.SCALE_MODES.LINEAR });
}

/**
 * Generate PixiJS textures for all animal species + special states.
 * Returns { RABBIT: Texture, WOLF: Texture, ..., SLEEPING: Texture, DEAD: Texture }
 */
export function generateEmojiTextures() {
  const textures = {};

  for (const [species, info] of Object.entries(SPECIES_INFO)) {
    textures[species] = canvasToTexture(emojiToCanvas(info.emoji));
  }

  // Special state textures
  textures.SLEEPING = canvasToTexture(emojiToCanvas('💤'));
  textures.DEAD = canvasToTexture(emojiToCanvas('💀'));

  return textures;
}

/**
 * Plant emoji map: "plantType_stage" → emoji string.
 * Built from plantSpecies.js canonical registry.
 * Stages: 1=Seed, 2=Young Sprout, 3=Adult Sprout, 4=Adult, 5=Fruit
 */
const PLANT_EMOJI_MAP = buildPlantEmojiMap();

let _plantTextures = null;

/**
 * Generate PixiJS textures for all plant type×stage combinations.
 * Returns { "1_1": Texture, "2_4": Texture, ... }
 */
export function generatePlantEmojiTextures() {
  if (_plantTextures) return _plantTextures;
  _plantTextures = {};
  for (const [key, emoji] of Object.entries(PLANT_EMOJI_MAP)) {
    _plantTextures[key] = canvasToTexture(emojiToCanvas(emoji));
  }
  return _plantTextures;
}
