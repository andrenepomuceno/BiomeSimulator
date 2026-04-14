/**
 * Dead template — universal stage 6 for all plant species.
 * 64×64 design grid.
 */
import { px, rect, darken, noise } from '../../helpers.js';

export function drawDead(ctx, params, frame) {
  const brown = '#8a7a55';
  const darkBrown = '#6a5a40';
  const dryLeaf = '#a09060';
  const cx = 26;

  // Wilted stem
  rect(ctx, cx + 4, 32, 4, 16, darkBrown);
  rect(ctx, cx + 2, 40, 2, 8, darkBrown);
  // Stem texture
  for (let dy = 0; dy < 16; dy++) {
    if (noise(cx + 5, 32 + dy) > 0.7) px(ctx, cx + 5, 32 + dy, brown);
  }

  // Droopy leaves/branches
  rect(ctx, cx, 32, 4, 4, brown);
  rect(ctx, cx - 2, 34, 4, 4, brown);
  rect(ctx, cx + 8, 32, 4, 4, brown);
  rect(ctx, cx + 10, 34, 4, 4, brown);

  // Dry leaf tips
  px(ctx, cx - 3, 36, dryLeaf);
  px(ctx, cx + 12, 36, dryLeaf);

  // Ground debris
  rect(ctx, cx - 4, 48, 6, 4, darkBrown);
  rect(ctx, cx + 10, 48, 6, 4, darkBrown);
  rect(ctx, cx + 2, 50, 4, 2, brown);

  // Frame variation: slight lean
  if (frame === 1) {
    rect(ctx, cx + 6, 28, 4, 4, brown);
  } else if (frame === 2) {
    rect(ctx, cx - 2, 28, 4, 4, brown);
  }

  // Ground shadow
  rect(ctx, cx - 4, 52, 20, 2, 'rgba(0,0,0,0.08)');
}
