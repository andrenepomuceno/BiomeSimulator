import { px, rect, darken, lighten, rimLight, ao, anisotropicSpeckle, blend, speckle, ellipse } from '../../helpers.js';
import { _featherZoneColor } from './shared.js';

export function drawFurTexture(ctx, x, y, w, h, baseColor, angle = 0, intensity = 0.26) {
  const darkVariant = darken(baseColor, 0.10);
  const lightVariant = lighten(baseColor, 0.06);
  anisotropicSpeckle(ctx, x, y, w, h, [darkVariant, baseColor, lightVariant], intensity, angle, 3.5);
}

export function drawSimpleBody(ctx, x, y, w, h, bodyColor, highlightColor, shadowColor) {
  rect(ctx, x + 4, y, w - 8, 3, highlightColor);
  rect(ctx, x + 2, y + 2, w - 4, 2, highlightColor);
  rect(ctx, x, y + 4, w, h - 8, bodyColor);
  rect(ctx, x + 2, y + h - 4, w - 4, 2, shadowColor);
  rect(ctx, x + 4, y + h - 2, w - 8, 2, darken(shadowColor, 0.1));

  rimLight(ctx, x + 4, y, w - 8, 3, highlightColor, 'top');
  ao(ctx, x + 2, y + h - 3, w - 4, 3, 0.08);
}

export function drawRoundedSideBody(ctx, f, x, y, w, h, dorsalColor, midColor, ventralColor, opts = {}) {
  const edgeRound = opts.edgeRound ?? 3;
  const bellyColor = opts.bellyColor ?? null;
  const bellyDepth = Math.max(0, opts.bellyDepth ?? 0);
  const hh = Math.max(1, h - 1);

  for (let row = 0; row < h; row++) {
    const t = hh === 0 ? 0 : row / hh;
    const ny = t * 2 - 1;
    const curve = Math.max(0, 1 - ny * ny);
    const inset = Math.round((1 - curve) * edgeRound);
    const x0 = x + inset;
    const x1 = x + w - 1 - inset;
    if (x1 < x0) continue;

    const grad = t < 0.5
      ? blend(dorsalColor, midColor, t / 0.5)
      : blend(midColor, ventralColor, (t - 0.5) / 0.5);
    const rowColor = bellyColor && row >= h - bellyDepth
      ? blend(grad, bellyColor, 0.72)
      : grad;

    for (let cx = x0; cx <= x1; cx++) px(ctx, f(cx), y + row, rowColor);
  }
}

export function drawEarSide(ctx, f, x, y, earH, earColor, innerColor = null, pointed = false) {
  for (let e = 0; e < earH; e++) {
    const ew = pointed
      ? Math.max(1, 3 - Math.floor(e * 2 / Math.max(1, earH - 1)))
      : 3;
    for (let i = 0; i < ew; i++) px(ctx, f(x + i), y - e, earColor);
  }
  if (!pointed && innerColor && earH >= 6) {
    for (let e = 1; e < earH - 2; e++) {
      px(ctx, f(x + 1), y - e, innerColor);
      px(ctx, f(x + 2), y - e, innerColor);
    }
  }
}

