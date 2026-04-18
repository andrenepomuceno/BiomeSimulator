import { px, rect, darken, lighten, ellipse, speckle, fillPolygon, blend } from '../../helpers.js';
import { _id, _drawIrisPupilHighlight } from './shared.js';

export function drawEye(ctx, x, y, eyeWhite, eyeIris, size = 4) {
  rect(ctx, x, y, size, size, eyeWhite);
  const irisOff = Math.floor(size / 4);
  const irisSize = Math.ceil(size / 2);
  const irisX = x + irisOff;
  const irisY = y + irisOff;
  _drawIrisPupilHighlight(
    ctx,
    _id,
    irisX,
    irisY,
    irisSize,
    irisSize,
    eyeIris,
    { dx: irisSize - 1, dy: irisSize - 1, color: darken(eyeIris, 0.40) },
    { dx: 0, dy: 0, color: lighten(eyeWhite, 0.06) },
  );
}

export function drawEyePair(ctx, headX, headY, headWidth, eyeOffsetLeft, eyeOffsetTop, eyeWhite, eyeIris, size = 4) {
  drawEye(ctx, headX + eyeOffsetLeft, headY + eyeOffsetTop, eyeWhite, eyeIris, size);
  drawEye(ctx, headX + headWidth - eyeOffsetLeft - size, headY + eyeOffsetTop, eyeWhite, eyeIris, size);
}

export function drawEyeSide(ctx, f, x, y, eyeWhite, eyeIris, outlineColor = null) {
  if (outlineColor) {
    rect(ctx, f(x), y, 5, 5, outlineColor);
    rect(ctx, f(x + 1), y + 1, 4, 4, eyeWhite);
    _drawIrisPupilHighlight(
      ctx,
      f,
      x + 2,
      y + 2,
      2,
      2,
      eyeIris,
      { dx: 0, dy: 1, color: darken(eyeIris, 0.35) },
      { dx: -1, dy: -1, color: '#ffffff' },
    );
    px(ctx, f(x + 3), y + 2, darken(eyeIris, 0.3));
  } else {
    rect(ctx, f(x), y, 3, 3, eyeWhite);
    _drawIrisPupilHighlight(
      ctx,
      f,
      x + 1,
      y + 1,
      1,
      1,
      eyeIris,
      null,
      { dx: -1, dy: -1, color: '#ffffff' },
    );
  }
}

export function drawHead(ctx, x, y, width, height, bodyColor, highlightColor, shadowColor) {
  rect(ctx, x + 2, y, width - 4, 3, bodyColor);
  rect(ctx, x, y + 3, width, height - 3, bodyColor);
  rect(ctx, x + 1, y + 1, width - 2, 2, bodyColor);

  rect(ctx, x + 3, y + 1, width - 6, 2, highlightColor);

  for (let r = 3; r < height; r++) {
    px(ctx, x, y + r, shadowColor);
    px(ctx, x + 1, y + r, shadowColor);
  }
  px(ctx, x + width - 1, y + 3, shadowColor);
}

export function drawCanidHeadTop(ctx, cx, hy, headW, body, highlight) {
  ellipse(ctx, cx, hy + 4, Math.floor(headW / 2), 4, body);
  rect(ctx, cx - Math.floor(headW / 2) + 2, hy + 1, headW - 4, 2, highlight);
}

export function drawCanidHeadSide(ctx, f, headX, headY, body, noseColor) {
  ellipse(ctx, f(headX + 4), headY + 6, 5, 5, body);
  rect(ctx, f(headX + 7), headY + 7, 3, 2, darken(body, 0.05));
  if (noseColor) rect(ctx, f(headX + 9), headY + 7, 2, 2, noseColor);
}

export function drawLizardHeadTop(ctx, cx, headBase, headTip, body, highlight, eye, showEyes) {
  fillPolygon(ctx, [
    [cx - 4, headBase],
    [cx + 4, headBase],
    [cx + 1, headTip],
    [cx - 1, headTip],
  ], blend(body, darken(body, 0.16), 0.5));
  rect(ctx, cx - 3, headBase, 7, 1, highlight);
  if (showEyes) {
    drawReptileEye(ctx, cx - 5, headBase + 1, eye);
    drawReptileEye(ctx, cx + 3, headBase + 1, eye);
  }
}

export function drawLizardHeadSide(ctx, f, hBaseX, by, bH, body, highlight, eye) {
  fillPolygon(ctx, [
    [f(hBaseX),      by + 1],
    [f(hBaseX + 10), by + 4],
    [f(hBaseX),      by + bH - 1],
  ], blend(body, darken(body, 0.15), 0.5));
  rect(ctx, f(hBaseX), by + 1, 3, 1, highlight);
  drawReptileEye(ctx, f(hBaseX + 2), by + 1, eye);
}

