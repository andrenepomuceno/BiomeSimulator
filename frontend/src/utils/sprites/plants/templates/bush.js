/**
 * Bush template — bushy plants (strawberry, blueberry, tomato, chili pepper).
 * Stages 2-5 at 32×32 design grid, 3 animation frames for sway.
 */
import { rect, darken, lighten } from '../../helpers.js';

export function drawBush(ctx, params, stage, frame) {
  const { stem, leaf, leafDark, fruit, fruitAccent } = params;
  const cx = 14;
  const baseY = 26;

  const swayOff = frame === 0 ? 0 : (frame === 1 ? 1 : -1);

  if (stage === 2) {
    // Young sprout
    rect(ctx, cx + 1 + swayOff, baseY - 6, 2, 6, stem);
    rect(ctx, cx - 1 + swayOff, baseY - 6, 3, 3, leaf);
    rect(ctx, cx + 2 + swayOff, baseY - 5, 3, 3, leaf);
    rect(ctx, cx, baseY, 4, 2, darken(stem, 0.3));
  } else if (stage === 3) {
    // Adult sprout: wider bush shape
    rect(ctx, cx + 1 + swayOff, baseY - 8, 2, 8, stem);
    // Main bush body
    rect(ctx, cx - 3 + swayOff, baseY - 10, 10, 6, leaf);
    rect(ctx, cx - 2 + swayOff, baseY - 12, 8, 3, leaf);
    // Depth shading
    rect(ctx, cx - 2 + swayOff, baseY - 6, 8, 2, leafDark);
    rect(ctx, cx - 1 + swayOff, baseY - 12, 4, 2, lighten(leaf, 0.15));
    // Ground
    rect(ctx, cx - 3, baseY, 10, 2, darken(stem, 0.3));
  } else if (stage === 4) {
    // Adult: full rounded bush
    rect(ctx, cx + 1 + swayOff, baseY - 8, 2, 8, stem);
    // Bush canopy
    rect(ctx, cx - 4 + swayOff, baseY - 12, 12, 8, leaf);
    rect(ctx, cx - 3 + swayOff, baseY - 14, 10, 3, leaf);
    rect(ctx, cx - 2 + swayOff, baseY - 16, 8, 3, leaf);
    // Depth
    rect(ctx, cx - 3 + swayOff, baseY - 6, 10, 2, leafDark);
    rect(ctx, cx - 1 + swayOff, baseY - 16, 6, 2, lighten(leaf, 0.2));
    // Ground
    rect(ctx, cx - 4, baseY, 12, 2, darken(stem, 0.3));
  } else if (stage === 5) {
    // Fruit: bush with berries/fruits
    rect(ctx, cx + 1 + swayOff, baseY - 8, 2, 8, stem);
    rect(ctx, cx - 4 + swayOff, baseY - 12, 12, 8, leaf);
    rect(ctx, cx - 3 + swayOff, baseY - 14, 10, 3, leaf);
    rect(ctx, cx - 2 + swayOff, baseY - 16, 8, 3, leaf);
    rect(ctx, cx - 3 + swayOff, baseY - 6, 10, 2, leafDark);
    // Fruit dots
    rect(ctx, cx - 3 + swayOff, baseY - 12, 3, 3, fruit);
    rect(ctx, cx + 3 + swayOff, baseY - 14, 3, 3, fruit);
    rect(ctx, cx + swayOff, baseY - 10, 3, 3, fruit);
    rect(ctx, cx - 2 + swayOff, baseY - 8, 2, 2, fruitAccent || fruit);
    rect(ctx, cx + 4 + swayOff, baseY - 10, 2, 2, fruitAccent || fruit);
    // Ground
    rect(ctx, cx - 4, baseY, 12, 2, darken(stem, 0.3));
  }
}