const _TAIL_STYLES = {
  squirrel: {
    top(ctx, cx, y, bodyColor, accent, shadow) {
      rect(ctx, cx - 4, y - 1, 9, 8, accent);
      rect(ctx, cx - 3, y + 7, 7, 3, lighten(accent, 0.1));
      px(ctx, cx - 1, y + 1, lighten(accent, 0.18));
    },
    back(ctx, cx, y, bodyColor, accent, shadow) {
      rect(ctx, cx - 4, y - 3, 9, 7, accent);
      rect(ctx, cx - 3, y + 3, 7, 3, lighten(accent, 0.1));
      px(ctx, cx - 1, y - 1, lighten(accent, 0.18));
    },
    side(ctx, f, x, y, bodyColor, accent, shadow, shadow2) {
      rect(ctx, f(x - 1), y + 3, 6, 6, accent);
      rect(ctx, f(x - 4), y - 1, 5, 6, accent);
      rect(ctx, f(x - 3), y - 7, 8, 7, accent);
      rect(ctx, f(x + 4), y - 9, 7, 5, lighten(accent, 0.08));
      rect(ctx, f(x + 9), y - 6, 5, 4, lighten(accent, 0.14));
      px(ctx, f(x - 1), y + 4, lighten(accent, 0.18));
    },
  },
  cotton: {
    top(ctx, cx, y, bodyColor, accent, shadow) {
      rect(ctx, cx - 2, y, 4, 4, '#fffff4');
      px(ctx, cx, y + 1, '#ffffff');
    },
    back(ctx, cx, y, bodyColor, accent, shadow) {
      rect(ctx, cx - 2, y + 2, 5, 5, '#fffff4');
      px(ctx, cx, y + 3, '#ffffff');
      px(ctx, cx - 1, y + 4, '#ffffff');
    },
    side(ctx, f, x, y, bodyColor, accent, shadow, shadow2) {
      rect(ctx, f(x - 1), y, 5, 5, '#fffff4');
      px(ctx, f(x + 1), y + 1, '#ffffff');
      px(ctx, f(x), y + 2, '#ffffff');
    },
  },
  bushy: {
    top(ctx, cx, y, bodyColor, accent, shadow) {
      rect(ctx, cx - 1, y - 3, 4, 4, accent);
      rect(ctx, cx + 2, y - 1, 3, 3, accent);
      rect(ctx, cx, y - 2, 3, 2, lighten(accent, 0.1));
    },
    back(ctx, cx, y, bodyColor, accent, shadow) {
      rect(ctx, cx - 1, y, 4, 4, accent);
      rect(ctx, cx - 3, y + 1, 3, 3, lighten(accent, 0.08));
    },
    side(ctx, f, x, y, bodyColor, accent, shadow, shadow2) {
      rect(ctx, f(x), y, 4, 4, accent);
      rect(ctx, f(x - 3), y, 3, 3, accent);
      rect(ctx, f(x - 3), y - 3, 3, 3, lighten(accent, 0.1));
      px(ctx, f(x + 1), y + 1, lighten(accent, 0.12));
    },
  },
  striped: {
    top(ctx, cx, y, bodyColor, accent, shadow) {
      rect(ctx, cx - 1, y, 3, 3, bodyColor);
      rect(ctx, cx - 1, y + 3, 3, 3, '#333333');
      rect(ctx, cx - 1, y + 6, 3, 2, bodyColor);
    },
    back(ctx, cx, y, bodyColor, accent, shadow) {
      rect(ctx, cx - 1, y, 3, 3, bodyColor);
      rect(ctx, cx - 1, y - 3, 3, 3, '#333333');
    },
    side(ctx, f, x, y, bodyColor, accent, shadow, shadow2) {
      rect(ctx, f(x), y, 3, 3, bodyColor);
      rect(ctx, f(x - 3), y, 3, 3, '#333333');
      rect(ctx, f(x), y + 3, 3, 3, '#333333');
    },
  },
  plain: {
    top(ctx, cx, y, bodyColor, accent, shadow) {
      rect(ctx, cx - 1, y, 3, 4, shadow);
    },
    back(ctx, cx, y, bodyColor, accent, shadow) {
      rect(ctx, cx - 1, y + 2, 3, 4, shadow);
    },
    side(ctx, f, x, y, bodyColor, accent, shadow, shadow2) {
      rect(ctx, f(x), y, 3, 4, shadow);
    },
  },
};

export function drawQuadrupedTailTop(ctx, cx, y, style, bodyColor, accent, shadow) {
  (_TAIL_STYLES[style] ?? _TAIL_STYLES.plain).top(ctx, cx, y, bodyColor, accent, shadow);
}

export function drawQuadrupedTailBack(ctx, cx, y, style, bodyColor, accent, shadow) {
  (_TAIL_STYLES[style] ?? _TAIL_STYLES.plain).back(ctx, cx, y, bodyColor, accent, shadow);
}

