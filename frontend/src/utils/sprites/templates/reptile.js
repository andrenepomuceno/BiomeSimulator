/**
 * Reptile drawing template.
 * Used by: lizard, crocodile.
 */
import { px, rect, darken, lighten, DOWN, UP, LEFT } from '../helpers.js';

export function drawReptile(ctx, params, dir, frame) {
  const { body, accent, eye, w, h, tailLen } = params;
  const shadow = darken(body, 0.15);
  const highlight = lighten(body, 0.1);
  const outline = darken(body, 0.3);
  const cx = 8;
  const cy = 8;
  const legShift = frame === 0 ? -1 : frame === 2 ? 1 : 0;

  if (dir === DOWN || dir === UP) {
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);
    const halfW = Math.floor(w / 2);

    rect(ctx, bx + 1, by, w - 2, 1, body);
    rect(ctx, bx, by + 1, w, h - 2, body);
    rect(ctx, bx + 1, by + h - 1, w - 2, 1, shadow);
    rect(ctx, bx + 1, by + 1, w - 2, h - 2, accent);
    if (params.spine) for (let r = 0; r < h; r++) px(ctx, cx, by + r, params.spine);
    if (params.scutes) for (let r = 0; r < h; r += 2) {
      px(ctx, cx - 1, by + r, params.scutes);
      px(ctx, cx + 1, by + r, params.scutes);
    }

    const headW = params.snout ? Math.min(5, w) : Math.max(3, w - 2);
    const hx = cx - Math.floor(headW / 2);
    const headY = dir === DOWN ? by - 2 : by + h;
    rect(ctx, hx, headY, headW, 2, body);
    px(ctx, hx + 1, headY - (dir === DOWN ? 1 : 0), body);
    px(ctx, hx + headW - 2, headY - (dir === DOWN ? 1 : 0), body);
    if (dir === DOWN) {
      px(ctx, hx + 1, headY + 1, eye);
      px(ctx, hx + headW - 2, headY + 1, eye);
      if (params.snout) {
        px(ctx, hx + 1, headY, shadow);
        px(ctx, hx + headW - 2, headY, shadow);
      }
      if (params.teeth) {
        px(ctx, hx + 1, headY + 2, '#f0f0e0');
        px(ctx, hx + headW - 2, headY + 2, '#f0f0e0');
      }
    }

    const tailBase = dir === DOWN ? by + h : by - 1;
    for (let t = 1; t <= tailLen; t++) {
      const tw = Math.max(1, halfW + 1 - t);
      const ty = dir === DOWN ? tailBase + t - 1 : tailBase - t + 1;
      for (let ti = 0; ti < tw; ti++) px(ctx, cx - Math.floor(tw / 2) + ti, ty, t === tailLen ? shadow : body);
    }

    const fLegY = by + (dir === DOWN ? 0 : h - 1);
    const bLegY = by + (dir === DOWN ? h - 1 : 0);
    px(ctx, bx - 1, fLegY + legShift, outline);
    px(ctx, bx + w, fLegY - legShift, outline);
    px(ctx, bx - 1, bLegY - legShift, outline);
    px(ctx, bx + w, bLegY + legShift, outline);
    px(ctx, bx - 2, fLegY + legShift, outline);
    px(ctx, bx + w + 1, fLegY - legShift, outline);
  } else {
    const flip = dir === LEFT;
    const f = flip ? (x) => 15 - x : (x) => x;
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);

    for (let c = 1; c < w - 1; c++) px(ctx, f(bx + c), by, body);
    for (let r = 1; r < h - 1; r++) for (let c = 0; c < w; c++) px(ctx, f(bx + c), by + r, body);
    for (let c = 1; c < w - 1; c++) px(ctx, f(bx + c), by + h - 1, shadow);
    for (let c = 1; c < w - 1; c++) px(ctx, f(bx + c), by + h - 1, accent);
    if (params.spine) for (let c = 0; c < w; c += 2) px(ctx, f(bx + c), by, params.spine);
    if (params.scutes) for (let c = 1; c < w; c += 2) px(ctx, f(bx + c), by, params.scutes);

    const headX = bx + w;
    const headW = params.snout ? 3 : 2;
    for (let hx = 0; hx < headW; hx++) for (let hy = 0; hy < h; hy++) px(ctx, f(headX + hx), by + hy, body);
    px(ctx, f(headX + headW - 1), by, highlight);
    px(ctx, f(headX + headW - 1), by + (h > 2 ? 1 : 0), eye);
    if (params.teeth) {
      px(ctx, f(headX + headW - 1), by + h - 1, '#f0f0e0');
      px(ctx, f(headX + headW), by + h - 1, '#f0f0e0');
    }

    for (let t = 1; t <= tailLen; t++) {
      const tx = bx - t;
      const th = Math.max(1, h - Math.floor(t * 0.6));
      const ty = cy - Math.floor(th / 2);
      for (let ti = 0; ti < th; ti++) px(ctx, f(tx), ty + ti, t === tailLen ? shadow : body);
    }

    px(ctx, f(bx + w - 2), by + h + legShift, outline);
    px(ctx, f(bx + w - 1), by + h + 1 + legShift, outline);
    px(ctx, f(bx + 1), by + h - legShift, outline);
    px(ctx, f(bx + 2), by + h + 1 - legShift, outline);
  }
}