export function drawEar(ctx, x, y, earHeight, earColor, innerColor, pointed = false) {
  for (let e = 0; e < earHeight; e++) {
    const ew = pointed
      ? Math.max(1, 3 - Math.floor(e * 2 / Math.max(1, earHeight - 1)))
      : (e < earHeight - 2 ? 3 : 2);
    rect(ctx, x, y - 1 - e, ew, 1, earColor);
  }

  if (innerColor && !pointed && earHeight >= 6) {
    for (let e = 1; e < earHeight - 2; e++) {
      px(ctx, x + 1, y - 1 - e, innerColor);
    }
  }
}

export function drawEarPair(ctx, headX, headY, headWidth, earHeight, earColor, innerColor, pointed = false) {
  drawEar(ctx, headX, headY, earHeight, earColor, innerColor, pointed);
  drawEar(ctx, headX + headWidth, headY, earHeight, earColor, innerColor, pointed);
}

export function drawNose(ctx, x, y, noseColor, highlight = true) {
  rect(ctx, x - 2, y, 4, 3, noseColor);
  if (highlight) {
    px(ctx, x - 1, y, lighten(noseColor, 0.2));
  }
}

export function drawHorns(ctx, headX, headY, headWidth, hornHeight, hornColor, tipColor) {
  const hc = hornColor;
  const hl = tipColor;

  rect(ctx, headX - 3, headY - 2, 3, 3, hc);
  rect(ctx, headX - 3, headY - 2 - hornHeight, 3, hornHeight, hl);
  px(ctx, headX - 2, headY - 3 - hornHeight, hl);

  rect(ctx, headX + headWidth, headY - 2, 3, 3, hc);
  rect(ctx, headX + headWidth, headY - 2 - hornHeight, 3, hornHeight, hl);
  px(ctx, headX + headWidth + 1, headY - 3 - hornHeight, hl);
}

export function drawAntlers(ctx, headX, headY, headWidth, baseColor, midColor, tipColor) {
  const ac = baseColor;
  const al = midColor;
  const at = tipColor;

  rect(ctx, headX - 3, headY - 3, 3, 3, ac);
  rect(ctx, headX - 3, headY - 7, 3, 4, ac);
  rect(ctx, headX - 6, headY - 7, 3, 3, al);
  rect(ctx, headX - 6, headY - 11, 3, 4, at);
  px(ctx, headX - 3, headY - 10, al);

  rect(ctx, headX + headWidth, headY - 3, 3, 3, ac);
  rect(ctx, headX + headWidth, headY - 7, 3, 4, ac);
  rect(ctx, headX + headWidth + 3, headY - 7, 3, 3, al);
  rect(ctx, headX + headWidth + 3, headY - 11, 3, 4, at);
  px(ctx, headX + headWidth + 2, headY - 10, al);
}

export function drawTusks(ctx, x, y, tuskColor = '#f0f0e0') {
  rect(ctx, x + 1, y, 3, 3, tuskColor);
  rect(ctx, x + 4, y, 3, 3, tuskColor);
  px(ctx, x + 2, y, '#fffff0');
  px(ctx, x + 5, y, '#fffff0');
}

export function drawMask(ctx, x, y, maskColor = '#111111') {
  rect(ctx, x, y, 4, 3, maskColor);
  rect(ctx, x + 3, y, 4, 3, maskColor);
  px(ctx, x + 1, y, '#222222');
  px(ctx, x + 4, y, '#222222');
}

export function drawMuzzle(ctx, x, y, muzzleColor) {
  rect(ctx, x - 3, y, 6, 3, muzzleColor);
  px(ctx, x - 2, y, lighten(muzzleColor, 0.1));
}

export function drawCheek(ctx, x, y, cheekColor) {
  rect(ctx, x, y, 3, 3, cheekColor);
}

export function drawCheekPair(ctx, headX, headY, headWidth, cheekOffsetY, cheekColor) {
  drawCheek(ctx, headX, headY + cheekOffsetY, cheekColor);
  drawCheek(ctx, headX + headWidth - 3, headY + cheekOffsetY, cheekColor);
}

export function drawBirdHeadTop(ctx, cx, by, bodyColor, highlightColor, eyeRing, eyeColor, withEyes) {
  rect(ctx, cx - 4, by - 7, 8, 7, bodyColor);
  rect(ctx, cx - 3, by - 9, 6, 3, bodyColor);
  rect(ctx, cx - 2, by - 9, 4, 2, highlightColor);
  if (!withEyes) return;
  rect(ctx, cx - 4, by - 5, 3, 3, eyeRing);
  rect(ctx, cx + 1, by - 5, 3, 3, eyeRing);
  px(ctx, cx - 3, by - 4, eyeColor);
  px(ctx, cx + 2, by - 4, eyeColor);
  px(ctx, cx - 3, by - 5, '#ffffff');
  px(ctx, cx + 2, by - 5, '#ffffff');
}

export function drawReptileEye(ctx, x, y, irisColor) {
  _drawIrisPupilHighlight(
    ctx,
    _id,
    x,
    y,
    3,
    3,
    irisColor,
    { dx: 1, dy: 1, color: '#000000' },
    { dx: 0, dy: 0, color: '#ffffff' },
  );
}

