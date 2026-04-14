/**
 * Reptile drawing template — 32×32 design grid.
 * Used by: lizard, crocodile.
 */
import { px, rect, darken, lighten, DOWN, UP, LEFT } from '../helpers.js';

export function drawReptile(ctx, params, dir, frame) {
  const { body, accent, eye, w, h, tailLen } = params;
  const shadow = darken(body, 0.15);
  const highlight = lighten(body, 0.1);
  const outline = darken(body, 0.3);
  const cx = 16;
  const cy = 16;
  const legShift = frame === 0 ? -2 : frame === 2 ? 2 : 0;

  if (dir === DOWN || dir === UP) {
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);
    const halfW = Math.floor(w / 2);

    // Body
    rect(ctx, bx + 2, by, w - 4, 2, body);
    rect(ctx, bx, by + 2, w, h - 4, body);
    rect(ctx, bx + 2, by + h - 2, w - 4, 2, shadow);
    // Belly accent
    rect(ctx, bx + 2, by + 2, w - 4, h - 4, accent);
    // Spine
    if (params.spine) for (let r = 0; r < h; r += 2) rect(ctx, cx, by + r, 2, 2, params.spine);
    // Scutes (armored ridges)
    if (params.scutes) for (let r = 0; r < h; r += 4) {
      rect(ctx, cx - 2, by + r, 2, 2, params.scutes);
      rect(ctx, cx + 2, by + r, 2, 2, params.scutes);
    }

    // Head
    const headW = params.snout ? Math.min(10, w) : Math.max(6, w - 4);
    const hx = cx - Math.floor(headW / 2);
    const headY = dir === DOWN ? by - 4 : by + h;
    rect(ctx, hx, headY, headW, 4, body);
    rect(ctx, hx + 2, headY - (dir === DOWN ? 2 : 0), 2, 2, body);
    rect(ctx, hx + headW - 4, headY - (dir === DOWN ? 2 : 0), 2, 2, body);
    if (dir === DOWN) {
      rect(ctx, hx + 2, headY + 2, 2, 2, eye);
      rect(ctx, hx + headW - 4, headY + 2, 2, 2, eye);
      if (params.snout) {
        rect(ctx, hx + 2, headY, 2, 2, shadow);
        rect(ctx, hx + headW - 4, headY, 2, 2, shadow);
      }
      if (params.teeth) {
        rect(ctx, hx + 2, headY + 4, 2, 2, '#f0f0e0');
        rect(ctx, hx + headW - 4, headY + 4, 2, 2, '#f0f0e0');
      }
    }

    // Tail
    const tailBase = dir === DOWN ? by + h : by - 2;
    for (let t = 1; t <= tailLen; t++) {
      const tw = Math.max(2, halfW + 2 - t * 2);
      const ty = dir === DOWN ? tailBase + (t - 1) * 2 : tailBase - (t - 1) * 2;
      for (let ti = 0; ti < tw; ti += 2) rect(ctx, cx - Math.floor(tw / 2) + ti, ty, 2, 2, t === tailLen ? shadow : body);
    }

    // Legs
    const fLegY = by + (dir === DOWN ? 0 : h - 2);
    const bLegY = by + (dir === DOWN ? h - 2 : 0);
    rect(ctx, bx - 2, fLegY + legShift, 2, 2, outline);
    rect(ctx, bx + w, fLegY - legShift, 2, 2, outline);
    rect(ctx, bx - 2, bLegY - legShift, 2, 2, outline);
    rect(ctx, bx + w, bLegY + legShift, 2, 2, outline);
    rect(ctx, bx - 4, fLegY + legShift, 2, 2, outline);
    rect(ctx, bx + w + 2, fLegY - legShift, 2, 2, outline);
  } else {
    const flip = dir === LEFT;
    const f = flip ? (x) => 31 - x : (x) => x;
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);

    // Body
    for (let c = 2; c < w - 2; c += 2) rect(ctx, f(bx + c), by, 2, 2, body);
    for (let r = 2; r < h - 2; r += 2) for (let c = 0; c < w; c += 2) rect(ctx, f(bx + c), by + r, 2, 2, body);
    for (let c = 2; c < w - 2; c += 2) rect(ctx, f(bx + c), by + h - 2, 2, 2, shadow);
    // Belly
    for (let c = 2; c < w - 2; c += 2) rect(ctx, f(bx + c), by + h - 2, 2, 2, accent);
    // Spine on top edge
    if (params.spine) for (let c = 0; c < w; c += 4) rect(ctx, f(bx + c), by, 2, 2, params.spine);
    if (params.scutes) for (let c = 2; c < w; c += 4) rect(ctx, f(bx + c), by, 2, 2, params.scutes);

    // Head
    const headX = bx + w;
    const headW = params.snout ? 6 : 4;
    for (let hx = 0; hx < headW; hx += 2) for (let hy = 0; hy < h; hy += 2) rect(ctx, f(headX + hx), by + hy, 2, 2, body);
    rect(ctx, f(headX + headW - 2), by, 2, 2, highlight);
    rect(ctx, f(headX + headW - 2), by + (h > 4 ? 2 : 0), 2, 2, eye);
    if (params.teeth) {
      rect(ctx, f(headX + headW - 2), by + h - 2, 2, 2, '#f0f0e0');
      rect(ctx, f(headX + headW), by + h - 2, 2, 2, '#f0f0e0');
    }

    // Tail
    for (let t = 1; t <= tailLen; t++) {
      const tx = bx - t * 2;
      const th = Math.max(2, h - Math.floor(t * 1.2));
      const ty = cy - Math.floor(th / 2);
      for (let ti = 0; ti < th; ti += 2) rect(ctx, f(tx), ty + ti, 2, 2, t === tailLen ? shadow : body);
    }

    // Legs
    rect(ctx, f(bx + w - 4), by + h + legShift, 2, 2, outline);
    rect(ctx, f(bx + w - 2), by + h + 2 + legShift, 2, 2, outline);
    rect(ctx, f(bx + 2), by + h - legShift, 2, 2, outline);
    rect(ctx, f(bx + 4), by + h + 2 - legShift, 2, 2, outline);
  }
}
