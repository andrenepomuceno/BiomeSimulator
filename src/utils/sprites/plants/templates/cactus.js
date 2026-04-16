/**
 * Cactus template — segmented cactus with arms.
 * Stages 2-5 at 64×64 design grid, 3 frames (cacti are rigid, frames identical).
 */
import { px, rect, darken, lighten, noise, gradientH, rimLight, ao, speckle } from '../../helpers.js';
import { drawCactusSpines, drawGroundBase, drawFruit } from '../bodyParts.js';

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
    drawCactusSpines(ctx, cx, baseY - 16, 8, 16, spine);
    rect(ctx, cx + 2, baseY - 18, 4, 4, lighten(body, 0.1));
    drawGroundBase(ctx, cx - 4, baseY, 16, body, 4);
  } else if (stage === 3) {
    gradientH(ctx, cx, baseY - 28, 8, 28, highlight, bodyDark);
    rect(ctx, cx, baseY - 28, 2, 28, highlight);
    rect(ctx, cx + 6, baseY - 28, 2, 28, bodyDark);
    ribTex(cx, baseY - 28, 8, 28);
    drawCactusSpines(ctx, cx, baseY - 28, 8, 28, spine);
    // Right arm stub
    rect(ctx, cx + 8, baseY - 20, 8, 6, body);
    rect(ctx, cx + 8, baseY - 20, 8, 2, highlight);
    rect(ctx, cx + 14, baseY - 16, 2, 4, bodyDark);
    rect(ctx, cx + 2, baseY - 30, 4, 4, lighten(body, 0.1));
    drawCactusSpines(ctx, cx + 8, baseY - 20, 8, 6, spine);
    drawGroundBase(ctx, cx - 4, baseY, 20, body, 4);
  } else if (stage === 4) {
    gradientH(ctx, cx, baseY - 36, 8, 36, highlight, bodyDark);
    rect(ctx, cx, baseY - 36, 2, 36, highlight);
    rect(ctx, cx + 6, baseY - 36, 2, 36, bodyDark);
    ribTex(cx, baseY - 36, 8, 36);
    drawCactusSpines(ctx, cx, baseY - 36, 8, 36, spine);
    // Left arm
    rect(ctx, cx - 8, baseY - 28, 8, 6, body);
    rect(ctx, cx - 8, baseY - 28, 2, 6, bodyDark);
    rect(ctx, cx - 8, baseY - 34, 6, 8, body);
    rect(ctx, cx - 8, baseY - 34, 2, 8, highlight);
    ribTex(cx - 8, baseY - 34, 6, 8);
    drawCactusSpines(ctx, cx - 8, baseY - 34, 6, 8, spine);
    // Right arm
    rect(ctx, cx + 8, baseY - 24, 8, 6, body);
    rect(ctx, cx + 14, baseY - 24, 2, 6, bodyDark);
    rect(ctx, cx + 10, baseY - 32, 6, 10, body);
    rect(ctx, cx + 10, baseY - 32, 2, 10, highlight);
    ribTex(cx + 10, baseY - 32, 6, 10);
    drawCactusSpines(ctx, cx + 10, baseY - 32, 6, 10, spine);
    rect(ctx, cx + 2, baseY - 38, 4, 4, lighten(body, 0.1));
    drawGroundBase(ctx, cx - 8, baseY, 28, body, 4);
  } else if (stage === 5) {
    gradientH(ctx, cx, baseY - 36, 8, 36, highlight, bodyDark);
    rect(ctx, cx, baseY - 36, 2, 36, highlight);
    rect(ctx, cx + 6, baseY - 36, 2, 36, bodyDark);
    ribTex(cx, baseY - 36, 8, 36);
    drawCactusSpines(ctx, cx, baseY - 36, 8, 36, spine);
    // Arms (same as stage 4)
    rect(ctx, cx - 8, baseY - 28, 8, 6, body);
    rect(ctx, cx - 8, baseY - 34, 6, 8, body);
    rect(ctx, cx - 8, baseY - 34, 2, 8, highlight);
    rect(ctx, cx + 8, baseY - 24, 8, 6, body);
    rect(ctx, cx + 10, baseY - 32, 6, 10, body);
    rect(ctx, cx + 10, baseY - 32, 2, 10, highlight);
    ribTex(cx - 8, baseY - 34, 6, 8);
    ribTex(cx + 10, baseY - 32, 6, 10);
    drawCactusSpines(ctx, cx - 8, baseY - 34, 6, 8, spine);
    drawCactusSpines(ctx, cx + 10, baseY - 32, 6, 10, spine);
    // Flowers/fruit on tips
    const bloom = flower || fruit;
    drawFruit(ctx, cx + 1, baseY - 43, 6, bloom, lighten(bloom, 0.2));
    drawFruit(ctx, cx - 8, baseY - 39, 5, bloom, lighten(bloom, 0.2));
    drawFruit(ctx, cx + 11, baseY - 37, 5, bloom, lighten(bloom, 0.2));
    drawGroundBase(ctx, cx - 8, baseY, 28, body, 4);
  }
}
