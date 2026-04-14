/**
 * Bush template — bushy plants (strawberry, blueberry, tomato, chili pepper).
 * Stages 2-5 at 32×32 design grid, 3 animation frames for sway.
 */
import { rect, darken, lighten } from '../../helpers.js';

export function drawBush(ctx, params, stage, frame) {
  const { stem, leaf, leafDark, fruit, fruitAccent } = params;
  // Shape params with defaults
  const bw = params.bushW || 12;    // full bush width at stage 4-5
  const bh = params.bushH || 10;    // full bush height at stage 4-5
  const cx = 14;
  const baseY = 28;

  const swayOff = frame === 0 ? 0 : (frame === 1 ? 1 : -1);
  const hw = (bw / 2) | 0;

  if (stage === 2) {
    rect(ctx, cx + 1 + swayOff, baseY - 6, 2, 6, stem);
    rect(ctx, cx - 1 + swayOff, baseY - 6, 3, 3, leaf);
    rect(ctx, cx + 2 + swayOff, baseY - 5, 3, 3, leaf);
    rect(ctx, cx, baseY, 4, 2, darken(stem, 0.3));
  } else if (stage === 3) {
    const sw = (bw * 0.8) | 0;
    const sh = (bh * 0.7) | 0;
    const shw = (sw / 2) | 0;
    rect(ctx, cx + 1 + swayOff, baseY - 8, 2, 8, stem);
    rect(ctx, cx - shw + swayOff, baseY - 8 - (sh * 0.3) | 0, sw, (sh * 0.6) | 0, leaf);
    rect(ctx, cx - shw + 1 + swayOff, baseY - 8 - (sh * 0.7) | 0, sw - 2, (sh * 0.4) | 0, leaf);
    rect(ctx, cx - shw + 1 + swayOff, baseY - 8 + 2, sw - 2, 2, leafDark);
    rect(ctx, cx - shw + 2 + swayOff, baseY - 8 - (sh * 0.7) | 0, (sw * 0.5) | 0, 2, lighten(leaf, 0.15));
    rect(ctx, cx - shw, baseY, sw + 1, 2, darken(stem, 0.3));
  } else if (stage === 4) {
    rect(ctx, cx + 1 + swayOff, baseY - 8, 2, 8, stem);
    rect(ctx, cx - hw + swayOff, baseY - 8 - (bh * 0.35) | 0, bw, (bh * 0.7) | 0, leaf);
    rect(ctx, cx - hw + 1 + swayOff, baseY - 8 - (bh * 0.7) | 0, bw - 2, (bh * 0.35) | 0, leaf);
    rect(ctx, cx - hw + 2 + swayOff, baseY - 8 - bh, bw - 4, (bh * 0.3) | 0, leaf);
    rect(ctx, cx - hw + 1 + swayOff, baseY - 8 + 2, bw - 2, 2, leafDark);
    rect(ctx, cx - hw + 2 + swayOff, baseY - 8 - bh, (bw * 0.5) | 0, 2, lighten(leaf, 0.2));
    rect(ctx, cx - hw, baseY, bw + 1, 2, darken(stem, 0.3));
  } else if (stage === 5) {
    rect(ctx, cx + 1 + swayOff, baseY - 8, 2, 8, stem);
    rect(ctx, cx - hw + swayOff, baseY - 8 - (bh * 0.35) | 0, bw, (bh * 0.7) | 0, leaf);
    rect(ctx, cx - hw + 1 + swayOff, baseY - 8 - (bh * 0.7) | 0, bw - 2, (bh * 0.35) | 0, leaf);
    rect(ctx, cx - hw + 2 + swayOff, baseY - 8 - bh, bw - 4, (bh * 0.3) | 0, leaf);
    rect(ctx, cx - hw + 1 + swayOff, baseY - 8 + 2, bw - 2, 2, leafDark);
    // Fruit — larger dots
    const fy = baseY - 8 - (bh * 0.35) | 0;
    rect(ctx, cx - hw + 2 + swayOff, fy, 4, 4, fruit);
    rect(ctx, cx + hw - 5 + swayOff, fy - 3, 4, 4, fruit);
    rect(ctx, cx + swayOff, fy + 2, 4, 4, fruit);
    rect(ctx, cx - hw + 3 + swayOff, fy - 1, 3, 3, fruitAccent || fruit);
    rect(ctx, cx + hw - 4 + swayOff, fy + 1, 3, 3, fruitAccent || fruit);
    rect(ctx, cx - hw, baseY, bw + 1, 2, darken(stem, 0.3));
  }
}
