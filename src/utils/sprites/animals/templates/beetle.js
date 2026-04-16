/**
 * Beetle drawing template — 64×64 design grid.
 * Key features: oval elytra with center suture line, distinct pronotum,
 * segmented antennae with antennal clubs, compound eyes, 6 jointed legs.
 */
import { px, rect, darken, lighten, blend, speckle, LEFT, DOWN, UP } from '../../helpers.js';

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
    // Elytra — filled oval with top-to-bottom gradient
    const eCx = cx, eCy = cy + 4, eRx = 9, eRy = 10;
    for (let dy = -eRy; dy <= eRy; dy++) {
      const hw  = Math.round(eRx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (eRy * eRy))));
      const t   = (dy + eRy) / (2 * eRy);
      const col = blend(lighten(accent, 0.06), darken(accent, 0.13), t);
      rect(ctx, eCx - hw, eCy + dy, hw * 2 + 1, 1, col);
    }
    // Center suture line
    for (let dy = -eRy; dy <= eRy; dy++) px(ctx, eCx, eCy + dy, shellLine);
    // Sheen highlights (top-left quadrant)
    if (sheen) {
      rect(ctx, eCx - 5, eCy - 7, 3, 2, sheen);
      px(ctx, eCx - 4, eCy - 4, lighten(sheen, 0.12));
      rect(ctx, eCx + 3, eCy - 6, 2, 2, sheen);
    }
    speckle(ctx, eCx - eRx + 2, eCy - eRy + 2, eRx * 2 - 4, eRy * 2 - 4,
      [darken(accent, 0.08), darken(accent, 0.14), lighten(accent, 0.04)], 0.14);

    // Pronotum — shield that tapers toward the head
    const pCy = eCy - eRy - 1;
    for (let i = 0; i < 5; i++) {
      const hw  = Math.max(2, 5 - Math.round(i * 1.1));
      const col = blend(darken(body, 0.04), darken(body, 0.20), i / 4);
      rect(ctx, cx - hw, pCy - i, hw * 2 + 1, 1, col);
    }

    // Head — small oval with compound eyes
    const hCy = pCy - 6;
    const headShape = [2, 3, 3, 2];
    for (let i = 0; i < 4; i++) {
      rect(ctx, cx - headShape[i], hCy + i, headShape[i] * 2 + 1, 1, body);
    }
    if (dir === DOWN) {
      // Bulging compound eyes on each side
      px(ctx, cx - 3, hCy + 1, eye); px(ctx, cx - 3, hCy, lighten(eye, 0.35));
      px(ctx, cx + 3, hCy + 1, eye); px(ctx, cx + 3, hCy, lighten(eye, 0.35));
    }

    // Antennae — 4 segments curving outward, with antennal club at tip
    for (let i = 1; i <= 4; i++) {
      px(ctx, cx - 2 - i, hCy - i, outline);
      px(ctx, cx + 2 + i, hCy - i, outline);
    }
    // Antennal clubs (wider terminal segments)
    px(ctx, cx - 7, hCy - 5, outline); px(ctx, cx - 6, hCy - 5, outline);
    px(ctx, cx + 7, hCy - 5, outline); px(ctx, cx + 6, hCy - 5, outline);

    // 6 legs — 3 pairs, jointed, emerging from sides of elytra
    const legYs = [eCy - 6, eCy, eCy + 6];
    for (let i = 0; i < 3; i++) {
      const lY  = legYs[i];
      const off = i === 1 ? -legOff : legOff;
      // Left: femur → tibia → tarsus
      px(ctx, eCx - eRx - 1, lY + off,     outline);
      px(ctx, eCx - eRx - 3, lY + off - 1, outline);
      px(ctx, eCx - eRx - 5, lY + off - 2, outline);
      px(ctx, eCx - eRx - 6, lY + off - 3, outline);
      // Right
      px(ctx, eCx + eRx + 1, lY - off,     outline);
      px(ctx, eCx + eRx + 3, lY - off - 1, outline);
      px(ctx, eCx + eRx + 5, lY - off - 2, outline);
      px(ctx, eCx + eRx + 6, lY - off - 3, outline);
    }

  // ── SIDE VIEW (LEFT / RIGHT) ─────────────────────────────────────────
  } else {
    const flip = dir === LEFT;
    const f    = flip ? (x) => 63 - x : (x) => x;

    // Elytra — dome-shaped oval profile
    const bCx = cx - 3, bW = 22, bH = 12;
    // Shift body toward bottom so beetle appears grounded (feet near y≈58)
    const by  = cy + 8;
    for (let dy = 0; dy < bH; dy++) {
      const nt = 2 * (dy / (bH - 1)) - 1;          // −1…+1
      const hw = Math.round((bW / 2) * Math.sqrt(Math.max(0, 1 - nt * nt)));
      if (hw <= 0) continue;
      const t   = dy / (bH - 1);
      const col = t < 0.2  ? blend(lighten(accent, 0.08), accent, t / 0.2)
                : t > 0.75 ? blend(accent, darken(accent, 0.18), (t - 0.75) / 0.25)
                : accent;
      for (let dx = -hw; dx < hw; dx++) px(ctx, f(bCx + dx), by + dy, col);
    }
    if (sheen) {
      px(ctx, f(bCx - 5), by + 1, sheen);
      px(ctx, f(bCx - 4), by + 2, sheen);
    }

    // Pronotum ridge at the head-facing end of elytra
    const proX = bCx + 8;
    for (let dy = 2; dy < bH - 2; dy++) px(ctx, f(proX), by + dy, darken(body, 0.10));

    // Head — small oval
    const headX = proX + 2;
    for (let dy = 1; dy < bH - 1; dy++) {
      const hw = dy === 1 || dy === bH - 2 ? 2 : 3;
      for (let dx = 0; dx < hw; dx++) px(ctx, f(headX + dx), by + dy, body);
    }
    // Eye
    px(ctx, f(headX + 2), by + 2, eye);
    px(ctx, f(headX + 2), by + 1, lighten(eye, 0.35));

    // Antenna — 4 segments going forward-upward, with club
    for (let i = 1; i <= 4; i++) px(ctx, f(headX + 2 + i), by + 1 - i, outline);
    px(ctx, f(headX + 6), by - 3, outline); px(ctx, f(headX + 7), by - 3, outline);

    // 6 legs — 3 pairs going downward from belly
    const bellyY = by + bH;
    const legXs  = [bCx - 5, bCx + 1, bCx + 7];
    for (let i = 0; i < 3; i++) {
      const off = i === 1 ? -legOff : legOff;
      px(ctx, f(legXs[i]),     bellyY + off,     outline);
      px(ctx, f(legXs[i] + 1), bellyY + 2 + off, outline);
      px(ctx, f(legXs[i] + 2), bellyY + 3 + off, outline);
      px(ctx, f(legXs[i] + 2), bellyY + 4 + off, outline);
    }
  }
}
