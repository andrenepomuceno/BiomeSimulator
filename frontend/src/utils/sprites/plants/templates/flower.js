/**
 * Flower template — sunflower (tall stem + flower head).
 * Stages 2-5 at 32×32 design grid, 3 animation frames for sway.
 */
import { rect, darken, lighten } from '../../helpers.js';

export function drawFlower(ctx, params, stage, frame) {
  const { stem, leaf, leafDark, petal, petalDark, center, fruit } = params;
  const cx = 14;
  const baseY = 28;

  const swayOff = frame === 0 ? 0 : (frame === 1 ? 1 : -1);

  if (stage === 2) {
    // Young sprout: short stem + 2 leaves
    rect(ctx, cx + 1 + swayOff, baseY - 8, 2, 8, stem);
    rect(ctx, cx - 1 + swayOff, baseY - 6, 3, 2, leaf);
    rect(ctx, cx + 2 + swayOff, baseY - 7, 3, 2, leaf);
    // Bud at top
    rect(ctx, cx + swayOff, baseY - 10, 4, 3, leaf);
    rect(ctx, cx + 1 + swayOff, baseY - 10, 2, 2, lighten(leaf, 0.15));
    // Ground
    rect(ctx, cx - 1, baseY, 6, 2, darken(stem, 0.3));
  } else if (stage === 3) {
    // Adult sprout: taller, opening bud
    rect(ctx, cx + 1 + swayOff, baseY - 14, 2, 14, stem);
    // Leaves on stem
    rect(ctx, cx - 2 + swayOff, baseY - 10, 4, 2, leaf);
    rect(ctx, cx + 2 + swayOff, baseY - 8, 4, 2, leaf);
    rect(ctx, cx - 1 + swayOff, baseY - 12, 3, 2, leafDark);
    // Opening flower bud
    rect(ctx, cx - 1 + swayOff, baseY - 18, 6, 5, petal);
    rect(ctx, cx + swayOff, baseY - 19, 4, 2, petal);
    rect(ctx, cx + swayOff, baseY - 16, 4, 3, center);
    // Ground
    rect(ctx, cx - 2, baseY, 8, 2, darken(stem, 0.3));
  } else if (stage === 4) {
    // Adult: full flower
    rect(ctx, cx + 1 + swayOff, baseY - 16, 2, 16, stem);
    rect(ctx, cx - 2 + swayOff, baseY - 12, 4, 2, leaf);
    rect(ctx, cx + 2 + swayOff, baseY - 10, 4, 2, leaf);
    // Flower head — petals around center
    rect(ctx, cx - 3 + swayOff, baseY - 22, 10, 8, petal);
    rect(ctx, cx - 2 + swayOff, baseY - 24, 8, 2, petal);
    rect(ctx, cx - 2 + swayOff, baseY - 16, 8, 2, petalDark || darken(petal, 0.15));
    // Center disc
    rect(ctx, cx - 1 + swayOff, baseY - 20, 6, 4, center);
    rect(ctx, cx + swayOff, baseY - 20, 4, 2, lighten(center, 0.1));
    // Ground
    rect(ctx, cx - 2, baseY, 8, 2, darken(stem, 0.3));
  } else if (stage === 5) {
    // Fruit: flower with seeds visible in center
    rect(ctx, cx + 1 + swayOff, baseY - 16, 2, 16, stem);
    rect(ctx, cx - 2 + swayOff, baseY - 12, 4, 2, leaf);
    rect(ctx, cx + 2 + swayOff, baseY - 10, 4, 2, leaf);
    // Flower petals (slightly droopy)
    rect(ctx, cx - 3 + swayOff, baseY - 20, 10, 7, petal);
    rect(ctx, cx - 2 + swayOff, baseY - 22, 8, 3, petal);
    rect(ctx, cx - 2 + swayOff, baseY - 14, 8, 2, petalDark || darken(petal, 0.15));
    // Large seed head
    rect(ctx, cx - 2 + swayOff, baseY - 19, 8, 5, center);
    rect(ctx, cx - 1 + swayOff, baseY - 18, 6, 3, darken(center, 0.15));
    // Seed dots
    rect(ctx, cx + swayOff, baseY - 18, 2, 2, fruit || lighten(center, 0.2));
    rect(ctx, cx + 2 + swayOff, baseY - 17, 2, 2, fruit || lighten(center, 0.2));
    // Ground
    rect(ctx, cx - 2, baseY, 8, 2, darken(stem, 0.3));
  }
}
