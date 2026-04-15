/**
 * Flower template — sunflower (tall stem + flower head).
 * Stages 2-5 at 64×64 design grid, 3 animation frames for sway.
 */
import { px, rect, darken, lighten, noise, rimLight, ao, speckle } from '../../helpers.js';

export function drawFlower(ctx, params, stage, frame) {
  const { stem, leaf, leafDark, petal, petalDark, center, fruit } = params;
  const cx = 28;
  const baseY = 56;

  const swayOff = frame === 0 ? 0 : (frame === 1 ? 2 : -2);

  function petalTex(x, y, w, h) {
    speckle(ctx, x, y, w, h, [petalDark || darken(petal, 0.15), darken(petal, 0.10), lighten(petal, 0.06)], 0.22);
  }

  if (stage === 2) {
    rect(ctx, cx + 2 + swayOff, baseY - 16, 4, 16, stem);
    rect(ctx, cx - 2 + swayOff, baseY - 12, 6, 4, leaf);
    rect(ctx, cx + 4 + swayOff, baseY - 14, 6, 4, leaf);
    // Bud
    rect(ctx, cx + swayOff, baseY - 20, 8, 6, leaf);
    rect(ctx, cx + 2 + swayOff, baseY - 20, 4, 4, lighten(leaf, 0.15));
    rect(ctx, cx - 2, baseY, 12, 4, darken(stem, 0.3));
  } else if (stage === 3) {
    rect(ctx, cx + 2 + swayOff, baseY - 28, 4, 28, stem);
    rect(ctx, cx - 4 + swayOff, baseY - 20, 8, 4, leaf);
    rect(ctx, cx + 4 + swayOff, baseY - 16, 8, 4, leaf);
    rect(ctx, cx - 2 + swayOff, baseY - 24, 6, 4, leafDark);
    // Opening bud
    rect(ctx, cx - 2 + swayOff, baseY - 36, 12, 10, petal);
    rect(ctx, cx + swayOff, baseY - 38, 8, 4, petal);
    rect(ctx, cx + swayOff, baseY - 32, 8, 6, center);
    petalTex(cx - 2 + swayOff, baseY - 36, 12, 10);
    rect(ctx, cx - 4, baseY, 16, 4, darken(stem, 0.3));
  } else if (stage === 4) {
    rect(ctx, cx + 2 + swayOff, baseY - 32, 4, 32, stem);
    rect(ctx, cx - 4 + swayOff, baseY - 24, 8, 4, leaf);
    rect(ctx, cx + 4 + swayOff, baseY - 20, 8, 4, leaf);
    // Full flower head
    rect(ctx, cx - 6 + swayOff, baseY - 44, 20, 16, petal);
    rect(ctx, cx - 4 + swayOff, baseY - 48, 16, 4, petal);
    rect(ctx, cx - 4 + swayOff, baseY - 32, 16, 4, petalDark || darken(petal, 0.15));
    petalTex(cx - 6 + swayOff, baseY - 48, 20, 20);
    // Center disc
    rect(ctx, cx - 2 + swayOff, baseY - 40, 12, 8, center);
    rect(ctx, cx + swayOff, baseY - 40, 8, 4, lighten(center, 0.1));
    // Center texture
    for (let dy = 0; dy < 8; dy++)
      for (let dx = 0; dx < 12; dx++)
        if (noise(cx - 2 + dx, baseY - 40 + dy) > 0.7) px(ctx, cx - 2 + dx + swayOff, baseY - 40 + dy, darken(center, 0.15));
    rect(ctx, cx - 4, baseY, 16, 4, darken(stem, 0.3));
  } else if (stage === 5) {
    rect(ctx, cx + 2 + swayOff, baseY - 32, 4, 32, stem);
    rect(ctx, cx - 4 + swayOff, baseY - 24, 8, 4, leaf);
    rect(ctx, cx + 4 + swayOff, baseY - 20, 8, 4, leaf);
    // Flower droopy
    rect(ctx, cx - 6 + swayOff, baseY - 40, 20, 14, petal);
    rect(ctx, cx - 4 + swayOff, baseY - 44, 16, 6, petal);
    rect(ctx, cx - 4 + swayOff, baseY - 28, 16, 4, petalDark || darken(petal, 0.15));
    petalTex(cx - 6 + swayOff, baseY - 44, 20, 20);
    // Seed head
    rect(ctx, cx - 4 + swayOff, baseY - 38, 16, 10, center);
    rect(ctx, cx - 2 + swayOff, baseY - 36, 12, 6, darken(center, 0.15));
    // Seed dots
    rect(ctx, cx + swayOff, baseY - 36, 4, 4, fruit || lighten(center, 0.2));
    rect(ctx, cx + 4 + swayOff, baseY - 34, 4, 4, fruit || lighten(center, 0.2));
    rect(ctx, cx - 4, baseY, 16, 4, darken(stem, 0.3));
  }
}