export function drawQuadrupedTailSide(ctx, f, x, y, style, bodyColor, accent, shadow, shadow2) {
  (_TAIL_STYLES[style] ?? _TAIL_STYLES.plain).side(ctx, f, x, y, bodyColor, accent, shadow, shadow2);
}

export function drawBirdWingTop(ctx, bx, by, w, wingSpan, wingY, accent, shadow2, highlight, highlight2) {
  for (let i = 1; i <= wingSpan; i++) {
    const t = (i - 1) / Math.max(1, wingSpan - 1);
    const wc = _featherZoneColor(t, accent);
    const wh = Math.max(1, 5 - Math.round(i * 3 / wingSpan));
    rect(ctx, bx - i * 3, wingY, 3, wh, wc);
    rect(ctx, bx + w - 3 + i * 3, wingY, 3, wh, wc);
    if (t < 0.28) {
      px(ctx, bx - i * 3, wingY, lighten(wc, 0.10));
      px(ctx, bx + w - 3 + i * 3 + 2, wingY, lighten(wc, 0.10));
    }
    if (t >= 0.65 && i % 2 === 1) {
      px(ctx, bx - i * 3, wingY + wh - 1, shadow2);
      px(ctx, bx + w - 3 + i * 3 + 2, wingY + wh - 1, shadow2);
    }
  }
  if (wingSpan > 4) {
    rect(ctx, bx - 3, wingY - 2, 3, 2, highlight);
    rect(ctx, bx + w, wingY - 2, 3, 2, highlight);
    rect(ctx, bx - 5, wingY - 1, 2, 1, highlight2);
    rect(ctx, bx + w + 3, wingY - 1, 2, 1, highlight2);
  }
}

export function drawBirdTailUp(ctx, cx, by, h, tailLen, tailColor) {
  for (let t = 0; t < tailLen; t += 2) {
    rect(ctx, cx - 3 + t, by + h + t, 3, 3, tailColor);
    rect(ctx, cx + 3 - t, by + h + t, 3, 3, tailColor);
  }
}

export function drawBirdWingSide(ctx, f, bx, wingY, wingW, accent, featherTex, shadow2) {
  const priStart = Math.floor(wingW * 0.65);
  for (let i = 0; i < wingW; i++) {
    const t = wingW > 1 ? i / (wingW - 1) : 0;
    const wc = _featherZoneColor(t, accent);
    px(ctx, f(bx + 2 + i), wingY, lighten(wc, 0.06));
    px(ctx, f(bx + 2 + i), wingY + 1, wc);
    px(ctx, f(bx + 2 + i), wingY + 2, darken(wc, 0.08));
  }
  for (let i = priStart; i < wingW - 1; i += 2) {
    px(ctx, f(bx + 2 + i), wingY + 2, shadow2);
  }
  anisotropicSpeckle(ctx, bx + 2, wingY, wingW, 3, [featherTex, darken(accent, 0.06)], 0.16, Math.PI / 2, 2.0);
}

export function drawBirdTailSide(ctx, f, bx, by, h, tailLen, tailColor, shadow) {
  for (let t = 0; t < tailLen; t++) {
    px(ctx, f(bx - 3 - t), by + h - 5 + t, tailColor);
    px(ctx, f(bx - 3 - t), by + h - 4 + t, tailColor);
    px(ctx, f(bx - 2 - t), by + h - 4 + t, shadow);
  }
  rect(ctx, f(bx - tailLen - 2), by + h - 5 + tailLen - 1, 3, 3, darken(tailColor, 0.18));
}

export function drawBellyStripe(ctx, pts, radii, bellyColor, isHorizontal = false) {
  for (let i = 0; i < pts.length; i++) {
    const [bx, by] = pts[i];
    const r = radii[i];
    if (isHorizontal) {
      rect(ctx, bx - r + 1, by + r - 1, r * 2 - 1, 2, bellyColor);
    } else {
      rect(ctx, bx - 1, by + r - 1, 3, 2, bellyColor);
    }
  }
}

