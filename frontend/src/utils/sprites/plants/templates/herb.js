/**
 * Herb template — low ground plants (grass, carrot, potato).
 * Stages 2-5 at 32×32 design grid, 3 animation frames for sway.
 */
import { rect, darken, lighten } from '../../helpers.js';

export function drawHerb(ctx, params, stage, frame) {
  const { stem, leaf, leafDark, fruit, fruitAccent } = params;
  const cx = 14;
  const baseY = 28;

  // Offsets for sway animation
  const swayOff = frame === 0 ? 0 : (frame === 1 ? 1 : -1);

  if (stage === 2) {
    rect(ctx, cx + 1 + swayOff, baseY - 8, 2, 8, stem);
    rect(ctx, cx - 1 + swayOff, baseY - 8, 4, 3, leaf);
    rect(ctx, cx + 2 + swayOff, baseY - 7, 4, 3, leaf);
    rect(ctx, cx - 1, baseY, 6, 2, darken(stem, 0.3));
  } else if (stage === 3) {
    rect(ctx, cx + 1 + swayOff, baseY - 14, 2, 14, stem);
    rect(ctx, cx - 3 + swayOff, baseY - 14, 5, 4, leaf);
    rect(ctx, cx + 2 + swayOff, baseY - 12, 5, 4, leaf);
    rect(ctx, cx - 2 + swayOff, baseY - 10, 4, 3, leafDark);
    rect(ctx, cx + 2 + swayOff, baseY - 8, 4, 3, leafDark);
    rect(ctx, cx - 2, baseY, 8, 2, darken(stem, 0.3));
  } else if (stage === 4) {
    rect(ctx, cx + 1 + swayOff, baseY - 18, 2, 18, stem);
    rect(ctx, cx - 4 + swayOff, baseY - 18, 12, 5, leaf);
    rect(ctx, cx - 3 + swayOff, baseY - 21, 10, 4, leaf);
    rect(ctx, cx - 2 + swayOff, baseY - 15, 8, 3, leafDark);
    rect(ctx, cx + swayOff, baseY - 21, 4, 2, lighten(leaf, 0.2));
    rect(ctx, cx - 3, baseY, 10, 2, darken(stem, 0.3));
  } else if (stage === 5) {
    rect(ctx, cx + 1 + swayOff, baseY - 18, 2, 18, stem);
    rect(ctx, cx - 4 + swayOff, baseY - 18, 12, 5, leaf);
    rect(ctx, cx - 3 + swayOff, baseY - 21, 10, 4, leaf);
    rect(ctx, cx - 2 + swayOff, baseY - 15, 8, 3, leafDark);
    // Fruit — larger
    rect(ctx, cx - 3 + swayOff, baseY - 18, 4, 4, fruit);
    rect(ctx, cx + 3 + swayOff, baseY - 17, 4, 4, fruit);
    rect(ctx, cx + swayOff, baseY - 16, 3, 3, fruitAccent || fruit);
    rect(ctx, cx - 3, baseY, 10, 2, darken(stem, 0.3));
  }
}
