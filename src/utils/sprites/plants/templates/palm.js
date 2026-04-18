/**
 * Palm template — coconut palm (tall trunk + fronds).
 * Stages 2-5 at 64×64 design grid, 3 animation frames for sway.
 */
import { rect, darken, lighten, speckle } from '../../helpers.js';
import { drawBarkTexture, drawGroundBase, drawPalmFrond, drawPalmTrunk, drawFruit } from '../bodyParts.js';

export function drawPalm(ctx, params, stage, frame) {
  const { trunk, trunkDark, leaf, leafDark, fruit, fruitAccent } = params;
  const cx = 28;
  const baseY = 60;

  const swayOff = frame === 0 ? 0 : (frame === 1 ? 2 : -2);

  function frondTex(x, y, w, h) {
    speckle(ctx, x, y, w, h, [leafDark, darken(leaf, 0.10), lighten(leaf, 0.06)], 0.22);
  }

  if (stage === 2) {
    drawPalmTrunk(ctx, cx, baseY, 20, trunk, trunkDark, 12, []);
    // Fronds
    drawPalmFrond(ctx, cx + 4 + swayOff, baseY - 24, 8, -1, 2, leaf, leafDark);
    drawPalmFrond(ctx, cx + 4 + swayOff, baseY - 24, 8, 1, 2, leaf, leafDark);
    drawPalmFrond(ctx, cx + 4 + swayOff, baseY - 24, 6, 0, -2, leaf, leafDark);
    rect(ctx, cx + 2 + swayOff, baseY - 28, 4, 4, lighten(leaf, 0.15));
    frondTex(cx - 4 + swayOff, baseY - 28, 16, 8);
    drawGroundBase(ctx, cx - 2, baseY, 12, trunk);
  } else if (stage === 3) {
    drawPalmTrunk(ctx, cx, baseY, 32, trunk, trunkDark, 20, [24, 16]);
    // Fronds
    drawPalmFrond(ctx, cx + 4 + swayOff, baseY - 36, 12, -1, 4, leaf, leafDark);
    drawPalmFrond(ctx, cx + 4 + swayOff, baseY - 36, 12, 1, 4, leaf, leafDark);
    drawPalmFrond(ctx, cx + 4 + swayOff, baseY - 37, 8, -1, -2, leaf, leafDark);
    drawPalmFrond(ctx, cx + 4 + swayOff, baseY - 37, 8, 1, -2, leaf, leafDark);
    drawPalmFrond(ctx, cx + 4 + swayOff, baseY - 37, 7, 0, -4, leaf, leafDark);
    frondTex(cx - 8 + swayOff, baseY - 40, 24, 8);
    drawGroundBase(ctx, cx - 4, baseY, 16, trunk);
  } else if (stage === 4) {
    drawPalmTrunk(ctx, cx, baseY, 44, trunk, trunkDark, 28, [36, 28, 20]);
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
    drawPalmTrunk(ctx, cx, baseY, 44, trunk, trunkDark, 28, [36, 28, 20]);
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