export function drawDorsalPattern(ctx, pts, patternColor, isHorizontal = false) {
  for (let i = 1; i < pts.length - 1; i += 2) {
    const [sx, sy] = pts[i];
    if (isHorizontal) {
      px(ctx, sx, sy - 1, patternColor);
      px(ctx, sx - 1, sy, patternColor);
      px(ctx, sx + 1, sy, patternColor);
      px(ctx, sx, sy + 1, patternColor);
    } else {
      px(ctx, sx, sy, patternColor);
      px(ctx, sx - 1, sy + 1, patternColor);
      px(ctx, sx + 1, sy + 1, patternColor);
      px(ctx, sx, sy + 2, patternColor);
    }
  }
}

export function drawSegmentHighlights(ctx, pts, radii, highlightColor, isHorizontal = false) {
  for (let i = 0; i < pts.length; i++) {
    const [sx, sy] = pts[i];
    const r = radii[i];
    const span = Math.max(1, r - 2);
    for (let ox = -span; ox <= span; ox++) {
      px(ctx, sx + ox, sy - r + 1, highlightColor);
    }
  }
}

export function drawScuteRidge(ctx, startX, y, count, spacing, scuteColor) {
  const hiColor = lighten(scuteColor, 0.12);
  for (let i = 0; i < count; i++) {
    const sx = startX + i * spacing;
    const sy = y + (i % 2);
    ellipse(ctx, sx, sy, 1, 1, scuteColor);
    px(ctx, sx, sy - 1, hiColor);
  }
}

export function drawArmoredBody(ctx, x, y, w, h, hiColor, shColor, scuteColor, scalePatternFn) {
  for (let dy = 0; dy < h; dy++) {
    const t = h <= 1 ? 0 : dy / (h - 1);
    const inset = dy === 0 || dy === h - 1 ? 2 : (dy === 1 || dy === h - 2 ? 1 : 0);
    rect(ctx, x + inset, y + dy, Math.max(1, w - inset * 2), 1, blend(hiColor, shColor, t));
  }
  scalePatternFn(ctx, x + 1, y + 1, w - 2, h - 2, blend(hiColor, shColor, 0.5), scuteColor, 4);
}

export function drawCaterpillarSegment(ctx, cx, cy, rx, ry, color, spotColor) {
  const hi = lighten(color, 0.14);
  const sh = darken(color, 0.16);
  ellipse(ctx, cx, cy, rx, ry, color);
  ellipse(ctx, cx - 1, cy - 1, Math.max(1, rx - 1), 1, hi);
  ellipse(ctx, cx, cy + 1, Math.max(1, rx - 1), 1, sh);
  if (spotColor) {
    px(ctx, cx, cy - 1, spotColor);
    px(ctx, cx, cy, darken(spotColor, 0.15));
  }
}

export function drawCaterpillarChainTop(ctx, cx, cy, segments, headAtTop, body, accent, spotColor) {
  for (let s = 0; s < segments; s++) {
    const sy = headAtTop ? cy - segments + s * 3 : cy + segments - 3 - s * 3;
    const segColor = s % 2 === 0 ? body : accent;
    drawCaterpillarSegment(ctx, cx, sy + 1, 5, 2, segColor, s % 2 === 0 ? spotColor : null);
    rect(ctx, cx - 7, sy + 1, 2, 2, darken(segColor, 0.24));
    rect(ctx, cx + 6, sy + 1, 2, 2, darken(segColor, 0.24));
  }
}

export function drawCricketWingPads(ctx, bx, w, by, h, body, accent) {
  const padY = by + Math.floor(h * 0.38);
  const padH = Math.ceil(h * 0.52);
  const hw = Math.floor((w - 4) / 2);
  rect(ctx, bx + 2, padY, hw, padH, lighten(accent, 0.06));
  rect(ctx, bx + 2 + hw, padY, w - 4 - hw, padH, accent);
  for (let dy = 1; dy < padH - 1; dy++) px(ctx, bx + 2 + hw, padY + dy, darken(accent, 0.12));
  rect(ctx, bx + 2, padY, w - 4, 1, darken(body, 0.10));
}
