/**
 * Mushroom template — mushroom (cap + stem).
 * Stages 2-5 at 32×32 design grid, 3 frames (mushrooms are rigid, frames are identical).
 */
import { rect, darken, lighten } from '../../helpers.js';

export function drawMushroom(ctx, params, stage, frame) {
  const { stem, stemDark, cap, capDark, spots, fruit } = params;
  const cx = 14;
  const baseY = 28;

  // Mushrooms don't sway, but frames can show slight cap wobble
  const wobble = frame === 1 ? 1 : (frame === 2 ? -1 : 0);

  if (stage === 2) {
    // Young: tiny mushroom
    rect(ctx, cx + 1, baseY - 4, 2, 4, stem);
    rect(ctx, cx, baseY - 6, 4, 3, cap);
    rect(ctx, cx + 1, baseY - 6, 2, 1, lighten(cap, 0.2));
    // Ground
    rect(ctx, cx - 1, baseY, 6, 2, darken(stem, 0.3));
  } else if (stage === 3) {
    // Adult sprout: medium mushroom
    rect(ctx, cx + 1, baseY - 8, 3, 8, stem);
    rect(ctx, cx, baseY - 6, 1, 4, stemDark);
    // Cap
    rect(ctx, cx - 2 + wobble, baseY - 12, 8, 5, cap);
    rect(ctx, cx - 1 + wobble, baseY - 14, 6, 3, cap);
    // Shading
    rect(ctx, cx - 1 + wobble, baseY - 8, 6, 2, capDark);
    rect(ctx, cx + wobble, baseY - 14, 4, 2, lighten(cap, 0.2));
    // Spots
    if (spots) {
      rect(ctx, cx + wobble, baseY - 12, 2, 2, spots);
      rect(ctx, cx + 3 + wobble, baseY - 11, 2, 2, spots);
    }
    // Ground
    rect(ctx, cx - 2, baseY, 8, 2, darken(stem, 0.3));
  } else if (stage === 4) {
    // Adult: full mushroom
    rect(ctx, cx + 1, baseY - 10, 3, 10, stem);
    rect(ctx, cx, baseY - 6, 1, 6, stemDark);
    // Large cap
    rect(ctx, cx - 4 + wobble, baseY - 16, 12, 7, cap);
    rect(ctx, cx - 3 + wobble, baseY - 18, 10, 3, cap);
    // Shading
    rect(ctx, cx - 3 + wobble, baseY - 10, 10, 2, capDark);
    rect(ctx, cx - 2 + wobble, baseY - 18, 8, 2, lighten(cap, 0.2));
    // Spots
    if (spots) {
      rect(ctx, cx - 2 + wobble, baseY - 16, 2, 2, spots);
      rect(ctx, cx + 2 + wobble, baseY - 14, 2, 2, spots);
      rect(ctx, cx + 5 + wobble, baseY - 15, 2, 2, spots);
    }
    // Gills under cap
    rect(ctx, cx - 2 + wobble, baseY - 10, 8, 1, darken(stem, 0.15));
    // Ground
    rect(ctx, cx - 3, baseY, 10, 2, darken(stem, 0.3));
  } else if (stage === 5) {
    // Fruit: same cap but with spore clusters
    rect(ctx, cx + 1, baseY - 10, 3, 10, stem);
    rect(ctx, cx, baseY - 6, 1, 6, stemDark);
    rect(ctx, cx - 4 + wobble, baseY - 16, 12, 7, cap);
    rect(ctx, cx - 3 + wobble, baseY - 18, 10, 3, cap);
    rect(ctx, cx - 3 + wobble, baseY - 10, 10, 2, capDark);
    rect(ctx, cx - 2 + wobble, baseY - 18, 8, 2, lighten(cap, 0.2));
    if (spots) {
      rect(ctx, cx - 2 + wobble, baseY - 16, 2, 2, spots);
      rect(ctx, cx + 2 + wobble, baseY - 14, 2, 2, spots);
    }
    // Spore clusters
    rect(ctx, cx - 3 + wobble, baseY - 10, 2, 2, fruit);
    rect(ctx, cx + 5 + wobble, baseY - 10, 2, 2, fruit);
    rect(ctx, cx + 1 + wobble, baseY - 9, 2, 2, fruit);
    // Ground
    rect(ctx, cx - 3, baseY, 10, 2, darken(stem, 0.3));
  }
}
