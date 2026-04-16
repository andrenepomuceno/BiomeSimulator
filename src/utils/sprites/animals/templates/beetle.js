/**
 * Beetle drawing template — 64×64 design grid.
 * Key features: oval elytra with center suture line, distinct pronotum,
 * segmented antennae with antennal clubs, compound eyes, 6 jointed legs.
 */
import { px, rect, darken, lighten, blend, speckle, thickLine, shadedEllipse, fillPolygon, LEFT, DOWN, UP } from '../../helpers.js';
import { drawCompoundEye } from '../bodyParts.js';

export function drawBeetle(ctx, params, dir, frame) {
  const { body, accent, eye } = params;
  const shellLine = params.shellLine || darken(accent, 0.30);
  const sheen     = params.sheen    || null;
  const cx = 32, cy = 36;
  const outline = darken(body, 0.42);
  // Alternate pairs: frame 0 = neutral, 1 = forward, 2 = back
  const legOff = frame === 0 ? 0 : frame === 1 ? -2 : 2;

  // ── OVERHEAD VIEW (DOWN / UP) ────────────────────────────────────────
  if (dir === DOWN || dir === UP) {
    const eCx = cx, eCy = cy + 4, eRx = 9, eRy = 10;

    // Elytra — shadedEllipse gives gradient + top highlight in one call
    shadedEllipse(ctx, eCx, eCy, eRx, eRy, accent, {
      highlight: lighten(accent, 0.10),
      shadow:    darken(accent, 0.18),
      texture:   true,
      texColors: [darken(accent, 0.08), darken(accent, 0.14), lighten(accent, 0.04)],
      texDensity: 0.14,
    });
    // Center suture line
    for (let dy = -eRy; dy <= eRy; dy++) px(ctx, eCx, eCy + dy, shellLine);
    // Sheen highlights
    if (sheen) {
      rect(ctx, eCx - 5, eCy - 7, 3, 2, sheen);
      px(ctx, eCx - 4, eCy - 4, lighten(sheen, 0.12));
      rect(ctx, eCx + 3, eCy - 6, 2, 2, sheen);
    }

    // Pronotum — filled trapezoid polygon, cleaner taper than loop
    const pCy = eCy - eRy - 1;
    fillPolygon(ctx, [
      [cx - 5, pCy],
      [cx + 5, pCy],
      [cx + 2, pCy - 5],
      [cx - 2, pCy - 5],
    ], darken(body, 0.08));
    // Pronotum shading gradient (re-draw top half darker)
    for (let i = 0; i < 5; i++) {
      const hw  = Math.max(2, 5 - Math.round(i * 1.1));
      const col = blend(darken(body, 0.04), darken(body, 0.20), i / 4);
      rect(ctx, cx - hw, pCy - i, hw * 2 + 1, 1, col);
    }

    // Head — small shadedEllipse
    const hCy = pCy - 6;
    shadedEllipse(ctx, cx, hCy + 2, 3, 2, body);
    if (dir === DOWN) {
      // Bulging compound eyes — faceted oval with cross-grid seams
      drawCompoundEye(ctx, cx - 3, hCy + 1, 2, 1, eye);
      drawCompoundEye(ctx, cx + 3, hCy + 1, 2, 1, eye);
    }

    // Antennae — thickLine: elbow then club
    thickLine(ctx, cx - 2, hCy - 1, cx - 6, hCy - 5, 0, outline);
    rect(ctx, cx - 7, hCy - 5, 2, 1, outline); // club
    thickLine(ctx, cx + 2, hCy - 1, cx + 6, hCy - 5, 0, outline);
    rect(ctx, cx + 6, hCy - 5, 2, 1, outline); // club

    // 6 legs — thickLine femur→knee + knee→tarsus tip
    const legYs = [eCy - 6, eCy, eCy + 6];
    for (let i = 0; i < 3; i++) {
      const lY  = legYs[i];
      const off = i === 1 ? -legOff : legOff;
      // Left leg: femur out, tibia angling back
      thickLine(ctx, eCx - eRx,     lY + off,     eCx - eRx - 4, lY + off - 1, 0, outline);
      thickLine(ctx, eCx - eRx - 4, lY + off - 1, eCx - eRx - 7, lY + off - 3, 0, outline);
      // Right leg
      thickLine(ctx, eCx + eRx,     lY - off,     eCx + eRx + 4, lY - off - 1, 0, outline);
      thickLine(ctx, eCx + eRx + 4, lY - off - 1, eCx + eRx + 7, lY - off - 3, 0, outline);
    }

  // ── SIDE VIEW (LEFT / RIGHT) ─────────────────────────────────────────
  } else {
    const flip = dir === LEFT;
    const f    = flip ? (x) => 63 - x : (x) => x;

    // Elytra — shadedEllipse (horizontal ellipse for side dome profile)
    const eCx = cx - 3, eCy = cy + 4, eRx = 11, eRy = 6;
    // Placed so tarsus (eCy+eRy+4) lands at y≈50
    const eShift = 0; // cy=36, eCy=40, belly=46, leg=50 ✓
    shadedEllipse(ctx, eCx, eCy + eShift, eRx, eRy, accent, {
      highlight: lighten(accent, 0.10),
      shadow:    darken(accent, 0.18),
      texture:   true,
      texColors: [darken(accent, 0.08), darken(accent, 0.14), lighten(accent, 0.04)],
      texDensity: 0.13,
    });
    if (sheen) {
      px(ctx, f(eCx - 5), eCy - 4, sheen);
      px(ctx, f(eCx - 4), eCy - 3, sheen);
    }

    // Pronotum ridge
    const proX = eCx + 7;
    for (let dy = -eRy + 2; dy <= eRy - 2; dy++) px(ctx, f(proX), eCy + dy, darken(body, 0.14));

    // Head — small shadedEllipse forward of pronotum
    shadedEllipse(ctx, f(proX + 4), eCy, 3, eRy - 2, body);
    // Compound eye — faceted with specular
    drawCompoundEye(ctx, f(proX + 5), eCy - 2, 1, 1, eye);

    // Antenna — thickLine elbowed upward
    thickLine(ctx, f(proX + 5), eCy - 3, f(proX + 8), eCy - 6, 0, outline);
    thickLine(ctx, f(proX + 8), eCy - 6, f(proX + 9), eCy - 6, 0, outline); // club

    // 6 legs — thickLine from belly down to tarsus; legs reach y≈50
    const bellyY = eCy + eRy;   // ≈46
    const legXs  = [eCx - 6, eCx, eCx + 6];
    for (let i = 0; i < 3; i++) {
      const off = i === 1 ? -legOff : legOff;
      // femur: horizontal stub out from belly
      thickLine(ctx, f(legXs[i]),     bellyY + off, f(legXs[i] - 2), bellyY + 2 + off, 0, outline);
      // tibia: angled down to tarsus at y≈50
      thickLine(ctx, f(legXs[i] - 2), bellyY + 2 + off, f(legXs[i] - 3), bellyY + 4 + off, 0, outline);
    }
  }
}
