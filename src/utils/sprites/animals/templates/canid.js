/**
 * Canid drawing template — fox/wolf focused silhouette.
 */
import { px, rect, ellipse, darken, lighten, gradientV, anisotropicSpeckle, DOWN, UP, LEFT } from '../../helpers.js';
import { drawEyePair, drawEarPair, drawNose, drawCheekPair, drawFurTexture, drawEyeSide, drawCanidHeadTop, drawCanidHeadSide, drawRoundedSideBody } from '../bodyParts.js';

export function drawCanid(ctx, params, dir, frame) {
  const { body, accent, eye, w, h } = params;
  const shadow = darken(body, 0.16);
  const shadow2 = darken(body, 0.28);
  const highlight = lighten(body, 0.10);
  const highlight2 = lighten(body, 0.18);
  const outline = darken(body, 0.34);
  const pawCol = params.pawColor || outline;
  const eyeIris = params.eyeIris || eye;
  const eyeWhite = params.eyeWhite || '#ffffff';
  const cx = 32;
  const cy = 36;
  const legShift = frame === 0 ? -2 : frame === 2 ? 2 : 0;

  if (dir === DOWN || dir === UP) {
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);

    // Legs
    rect(ctx, bx + 2, by + h + legShift, 3, 6, shadow);
    rect(ctx, bx + w - 5, by + h - legShift, 3, 6, shadow);
    rect(ctx, bx + 4, by + h - legShift, 3, 6, body);
    rect(ctx, bx + w - 7, by + h + legShift, 3, 6, body);
    rect(ctx, bx + 2, by + h + 5 + legShift, 3, 1, pawCol);
    rect(ctx, bx + w - 5, by + h + 5 - legShift, 3, 1, pawCol);

    // Body silhouette (ellipse stack instead of hard rectangles)
    ellipse(ctx, cx, by + Math.floor(h * 0.48), Math.max(7, Math.floor(w * 0.48)), Math.max(5, Math.floor(h * 0.38)), body);
    ellipse(ctx, cx, by + Math.floor(h * 0.42), Math.max(6, Math.floor(w * 0.42)), Math.max(4, Math.floor(h * 0.30)), highlight);
    rect(ctx, bx + 4, by + h - 5, w - 8, 2, shadow);
    drawFurTexture(ctx, bx + 3, by + 3, w - 6, h - 8, body, Math.PI / 2, 0.22);

    // Head
    const headW = 12;
    const hx = cx - Math.floor(headW / 2);
    const hy = by - 7;
    drawCanidHeadTop(ctx, cx, hy, headW, body, highlight);
    drawEyePair(ctx, hx, hy + 2, headW, 3, 0, eyeWhite, eyeIris, 3);
    if (params.cheeks) drawCheekPair(ctx, hx + 1, hy + 4, headW - 2, 0, params.cheeks);
    if (params.noseColor) {
      drawNose(ctx, cx, hy + 6, params.noseColor, true);
      rect(ctx, cx - 1, hy + 7, 2, 1, params.noseColor);
    }
    if (params.earH) drawEarPair(ctx, hx, hy, headW, params.earH + 1, body, params.earInner, true);

    // Belly patch (frontal)
    if (params.bellyColor) {
      const bpW = Math.max(4, Math.floor(w * 0.36));
      ellipse(ctx, cx, by + Math.floor(h * 0.62), bpW, Math.floor(h * 0.26), params.bellyColor);
    }

    // Tail
    if (params.tail) {
      const tx = cx + Math.floor(w * 0.34);
      const ty = by + h - 4;
      const tailTip = params.tailTip || lighten(accent, 0.08);
      rect(ctx, tx, ty, 4, 3, accent);
      rect(ctx, tx + 3, ty - 2, 3, 3, accent);
      rect(ctx, tx + 5, ty - 4, 3, 3, tailTip);
    }
    return;
  }

  // Side view
  const flip = dir === LEFT;
  const f = flip ? (x) => 63 - x : (x) => x;
  const bx = cx - Math.floor(w / 2);
  const by = cy - Math.floor(h / 2);

  // Legs
  rect(ctx, f(bx + 1), by + h, 2, 6, shadow);
  rect(ctx, f(bx + 5), by + h, 2, 6, shadow);
  rect(ctx, f(bx + w - 7), by + h, 2, 6, body);
  rect(ctx, f(bx + w - 3), by + h, 2, 6, body);
  rect(ctx, f(bx + 1), by + h + 5, 2, 1, pawCol);
  rect(ctx, f(bx + w - 7), by + h + 5, 2, 1, pawCol);

  // Torso (rounded side silhouette)
  drawRoundedSideBody(ctx, f, bx + 1, by + 1, w - 2, h - 1, highlight2, body, shadow2, {
    edgeRound: 3,
    bellyColor: params.bellyColor || null,
    bellyDepth: 2,
  });
  anisotropicSpeckle(ctx, bx + 3, by + 3, w - 6, h - 5, [darken(body, 0.10), body, lighten(body, 0.05)], 0.22, 0, 3.2);
  rect(ctx, f(bx + 5), by + 2, w - 10, 1, highlight2);

  // Head (longer snout)
  const headX = bx + w - 1;
  const headY = by - 2;
  drawCanidHeadSide(ctx, f, headX, headY, body, params.noseColor || null);
  drawEyeSide(ctx, f, headX + 2, headY + 5, eyeWhite, eyeIris);
  if (params.earH) {
    rect(ctx, f(headX + 2), headY - 2, 2, 4, body);
    rect(ctx, f(headX + 5), headY - 3, 2, 5, body);
  }

  // Tail plume
  if (params.tail) {
    const tx = bx - 4;
    const ty = by + 4;
    const tailTip = params.tailTip || lighten(accent, 0.08);
    rect(ctx, f(tx), ty, 4, 3, accent);
    rect(ctx, f(tx - 3), ty - 1, 3, 3, accent);
    rect(ctx, f(tx - 5), ty - 2, 2, 3, tailTip);
    rect(ctx, f(tx - 6), ty - 1, 1, 2, tailTip);
  }
}
