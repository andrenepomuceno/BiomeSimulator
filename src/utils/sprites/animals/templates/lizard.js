/**
 * Lizard drawing template -- 64x64 design grid.
 */
import { px, rect, darken, lighten, blend, shadedEllipse, scalePattern, quadraticThick, thickLine, DOWN, UP, LEFT } from '../../helpers.js';
import { drawReptileEye, drawTongue, drawLizardLegTop, drawLizardLegSide, drawLizardHeadTop, drawLizardHeadSide } from '../bodyParts.js';

export function drawLizard(ctx, params, dir, frame) {
  const { body, accent, eye } = params;
  const cx = 32;
  const outline   = darken(body, 0.36);
  const highlight = lighten(body, 0.14);
  const shadow    = darken(body, 0.18);
  const belly     = params.belly || lighten(accent, 0.08);
  const scaleTex  = darken(body, 0.08);
  const legShift  = frame === 0 ? 0 : frame === 1 ? -2 : 2;
  const tailSway  = frame === 0 ? 0 : frame === 1 ? -1 : 1;

  if (dir === DOWN || dir === UP) {
    const facingDown = dir === DOWN;
    const neckDir = facingDown ? -1 : 1;

    const bRx = 5, bRy = 9, bCy = 38;
    shadedEllipse(ctx, cx, bCy, bRx, bRy, body, {
      highlight, shadow,
      overlay: belly, overlayW: 2,
      texture: true,
      texColors: [scaleTex, darken(body, 0.12), lighten(body, 0.04)],
      texDensity: 0.26,
    });
    if (params.spine) {
      for (let dy = -bRy + 2; dy <= bRy - 2; dy++) px(ctx, cx, bCy + dy, params.spine);
    }

    const neckY0 = facingDown ? bCy - bRy - 1 : bCy + bRy + 1;
    for (let i = 0; i < 5; i++) {
      const hw = Math.max(2, 4 - Math.round(i * 0.5));
      rect(ctx, cx - hw, neckY0 + i * neckDir, hw * 2 + 1, 1, blend(highlight, body, i / 4));
    }

    const headBase = neckY0 + 5 * neckDir;
    const headTip  = headBase + 9 * neckDir;
    drawLizardHeadTop(ctx, cx, headBase, headTip, body, highlight, eye, facingDown);
    if (facingDown && frame === 2) {
      const tipY = headTip + neckDir;
      drawTongue(ctx, cx, tipY, 3, neckDir);
    }

    const tailBaseY = facingDown ? bCy + bRy + 1 : bCy - bRy - 1;
    const tailDir   = facingDown ? 1 : -1;
    const cpX = cx + 10 * tailSway;
    const cpY = tailBaseY + 15 * tailDir;
    quadraticThick(ctx, cx, tailBaseY, cpX, cpY, cx + 4 * tailSway, tailBaseY + 30 * tailDir, 2, body, 0.9);
    px(ctx, cx + 4 * tailSway, tailBaseY + 30 * tailDir, outline);

    const fLY = bCy - 3;
    drawLizardLegTop(ctx, cx - bRx, fLY, -1, legShift, shadow, outline);
    drawLizardLegTop(ctx, cx + bRx, fLY, 1, -legShift, shadow, outline);
    const rLY = bCy + 5;
    drawLizardLegTop(ctx, cx - bRx, rLY, -1, -legShift, shadow, outline);
    drawLizardLegTop(ctx, cx + bRx, rLY, 1, legShift, shadow, outline);

  } else {
    const flip = dir === LEFT;
    const f    = flip ? (x) => 63 - x : (x) => x;

    const bW = 20, bH = 9;
    const bx = cx - 12;
    const by = 37;
    for (let dy = 0; dy < bH; dy++) {
      const inset = dy === 0 || dy === bH - 1 ? 3 : (dy === 1 || dy === bH - 2 ? 1 : 0);
      rect(ctx, f(bx + inset), by + dy, bW - inset * 2, 1, blend(highlight, shadow, dy / (bH - 1)));
    }
    scalePattern(ctx, bx + 2, by + 1, bW - 4, bH - 3, blend(highlight, shadow, 0.5), scaleTex, 3);
    rect(ctx, f(bx + 2), by + bH - 3, bW - 4, 2, belly);
    if (params.spine) {
      for (let i = 2; i < bW; i += 4) rect(ctx, f(bx + i), by, 2, 2, params.spine);
    }

    const hBaseX = bx + bW;
    drawLizardHeadSide(ctx, f, hBaseX, by, bH, body, highlight, eye);
    if (frame === 2) {
      thickLine(ctx, f(hBaseX + 9), by + bH - 2, f(hBaseX + 11), by + bH - 3, 0, '#cc2222');
      thickLine(ctx, f(hBaseX + 9), by + bH - 2, f(hBaseX + 11), by + bH - 1, 0, '#cc2222');
    }

    const droop = 3 + tailSway;
    quadraticThick(ctx, f(bx), by + 4, f(bx - 14), by + 5 + droop, f(bx - 28), by + 7 + droop, 3, body, 0.9);
    px(ctx, f(bx - 28), by + 7 + droop, outline);

    const rLX = bx + 4;
    drawLizardLegSide(ctx, f, rLX, by + bH, legShift, shadow, outline, -1);
    const fLX = bx + bW - 5;
    drawLizardLegSide(ctx, f, fLX, by + bH, -legShift, shadow, outline, 1);
  }
}