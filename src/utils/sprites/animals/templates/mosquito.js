/**
 * Mosquito drawing template — 64×64 design grid.
 * Key features: thin segmented abdomen, very large transparent wings,
 * long needle-like proboscis, bushy antennae, 6 very long thin legs.
 */
import { px, rect, darken, lighten, blend, thickLine, shadedEllipse, segmentChain, quadraticThick, LEFT, DOWN, UP } from '../../helpers.js';

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
      // Compound eyes bulging on each side
      shadedEllipse(ctx, cx - 3, cy - 8, 1, 1, eye, { highlight: lighten(eye, 0.45) });
      shadedEllipse(ctx, cx + 3, cy - 8, 1, 1, eye, { highlight: lighten(eye, 0.45) });
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
    shadedEllipse(ctx, f(cx + 11), cy - 3, 2, 2, eye, { highlight: lighten(eye, 0.45) });

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

export function drawMosquito(ctx, params, dir, frame) {
  const { body, accent, eye } = params;
  const cx = 32, cy = 32;
  const outline   = darken(body, 0.38);
  const bodyHi    = lighten(body, 0.18);
  const wingCol   = 'rgba(180,205,235,0.30)';
  const wingVein  = 'rgba(150,180,215,0.55)';
  // Wing flap: frame 1 = wings angled slightly down
  const wingFlap  = frame === 1 ? 1 : 0;
  // Leg sway
  const legOff    = frame === 0 ? 0 : frame === 1 ? -3 : 3;

  // Helper: draw a pixel using RGBA colors
  function apx(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * 4, y * 4, 4, 4);
  }

  // ── OVERHEAD VIEW (DOWN / UP) ─────────────────────────────────────────
  if (dir === DOWN || dir === UP) {
    // ── Proboscis — long needle pointing upward (forward when facing south) ──
    for (let i = 0; i < 13; i++) {
      const col = i < 10 ? '#cc2222' : '#881111';
      px(ctx, cx, cy - 22 + i, col);
    }
    px(ctx, cx, cy - 22, '#772222');  // sharp tip

    // ── Head — small oval ──
    rect(ctx, cx - 1, cy - 9,  3, 2, body);
    rect(ctx, cx - 2, cy - 8,  5, 3, body);
    rect(ctx, cx - 1, cy - 6,  3, 1, body);
    if (dir === DOWN) {
      // Large compound eyes, one on each side
      px(ctx, cx - 3, cy - 8, eye); px(ctx, cx - 3, cy - 7, eye);
      px(ctx, cx + 3, cy - 8, eye); px(ctx, cx + 3, cy - 7, eye);
      px(ctx, cx - 3, cy - 8, lighten(eye, 0.45));  // highlight
      px(ctx, cx + 3, cy - 8, lighten(eye, 0.45));
    }

    // ── Antennae — long and bushy (mosquito hallmark) ──
    for (let i = 0; i < 9; i++) {
      const spread = Math.floor(i * 0.6);
      px(ctx, cx - 2 - spread, cy - 10 - i, outline);
      px(ctx, cx + 2 + spread, cy - 10 - i, outline);
      // Bushy texture: tiny side filaments on lower half
      if (i < 5) {
        px(ctx, cx - 3 - spread, cy - 10 - i, outline);
        px(ctx, cx + 3 + spread, cy - 10 - i, outline);
      }
    }

    // ── Thorax — slightly wider oval ──
    rect(ctx, cx - 3, cy - 5, 7, 3, accent);
    rect(ctx, cx - 2, cy - 5, 5, 2, accent);
    rect(ctx, cx - 2, cy - 6, 5, 1, lighten(accent, 0.14));  // dorsal highlight

    // ── Wings — large, transparent, dominant visual feature ──
    // Each wing tapers from a wide base near the thorax to a narrow tip
    const wBaseY = cy - 6 + wingFlap;
    const wLen   = 15;  // wing length (sideways)
    const wH     = 13;  // wing height (front-to-back)
    for (let wy = 0; wy < wH; wy++) {
      const ww = Math.round(wLen * (1 - wy / (wH * 1.6)));
      if (ww <= 0) continue;
      for (let wx = 0; wx < ww; wx++) {
        apx(cx - 4 - wx, wBaseY + wy, wingCol);
        apx(cx + 4 + wx, wBaseY + wy, wingCol);
      }
    }
    // Wing veins
    for (let wy = 0; wy < wH - 2; wy++) {
      const ww = Math.round(wLen * (1 - wy / (wH * 1.6)));
      apx(cx - 4 - Math.floor(ww * 0.5), wBaseY + wy, wingVein);
      apx(cx + 4 + Math.floor(ww * 0.5), wBaseY + wy, wingVein);
    }
    // Hindwings (smaller, slightly behind forewings)
    for (let wy = 0; wy < 8; wy++) {
      const ww = Math.round(9 * (1 - wy / 13));
      if (ww <= 0) continue;
      for (let wx = 0; wx < ww; wx++) {
        apx(cx - 4 - wx, wBaseY + 4 + wy, wingCol);
        apx(cx + 4 + wx, wBaseY + 4 + wy, wingCol);
      }
    }

    // ── Abdomen — long, narrow, tapered, segmented ──
    const abdY0  = cy - 2;
    const abdSegs = 7;
    for (let s = 0; s < abdSegs; s++) {
      const sw     = Math.max(1, 4 - Math.floor(s / 2));
      const abdCol = s % 2 === 0 ? body : darken(body, 0.16);
      rect(ctx, cx - Math.floor(sw / 2), abdY0 + s * 3, sw, 3, abdCol);
      if (s < 3) px(ctx, cx, abdY0 + s * 3, bodyHi);  // dorsal highlight
    }
    // Pointed tip
    px(ctx, cx, abdY0 + abdSegs * 3, outline);

    // ── Legs — 6 very long thin legs ──
    // Three pairs from thorax area, fanning outward
    for (let i = 0; i < 3; i++) {
      const off   = i === 1 ? -legOff : legOff;
      const xBase = cx - 3 + i * 3;  // stagger attachment points
      // Left leg: goes wide out and downward, bent at knee
      for (let j = 0; j < 11; j++) {
        const lx = cx - 5 - j - (i * 2);
        const ly = cy - 3 + Math.floor(j * 0.5) + off;
        if (lx >= 0) px(ctx, lx, ly, outline);
      }
      // Right leg
      for (let j = 0; j < 11; j++) {
        const lx = cx + 5 + j + (i * 2);
        const ly = cy - 3 + Math.floor(j * 0.5) - off;
        if (lx < 64) px(ctx, lx, ly, outline);
      }
    }

  // ── SIDE VIEW (LEFT / RIGHT) ──────────────────────────────────────────
  } else {
    const flip = dir === LEFT;
    const f    = flip ? (x) => 63 - x : (x) => x;

    // ── Proboscis — long horizontal needle pointing forward ──
    for (let i = 0; i < 15; i++) {
      const col = i < 11 ? '#cc2222' : '#881111';
      px(ctx, f(cx + 12 + i), cy - 1, col);
    }
    px(ctx, f(cx + 27), cy - 1, '#772222');  // sharp tip

    // ── Head — small oval ──
    rect(ctx, f(cx + 8), cy - 4, 5, 7, body);
    // Large compound eye (prominent from side)
    rect(ctx, f(cx + 10), cy - 4, 3, 3, eye);
    px(ctx, f(cx + 10), cy - 4, lighten(eye, 0.45));

    // ── Antenna — long bushy filament pointing up-forward ──
    for (let i = 1; i <= 8; i++) {
      px(ctx, f(cx + 9 + i), cy - 4 - i, outline);
      if (i < 5) px(ctx, f(cx + 8 + i), cy - 4 - i, outline);  // bushy
    }

    // ── Thorax — humped dorsal profile ──
    for (let dy = 0; dy < 9; dy++) {
      const hw = [1, 2, 3, 4, 4, 4, 3, 2, 1][dy];
      rect(ctx, f(cx + 4), cy - 5 + dy, hw, 1, accent);
    }
    px(ctx, f(cx + 4), cy - 5, lighten(accent, 0.16));
    px(ctx, f(cx + 5), cy - 5, lighten(accent, 0.10));

    // ── Wing — large, transparent, from top of thorax ──
    const wBaseX = cx + 4;
    const wBaseY = cy - 4 + wingFlap;
    for (let wy = 0; wy < 13; wy++) {
      const ww = Math.round(13 * (1 - wy / 20));
      if (ww <= 0) continue;
      for (let wx = 0; wx < ww; wx++) {
        apx(f(wBaseX - wx), wBaseY - wy, wingCol);
      }
    }
    // Wing vein
    for (let wy = 0; wy < 10; wy++) {
      apx(f(wBaseX - Math.floor(wy * 0.5)), wBaseY - wy, wingVein);
    }

    // ── Abdomen — long narrow tube drooping slightly ──
    const abdX0 = cx + 4;
    for (let i = 0; i < 20; i++) {
      const t      = i / 19;
      const abdW   = Math.max(1, Math.round(4 * (1 - t * 0.7)));
      const yDroop = Math.round(i * i * 0.04);  // slight downward curve
      const abdCol = Math.floor(i / 3) % 2 === 0 ? body : darken(body, 0.16);
      for (let j = 0; j < abdW; j++) {
        px(ctx, f(abdX0 - i), cy - 1 + j + yDroop, abdCol);
      }
    }
    // Pointed tail
    px(ctx, f(abdX0 - 20), cy + 1 + Math.round(20 * 20 * 0.04), outline);

    // ── Legs — 3 pairs, very long and thin ──
    const legBases = [cx + 7, cx + 5, cx + 3];
    for (let i = 0; i < 3; i++) {
      const off = i === 1 ? -legOff : legOff;
      for (let j = 0; j < 10; j++) {
        const lx = legBases[i] - Math.floor(j * 0.2);
        const ly = cy + 3 + j + off;
        if (ly < 64) px(ctx, f(lx), ly, outline);
      }
    }
  }
}
