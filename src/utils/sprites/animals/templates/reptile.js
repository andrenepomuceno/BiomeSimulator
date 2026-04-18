/**
 * Reptile drawing template — 64x64 design grid.
 * Used by: lizard, crocodile.
 *
 * Scale texture via noise, slit-pupil eyes, claw detail, belly plates.
 */
import { px, rect, darken, lighten, noise, gradientV, rimLight, ao, speckle, thickLine, DOWN, UP, LEFT } from '../../helpers.js';
import { drawReptileEye, drawReptileHeadTop, drawReptileHeadSide, drawTongue, drawReptileLegTop, drawReptileLegSide } from '../bodyParts.js';

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
    const headY = dir === DOWN ? by - 7 : by + h;
    drawReptileHeadTop(ctx, cx, headY, headW, body, eye, dir === DOWN, { snout: params.snout, teeth: params.teeth });

    // Tail
    const tailBase = dir === DOWN ? by + h : by - 3;
    for (let t = 1; t <= tailLen; t++) {
      const tw = Math.max(2, halfW + 3 - t * 2);
      const ty = dir === DOWN ? tailBase + (t - 1) * 3 : tailBase - (t - 1) * 3;
      const tc = t === tailLen ? shadow2 : body;
      for (let ti = 0; ti < tw; ti += 2) rect(ctx, cx - Math.floor(tw / 2) + ti, ty, 2, 3, tc);
      if (t < tailLen) scaleRegion(cx - Math.floor(tw / 2), ty, tw, 3);
    }

    // Legs — jointed femur + tibia + claw tip per limb
    const fLegY = by + (dir === DOWN ? 1 : h - 3);
    const bLegY = by + (dir === DOWN ? h - 3 : 1);
    drawReptileLegTop(ctx, bx, fLegY, -1, legShift, shadow, outline, shadow2);
    drawReptileLegTop(ctx, bx + w, fLegY, 1, -legShift, shadow, outline, shadow2);
    drawReptileLegTop(ctx, bx, bLegY, -1, -legShift, shadow, outline, shadow2);
    drawReptileLegTop(ctx, bx + w, bLegY, 1, legShift, shadow, outline, shadow2);
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
    drawReptileHeadSide(ctx, f, headX, by, headW, h, body, highlight, eye, { teeth: params.teeth });

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
    // Legs — jointed thickLine (rear pair + front pair)
    const bellyY = by + h;
    drawReptileLegSide(ctx, f, bx + 3, bellyY, legShift, shadow, outline, shadow2, -2, -4);
    drawReptileLegSide(ctx, f, bx + w - 4, bellyY, -legShift, shadow, outline, shadow2, 2, 4);
  }
}
