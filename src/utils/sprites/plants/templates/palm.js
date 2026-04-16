/**
 * Palm template — coconut palm (tall trunk + fronds).
 * Stages 2-5 at 64×64 design grid, 3 animation frames for sway.
 */
import { px, rect, darken, lighten, noise, gradientH, rimLight, ao, speckle } from '../../helpers.js';
import { drawBarkTexture, drawGroundBase, drawPalmFrond, drawFruit } from '../bodyParts.js';

export function drawPalm(ctx, params, stage, frame) {
  const { trunk, trunkDark, leaf, leafDark, fruit, fruitAccent } = params;
  const cx = 28;
  const baseY = 60;

  const swayOff = frame === 0 ? 0 : (frame === 1 ? 2 : -2);

  function barkTex(x, y, w, h) {
    drawBarkTexture(ctx, x, y, w, h, trunk, trunkDark);
  }

  function frondTex(x, y, w, h) {
    speckle(ctx, x, y, w, h, [leafDark, darken(leaf, 0.10), lighten(leaf, 0.06)], 0.22);
  }

  if (stage === 2) {
    gradientH(ctx, cx + 2, baseY - 20, 4, 20, trunk, trunkDark);
    rect(ctx, cx, baseY - 12, 2, 12, trunkDark);
    barkTex(cx, baseY - 20, 6, 20);
    // Fronds
    drawPalmFrond(ctx, cx + 4 + swayOff, baseY - 24, 8, -1, 2, leaf, leafDark);
    drawPalmFrond(ctx, cx + 4 + swayOff, baseY - 24, 8, 1, 2, leaf, leafDark);
    drawPalmFrond(ctx, cx + 4 + swayOff, baseY - 24, 6, 0, -2, leaf, leafDark);
    rect(ctx, cx + 2 + swayOff, baseY - 28, 4, 4, lighten(leaf, 0.15));
    frondTex(cx - 4 + swayOff, baseY - 28, 16, 8);
    drawGroundBase(ctx, cx - 2, baseY, 12, trunk);
  } else if (stage === 3) {
    gradientH(ctx, cx + 2, baseY - 32, 4, 32, trunk, trunkDark);
    rect(ctx, cx, baseY - 20, 2, 20, trunkDark);
    barkTex(cx, baseY - 32, 6, 32);
    // Trunk segments
    rect(ctx, cx, baseY - 24, 8, 2, trunkDark);
    rect(ctx, cx, baseY - 16, 8, 2, trunkDark);
    // Fronds
    drawPalmFrond(ctx, cx + 4 + swayOff, baseY - 36, 12, -1, 4, leaf, leafDark);
    drawPalmFrond(ctx, cx + 4 + swayOff, baseY - 36, 12, 1, 4, leaf, leafDark);
    drawPalmFrond(ctx, cx + 4 + swayOff, baseY - 37, 8, -1, -2, leaf, leafDark);
    drawPalmFrond(ctx, cx + 4 + swayOff, baseY - 37, 8, 1, -2, leaf, leafDark);
    drawPalmFrond(ctx, cx + 4 + swayOff, baseY - 37, 7, 0, -4, leaf, leafDark);
    frondTex(cx - 8 + swayOff, baseY - 40, 24, 8);
    drawGroundBase(ctx, cx - 4, baseY, 16, trunk);
  } else if (stage === 4) {
    gradientH(ctx, cx + 2, baseY - 44, 4, 44, trunk, trunkDark);
    rect(ctx, cx, baseY - 28, 2, 28, trunkDark);
    barkTex(cx, baseY - 44, 6, 44);
    // Trunk segments
    rect(ctx, cx, baseY - 36, 8, 2, trunkDark);
    rect(ctx, cx, baseY - 28, 8, 2, trunkDark);
    rect(ctx, cx, baseY - 20, 8, 2, trunkDark);
    // Fronds — wide drooping
    drawPalmFrond(ctx, cx + 4 + swayOff, baseY - 48, 20, -1, 8, leaf, leafDark);
    drawPalmFrond(ctx, cx + 4 + swayOff, baseY - 48, 20, 1, 8, leaf, leafDark);
    drawPalmFrond(ctx, cx + 4 + swayOff, baseY - 50, 14, -1, 2, leaf, leafDark);
    drawPalmFrond(ctx, cx + 4 + swayOff, baseY - 50, 14, 1, 2, leaf, leafDark);
    drawPalmFrond(ctx, cx + 4 + swayOff, baseY - 52, 10, 0, -4, leaf, leafDark);
    // Crown
    rect(ctx, cx - 2 + swayOff, baseY - 54, 12, 6, leaf);
    rect(ctx, cx + swayOff, baseY - 56, 8, 4, lighten(leaf, 0.2));
    frondTex(cx - 16 + swayOff, baseY - 56, 40, 14);
    drawGroundBase(ctx, cx - 4, baseY, 16, trunk);
  } else if (stage === 5) {
    gradientH(ctx, cx + 2, baseY - 44, 4, 44, trunk, trunkDark);
    rect(ctx, cx, baseY - 28, 2, 28, trunkDark);
    barkTex(cx, baseY - 44, 6, 44);
    rect(ctx, cx, baseY - 36, 8, 2, trunkDark);
    rect(ctx, cx, baseY - 28, 8, 2, trunkDark);
    rect(ctx, cx, baseY - 20, 8, 2, trunkDark);
    // Fronds
    drawPalmFrond(ctx, cx + 4 + swayOff, baseY - 48, 20, -1, 8, leaf, leafDark);
    drawPalmFrond(ctx, cx + 4 + swayOff, baseY - 48, 20, 1, 8, leaf, leafDark);
    drawPalmFrond(ctx, cx + 4 + swayOff, baseY - 50, 14, -1, 2, leaf, leafDark);
    drawPalmFrond(ctx, cx + 4 + swayOff, baseY - 50, 14, 1, 2, leaf, leafDark);
    drawPalmFrond(ctx, cx + 4 + swayOff, baseY - 52, 10, 0, -4, leaf, leafDark);
    rect(ctx, cx - 2 + swayOff, baseY - 54, 12, 6, leaf);
    frondTex(cx - 16 + swayOff, baseY - 56, 40, 14);
    // Coconuts
    drawFruit(ctx, cx - 2 + swayOff, baseY - 45, 6, fruit, fruitAccent);
    drawFruit(ctx, cx + 4 + swayOff, baseY - 45, 6, fruit, fruitAccent);
    drawFruit(ctx, cx + swayOff, baseY - 43, 5, fruitAccent || fruit, lighten(fruit, 0.2));
    drawGroundBase(ctx, cx - 4, baseY, 16, trunk);
  }
}
