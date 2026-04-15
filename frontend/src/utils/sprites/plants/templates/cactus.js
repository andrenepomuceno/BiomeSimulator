/**
 * Cactus template — segmented cactus with arms.
 * Stages 2-5 at 64×64 design grid, 3 frames (cacti are rigid, frames identical).
 */
import { px, rect, darken, lighten, noise, gradientH, rimLight, ao, speckle } from '../../helpers.js';

export function drawCactus(ctx, params, stage, frame) {
  const { body, bodyDark, highlight, flower, fruit } = params;
  const cx = 28;
  const baseY = 56;
  const spine = '#c8c880';

  function ribTex(x, y, w, h) {
    speckle(ctx, x, y, w, h, [bodyDark, darken(body, 0.12), lighten(body, 0.04)], 0.22);
  }

  if (stage === 2) {
    gradientH(ctx, cx, baseY - 16, 8, 16, highlight, bodyDark);
    rect(ctx, cx, baseY - 16, 2, 16, highlight);
    rect(ctx, cx + 6, baseY - 16, 2, 16, bodyDark);
    ribTex(cx, baseY - 16, 8, 16);
    rect(ctx, cx + 2, baseY - 18, 4, 4, lighten(body, 0.1));
    rect(ctx, cx - 4, baseY, 16, 4, darken(body, 0.4));
  } else if (stage === 3) {
    gradientH(ctx, cx, baseY - 28, 8, 28, highlight, bodyDark);
    rect(ctx, cx, baseY - 28, 2, 28, highlight);
    rect(ctx, cx + 6, baseY - 28, 2, 28, bodyDark);
    ribTex(cx, baseY - 28, 8, 28);
    // Right arm stub
    rect(ctx, cx + 8, baseY - 20, 8, 6, body);
    rect(ctx, cx + 8, baseY - 20, 8, 2, highlight);
    rect(ctx, cx + 14, baseY - 16, 2, 4, bodyDark);
    rect(ctx, cx + 2, baseY - 30, 4, 4, lighten(body, 0.1));
    // Spines
    px(ctx, cx - 2, baseY - 24, spine);
    px(ctx, cx + 8, baseY - 16, spine);
    px(ctx, cx - 2, baseY - 16, spine);
    rect(ctx, cx - 4, baseY, 20, 4, darken(body, 0.4));
  } else if (stage === 4) {
    gradientH(ctx, cx, baseY - 36, 8, 36, highlight, bodyDark);
    rect(ctx, cx, baseY - 36, 2, 36, highlight);
    rect(ctx, cx + 6, baseY - 36, 2, 36, bodyDark);
    ribTex(cx, baseY - 36, 8, 36);
    // Left arm
    rect(ctx, cx - 8, baseY - 28, 8, 6, body);
    rect(ctx, cx - 8, baseY - 28, 2, 6, bodyDark);
    rect(ctx, cx - 8, baseY - 34, 6, 8, body);
    rect(ctx, cx - 8, baseY - 34, 2, 8, highlight);
    ribTex(cx - 8, baseY - 34, 6, 8);
    // Right arm
    rect(ctx, cx + 8, baseY - 24, 8, 6, body);
    rect(ctx, cx + 14, baseY - 24, 2, 6, bodyDark);
    rect(ctx, cx + 10, baseY - 32, 6, 10, body);
    rect(ctx, cx + 10, baseY - 32, 2, 10, highlight);
    ribTex(cx + 10, baseY - 32, 6, 10);
    rect(ctx, cx + 2, baseY - 38, 4, 4, lighten(body, 0.1));
    // Spines
    px(ctx, cx - 2, baseY - 32, spine); px(ctx, cx + 8, baseY - 20, spine);
    px(ctx, cx - 10, baseY - 30, spine); px(ctx, cx + 16, baseY - 28, spine);
    rect(ctx, cx - 8, baseY, 28, 4, darken(body, 0.4));
  } else if (stage === 5) {
    gradientH(ctx, cx, baseY - 36, 8, 36, highlight, bodyDark);
    rect(ctx, cx, baseY - 36, 2, 36, highlight);
    rect(ctx, cx + 6, baseY - 36, 2, 36, bodyDark);
    ribTex(cx, baseY - 36, 8, 36);
    // Arms (same as stage 4)
    rect(ctx, cx - 8, baseY - 28, 8, 6, body);
    rect(ctx, cx - 8, baseY - 34, 6, 8, body);
    rect(ctx, cx - 8, baseY - 34, 2, 8, highlight);
    rect(ctx, cx + 8, baseY - 24, 8, 6, body);
    rect(ctx, cx + 10, baseY - 32, 6, 10, body);
    rect(ctx, cx + 10, baseY - 32, 2, 10, highlight);
    ribTex(cx - 8, baseY - 34, 6, 8);
    ribTex(cx + 10, baseY - 32, 6, 10);
    // Flowers/fruit on tips
    rect(ctx, cx, baseY - 42, 8, 6, flower || fruit);
    rect(ctx, cx + 2, baseY - 44, 4, 4, lighten(flower || fruit, 0.2));
    rect(ctx, cx - 8, baseY - 38, 6, 4, flower || fruit);
    rect(ctx, cx + 10, baseY - 36, 6, 4, flower || fruit);
    rect(ctx, cx - 8, baseY, 28, 4, darken(body, 0.4));
  }
}
