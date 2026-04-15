/**
 * Herb template — low ground plants (grass, carrot, potato).
 * Stages 2-5 at 64×64 design grid, 3 animation frames for sway.
 */
import { px, rect, darken, lighten, noise, rimLight, ao, speckle } from '../../helpers.js';

export function drawHerb(ctx, params, stage, frame) {
  const { stem, leaf, leafDark, fruit, fruitAccent } = params;
  const cx = 28;
  const baseY = 56;

  const swayOff = frame === 0 ? 0 : (frame === 1 ? 2 : -2);

  function leafTex(x, y, w, h) {
    speckle(ctx, x, y, w, h, [leafDark, darken(leaf, 0.10), lighten(leaf, 0.06)], 0.22);
  }

  if (stage === 2) {
    rect(ctx, cx + 2 + swayOff, baseY - 16, 4, 16, stem);
    rect(ctx, cx - 2 + swayOff, baseY - 16, 8, 6, leaf);
    rect(ctx, cx + 4 + swayOff, baseY - 14, 8, 6, leaf);
    leafTex(cx - 2 + swayOff, baseY - 16, 14, 6);
    rect(ctx, cx - 2, baseY, 12, 4, darken(stem, 0.3));
  } else if (stage === 3) {
    rect(ctx, cx + 2 + swayOff, baseY - 28, 4, 28, stem);
    rect(ctx, cx - 6 + swayOff, baseY - 28, 10, 8, leaf);
    rect(ctx, cx + 4 + swayOff, baseY - 24, 10, 8, leaf);
    rect(ctx, cx - 4 + swayOff, baseY - 20, 8, 6, leafDark);
    rect(ctx, cx + 4 + swayOff, baseY - 16, 8, 6, leafDark);
    leafTex(cx - 6 + swayOff, baseY - 28, 20, 18);
    rect(ctx, cx - 4, baseY, 16, 4, darken(stem, 0.3));
  } else if (stage === 4) {
    rect(ctx, cx + 2 + swayOff, baseY - 36, 4, 36, stem);
    rect(ctx, cx - 8 + swayOff, baseY - 36, 24, 10, leaf);
    rect(ctx, cx - 6 + swayOff, baseY - 42, 20, 8, leaf);
    rect(ctx, cx - 4 + swayOff, baseY - 30, 16, 6, leafDark);
    rect(ctx, cx + swayOff, baseY - 42, 8, 4, lighten(leaf, 0.2));
    leafTex(cx - 8 + swayOff, baseY - 42, 24, 18);
    rect(ctx, cx - 6, baseY, 20, 4, darken(stem, 0.3));
  } else if (stage === 5) {
    rect(ctx, cx + 2 + swayOff, baseY - 36, 4, 36, stem);
    rect(ctx, cx - 8 + swayOff, baseY - 36, 24, 10, leaf);
    rect(ctx, cx - 6 + swayOff, baseY - 42, 20, 8, leaf);
    rect(ctx, cx - 4 + swayOff, baseY - 30, 16, 6, leafDark);
    leafTex(cx - 8 + swayOff, baseY - 42, 24, 18);
    // Fruit
    rect(ctx, cx - 6 + swayOff, baseY - 36, 8, 8, fruit);
    rect(ctx, cx + 6 + swayOff, baseY - 34, 8, 8, fruit);
    rect(ctx, cx + swayOff, baseY - 32, 6, 6, fruitAccent || fruit);
    // Fruit highlight
    px(ctx, cx - 5 + swayOff, baseY - 35, lighten(fruit, 0.2));
    px(ctx, cx + 7 + swayOff, baseY - 33, lighten(fruit, 0.2));
    rect(ctx, cx - 6, baseY, 20, 4, darken(stem, 0.3));
  }
}
