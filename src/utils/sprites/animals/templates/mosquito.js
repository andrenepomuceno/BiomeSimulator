/**
 * Mosquito drawing template — 64×64 design grid.
 * Key features: thin segmented abdomen, very large transparent wings,
 * long needle-like proboscis, bushy antennae, 6 very long thin legs.
 */
import { px, rect, darken, lighten, blend, thickLine, shadedEllipse, segmentChain, quadraticThick, LEFT, DOWN, UP } from '../../helpers.js';
import { drawCompoundEye } from '../bodyParts.js';

export function drawMosquito(ctx, params, dir, frame) {
  const { body, accent, eye } = params;
  const cx = 32, cy = 32;
  const outline   = darken(body, 0.38);
  const bodyHi    = lighten(body, 0.18);
  const wingCol   = 'rgba(180,205,235,0.30)';
  const wingVein  = 'rgba(150,180,215,0.55)';
  const wingFlap  = frame === 1 ? 1 : 0;
  const legOff    = frame === 0 ? 0 : frame === 1 ? -3 : 3;

  function apx(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * 4, y * 4, 4, 4);
  }

  // ── OVERHEAD VIEW (DOWN / UP) ─────────────────────────────────────────
  if (dir === DOWN || dir === UP) {
    // Proboscis — quadraticThick with taper to 1px at tip
    quadraticThick(ctx, cx, cy - 9, cx, cy - 16, cx, cy - 22, 1, '#cc2222', 0.5);
    px(ctx, cx, cy - 22, '#772222');

    // Head — shadedEllipse (small)
    shadedEllipse(ctx, cx, cy - 8, 2, 2, body, { highlight: lighten(body, 0.14) });
    if (dir === DOWN) {
      // Compound eyes — faceted cross-grid pattern
      drawCompoundEye(ctx, cx - 3, cy - 8, 2, 2, eye);
      drawCompoundEye(ctx, cx + 3, cy - 8, 2, 2, eye);
    }

    // Antennae — quadraticThick, curving outward and bushy
    quadraticThick(ctx, cx - 2, cy - 10, cx - 4, cy - 14, cx - 6, cy - 19, 0, outline);
    quadraticThick(ctx, cx + 2, cy - 10, cx + 4, cy - 14, cx + 6, cy - 19, 0, outline);
    // Bushy side filaments (thickLine stubs)
    for (let i = 1; i <= 4; i++) {
      thickLine(ctx, cx - 2 - i, cy - 10 - i, cx - 3 - i, cy - 10 - i, 0, outline);
      thickLine(ctx, cx + 2 + i, cy - 10 - i, cx + 3 + i, cy - 10 - i, 0, outline);
    }

    // Thorax — shadedEllipse (slightly wider than head)
    shadedEllipse(ctx, cx, cy - 4, 3, 2, accent, {
      highlight: lighten(accent, 0.16),
      shadow: darken(accent, 0.10),
    });

    // Wings — unchanged (RGBA transparent, uses apx)
    const wBaseY = cy - 6 + wingFlap;
    const wLen = 15, wH = 13;
    for (let wy = 0; wy < wH; wy++) {
      const ww = Math.round(wLen * (1 - wy / (wH * 1.6)));
      if (ww <= 0) continue;
      for (let wx = 0; wx < ww; wx++) {
        apx(cx - 4 - wx, wBaseY + wy, wingCol);
        apx(cx + 4 + wx, wBaseY + wy, wingCol);
      }
    }
    for (let wy = 0; wy < wH - 2; wy++) {
      const ww = Math.round(wLen * (1 - wy / (wH * 1.6)));
      apx(cx - 4 - Math.floor(ww * 0.5), wBaseY + wy, wingVein);
      apx(cx + 4 + Math.floor(ww * 0.5), wBaseY + wy, wingVein);
    }
    for (let wy = 0; wy < 8; wy++) {
      const ww = Math.round(9 * (1 - wy / 13));
      if (ww <= 0) continue;
      for (let wx = 0; wx < ww; wx++) {
        apx(cx - 4 - wx, wBaseY + 4 + wy, wingCol);
        apx(cx + 4 + wx, wBaseY + 4 + wy, wingCol);
      }
    }

    // Abdomen — segmentChain: 7 shrinking segments down from thorax
    const abdSegs = 7;
    const abdPts  = Array.from({ length: abdSegs }, (_, s) => [cx, cy - 1 + s * 3]);
    const abdR    = Array.from({ length: abdSegs }, (_, s) => Math.max(1, 2 - Math.floor(s / 2)));
    const abdCols = Array.from({ length: abdSegs }, (_, s) => s % 2 === 0 ? body : darken(body, 0.16));
    segmentChain(ctx, abdPts, abdR, abdCols);
    // Dorsal highlight on upper segments
    for (let s = 0; s < 3; s++) px(ctx, cx, cy - 1 + s * 3, bodyHi);
    px(ctx, cx, cy - 1 + abdSegs * 3, outline); // tail tip

    // Legs — thickLine: each pair fans wide from thorax
    for (let i = 0; i < 3; i++) {
      const off = i === 1 ? -legOff : legOff;
      const lx0L = cx - 4 - i * 2, ly0 = cy - 3 + off;
      thickLine(ctx, cx - 3, ly0, lx0L,          ly0 + 3, 0, outline); // femur L
      thickLine(ctx, lx0L,   ly0 + 3, lx0L - 5,  ly0 + 5, 0, outline); // tibia L
      const lx0R = cx + 4 + i * 2;
      thickLine(ctx, cx + 3, ly0, lx0R,          ly0 + 3, 0, outline); // femur R
      thickLine(ctx, lx0R,   ly0 + 3, lx0R + 5,  ly0 + 5, 0, outline); // tibia R
    }

  // ── SIDE VIEW (LEFT / RIGHT) ──────────────────────────────────────────
  } else {
    const flip = dir === LEFT;
    const f    = flip ? (x) => 63 - x : (x) => x;

    // Proboscis — quadraticThick horizontal, tapering
    quadraticThick(ctx, f(cx + 12), cy - 1, f(cx + 20), cy - 1, f(cx + 27), cy - 1, 0, '#cc2222');
    px(ctx, f(cx + 27), cy - 1, '#772222');

    // Head — shadedEllipse
    shadedEllipse(ctx, f(cx + 10), cy - 1, 3, 3, body);
    // Compound eye (side view) — faceted oval
    drawCompoundEye(ctx, f(cx + 11), cy - 3, 2, 2, eye);

    // Antenna — quadraticThick arcing upward
    quadraticThick(ctx, f(cx + 11), cy - 4, f(cx + 14), cy - 9, f(cx + 16), cy - 12, 0, outline);
    for (let i = 1; i <= 4; i++) {
      thickLine(ctx, f(cx + 11 + i), cy - 4 - i, f(cx + 10 + i), cy - 4 - i, 0, outline);
    }

    // Thorax — shadedEllipse (humped)
    shadedEllipse(ctx, f(cx + 6), cy - 1, 4, 4, accent, {
      highlight: lighten(accent, 0.18),
      shadow: darken(accent, 0.10),
    });

    // Wing — unchanged RGBA
    const wBaseX = cx + 4;
    const wBaseY = cy - 4 + wingFlap;
    for (let wy = 0; wy < 13; wy++) {
      const ww = Math.round(13 * (1 - wy / 20));
      if (ww <= 0) continue;
      for (let wx = 0; wx < ww; wx++) apx(f(wBaseX - wx), wBaseY - wy, wingCol);
    }
    for (let wy = 0; wy < 10; wy++) {
      apx(f(wBaseX - Math.floor(wy * 0.5)), wBaseY - wy, wingVein);
    }

    // Abdomen — segmentChain drooping backward, tapering
    const abdCount = 8;
    const abdPts = Array.from({ length: abdCount }, (_, i) => {
      const t = i / (abdCount - 1);
      return [f(cx + 4 - i * 2), cy - 1 + Math.round(i * i * 0.04)];
    });
    const abdR    = Array.from({ length: abdCount }, (_, i) => Math.max(1, Math.round(2 * (1 - i / abdCount * 0.7))));
    const abdCols = Array.from({ length: abdCount }, (_, i) => Math.floor(i / 3) % 2 === 0 ? body : darken(body, 0.16));
    segmentChain(ctx, abdPts, abdR, abdCols);
    px(ctx, abdPts[abdCount - 1][0], abdPts[abdCount - 1][1], outline);

    // Legs — thickLine: 3 pairs dangling downward
    const legBases = [cx + 7, cx + 5, cx + 3];
    for (let i = 0; i < 3; i++) {
      const off = i === 1 ? -legOff : legOff;
      thickLine(ctx, f(legBases[i]), cy + 2 + off, f(legBases[i] - 1), cy + 7 + off, 0, outline);
      thickLine(ctx, f(legBases[i] - 1), cy + 7 + off, f(legBases[i] - 2), cy + 12 + off, 0, outline);
    }
  }
}
