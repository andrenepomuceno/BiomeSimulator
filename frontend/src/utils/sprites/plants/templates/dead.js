/**
 * Dead template — universal stage 6 for all plant species.
 * Draws a withered/dried plant at 32×32 design grid.
 */
import { rect } from '../../helpers.js';

export function drawDead(ctx, params, frame) {
  const brown = '#8a7a55';
  const darkBrown = '#6a5a40';
  const cx = 13;

  // Wilted stem
  rect(ctx, cx + 2, 16, 2, 8, darkBrown);
  rect(ctx, cx + 1, 20, 1, 4, darkBrown);

  // Droopy leaves/branches
  rect(ctx, cx, 16, 2, 2, brown);
  rect(ctx, cx - 1, 17, 2, 2, brown);
  rect(ctx, cx + 4, 16, 2, 2, brown);
  rect(ctx, cx + 5, 17, 2, 2, brown);

  // Ground debris
  rect(ctx, cx - 2, 24, 3, 2, darkBrown);
  rect(ctx, cx + 5, 24, 3, 2, darkBrown);

  // Frame variation: slight lean
  if (frame === 1) {
    rect(ctx, cx + 3, 14, 2, 2, brown);
  } else if (frame === 2) {
    rect(ctx, cx - 1, 14, 2, 2, brown);
  }
}
