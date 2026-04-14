/**
 * Cactus template — segmented cactus with arms.
 * Stages 2-5 at 32×32 design grid, 3 frames (cacti are rigid, frames identical).
 */
import { rect, darken, lighten } from '../../helpers.js';

export function drawCactus(ctx, params, stage, frame) {
  const { body, bodyDark, highlight, flower, fruit } = params;
  const cx = 14;
  const baseY = 28;

  // Cacti don't sway; frames are identical
  if (stage === 2) {
    // Young: small single column
    rect(ctx, cx, baseY - 8, 4, 8, body);
    rect(ctx, cx, baseY - 8, 1, 8, highlight);
    rect(ctx, cx + 3, baseY - 8, 1, 8, bodyDark);
    // Tip
    rect(ctx, cx + 1, baseY - 9, 2, 2, lighten(body, 0.1));
    // Ground
    rect(ctx, cx - 2, baseY, 8, 2, darken(body, 0.4));
  } else if (stage === 3) {
    // Adult sprout: taller with one arm stub
    rect(ctx, cx, baseY - 14, 4, 14, body);
    rect(ctx, cx, baseY - 14, 1, 14, highlight);
    rect(ctx, cx + 3, baseY - 14, 1, 14, bodyDark);
    // Right arm stub
    rect(ctx, cx + 4, baseY - 10, 4, 3, body);
    rect(ctx, cx + 4, baseY - 10, 4, 1, highlight);
    rect(ctx, cx + 7, baseY - 8, 1, 2, bodyDark);
    // Tip
    rect(ctx, cx + 1, baseY - 15, 2, 2, lighten(body, 0.1));
    // Spines
    rect(ctx, cx - 1, baseY - 12, 1, 1, '#c8c880');
    rect(ctx, cx + 4, baseY - 8, 1, 1, '#c8c880');
    // Ground
    rect(ctx, cx - 2, baseY, 10, 2, darken(body, 0.4));
  } else if (stage === 4) {
    // Adult: full cactus with arms
    rect(ctx, cx, baseY - 18, 4, 18, body);
    rect(ctx, cx, baseY - 18, 1, 18, highlight);
    rect(ctx, cx + 3, baseY - 18, 1, 18, bodyDark);
    // Left arm
    rect(ctx, cx - 4, baseY - 14, 4, 3, body);
    rect(ctx, cx - 4, baseY - 14, 1, 3, bodyDark);
    rect(ctx, cx - 4, baseY - 17, 3, 4, body);
    rect(ctx, cx - 4, baseY - 17, 1, 4, highlight);
    // Right arm
    rect(ctx, cx + 4, baseY - 12, 4, 3, body);
    rect(ctx, cx + 7, baseY - 12, 1, 3, bodyDark);
    rect(ctx, cx + 5, baseY - 16, 3, 5, body);
    rect(ctx, cx + 5, baseY - 16, 1, 5, highlight);
    // Tip
    rect(ctx, cx + 1, baseY - 19, 2, 2, lighten(body, 0.1));
    // Spines
    rect(ctx, cx - 1, baseY - 16, 1, 1, '#c8c880');
    rect(ctx, cx + 4, baseY - 10, 1, 1, '#c8c880');
    rect(ctx, cx - 5, baseY - 15, 1, 1, '#c8c880');
    rect(ctx, cx + 8, baseY - 14, 1, 1, '#c8c880');
    // Ground
    rect(ctx, cx - 4, baseY, 14, 2, darken(body, 0.4));
  } else if (stage === 5) {
    // Fruit: cactus with flowers/fruit on tips
    rect(ctx, cx, baseY - 18, 4, 18, body);
    rect(ctx, cx, baseY - 18, 1, 18, highlight);
    rect(ctx, cx + 3, baseY - 18, 1, 18, bodyDark);
    // Arms (same as adult)
    rect(ctx, cx - 4, baseY - 14, 4, 3, body);
    rect(ctx, cx - 4, baseY - 17, 3, 4, body);
    rect(ctx, cx - 4, baseY - 17, 1, 4, highlight);
    rect(ctx, cx + 4, baseY - 12, 4, 3, body);
    rect(ctx, cx + 5, baseY - 16, 3, 5, body);
    rect(ctx, cx + 5, baseY - 16, 1, 5, highlight);
    // Flowers/fruit on tips
    rect(ctx, cx, baseY - 21, 4, 3, flower || fruit);
    rect(ctx, cx + 1, baseY - 22, 2, 2, lighten(flower || fruit, 0.2));
    rect(ctx, cx - 4, baseY - 19, 3, 2, flower || fruit);
    rect(ctx, cx + 5, baseY - 18, 3, 2, flower || fruit);
    // Ground
    rect(ctx, cx - 4, baseY, 14, 2, darken(body, 0.4));
  }
}
