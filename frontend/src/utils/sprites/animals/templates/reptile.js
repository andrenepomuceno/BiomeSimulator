/**
 * Reptile drawing template — 64x64 design grid.
 * Used by: lizard, crocodile.
 *
 * Scale texture via noise, slit-pupil eyes, claw detail, belly plates.
 */
import { px, rect, darken, lighten, noise, gradientV, rimLight, ao, speckle, DOWN, UP, LEFT } from '../../helpers.js';

export function drawReptile(ctx, params, dir, frame) {
  const { body, accent, eye, w, h, tailLen } = params;
  const shadow = darken(body, 0.15);
  const shadow2 = darken(body, 0.25);
  const highlight = lighten(body, 0.10);
  const outline = darken(body, 0.3);
  const scaleTex = darken(body, 0.07);
  const cx = 32;
  const cy = 32;
  const legShift = frame === 0 ? -3 : frame === 2 ? 3 : 0;

  function scaleRegion(x, y, rw, rh) {
    speckle(ctx, x, y, rw, rh, [scaleTex, darken(body, 0.12), lighten(body, 0.04)], 0.28);
  }

  if (dir === DOWN || dir === UP) {
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);
    const halfW = Math.floor(w / 2);

    // Body
    rect(ctx, bx + 3, by, w - 6, 3, body);
    rect(ctx, bx + 1, by + 2, w - 2, 2, body);
    gradientV(ctx, bx, by + 4, w, h - 8, body, shadow);
    rect(ctx, bx + 1, by + h - 4, w - 2, 2, shadow);
    rect(ctx, bx + 3, by + h - 2, w - 6, 2, shadow2);
    // Belly accent
    rect(ctx, bx + 3, by + 3, w - 6, h - 6, accent);
    // Scale texture
    scaleRegion(bx + 1, by + 2, w - 2, h - 4);
    rimLight(ctx, bx + 3, by, w - 6, 3, lighten(body, 0.10), 'top');
    ao(ctx, bx + 2, by + h - 3, w - 4, 3, 0.08);
    // Spine
    if (params.spine) for (let r = 0; r < h; r += 3) rect(ctx, cx, by + r, 2, 2, params.spine);
    // Scutes
    if (params.scutes) for (let r = 0; r < h; r += 5) {
      rect(ctx, cx - 3, by + r, 2, 2, params.scutes);
      rect(ctx, cx + 3, by + r, 2, 2, params.scutes);
    }

    // Head
    const headW = params.snout ? Math.min(16, w + 2) : Math.max(10, w - 4);
    const hx = cx - Math.floor(headW / 2);
    const headY = dir === DOWN ? by - 7 : by + h;
    rect(ctx, hx + 1, headY, headW - 2, 3, body);
    rect(ctx, hx, headY + 3, headW, 4, body);
    rect(ctx, hx + 3, headY - (dir === DOWN ? 3 : 0), 3, 3, body);
    rect(ctx, hx + headW - 6, headY - (dir === DOWN ? 3 : 0), 3, 3, body);
    scaleRegion(hx + 1, headY + 1, headW - 2, 4);
    if (dir === DOWN) {
      // Slit-pupil eyes
      rect(ctx, hx + 3, headY + 3, 3, 3, eye);
      rect(ctx, hx + headW - 6, headY + 3, 3, 3, eye);
      px(ctx, hx + 4, headY + 3, '#000000'); // slit pupil
      px(ctx, hx + headW - 5, headY + 3, '#000000');
      px(ctx, hx + 3, headY + 3, '#ffffff');
      px(ctx, hx + headW - 4, headY + 3, '#ffffff');
      if (params.snout) {
        rect(ctx, hx + 3, headY, 3, 2, shadow);
        rect(ctx, hx + headW - 6, headY, 3, 2, shadow);
      }
      if (params.teeth) {
        rect(ctx, hx + 3, headY + 7, 2, 2, '#f0f0e0');
        rect(ctx, hx + headW - 5, headY + 7, 2, 2, '#f0f0e0');
        px(ctx, hx + 5, headY + 7, '#f0f0e0');
        px(ctx, hx + headW - 7, headY + 7, '#f0f0e0');
      }
    }

    // Tail
    const tailBase = dir === DOWN ? by + h : by - 3;
    for (let t = 1; t <= tailLen; t++) {
      const tw = Math.max(2, halfW + 3 - t * 2);
      const ty = dir === DOWN ? tailBase + (t - 1) * 3 : tailBase - (t - 1) * 3;
      const tc = t === tailLen ? shadow2 : body;
      for (let ti = 0; ti < tw; ti += 2) rect(ctx, cx - Math.floor(tw / 2) + ti, ty, 2, 3, tc);
      if (t < tailLen) scaleRegion(cx - Math.floor(tw / 2), ty, tw, 3);
    }

    // Legs
    const fLegY = by + (dir === DOWN ? 1 : h - 3);
    const bLegY = by + (dir === DOWN ? h - 3 : 1);
    rect(ctx, bx - 4, fLegY + legShift, 4, 3, outline);
    rect(ctx, bx + w, fLegY - legShift, 4, 3, outline);
    rect(ctx, bx - 4, bLegY - legShift, 4, 3, outline);
    rect(ctx, bx + w, bLegY + legShift, 4, 3, outline);
    // Claw tips
    rect(ctx, bx - 6, fLegY + legShift, 2, 2, outline);
    rect(ctx, bx + w + 4, fLegY - legShift, 2, 2, outline);
    px(ctx, bx - 6, fLegY + legShift + 2, shadow2);
    px(ctx, bx + w + 5, fLegY - legShift + 2, shadow2);
  } else {
    // LEFT / RIGHT
    const flip = dir === LEFT;
    const f = flip ? (x) => 63 - x : (x) => x;
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);

    // Body
    for (let c = 3; c < w - 3; c++) { px(ctx, f(bx + c), by, body); px(ctx, f(bx + c), by + 1, body); }
    for (let r = 2; r < h - 2; r++) for (let c = 0; c < w; c++) px(ctx, f(bx + c), by + r, body);
    for (let c = 3; c < w - 3; c++) { px(ctx, f(bx + c), by + h - 2, shadow); px(ctx, f(bx + c), by + h - 1, shadow2); }
    // Belly
    for (let c = 2; c < w - 2; c++) { px(ctx, f(bx + c), by + h - 3, accent); px(ctx, f(bx + c), by + h - 4, accent); }
    // Spine on top
    if (params.spine) for (let c = 0; c < w; c += 5) rect(ctx, f(bx + c), by, 2, 2, params.spine);
    if (params.scutes) for (let c = 3; c < w; c += 5) rect(ctx, f(bx + c), by, 2, 2, params.scutes);
    // Scale texture (multi-tone)
    for (let r = 2; r < h - 2; r++) {
      for (let c = 1; c < w - 1; c++) {
        const n = noise(bx + c, by + r);
        if (n > 0.74) px(ctx, f(bx + c), by + r, scaleTex);
        else if (n > 0.70) px(ctx, f(bx + c), by + r, darken(body, 0.12));
        else if (n < 0.10) px(ctx, f(bx + c), by + r, lighten(body, 0.04));
      }
    }

    // Head
    const headX = bx + w;
    const headW = params.snout ? 10 : 7;
    for (let hx = 0; hx < headW; hx++) for (let hy = 0; hy < h; hy++) px(ctx, f(headX + hx), by + hy, body);
    rect(ctx, f(headX + headW - 3), by, 3, 2, highlight);
    // Eye (slit pupil)
    rect(ctx, f(headX + headW - 3), by + (h > 6 ? 3 : 1), 3, 3, eye);
    px(ctx, f(headX + headW - 2), by + (h > 6 ? 4 : 2), '#000000');
    px(ctx, f(headX + headW - 3), by + (h > 6 ? 3 : 1), '#ffffff');
    if (params.teeth) {
      rect(ctx, f(headX + headW - 2), by + h - 3, 2, 2, '#f0f0e0');
      rect(ctx, f(headX + headW), by + h - 3, 2, 2, '#f0f0e0');
    }

    // Tail
    for (let t = 1; t <= tailLen; t++) {
      const tx = bx - t * 3;
      const th = Math.max(2, h - Math.floor(t * 1.5));
      const ty = cy - Math.floor(th / 2);
      const tc = t === tailLen ? shadow2 : body;
      for (let ti = 0; ti < th; ti++) px(ctx, f(tx), ty + ti, tc);
      px(ctx, f(tx + 1), ty, tc);
      if (t < tailLen) {
        for (let ti = 0; ti < th; ti++) {
          if (noise(tx, ty + ti) > 0.72) px(ctx, f(tx), ty + ti, scaleTex);
        }
      }
    }

    // Legs
    rect(ctx, f(bx + w - 5), by + h + legShift, 3, 3, outline);
    rect(ctx, f(bx + w - 3), by + h + 3 + legShift, 2, 2, outline);
    rect(ctx, f(bx + 2), by + h - legShift, 3, 3, outline);
    rect(ctx, f(bx + 4), by + h + 3 - legShift, 2, 2, outline);
  }
}
