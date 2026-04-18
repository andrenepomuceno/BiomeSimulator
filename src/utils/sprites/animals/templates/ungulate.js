/**
 * Ungulate drawing template — deer/goat focused silhouette.
 */
import { px, rect, ellipse, darken, lighten, gradientV, DOWN, UP, LEFT } from '../../helpers.js';
import { drawEyePair, drawEarPair, drawNose, drawHorns, drawAntlers, drawHoofLeg, drawEyeSide, drawRoundedSideBody } from '../bodyParts.js';

export function drawUngulate(ctx, params, dir, frame) {
  const { body, accent, eye, w, h } = params;
  const shadow = darken(body, 0.16);
  const shadow2 = darken(body, 0.26);
  const highlight = lighten(body, 0.10);
  const outline = darken(body, 0.32);
  const hoofCol = params.pawColor || outline;
  const eyeIris = params.eyeIris || eye;
  const eyeWhite = params.eyeWhite || '#ffffff';
  const spotCol = params.spotColor || accent;
  const antlerBase = params.antlerBase || '#b08050';
  const antlerMid = params.antlerMid || '#c09868';
  const antlerTip = params.antlerTip || '#d0b080';
  const hornBase = params.hornBase || '#d0d0d0';
  const hornTip = params.hornTip || '#e8e8e8';
  const beardLen = params.beardLen || 2;
  const cx = 32;
  const cy = 35;
  const legShift = frame === 0 ? -2 : frame === 2 ? 2 : 0;

  if (dir === DOWN || dir === UP) {
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);

    // Slender legs with hooves
    drawHoofLeg(ctx, bx + 2, by + h + legShift, 8, shadow, shadow2, hoofCol);
    drawHoofLeg(ctx, bx + w - 6, by + h - legShift, 8, shadow, shadow2, hoofCol);
    drawHoofLeg(ctx, bx + 5, by + h - legShift, 8, body, shadow, hoofCol);
    drawHoofLeg(ctx, bx + w - 9, by + h + legShift, 8, body, shadow, hoofCol);

    // Body
    ellipse(ctx, cx, by + Math.floor(h * 0.50), Math.max(7, Math.floor(w * 0.45)), Math.max(4, Math.floor(h * 0.30)), body);
    rect(ctx, bx + 4, by + 3, w - 8, 2, highlight);
    rect(ctx, bx + 4, by + h - 4, w - 8, 2, shadow);

    // Spots for deer
    if (params.spots) {
      rect(ctx, bx + 6, by + 5, 2, 2, spotCol);
      rect(ctx, bx + w - 8, by + 7, 2, 2, spotCol);
      rect(ctx, bx + 10, by + 8, 2, 2, spotCol);
    }

    // Head
    const headW = 11;
    const hx = cx - Math.floor(headW / 2);
    const hy = by - 7;
    ellipse(ctx, cx, hy + 4, 5, 4, body);
    drawEyePair(ctx, hx, hy + 2, headW, 3, 0, eyeWhite, eyeIris, 3);
    if (params.noseColor) drawNose(ctx, cx, hy + 6, params.noseColor, true);
    if (params.earH) drawEarPair(ctx, hx, hy, headW, params.earH, body, params.earInner, params.pointedEars);
    if (params.horns) drawHorns(ctx, hx, hy - 2, headW, 4, hornBase, hornTip);
    if (params.antlers) drawAntlers(ctx, hx, hy - 3, headW, antlerBase, antlerMid, antlerTip);
    if (params.beard) rect(ctx, cx - 1, hy + 7, 2, beardLen, accent);
    return;
  }

  // Side view
  const flip = dir === LEFT;
  const f = flip ? (x) => 63 - x : (x) => x;
  const bx = cx - Math.floor(w / 2);
  const by = cy - Math.floor(h / 2);

  // Legs
  drawHoofLeg(ctx, f(bx + 1), by + h, 8, shadow, shadow2, hoofCol);
  drawHoofLeg(ctx, f(bx + 5), by + h + legShift, 8, shadow, shadow2, hoofCol);
  drawHoofLeg(ctx, f(bx + w - 7), by + h - legShift, 8, body, shadow, hoofCol);
  drawHoofLeg(ctx, f(bx + w - 3), by + h, 8, body, shadow, hoofCol);

  // Torso (rounded side silhouette)
  drawRoundedSideBody(ctx, f, bx + 1, by + 1, w - 2, h - 1, highlight, body, shadow2, {
    edgeRound: 3,
    bellyDepth: 1,
  });
  rect(ctx, f(bx + 5), by + 2, w - 10, 1, lighten(body, 0.14));

  if (params.spots) {
    rect(ctx, f(bx + 7), by + 5, 2, 2, spotCol);
    rect(ctx, f(bx + 11), by + 7, 2, 2, spotCol);
  }

  // Head and neck
  const headX = bx + w - 1;
  const headY = by - 1;
  ellipse(ctx, f(headX + 4), headY + 5, 4, 4, body);
  rect(ctx, f(headX + 7), headY + 6, 3, 2, darken(body, 0.05));
  if (params.noseColor) rect(ctx, f(headX + 9), headY + 6, 2, 2, params.noseColor);
  drawEyeSide(ctx, f, headX + 2, headY + 4, eyeWhite, eyeIris);

  // Horns/antlers side
  if (params.horns) {
    rect(ctx, f(headX + 3), headY - 4, 2, 5, hornBase);
    rect(ctx, f(headX + 5), headY - 5, 2, 6, hornTip);
  }
  if (params.antlers) {
    rect(ctx, f(headX + 3), headY - 4, 2, 5, antlerBase);
    rect(ctx, f(headX + 1), headY - 7, 2, 3, antlerMid);
    rect(ctx, f(headX + 6), headY - 8, 2, 3, antlerTip);
  }
  if (params.beard) rect(ctx, f(headX + 6), headY + 8, 2, beardLen + 1, accent);

  // Small tail
  rect(ctx, f(bx - 1), by + 4, 2, 2, shadow);
}
