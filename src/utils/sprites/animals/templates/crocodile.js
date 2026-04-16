/**
 * Crocodile template — long, low silhouette with broad snout and armored tail.
 * 64x64 design grid.
 */
import { px, rect, darken, lighten, blend, speckle, shadedEllipse, scalePattern, quadraticThick, thickLine, fillPolygon, DOWN, UP, LEFT } from '../../helpers.js';
import { drawReptileEye, drawArmoredBody, drawScuteRidge } from '../bodyParts.js';

export function drawCrocodile(ctx, params, dir, frame) {
  const { body, accent, eye } = params;
  const cx = 32;
  const cy = 34;
  const outline  = darken(body, 0.36);
  const bodyHi   = lighten(body, 0.10);
  const bodySh   = darken(body, 0.18);
  const scuteCol = params.scutes || darken(body, 0.28);
  const jawCol   = lighten(accent, 0.10);
  const legOff   = frame === 0 ? 0 : frame === 1 ? -2 : 2;

  const armoredBody = (x, y, w, h) => drawArmoredBody(ctx, x, y, w, h, bodyHi, bodySh, scuteCol, scalePattern);

  if (dir === DOWN || dir === UP) {
    const facingDown = dir === DOWN;
    const bx = cx - 12;
    const by = cy - 5;

    // Body: wide armored ellipse
    armoredBody(bx, by, 24, 11);

    // Raised dorsal scute ridge
    drawScuteRidge(ctx, cx - 8, by + 2, 5, 4, scuteCol);

    // Head + snout (broad, flat) — fillPolygon for trapezoidal skull
    const headY = facingDown ? by - 8 : by + 11;
    const hDir  = facingDown ? 1 : -1;
    fillPolygon(ctx, [
      [cx - 6, headY],
      [cx + 6, headY],
      [cx + 8, headY + 6 * hDir],
      [cx - 8, headY + 6 * hDir],
    ], body);
    // Lower jaw
    rect(ctx, cx - 6, headY + 6 * hDir, 12, 2, jawCol);
    // Nostrils
    px(ctx, cx - 3, facingDown ? headY + 1 : headY - 1, outline);
    px(ctx, cx + 3, facingDown ? headY + 1 : headY - 1, outline);

    if (facingDown) {
      // Eyes with slit pupils
      drawReptileEye(ctx, cx - 7, headY + 2, eye);
      drawReptileEye(ctx, cx + 5, headY + 2, eye);
      if (params.teeth) {
        for (const tx of [cx - 5, cx - 1, cx + 2, cx + 5])
          px(ctx, tx, headY + 7, '#f0f0e0');
      }
    }

    // Tail — quadraticThick tapering curve
    const tailBaseY = facingDown ? by + 11 : by - 1;
    const tailTipY  = facingDown ? tailBaseY + 20 : tailBaseY - 20;
    const tailCpX   = cx + 6; // curve slightly off-center
    quadraticThick(ctx, cx, tailBaseY, tailCpX, (tailBaseY + tailTipY) / 2, cx + 4, tailTipY, 5, body, 0.9);
    // Scute ridge along tail spine
    for (let t = 0; t < 8; t++) {
      const prog = t / 7;
      const ty   = facingDown ? tailBaseY + t * 2 : tailBaseY - t * 2;
      px(ctx, cx + Math.round(prog * 2), ty, scuteCol);
    }

    // Legs — thickLine: femur + claw stubs
    const legYFront = by + 1, legYBack = by + 7;
    thickLine(ctx, bx,      legYFront + legOff, bx - 5, legYFront + legOff + 1, 1, outline);
    thickLine(ctx, bx + 24, legYFront - legOff, bx + 29, legYFront - legOff + 1, 1, outline);
    thickLine(ctx, bx,      legYBack - legOff,  bx - 5, legYBack - legOff + 1,  1, outline);
    thickLine(ctx, bx + 24, legYBack + legOff,  bx + 29, legYBack + legOff + 1,  1, outline);

  } else {
    const flip = dir === LEFT;
    const f = flip ? (x) => 63 - x : (x) => x;
    const bx = cx - 8;
    // Placed so leg tips (by+13) land at y≈50 = FEET_ANCHOR_Y ground plane
    const by = cy + 3;

    // Long low torso with armored plates
    armoredBody(bx, by, 18, 10);

    // Head — broad flat wedge (fillPolygon)
    const hx = bx + 18;
    fillPolygon(ctx, [
      [f(hx),      by],
      [f(hx + 14), by + 2],
      [f(hx + 14), by + 5],
      [f(hx),      by + 6],
    ], body);
    // Jaw underline
    rect(ctx, f(hx + 6), by + 5, 8, 1, jawCol);
    // Eye with slit pupil
    drawReptileEye(ctx, f(hx + 2), by, eye);
    // Nostrils
    px(ctx, f(hx + 13), by + 2, outline);
    px(ctx, f(hx + 13), by + 3, outline);
    if (params.teeth) {
      px(ctx, f(hx + 9),  by + 5, '#f0f0e0');
      px(ctx, f(hx + 11), by + 5, '#f0f0e0');
    }

    // Tail — quadraticThick tapering curve backward
    const tailStartX = flip ? 63 - bx : bx;
    quadraticThick(ctx, f(bx), by + 5, f(bx - 8), by + 6, f(bx - 16), by + 7, 4, body, 0.9);
    // Scute spine
    for (let t = 0; t < 8; t++) {
      px(ctx, f(bx - t * 2), by + 4 + Math.floor(t * 0.4), scuteCol);
    }

    // Legs — thickLine femur + tibia, reaches y≈50
    thickLine(ctx, f(bx + 3),  by + 9, f(bx + 1),  by + 13, 1, outline);
    thickLine(ctx, f(bx + 8),  by + 9, f(bx + 6),  by + 13, 1, outline);
    thickLine(ctx, f(bx + 13), by + 9, f(bx + 11), by + 13, 1, outline);
    thickLine(ctx, f(bx + 17), by + 9, f(bx + 15), by + 13, 1, outline);
  }
}
