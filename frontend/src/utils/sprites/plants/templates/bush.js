/**
 * Bush template — bushy plants (strawberry, blueberry, tomato, chili pepper).
 * Stages 2-5 at 64×64 design grid, 3 animation frames for sway.
 */
import { px, rect, darken, lighten, noise } from '../../helpers.js';

export function drawBush(ctx, params, stage, frame) {
  const { stem, leaf, leafDark, fruit, fruitAccent } = params;
  const bw = params.bushW || 24;
  const bh = params.bushH || 20;
  const cx = 28;
  const baseY = 56;

  const swayOff = frame === 0 ? 0 : (frame === 1 ? 2 : -2);
  const hw = (bw / 2) | 0;

  function leafTex(x, y, w, h) {
    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++)
        if (noise(x + dx, y + dy) > 0.76) px(ctx, x + dx, y + dy, leafDark);
  }

  if (stage === 2) {
    rect(ctx, cx + 2 + swayOff, baseY - 12, 4, 12, stem);
    rect(ctx, cx - 2 + swayOff, baseY - 12, 6, 6, leaf);
    rect(ctx, cx + 4 + swayOff, baseY - 10, 6, 6, leaf);
    leafTex(cx - 2 + swayOff, baseY - 12, 12, 6);
    rect(ctx, cx, baseY, 8, 4, darken(stem, 0.3));
  } else if (stage === 3) {
    const sw = (bw * 0.8) | 0;
    const sh = (bh * 0.7) | 0;
    const shw = (sw / 2) | 0;
    rect(ctx, cx + 2 + swayOff, baseY - 16, 4, 16, stem);
    rect(ctx, cx - shw + swayOff, baseY - 16 - (sh * 0.3) | 0, sw, (sh * 0.6) | 0, leaf);
    rect(ctx, cx - shw + 2 + swayOff, baseY - 16 - (sh * 0.7) | 0, sw - 4, (sh * 0.4) | 0, leaf);
    rect(ctx, cx - shw + 2 + swayOff, baseY - 16 + 4, sw - 4, 4, leafDark);
    rect(ctx, cx - shw + 4 + swayOff, baseY - 16 - (sh * 0.7) | 0, (sw * 0.5) | 0, 4, lighten(leaf, 0.15));
    leafTex(cx - shw + swayOff, baseY - 16 - (sh * 0.7) | 0, sw, sh);
    rect(ctx, cx - shw, baseY, sw + 2, 4, darken(stem, 0.3));
  } else if (stage === 4) {
    rect(ctx, cx + 2 + swayOff, baseY - 16, 4, 16, stem);
    rect(ctx, cx - hw + swayOff, baseY - 16 - (bh * 0.35) | 0, bw, (bh * 0.7) | 0, leaf);
    rect(ctx, cx - hw + 2 + swayOff, baseY - 16 - (bh * 0.7) | 0, bw - 4, (bh * 0.35) | 0, leaf);
    rect(ctx, cx - hw + 4 + swayOff, baseY - 16 - bh, bw - 8, (bh * 0.3) | 0, leaf);
    rect(ctx, cx - hw + 2 + swayOff, baseY - 16 + 4, bw - 4, 4, leafDark);
    rect(ctx, cx - hw + 4 + swayOff, baseY - 16 - bh, (bw * 0.5) | 0, 4, lighten(leaf, 0.2));
    leafTex(cx - hw + swayOff, baseY - 16 - bh, bw, bh);
    rect(ctx, cx - hw, baseY, bw + 2, 4, darken(stem, 0.3));
  } else if (stage === 5) {
    rect(ctx, cx + 2 + swayOff, baseY - 16, 4, 16, stem);
    rect(ctx, cx - hw + swayOff, baseY - 16 - (bh * 0.35) | 0, bw, (bh * 0.7) | 0, leaf);
    rect(ctx, cx - hw + 2 + swayOff, baseY - 16 - (bh * 0.7) | 0, bw - 4, (bh * 0.35) | 0, leaf);
    rect(ctx, cx - hw + 4 + swayOff, baseY - 16 - bh, bw - 8, (bh * 0.3) | 0, leaf);
    rect(ctx, cx - hw + 2 + swayOff, baseY - 16 + 4, bw - 4, 4, leafDark);
    leafTex(cx - hw + swayOff, baseY - 16 - bh, bw, bh);
    // Fruit
    const fy = baseY - 16 - (bh * 0.35) | 0;
    rect(ctx, cx - hw + 4 + swayOff, fy, 8, 8, fruit);
    rect(ctx, cx + hw - 10 + swayOff, fy - 6, 8, 8, fruit);
    rect(ctx, cx + swayOff, fy + 4, 8, 8, fruit);
    rect(ctx, cx - hw + 6 + swayOff, fy - 2, 6, 6, fruitAccent || fruit);
    rect(ctx, cx + hw - 8 + swayOff, fy + 2, 6, 6, fruitAccent || fruit);
    // Fruit highlights
    px(ctx, cx - hw + 5 + swayOff, fy + 1, lighten(fruit, 0.2));
    px(ctx, cx + hw - 9 + swayOff, fy - 5, lighten(fruit, 0.2));
    rect(ctx, cx - hw, baseY, bw + 2, 4, darken(stem, 0.3));
  }
}
