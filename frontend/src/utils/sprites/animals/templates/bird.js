/**
 * Bird drawing template â€” 32Ã—32 design grid.
 * Used by: crow, hawk.
 */
import { px, rect, darken, lighten, DOWN, UP, LEFT } from '../../helpers.js';

export function drawBird(ctx, params, dir, frame) {
  const { body, accent, eye, beak, w, h, wingSpan } = params;
  const shadow = darken(body, 0.15);
  const highlight = lighten(body, 0.12);
  const outline = darken(body, 0.3);
  const cx = 16;
  const cy = 16;
  const wingUp = frame === 0 ? -2 : frame === 2 ? 2 : 0;

  if (dir === DOWN || dir === UP) {
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);

    // Body oval
    rect(ctx, bx + 2, by, w - 4, 2, body);
    rect(ctx, bx, by + 2, w, h - 4, body);
    rect(ctx, bx + 2, by + h - 2, w - 4, 2, shadow);
    rect(ctx, cx - 1, by, 2, 2, highlight);
    if (params.breast && dir === DOWN) {
      rect(ctx, bx + 2, by + h - 4, w - 4, 2, params.breast);
    }

    // Head
    rect(ctx, cx - 2, by - 4, 4, 4, body);
    rect(ctx, cx - 1, by - 4, 2, 2, highlight);
    if (dir === DOWN) {
      rect(ctx, cx - 2, by - 2, 2, 2, eye);
      rect(ctx, cx + 2, by - 2, 2, 2, eye);
      px(ctx, cx - 2, by - 2, '#ffffff');
      px(ctx, cx + 3, by - 2, '#ffffff');
      rect(ctx, cx - 1, by, 2, 2, beak);
    }

    // Wings
    const wingY = by + 2 + wingUp;
    for (let i = 1; i <= wingSpan; i++) {
      const wingColor = i <= 2 ? body : (i >= wingSpan - 1 ? shadow : accent);
      rect(ctx, bx - i * 2, wingY, 2, 2, wingColor);
      rect(ctx, bx + w - 2 + i * 2, wingY, 2, 2, wingColor);
    }
    if (wingSpan > 4) {
      rect(ctx, bx - 2, wingY - 2, 2, 2, accent);
      rect(ctx, bx + w, wingY - 2, 2, 2, accent);
    }

    // Tail feathers
    if (dir === UP) {
      const tailLen = params.tailLen || 4;
      for (let t = 0; t < tailLen; t += 2) {
        rect(ctx, cx - 2 + t, by + h + t, 2, 2, accent);
        rect(ctx, cx + 2 - t, by + h + t, 2, 2, accent);
      }
    }
    rect(ctx, cx - 2, by + h, 2, 2, outline);
    rect(ctx, cx + 2, by + h, 2, 2, outline);
  } else {
    const flip = dir === LEFT;
    const f = flip ? (x) => 31 - x : (x) => x;
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);

    // Body
    for (let i = 2; i < w - 2; i++) { px(ctx, f(bx + i), by, body); px(ctx, f(bx + i), by + 1, body); }
    for (let r = 2; r < h - 2; r++) for (let i = 0; i < w; i++) px(ctx, f(bx + i), by + r, body);
    for (let i = 2; i < w - 2; i++) { px(ctx, f(bx + i), by + h - 2, shadow); px(ctx, f(bx + i), by + h - 1, shadow); }
    for (let i = 2; i < w - 2; i++) { px(ctx, f(bx + i), by + 2, highlight); px(ctx, f(bx + i), by + 3, highlight); }
    if (params.breast) {
      for (let i = 2; i < w - 2; i++) { px(ctx, f(bx + i), by + h - 4, params.breast); px(ctx, f(bx + i), by + h - 3, params.breast); }
    }

    // Head
    const headX = bx + w;
    for (let dy = -2; dy < 2; dy++) for (let dx = 0; dx < 4; dx++) px(ctx, f(headX + dx), by + dy, body);
    rect(ctx, f(headX + 2), by - 2, 2, 2, eye);
    px(ctx, f(headX + 2), by - 2, '#ffffff');
    rect(ctx, f(headX + 4), by, 2, 2, beak);

    // Wing (folded)
    const wingY = by + 2 - wingUp;
    for (let i = 0; i < Math.max(4, w - 4); i++) px(ctx, f(bx + 2 + i), wingY, accent);
    for (let i = 0; i < Math.max(4, w - 4); i++) px(ctx, f(bx + 2 + i), wingY + 1, accent);

    // Tail
    const tailLen = params.tailLen || 4;
    for (let t = 0; t < tailLen; t++) {
      px(ctx, f(bx - 2 - t), by + h - 4 + t, accent);
      px(ctx, f(bx - 2 - t), by + h - 3 + t, accent);
    }
    rect(ctx, f(bx - tailLen - 1), by + h - 4 + tailLen - 1, 2, 2, shadow);

    // Feet
    rect(ctx, f(bx + 2), by + h, 2, 2, outline);
    rect(ctx, f(bx + 4), by + h, 2, 2, outline);
    rect(ctx, f(bx + 2), by + h + 2, 2, 2, outline);
  }
}
