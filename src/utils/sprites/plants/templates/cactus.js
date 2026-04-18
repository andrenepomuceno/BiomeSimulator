/**
 * Cactus template — segmented cactus with arms.
 * Stages 2-5 at 64×64 design grid, 3 frames (cacti are rigid, frames identical).
 */
import { rect, lighten } from '../../helpers.js';
import { drawCactusColumn, drawCactusLeftArm, drawCactusRightArm, drawCactusSpines, drawGroundBase, drawFruit } from '../bodyParts.js';

export function drawCactus(ctx, params, stage, frame) {
  const { body, bodyDark, highlight, flower, fruit } = params;
  const cx = 28;
  const baseY = 56;
  const spine = '#c8c880';

  if (stage === 2) {
    drawCactusColumn(ctx, cx, baseY, 8, 16, body, highlight, bodyDark, spine);
    rect(ctx, cx + 2, baseY - 18, 4, 4, lighten(body, 0.1));
    drawGroundBase(ctx, cx - 4, baseY, 16, body, 4);
  } else if (stage === 3) {
    drawCactusColumn(ctx, cx, baseY, 8, 28, body, highlight, bodyDark, spine);
    // Right arm stub
    rect(ctx, cx + 8, baseY - 20, 8, 6, body);
    rect(ctx, cx + 8, baseY - 20, 8, 2, highlight);
    rect(ctx, cx + 14, baseY - 16, 2, 4, bodyDark);
    drawCactusSpines(ctx, cx + 8, baseY - 20, 8, 6, spine);
    rect(ctx, cx + 2, baseY - 30, 4, 4, lighten(body, 0.1));
    drawGroundBase(ctx, cx - 4, baseY, 20, body, 4);
  } else if (stage === 4) {
    drawCactusColumn(ctx, cx, baseY, 8, 36, body, highlight, bodyDark, spine);
    drawCactusLeftArm(ctx, cx, baseY, body, highlight, bodyDark, spine);
    drawCactusRightArm(ctx, cx, baseY, body, highlight, bodyDark, spine);
    rect(ctx, cx + 2, baseY - 38, 4, 4, lighten(body, 0.1));
    drawGroundBase(ctx, cx - 8, baseY, 28, body, 4);
  } else if (stage === 5) {
    drawCactusColumn(ctx, cx, baseY, 8, 36, body, highlight, bodyDark, spine);
    drawCactusLeftArm(ctx, cx, baseY, body, highlight, bodyDark, spine);
    drawCactusRightArm(ctx, cx, baseY, body, highlight, bodyDark, spine);
    // Flowers/fruit on tips
    const bloom = flower || fruit;
    drawFruit(ctx, cx + 1, baseY - 43, 6, bloom, lighten(bloom, 0.2));
    drawFruit(ctx, cx - 8, baseY - 39, 5, bloom, lighten(bloom, 0.2));
    drawFruit(ctx, cx + 11, baseY - 37, 5, bloom, lighten(bloom, 0.2));
    drawGroundBase(ctx, cx - 8, baseY, 28, body, 4);
  }
}