export function drawReptileHeadTop(ctx, cx, headY, headW, body, eye, facingDown, opts = {}) {
  const hx = cx - Math.floor(headW / 2);
  const shadow = darken(body, 0.15);
  const scaleTex = darken(body, 0.07);
  const nibY = facingDown ? headY - 3 : headY;
  rect(ctx, hx + 1, headY, headW - 2, 3, body);
  rect(ctx, hx, headY + 3, headW, 4, body);
  rect(ctx, hx + 3, nibY, 3, 3, body);
  rect(ctx, hx + headW - 6, nibY, 3, 3, body);
  speckle(ctx, hx + 1, headY + 1, headW - 2, 4, [scaleTex, darken(body, 0.12), lighten(body, 0.04)], 0.28);
  if (facingDown) {
    drawReptileEye(ctx, hx + 3, headY + 3, eye);
    drawReptileEye(ctx, hx + headW - 6, headY + 3, eye);
    if (opts.snout) {
      rect(ctx, hx + 3, headY, 3, 2, shadow);
      rect(ctx, hx + headW - 6, headY, 3, 2, shadow);
    }
    if (opts.teeth) {
      rect(ctx, hx + 3, headY + 7, 2, 2, '#f0f0e0');
      rect(ctx, hx + headW - 5, headY + 7, 2, 2, '#f0f0e0');
      px(ctx, hx + 5, headY + 7, '#f0f0e0');
      px(ctx, hx + headW - 7, headY + 7, '#f0f0e0');
    }
  }
}

export function drawReptileHeadSide(ctx, f, headX, by, headW, h, body, highlight, eye, opts = {}) {
  const rx = Math.min(f(headX), f(headX + headW - 1));
  rect(ctx, rx, by, headW, h, body);
  rect(ctx, f(headX + headW - 3), by, 3, 2, highlight);
  drawReptileEye(ctx, f(headX + headW - 3), by + (h > 6 ? 3 : 1), eye);
  if (opts.teeth) {
    rect(ctx, f(headX + headW - 2), by + h - 3, 2, 2, '#f0f0e0');
    rect(ctx, f(headX + headW), by + h - 3, 2, 2, '#f0f0e0');
  }
}

export function drawTongue(ctx, x, y, length, direction = 1, tongueColor = '#cc2222') {
  px(ctx, x, y, tongueColor);
  px(ctx, x, y + direction, tongueColor);
  px(ctx, x - 1, y + direction * 2, tongueColor);
  px(ctx, x + 1, y + direction * 2, tongueColor);
}

export function drawBeakDown(ctx, cx, y, length, beakColor) {
  const beakDark = darken(beakColor, 0.18);
  const beakHi = lighten(beakColor, 0.15);
  for (let i = 0; i < length; i++) {
    const w = Math.max(1, length - i);
    rect(ctx, cx - Math.floor(w / 2), y + i, w, 1, beakColor);
  }
  px(ctx, cx, y + 1, beakHi);
  px(ctx, cx, y + length - 1, beakDark);
}

export function drawBeakSide(ctx, f, tipX, baseY, length, beakColor) {
  const beakDark = darken(beakColor, 0.15);
  fillPolygon(ctx, [
    [f(tipX - length), baseY - 1],
    [f(tipX),          baseY + 1],
    [f(tipX - length), baseY + 2],
  ], beakColor);
  px(ctx, f(tipX - 1), baseY + 1, beakDark);
}

export function drawRaptorBeak(ctx, f, x, y, beakColor, beakHi, beakSh) {
  rect(ctx, f(x), y, 4, 2, beakColor);
  rect(ctx, f(x), y, 3, 1, beakHi);
  px(ctx, f(x + 3), y + 1, beakSh);
  rect(ctx, f(x + 1), y + 2, 3, 2, darken(beakColor, 0.08));
  px(ctx, f(x + 3), y + 3, beakSh);
}

export function drawCompoundEye(ctx, cx, cy, rx, ry, eyeColor) {
  const dark = darken(eyeColor, 0.30);
  const hi = lighten(eyeColor, 0.45);

  ellipse(ctx, cx, cy, rx, ry, eyeColor);

  const hmw = Math.round(rx * Math.sqrt(Math.max(0, 1 - 0)));
  if (hmw > 0) {
    for (let dx = -hmw; dx <= hmw; dx++) px(ctx, cx + dx, cy, dark);
  }
  for (let dy = -(ry - 1); dy <= (ry - 1); dy++) {
    const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
    if (hw >= 1) px(ctx, cx, cy + dy, dark);
  }

  px(ctx, cx - Math.max(0, rx - 1), cy - Math.max(0, ry - 1), hi);
  if (rx >= 2) px(ctx, cx - Math.max(0, rx - 2), cy - ry + 1, lighten(hi, 0.12));
}
