/**
 * Seed template — universal stage 1 for all plant species.
 * Draws a small seed/sprout at 32×32 design grid.
 */
import { rect } from '../../helpers.js';

export function drawSeed(ctx, params, frame) {
  const { seedColor, sproutColor } = params;
  const cx = 15;
  const cy = 20;

  // Seed body
  rect(ctx, cx, cy, 4, 4, seedColor);
  rect(ctx, cx + 1, cy - 1, 2, 1, seedColor);
  // Highlight
  rect(ctx, cx, cy, 2, 2, params.seedHighlight || '#b8a870');

  // Tiny sprout emerging (frames 1-2 show more growth)
  if (frame >= 1) {
    rect(ctx, cx + 1, cy - 2, 2, 2, sproutColor);
  }
  if (frame >= 2) {
    rect(ctx, cx + 1, cy - 4, 2, 2, sproutColor);
    rect(ctx, cx, cy - 3, 1, 1, sproutColor);
  }
}
