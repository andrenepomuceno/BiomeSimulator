/**
 * Herb template — low ground plants (grass, carrot, potato).
 * Stages 2-5 at 32×32 design grid, 3 animation frames for sway.
 */
import { rect, darken, lighten } from '../../helpers.js';

export function drawHerb(ctx, params, stage, frame) {
  const { stem, leaf, leafDark, fruit, fruitAccent } = params;
  const cx = 14;
  const baseY = 24;

  // Offsets for sway animation
  const swayOff = frame === 0 ? 0 : (frame === 1 ? 1 : -1);

  if (stage === 2) {
    // Young sprout: small stem + 2 tiny leaves
    rect(ctx, cx + 1 + swayOff, baseY - 6, 2, 6, stem);
    rect(ctx, cx - 1 + swayOff, baseY - 6, 3, 2, leaf);
    rect(ctx, cx + 2 + swayOff, baseY - 5, 3, 2, leaf);
    // Ground
    rect(ctx, cx - 1, baseY, 6, 2, darken(stem, 0.3));
  } else if (stage === 3) {
    // Adult sprout: taller, more leaves
    rect(ctx, cx + 1 + swayOff, baseY - 10, 2, 10, stem);
    rect(ctx, cx - 2 + swayOff, baseY - 10, 4, 3, leaf);
    rect(ctx, cx + 2 + swayOff, baseY - 9, 4, 3, leaf);
    rect(ctx, cx - 1 + swayOff, baseY - 7, 3, 2, leafDark);
    rect(ctx, cx + 2 + swayOff, baseY - 6, 3, 2, leafDark);
    // Ground tuft
    rect(ctx, cx - 2, baseY, 8, 2, darken(stem, 0.3));
  } else if (stage === 4) {
    // Adult: full growth, bushy top
    rect(ctx, cx + 1 + swayOff, baseY - 14, 2, 14, stem);
    // Leaf cluster
    rect(ctx, cx - 3 + swayOff, baseY - 14, 10, 4, leaf);
    rect(ctx, cx - 2 + swayOff, baseY - 16, 8, 3, leaf);
    rect(ctx, cx - 1 + swayOff, baseY - 12, 6, 3, leafDark);
    // Highlight
    rect(ctx, cx + swayOff, baseY - 16, 4, 2, lighten(leaf, 0.2));
    // Ground
    rect(ctx, cx - 3, baseY, 10, 2, darken(stem, 0.3));
  } else if (stage === 5) {
    // Fruit: same as adult but with fruit items
    rect(ctx, cx + 1 + swayOff, baseY - 14, 2, 14, stem);
    rect(ctx, cx - 3 + swayOff, baseY - 14, 10, 4, leaf);
    rect(ctx, cx - 2 + swayOff, baseY - 16, 8, 3, leaf);
    rect(ctx, cx - 1 + swayOff, baseY - 12, 6, 3, leafDark);
    // Fruit items
    rect(ctx, cx - 2 + swayOff, baseY - 14, 3, 3, fruit);
    rect(ctx, cx + 3 + swayOff, baseY - 13, 3, 3, fruit);
    rect(ctx, cx + swayOff, baseY - 12, 2, 2, fruitAccent || fruit);
    // Ground
    rect(ctx, cx - 3, baseY, 10, 2, darken(stem, 0.3));
  }
}
