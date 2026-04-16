/**
 * Seed template — universal stage 1 for all plant species.
 * 64×64 design grid.
 */
import { px, rect, ellipse, darken, lighten, blend, speckle } from '../../helpers.js';

export function drawSeed(ctx, params, frame) {
  const { seedColor, sproutColor } = params;
  const seedHi = params.seedHighlight || lighten(seedColor, 0.18);
  const cx = 32;
  const cy = 42;
  const srx = 5, sry = 4;

  // Seed body — organic ellipse
  ellipse(ctx, cx, cy, srx, sry, seedColor);

  // Shadow crescent on lower half
  for (let dy = 1; dy <= sry; dy++) {
    const hw = Math.round(srx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (sry * sry))));
    if (hw > 0) rect(ctx, cx - hw, cy + dy, hw * 2 + 1, 1, darken(seedColor, 0.06 + dy * 0.014));
  }

  // Highlight spot — top-left
  px(ctx, cx - 2, cy - 2, seedHi);
  px(ctx, cx - 1, cy - 2, lighten(seedHi, 0.08));

  // Texture clipped to ellipse
  for (let dy = -sry; dy <= sry; dy++) {
    const hw = Math.round(srx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (sry * sry))));
    if (hw > 0) speckle(ctx, cx - hw, cy + dy, hw * 2 + 1, 1,
      [darken(seedColor, 0.12), darken(seedColor, 0.08), lighten(seedColor, 0.04)], 0.20);
  }

  // Tiny root threads below seed (suggest germination even at frame 0)
  px(ctx, cx - 1, cy + sry + 1, darken(seedColor, 0.30));
  px(ctx, cx + 1, cy + sry + 2, darken(seedColor, 0.22));

  // Sprout — frame 1: first shoot emerging
  if (frame >= 1) {
    const sh = Math.floor(sry * 1.5);
    for (let i = 0; i < sh; i++) {
      const t = i / Math.max(1, sh - 1);
      const lean = -Math.round(t);
      px(ctx, cx + lean, cy - sry - 1 - i, blend(sproutColor, lighten(sproutColor, 0.18), t));
    }
    // First leaf bud (tiny angled pixel pair)
    px(ctx, cx - 2, cy - sry - 3, sproutColor);
    px(ctx, cx - 3, cy - sry - 4, darken(sproutColor, 0.08));
  }

  // Sprout — frame 2: taller shoot with spreading leaves
  if (frame >= 2) {
    const sh2 = sry * 2 + 2;
    for (let i = 0; i < sh2; i++) {
      const t = i / Math.max(1, sh2 - 1);
      const lean = -Math.round(t * 2);
      px(ctx, cx + lean, cy - sry - 1 - i, blend(sproutColor, lighten(sproutColor, 0.22), t));
    }
    // Left leaf blade (4 pixels angling up-left)
    for (let j = 0; j < 4; j++) {
      px(ctx, cx - 3 - j, cy - sry - sh2 + j, j < 2 ? sproutColor : darken(sproutColor, 0.08));
    }
    // Right leaf blade (3 pixels angling up-right)
    for (let j = 0; j < 3; j++) {
      px(ctx, cx + j, cy - sry - sh2 - 1 + j, j === 0 ? lighten(sproutColor, 0.14) : sproutColor);
    }
    // Growing tip
    px(ctx, cx - 2, cy - sry - sh2 - 1, lighten(sproutColor, 0.22));
  }

  // Ground shadow
  rect(ctx, cx - srx - 2, cy + sry + 3, (srx + 2) * 2, 2, 'rgba(0,0,0,0.08)');
}
