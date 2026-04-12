/**
 * Emoji-based texture generator — renders emoji onto offscreen canvas,
 * converts to PixiJS textures for animal and plant sprites.
 */
import * as PIXI from 'pixi.js';
import { SPECIES_INFO } from './terrainColors';

const TEX_SIZE = 64;
const FONT_SIZE = 48;

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
 * Types: 1=Grass, 2=Strawberry, 3=Blueberry, 4=Apple Tree, 5=Mango Tree, 6=Carrot
 * Stages: 1=Seed, 2=Sprout, 3=Mature, 4=Fruiting
 */
const PLANT_EMOJI_MAP = {
  // Grass
  '1_1': '🌱', '1_2': '🌿', '1_3': '🌾', '1_4': '🌾',
  // Strawberry
  '2_1': '🌱', '2_2': '🌿', '2_3': '☘️', '2_4': '🍓',
  // Blueberry
  '3_1': '🌱', '3_2': '🌿', '3_3': '☘️', '3_4': '🫐',
  // Apple Tree
  '4_1': '🌱', '4_2': '🌿', '4_3': '🌳', '4_4': '🍎',
  // Mango Tree
  '5_1': '🌱', '5_2': '🌿', '5_3': '🌳', '5_4': '🥭',
  // Carrot
  '6_1': '🌱', '6_2': '🌿', '6_3': '🥬', '6_4': '🥕',
};

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
