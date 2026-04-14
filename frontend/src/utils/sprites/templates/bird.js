/**
 * Bird drawing template.
 * Used by: crow, hawk.
 */
import { px, rect, darken, lighten, DOWN, UP, LEFT } from '../helpers.js';

export function drawBird(ctx, params, dir, frame) {
  const { body, accent, eye, beak, w, h, wingSpan } = params;
  const shadow = darken(body, 0.15);
  const highlight = lighten(body, 0.12);
  const outline = darken(body, 0.3);
  const cx = 8;
  const cy = 8;
  const wingUp = frame === 0 ? -1 : frame === 2 ? 1 : 0;

  if (dir === DOWN || dir === UP) {
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);

    // Body oval
    rect(ctx, bx + 1, by, w - 2, 1, body);
    rect(ctx, bx, by + 1, w, h - 2, body);
    rect(ctx, bx + 1, by + h - 1, w - 2, 1, shadow);
    px(ctx, cx, by, highlight);
    if (params.breast && dir === DOWN) {
      rect(ctx, bx + 1, by + h - 2, w - 2, 1, params.breast);
    }

    // Head
    rect(ctx, cx - 1, by - 2, 3, 2, body);
    px(ctx, cx, by - 2, highlight);
    if (dir === DOWN) {
      px(ctx, cx - 1, by - 1, eye);
      px(ctx, cx + 1, by - 1, eye);
      px(ctx, cx, by, beak);
    }

    // Wings
    const wingY = by + 1 + wingUp;
    for (let i = 1; i <= wingSpan; i++) {
      const wingColor = i === 1 ? body : (i === wingSpan ? shadow : accent);
      px(ctx, bx - i, wingY, wingColor);
      px(ctx, bx + w - 1 + i, wingY, wingColor);
    }
    if (wingSpan > 2) {
      px(ctx, bx - 1, wingY - 1, accent);
      px(ctx, bx + w, wingY - 1, accent);
    }

    // Tail feathers
    if (dir === UP) {
      const tailLen = params.tailLen || 2;
      for (let t = 0; t < tailLen; t++) {
        px(ctx, cx - 1 + t, by + h + t, accent);
        px(ctx, cx + 1 - t, by + h + t, accent);
      }
    }
    px(ctx, cx - 1, by + h, outline);
    px(ctx, cx + 1, by + h, outline);
  } else {
    const flip = dir === LEFT;
    const f = flip ? (x) => 15 - x : (x) => x;
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);

    for (let i = 1; i < w - 1; i++) px(ctx, f(bx + i), by, body);
    for (let r = 1; r < h - 1; r++) for (let i = 0; i < w; i++) px(ctx, f(bx + i), by + r, body);
    for (let i = 1; i < w - 1; i++) px(ctx, f(bx + i), by + h - 1, shadow);
    for (let i = 1; i < w - 1; i++) px(ctx, f(bx + i), by + 1, highlight);
    if (params.breast) {
      for (let i = 1; i < w - 1; i++) px(ctx, f(bx + i), by + h - 2, params.breast);
    }

    // Head
    const headX = bx + w;
    px(ctx, f(headX), by - 1, body); px(ctx, f(headX), by, body);
    px(ctx, f(headX + 1), by - 1, body); px(ctx, f(headX + 1), by, body);
    px(ctx, f(headX + 1), by - 1, eye);
    px(ctx, f(headX + 2), by, beak);

    // Wing (folded)
    const wingY = by + 1 - wingUp;
    for (let i = 0; i < Math.max(2, w - 2); i++) px(ctx, f(bx + 1 + i), wingY, accent);

    // Tail
    const tailLen = params.tailLen || 2;
    for (let t = 0; t < tailLen; t++) px(ctx, f(bx - 1 - t), by + h - 2 + t, accent);
    px(ctx, f(bx - tailLen), by + h - 2 + tailLen - 1, shadow);

    // Feet
    px(ctx, f(bx + 1), by + h, outline);
    px(ctx, f(bx + 2), by + h, outline);
    px(ctx, f(bx + 1), by + h + 1, outline);
  }
}
