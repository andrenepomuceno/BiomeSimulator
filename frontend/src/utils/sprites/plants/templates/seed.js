/**
 * Seed template — universal stage 1 for all plant species.
 * 64×64 design grid.
 */
import { px, rect, darken, lighten, noise, rimLight, speckle } from '../../helpers.js';

export function drawSeed(ctx, params, frame) {
  const { seedColor, sproutColor } = params;
  const seedHi = params.seedHighlight || lighten(seedColor, 0.15);
  const cx = 30;
  const cy = 40;

  // Seed body — oval shape
  rect(ctx, cx, cy, 8, 8, seedColor);
  rect(ctx, cx + 1, cy - 2, 6, 2, seedColor);
  rect(ctx, cx + 1, cy + 8, 6, 2, darken(seedColor, 0.1));
  // Highlight
  rect(ctx, cx, cy, 4, 4, seedHi);
  px(ctx, cx + 1, cy + 1, lighten(seedHi, 0.1));
  // Seed texture (multi-tone)
  speckle(ctx, cx, cy, 8, 8, [darken(seedColor, 0.12), darken(seedColor, 0.08), lighten(seedColor, 0.04)], 0.20);

  // Tiny sprout emerging (frames 1-2 show more growth)
  if (frame >= 1) {
    rect(ctx, cx + 2, cy - 4, 4, 4, sproutColor);
    px(ctx, cx + 3, cy - 5, lighten(sproutColor, 0.15));
  }
  if (frame >= 2) {
    rect(ctx, cx + 2, cy - 8, 4, 4, sproutColor);
    rect(ctx, cx, cy - 6, 3, 2, sproutColor);
    rect(ctx, cx + 5, cy - 7, 3, 2, sproutColor);
    px(ctx, cx + 3, cy - 9, lighten(sproutColor, 0.2));
  }

  // Ground shadow
  rect(ctx, cx - 2, cy + 10, 12, 2, 'rgba(0,0,0,0.08)');
}
