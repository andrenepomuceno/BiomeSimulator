/**
 * Ursid drawing template — bear focused silhouette.
 */
import { px, rect, ellipse, darken, lighten, gradientV, DOWN, UP, LEFT } from '../../helpers.js';
import { drawEyePair, drawEarPair, drawNose, drawMuzzle, drawFurTexture, drawEyeSide } from '../bodyParts.js';

export function drawUrsid(ctx, params, dir, frame) {
  const { body, accent, eye, w, h } = params;
  const shadow = darken(body, 0.18);
  const shadow2 = darken(body, 0.30);
  const highlight = lighten(body, 0.10);
  const highlight2 = lighten(body, 0.18);
  const outline = darken(body, 0.35);
  const pawCol = params.pawColor || outline;
  const eyeIris = params.eyeIris || eye;
  const eyeWhite = params.eyeWhite || '#ffffff';
  const cx = 32;
  const cy = 36;
  const legShift = frame === 0 ? -1 : frame === 2 ? 1 : 0;

  if (dir === DOWN || dir === UP) {
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);

    // Heavy legs and paws
    rect(ctx, bx + 2, by + h + legShift, 4, 6, shadow);
    rect(ctx, bx + w - 6, by + h - legShift, 4, 6, shadow);
    rect(ctx, bx + 6, by + h - legShift, 4, 6, body);
    rect(ctx, bx + w - 10, by + h + legShift, 4, 6, body);
    rect(ctx, bx + 2, by + h + 5 + legShift, 4, 1, pawCol);
    rect(ctx, bx + w - 6, by + h + 5 - legShift, 4, 1, pawCol);

    // Broad torso and shoulder hump
    ellipse(ctx, cx, by + Math.floor(h * 0.50), Math.max(8, Math.floor(w * 0.46)), Math.max(5, Math.floor(h * 0.36)), body);
    rect(ctx, bx + 5, by + 1, w - 10, 2, highlight2);
    rect(ctx, bx + 7, by, w - 14, 1, lighten(body, 0.16));
    rect(ctx, bx + 5, by + h - 4, w - 10, 2, shadow);
    drawFurTexture(ctx, bx + 4, by + 3, w - 8, h - 7, body, Math.PI / 2, 0.24);

    // Head
    const headW = 14;
    const hx = cx - Math.floor(headW / 2);
    const hy = by - 7;
    ellipse(ctx, cx, hy + 4, 7, 4, body);
    drawEyePair(ctx, hx, hy + 2, headW, 4, 0, eyeWhite, eyeIris, 3);
    if (params.noseColor) drawNose(ctx, cx, hy + 6, params.noseColor, true);
    if (params.muzzle) drawMuzzle(ctx, cx, hy + 5, params.muzzle);
    if (params.earH) drawEarPair(ctx, hx + 1, hy, headW - 2, Math.max(3, params.earH - 1), body, params.earInner, false);
    return;
  }

  // Side view
  const flip = dir === LEFT;
  const f = flip ? (x) => 63 - x : (x) => x;
  const bx = cx - Math.floor(w / 2);
  const by = cy - Math.floor(h / 2);

  rect(ctx, f(bx + 1), by + h, 3, 6, shadow);
  rect(ctx, f(bx + 6), by + h + legShift, 3, 6, shadow);
  rect(ctx, f(bx + w - 8), by + h - legShift, 3, 6, body);
  rect(ctx, f(bx + w - 3), by + h, 3, 6, body);
  rect(ctx, f(bx + 1), by + h + 5, 3, 1, pawCol);
  rect(ctx, f(bx + w - 8), by + h + 5, 3, 1, pawCol);

  gradientV(ctx, bx + 1, by + 2, w - 2, h - 1, highlight2, shadow2);
  rect(ctx, f(bx + 7), by + 1, w - 12, 2, highlight2);
  rect(ctx, f(bx + 8), by, w - 14, 1, lighten(body, 0.14));
  drawFurTexture(ctx, bx + 3, by + 3, w - 6, h - 4, body, 0, 0.22);

  const headX = bx + w - 1;
  const headY = by - 1;
  ellipse(ctx, f(headX + 4), headY + 6, 5, 5, body);
  if (params.muzzle) rect(ctx, f(headX + 6), headY + 7, 4, 3, params.muzzle);
  if (params.noseColor) rect(ctx, f(headX + 9), headY + 7, 2, 2, params.noseColor);
  drawEyeSide(ctx, f, headX + 2, headY + 5, eyeWhite, eyeIris);

  if (params.earH) {
    rect(ctx, f(headX + 2), headY + 1, 2, 2, body);
    rect(ctx, f(headX + 5), headY, 2, 2, body);
  }

  // Tiny tail
  rect(ctx, f(bx - 1), by + 6, 2, 2, darken(body, 0.12));
}
