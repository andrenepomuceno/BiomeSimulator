/**
 * Palm template — coconut palm (tall trunk + fronds).
 * Stages 2-5 at 64×64 design grid, 3 animation frames for sway.
 */
import { px, rect, darken, lighten, noise, gradientH, rimLight, ao, speckle } from '../../helpers.js';

export function drawPalm(ctx, params, stage, frame) {
  const { trunk, trunkDark, leaf, leafDark, fruit, fruitAccent } = params;
  const cx = 28;
  const baseY = 60;

  const swayOff = frame === 0 ? 0 : (frame === 1 ? 2 : -2);

  function barkTex(x, y, w, h) {
    speckle(ctx, x, y, w, h, [trunkDark, darken(trunk, 0.12), lighten(trunk, 0.04)], 0.24);
  }

  function frondTex(x, y, w, h) {
    speckle(ctx, x, y, w, h, [leafDark, darken(leaf, 0.10), lighten(leaf, 0.06)], 0.22);
  }

  if (stage === 2) {
    gradientH(ctx, cx + 2, baseY - 20, 4, 20, trunk, trunkDark);
    rect(ctx, cx, baseY - 12, 2, 12, trunkDark);
    barkTex(cx, baseY - 20, 6, 20);
    // Fronds
    rect(ctx, cx - 4 + swayOff, baseY - 24, 6, 4, leaf);
    rect(ctx, cx + 6 + swayOff, baseY - 24, 6, 4, leaf);
    rect(ctx, cx + swayOff, baseY - 26, 8, 4, leaf);
    rect(ctx, cx + 2 + swayOff, baseY - 28, 4, 4, lighten(leaf, 0.15));
    frondTex(cx - 4 + swayOff, baseY - 28, 16, 8);
    rect(ctx, cx - 2, baseY, 12, 4, darken(trunk, 0.3));
  } else if (stage === 3) {
    gradientH(ctx, cx + 2, baseY - 32, 4, 32, trunk, trunkDark);
    rect(ctx, cx, baseY - 20, 2, 20, trunkDark);
    barkTex(cx, baseY - 32, 6, 32);
    // Trunk segments
    rect(ctx, cx, baseY - 24, 8, 2, trunkDark);
    rect(ctx, cx, baseY - 16, 8, 2, trunkDark);
    // Fronds
    rect(ctx, cx - 8 + swayOff, baseY - 36, 10, 4, leaf);
    rect(ctx, cx + 6 + swayOff, baseY - 36, 10, 4, leaf);
    rect(ctx, cx - 6 + swayOff, baseY - 38, 8, 4, leafDark);
    rect(ctx, cx + 6 + swayOff, baseY - 38, 8, 4, leafDark);
    rect(ctx, cx + swayOff, baseY - 40, 8, 4, lighten(leaf, 0.2));
    frondTex(cx - 8 + swayOff, baseY - 40, 24, 8);
    rect(ctx, cx - 4, baseY, 16, 4, darken(trunk, 0.3));
  } else if (stage === 4) {
    gradientH(ctx, cx + 2, baseY - 44, 4, 44, trunk, trunkDark);
    rect(ctx, cx, baseY - 28, 2, 28, trunkDark);
    barkTex(cx, baseY - 44, 6, 44);
    // Trunk segments
    rect(ctx, cx, baseY - 36, 8, 2, trunkDark);
    rect(ctx, cx, baseY - 28, 8, 2, trunkDark);
    rect(ctx, cx, baseY - 20, 8, 2, trunkDark);
    // Fronds — wide drooping
    rect(ctx, cx - 16 + swayOff, baseY - 46, 18, 4, leaf);
    rect(ctx, cx - 14 + swayOff, baseY - 42, 10, 4, leafDark);
    rect(ctx, cx + 6 + swayOff, baseY - 46, 18, 4, leaf);
    rect(ctx, cx + 12 + swayOff, baseY - 42, 10, 4, leafDark);
    // Mid fronds
    rect(ctx, cx - 10 + swayOff, baseY - 50, 12, 4, leaf);
    rect(ctx, cx + 6 + swayOff, baseY - 50, 12, 4, leaf);
    // Crown
    rect(ctx, cx - 2 + swayOff, baseY - 54, 12, 6, leaf);
    rect(ctx, cx + swayOff, baseY - 56, 8, 4, lighten(leaf, 0.2));
    frondTex(cx - 16 + swayOff, baseY - 56, 40, 14);
    rect(ctx, cx - 4, baseY, 16, 4, darken(trunk, 0.3));
  } else if (stage === 5) {
    gradientH(ctx, cx + 2, baseY - 44, 4, 44, trunk, trunkDark);
    rect(ctx, cx, baseY - 28, 2, 28, trunkDark);
    barkTex(cx, baseY - 44, 6, 44);
    rect(ctx, cx, baseY - 36, 8, 2, trunkDark);
    rect(ctx, cx, baseY - 28, 8, 2, trunkDark);
    rect(ctx, cx, baseY - 20, 8, 2, trunkDark);
    // Fronds
    rect(ctx, cx - 16 + swayOff, baseY - 46, 18, 4, leaf);
    rect(ctx, cx - 14 + swayOff, baseY - 42, 10, 4, leafDark);
    rect(ctx, cx + 6 + swayOff, baseY - 46, 18, 4, leaf);
    rect(ctx, cx + 12 + swayOff, baseY - 42, 10, 4, leafDark);
    rect(ctx, cx - 10 + swayOff, baseY - 50, 12, 4, leaf);
    rect(ctx, cx + 6 + swayOff, baseY - 50, 12, 4, leaf);
    rect(ctx, cx - 2 + swayOff, baseY - 54, 12, 6, leaf);
    frondTex(cx - 16 + swayOff, baseY - 56, 40, 14);
    // Coconuts
    rect(ctx, cx - 2 + swayOff, baseY - 44, 6, 6, fruit);
    rect(ctx, cx + 4 + swayOff, baseY - 44, 6, 6, fruit);
    rect(ctx, cx + swayOff, baseY - 42, 4, 4, fruitAccent || lighten(fruit, 0.2));
    px(ctx, cx - 1 + swayOff, baseY - 43, lighten(fruit, 0.2));
    rect(ctx, cx - 4, baseY, 16, 4, darken(trunk, 0.3));
  }
}
