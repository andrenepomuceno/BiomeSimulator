/**
 * Tree template — round-canopy trees (apple, mango, oak, olive).
 * Stages 2-5 at 32×32 design grid, 3 animation frames for sway.
 */
import { rect, darken, lighten } from '../../helpers.js';

export function drawTree(ctx, params, stage, frame) {
  const { trunk, trunkDark, leaf, leafDark, fruit, fruitAccent } = params;
  const cx = 14;
  const baseY = 28;

  const swayOff = frame === 0 ? 0 : (frame === 1 ? 1 : -1);

  if (stage === 2) {
    // Young sprout: thin trunk + small canopy
    rect(ctx, cx + 1, baseY - 10, 2, 10, trunk);
    rect(ctx, cx, baseY - 10, 1, 4, trunkDark);
    // Small canopy
    rect(ctx, cx - 1 + swayOff, baseY - 14, 6, 5, leaf);
    rect(ctx, cx + swayOff, baseY - 15, 4, 2, lighten(leaf, 0.15));
    rect(ctx, cx + swayOff, baseY - 10, 4, 2, leafDark);
    // Ground
    rect(ctx, cx - 1, baseY, 6, 2, darken(trunk, 0.3));
  } else if (stage === 3) {
    // Adult sprout: medium tree
    rect(ctx, cx + 1, baseY - 14, 3, 14, trunk);
    rect(ctx, cx, baseY - 10, 1, 8, trunkDark);
    // Medium canopy
    rect(ctx, cx - 4 + swayOff, baseY - 18, 12, 6, leaf);
    rect(ctx, cx - 3 + swayOff, baseY - 20, 10, 3, leaf);
    rect(ctx, cx - 2 + swayOff, baseY - 22, 8, 3, leaf);
    // Depth
    rect(ctx, cx - 3 + swayOff, baseY - 14, 10, 2, leafDark);
    rect(ctx, cx - 1 + swayOff, baseY - 22, 6, 2, lighten(leaf, 0.2));
    // Ground
    rect(ctx, cx - 2, baseY, 8, 2, darken(trunk, 0.3));
  } else if (stage === 4) {
    // Adult: full tree
    rect(ctx, cx, baseY - 16, 4, 16, trunk);
    rect(ctx, cx - 1, baseY - 10, 2, 8, trunkDark);
    // Full canopy
    rect(ctx, cx - 6 + swayOff, baseY - 20, 16, 8, leaf);
    rect(ctx, cx - 5 + swayOff, baseY - 24, 14, 5, leaf);
    rect(ctx, cx - 3 + swayOff, baseY - 26, 10, 3, leaf);
    // Depth
    rect(ctx, cx - 5 + swayOff, baseY - 14, 14, 2, leafDark);
    rect(ctx, cx - 2 + swayOff, baseY - 26, 8, 2, lighten(leaf, 0.2));
    // Ground
    rect(ctx, cx - 3, baseY, 10, 2, darken(trunk, 0.3));
  } else if (stage === 5) {
    // Fruit: full tree with hanging fruit
    rect(ctx, cx, baseY - 16, 4, 16, trunk);
    rect(ctx, cx - 1, baseY - 10, 2, 8, trunkDark);
    rect(ctx, cx - 6 + swayOff, baseY - 20, 16, 8, leaf);
    rect(ctx, cx - 5 + swayOff, baseY - 24, 14, 5, leaf);
    rect(ctx, cx - 3 + swayOff, baseY - 26, 10, 3, leaf);
    rect(ctx, cx - 5 + swayOff, baseY - 14, 14, 2, leafDark);
    // Fruit
    rect(ctx, cx - 4 + swayOff, baseY - 18, 3, 3, fruit);
    rect(ctx, cx + 4 + swayOff, baseY - 20, 3, 3, fruit);
    rect(ctx, cx + swayOff, baseY - 16, 3, 3, fruit);
    rect(ctx, cx - 3 + swayOff, baseY - 22, 2, 2, fruitAccent || fruit);
    rect(ctx, cx + 5 + swayOff, baseY - 16, 2, 2, fruitAccent || fruit);
    // Ground
    rect(ctx, cx - 3, baseY, 10, 2, darken(trunk, 0.3));
  }
}
