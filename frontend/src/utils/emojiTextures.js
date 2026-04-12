/**
 * Emoji-based texture generator — renders emoji onto offscreen canvas,
 * converts to PixiJS textures for animal sprites.
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

/**
 * Generate PixiJS textures for all animal species + special states.
 * Returns { RABBIT: Texture, WOLF: Texture, ..., SLEEPING: Texture, DEAD: Texture }
 */
export function generateEmojiTextures() {
  const textures = {};

  for (const [species, info] of Object.entries(SPECIES_INFO)) {
    const canvas = emojiToCanvas(info.emoji);
    textures[species] = PIXI.Texture.from(canvas, {
      scaleMode: PIXI.SCALE_MODES.LINEAR,
    });
  }

  // Special state textures
  textures.SLEEPING = PIXI.Texture.from(emojiToCanvas('💤'), {
    scaleMode: PIXI.SCALE_MODES.LINEAR,
  });
  textures.DEAD = PIXI.Texture.from(emojiToCanvas('💀'), {
    scaleMode: PIXI.SCALE_MODES.LINEAR,
  });

  return textures;
}
