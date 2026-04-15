/**
 * Texture generator — atlas-backed with emoji canvas fallback.
 *
 * Consumers call generateEmojiTextures() / generatePlantEmojiTextures() exactly
 * as before. Internally we now build a single atlas canvas per category and slice
 * it, which cuts per-species canvas+texture objects from ~100 → 2 and reduces GPU
 * texture switches. When real pixel-art PNGs land in public/sprites/, the atlas
 * loader in spriteAtlas.js will pick them up automatically.
 */
import { buildFaunaAtlasSync, buildFloraAtlasSync } from './spriteAtlas.js';

/**
 * Generate PixiJS textures for all animal species + special states.
 * Returns { RABBIT: Texture, WOLF: Texture, ..., SLEEPING: Texture, DEAD: Texture, EGG: Texture, PUPA: Texture }
 */
export function generateEmojiTextures() {
  return buildFaunaAtlasSync();
}

/**
 * Generate PixiJS textures for all plant type×stage combinations.
 * Returns { "1_1": Texture, "2_4": Texture, ... }
 */
export function generatePlantEmojiTextures() {
  return buildFloraAtlasSync();
}
