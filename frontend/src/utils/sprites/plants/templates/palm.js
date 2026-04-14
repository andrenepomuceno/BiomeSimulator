/**
 * Palm template — coconut palm (tall trunk + fronds).
 * Stages 2-5 at 32×32 design grid, 3 animation frames for sway.
 */
import { rect, darken, lighten } from '../../helpers.js';

export function drawPalm(ctx, params, stage, frame) {
  const { trunk, trunkDark, leaf, leafDark, fruit, fruitAccent } = params;
  const cx = 14;
  const baseY = 30;

  const swayOff = frame === 0 ? 0 : (frame === 1 ? 1 : -1);

  if (stage === 2) {
    // Young sprout: thin trunk + 2 small fronds
    rect(ctx, cx + 1, baseY - 10, 2, 10, trunk);
    rect(ctx, cx, baseY - 6, 1, 6, trunkDark);
    // Fronds
    rect(ctx, cx - 2 + swayOff, baseY - 12, 3, 2, leaf);
    rect(ctx, cx + 3 + swayOff, baseY - 12, 3, 2, leaf);
    rect(ctx, cx + swayOff, baseY - 13, 4, 2, leaf);
    rect(ctx, cx + 1 + swayOff, baseY - 14, 2, 2, lighten(leaf, 0.15));
    // Ground
    rect(ctx, cx - 1, baseY, 6, 2, darken(trunk, 0.3));
  } else if (stage === 3) {
    // Adult sprout: taller with more fronds
    rect(ctx, cx + 1, baseY - 16, 2, 16, trunk);
    rect(ctx, cx, baseY - 10, 1, 10, trunkDark);
    // Trunk segments
    rect(ctx, cx, baseY - 12, 4, 1, trunkDark);
    rect(ctx, cx, baseY - 8, 4, 1, trunkDark);
    // Fronds (3 directions)
    rect(ctx, cx - 4 + swayOff, baseY - 18, 5, 2, leaf);
    rect(ctx, cx + 3 + swayOff, baseY - 18, 5, 2, leaf);
    rect(ctx, cx - 3 + swayOff, baseY - 19, 4, 2, leafDark);
    rect(ctx, cx + 3 + swayOff, baseY - 19, 4, 2, leafDark);
    rect(ctx, cx + swayOff, baseY - 20, 4, 2, lighten(leaf, 0.2));
    // Ground
    rect(ctx, cx - 2, baseY, 8, 2, darken(trunk, 0.3));
  } else if (stage === 4) {
    // Adult: tall palm
    rect(ctx, cx + 1, baseY - 22, 2, 22, trunk);
    rect(ctx, cx, baseY - 14, 1, 14, trunkDark);
    // Trunk segments
    rect(ctx, cx, baseY - 18, 4, 1, trunkDark);
    rect(ctx, cx, baseY - 14, 4, 1, trunkDark);
    rect(ctx, cx, baseY - 10, 4, 1, trunkDark);
    // Fronds spreading out
    rect(ctx, cx - 6 + swayOff, baseY - 24, 7, 2, leaf);
    rect(ctx, cx + 3 + swayOff, baseY - 24, 7, 2, leaf);
    rect(ctx, cx - 5 + swayOff, baseY - 25, 5, 2, leafDark);
    rect(ctx, cx + 4 + swayOff, baseY - 25, 5, 2, leafDark);
    rect(ctx, cx - 4 + swayOff, baseY - 22, 4, 2, leaf);
    rect(ctx, cx + 4 + swayOff, baseY - 22, 4, 2, leaf);
    // Top fronds
    rect(ctx, cx + swayOff, baseY - 27, 4, 3, leaf);
    rect(ctx, cx + 1 + swayOff, baseY - 28, 2, 2, lighten(leaf, 0.2));
    // Ground
    rect(ctx, cx - 2, baseY, 8, 2, darken(trunk, 0.3));
  } else if (stage === 5) {
    // Fruit: palm with coconuts
    rect(ctx, cx + 1, baseY - 22, 2, 22, trunk);
    rect(ctx, cx, baseY - 14, 1, 14, trunkDark);
    rect(ctx, cx, baseY - 18, 4, 1, trunkDark);
    rect(ctx, cx, baseY - 14, 4, 1, trunkDark);
    rect(ctx, cx, baseY - 10, 4, 1, trunkDark);
    // Fronds
    rect(ctx, cx - 6 + swayOff, baseY - 24, 7, 2, leaf);
    rect(ctx, cx + 3 + swayOff, baseY - 24, 7, 2, leaf);
    rect(ctx, cx - 5 + swayOff, baseY - 25, 5, 2, leafDark);
    rect(ctx, cx + 4 + swayOff, baseY - 25, 5, 2, leafDark);
    rect(ctx, cx + swayOff, baseY - 27, 4, 3, leaf);
    // Coconuts hanging below fronds
    rect(ctx, cx - 1 + swayOff, baseY - 22, 3, 3, fruit);
    rect(ctx, cx + 2 + swayOff, baseY - 22, 3, 3, fruit);
    rect(ctx, cx + swayOff, baseY - 21, 2, 2, fruitAccent || lighten(fruit, 0.2));
    // Ground
    rect(ctx, cx - 2, baseY, 8, 2, darken(trunk, 0.3));
  }
}
