/**
 * Lizard drawing template — 64×64 design grid.
 * Key features: slim oval body, triangular tapered head (not broad croc jaw),
 * very long curving thin tail, four clearly splayed legs with visible toes,
 * slit-pupil eyes, scale texture, optional dorsal spine.
 *
 * Ground contact at FEET_ANCHOR_Y (y≈50):
 *   – overhead: rear-leg toes at y≈50
 *   – side: foot toes at y≈50
 */
import { px, rect, darken, lighten, blend, noise, speckle, DOWN, UP, LEFT } from '../../helpers.js';

export function drawLizard(ctx, params, dir, frame) {
  const { body, accent, eye } = params;
  const cx = 32;
  const outline  = darken(body, 0.36);
  const highlight = lighten(body, 0.14);
  const shadow   = darken(body, 0.18);
  const belly    = params.belly || lighten(accent, 0.08);
  const scaleTex = darken(body, 0.08);
  const legShift = frame === 0 ? 0 : frame === 1 ? -2 : 2;
  const tailSway = frame === 0 ? 0 : frame === 1 ? -1 : 1;

  function scales(x, y, w, h) {
    speckle(ctx, x, y, w, h,
      [scaleTex, darken(body, 0.12), lighten(body, 0.04)], 0.26);
  }

  // ── OVERHEAD (DOWN / UP) ─────────────────────────────────────────────
  if (dir === DOWN || dir === UP) {
    const facingDown = dir === DOWN;
    const neckDir = facingDown ? -1 : 1;   // direction toward head

    // Body — slim upright oval
    const bRx = 5, bRy = 9;
    const bCy = 38;  // center; bottom y=47, top y=29
    for (let dy = -bRy; dy <= bRy; dy++) {
      const hw = Math.round(bRx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (bRy * bRy))));
      if (hw <= 0) continue;
      const t = (dy + bRy) / (2 * bRy);
      rect(ctx, cx - hw, bCy + dy, hw * 2 + 1, 1, blend(highlight, shadow, t));
    }
    // Belly stripe
    rect(ctx, cx - 2, bCy - 5, 5, 10, belly);
    // Dorsal spine
    if (params.spine) {
      for (let dy = -bRy + 2; dy <= bRy - 2; dy++) px(ctx, cx, bCy + dy, params.spine);
    }
    scales(cx - bRx + 1, bCy - bRy + 2, bRx * 2 - 1, bRy * 2 - 4);

    // Neck — tapers from body toward head
    const neckY0 = facingDown ? bCy - bRy - 1 : bCy + bRy + 1;
    for (let i = 0; i < 5; i++) {
      const hw = Math.max(2, 4 - Math.round(i * 0.5));
      rect(ctx, cx - hw, neckY0 + i * neckDir, hw * 2 + 1, 1,
        blend(highlight, body, i / 4));
    }

    // Head — triangular, clearly narrower than croc
    const headBase = neckY0 + 5 * neckDir;
    // Half-widths row by row from jaw base to snout tip
    const headHW = [4, 4, 4, 3, 3, 2, 2, 1, 1, 1];
    for (let i = 0; i < headHW.length; i++) {
      const hy  = headBase + i * neckDir;
      const hw  = headHW[i];
      const col = blend(body, darken(body, 0.16), i / (headHW.length - 1));
      rect(ctx, cx - hw, hy, hw * 2 + 1, 1, col);
    }
    scales(cx - 4, facingDown ? headBase - 1 : headBase + 1, 8, 8);

    if (facingDown) {
      // Eyes — slit pupils near jaw base
      rect(ctx, cx - 5, headBase + 1, 2, 2, eye);
      rect(ctx, cx + 4, headBase + 1, 2, 2, eye);
      px(ctx, cx - 4, headBase + 2, '#000000');
      px(ctx, cx + 4, headBase + 2, '#000000');
      px(ctx, cx - 5, headBase + 1, lighten(eye, 0.35));
      px(ctx, cx + 4, headBase + 1, lighten(eye, 0.35));
      // Forked tongue (frame 2)
      if (frame === 2) {
        const tipY = headBase + headHW.length * neckDir;
        px(ctx, cx, tipY,     '#cc2222');
        px(ctx, cx - 1, tipY + 1, '#cc2222');
        px(ctx, cx + 1, tipY + 1, '#cc2222');
      }
    }

    // Tail — long, curving, tapering to tip; starts at body bottom
    const tailBaseY = facingDown ? bCy + bRy + 1 : bCy - bRy - 1;
    const tailDir   = facingDown ? 1 : -1;
    const tailLen   = 16;
    for (let t = 0; t < tailLen; t++) {
      const prog  = t / (tailLen - 1);
      const tw    = Math.max(1, Math.round(5 * (1 - prog)));
      // Curve sideways as tail extends (sine wave with frame sway)
      const curvX = cx + Math.round(Math.sin(prog * Math.PI * 1.4 + tailSway * 0.5) * 9 * prog);
      const ty    = tailBaseY + t * 2 * tailDir;
      const col   = blend(body, outline, prog * 0.4);
      rect(ctx, curvX - Math.floor(tw / 2), ty, tw, 2, col);
    }

    // Legs — 4 splayed, thigh + shin + 3 toes
    // Front pair (near neck)
    const fLY = bCy - 3;
    //   Left
    rect(ctx, cx - bRx - 1, fLY + legShift,     3, 2, shadow);
    px(ctx,   cx - bRx - 3, fLY + 2 + legShift, outline);
    px(ctx,   cx - bRx - 4, fLY + 3 + legShift, outline);
    px(ctx,   cx - bRx - 6, fLY + 4 + legShift, outline);
    px(ctx,   cx - bRx - 5, fLY + 5 + legShift, outline);
    px(ctx,   cx - bRx - 3, fLY + 5 + legShift, outline);
    //   Right
    rect(ctx, cx + bRx - 2, fLY - legShift,     3, 2, shadow);
    px(ctx,   cx + bRx + 2, fLY + 2 - legShift, outline);
    px(ctx,   cx + bRx + 3, fLY + 3 - legShift, outline);
    px(ctx,   cx + bRx + 5, fLY + 4 - legShift, outline);
    px(ctx,   cx + bRx + 4, fLY + 5 - legShift, outline);
    px(ctx,   cx + bRx + 2, fLY + 5 - legShift, outline);

    // Rear pair (near tail) — toes reach y≈50
    const rLY = bCy + 5;  // y=43; toes at 43+7=50
    //   Left
    rect(ctx, cx - bRx - 1, rLY - legShift,     3, 2, shadow);
    px(ctx,   cx - bRx - 3, rLY + 2 - legShift, outline);
    px(ctx,   cx - bRx - 4, rLY + 3 - legShift, outline);
    px(ctx,   cx - bRx - 6, rLY + 4 - legShift, outline);
    px(ctx,   cx - bRx - 5, rLY + 5 - legShift, outline);
    px(ctx,   cx - bRx - 3, rLY + 5 - legShift, outline);
    //   Right
    rect(ctx, cx + bRx - 2, rLY + legShift,     3, 2, shadow);
    px(ctx,   cx + bRx + 2, rLY + 2 + legShift, outline);
    px(ctx,   cx + bRx + 3, rLY + 3 + legShift, outline);
    px(ctx,   cx + bRx + 5, rLY + 4 + legShift, outline);
    px(ctx,   cx + bRx + 4, rLY + 5 + legShift, outline);
    px(ctx,   cx + bRx + 2, rLY + 5 + legShift, outline);

  // ── SIDE VIEW (LEFT / RIGHT) ─────────────────────────────────────────
  } else {
    const flip = dir === LEFT;
    const f    = flip ? (x) => 63 - x : (x) => x;

    // Body — low slung, narrower than croc
    const bW = 20, bH = 9;
    const bx = cx - 12;   // left edge x=20; right edge x=40
    const by = 37;         // top y=37; bottom y=46
    for (let dy = 0; dy < bH; dy++) {
      const inset = dy === 0 || dy === bH - 1 ? 3 : (dy === 1 || dy === bH - 2 ? 1 : 0);
      const t = dy / (bH - 1);
      rect(ctx, f(bx + inset), by + dy, bW - inset * 2, 1,
        blend(highlight, shadow, t));
    }
    // Belly plates
    for (let i = 2; i < bW - 2; i++) {
      px(ctx, f(bx + i), by + bH - 3, belly);
      px(ctx, f(bx + i), by + bH - 2, belly);
    }
    // Dorsal spine bumps
    if (params.spine) {
      for (let i = 2; i < bW; i += 4) rect(ctx, f(bx + i), by, 2, 2, params.spine);
    }
    scales(bx + 2, by + 1, bW - 4, bH - 3);

    // Head — narrow triangular wedge pointing forward (very different from croc)
    const hBaseX = bx + bW;  // x=32; head extends to x=42
    for (let i = 0; i < 10; i++) {
      const hh   = Math.max(1, bH - 1 - Math.round(i * 0.72));
      const hy   = by + 1 + Math.floor((bH - hh) / 2);
      const col  = blend(body, darken(body, 0.15), i / 9);
      rect(ctx, f(hBaseX + i), hy, 1, hh, col);
    }
    // Top jaw highlight
    rect(ctx, f(hBaseX), by + 1, 4, 1, highlight);
    // Eye — slit pupil, positioned on head side
    rect(ctx, f(hBaseX + 2), by + 2, 3, 3, eye);
    px(ctx,   f(hBaseX + 3), by + 3, '#000000');
    px(ctx,   f(hBaseX + 2), by + 2, '#ffffff');
    // Tongue flick (frame 2)
    if (frame === 2) {
      px(ctx, f(hBaseX + 9),  by + bH - 2, '#cc2222');
      px(ctx, f(hBaseX + 10), by + bH - 3, '#cc2222');
      px(ctx, f(hBaseX + 10), by + bH - 1, '#cc2222');
    }

    // Tail — long tapering arc, slight downward curve, fills left side of frame
    const tailLen = 20;
    for (let t = 1; t <= tailLen; t++) {
      const prog  = t / tailLen;
      const tx    = bx - t * 2;
      const th    = Math.max(1, Math.round(bH * (1 - prog * 0.9)));
      const yDroop = Math.round(prog * prog * 5 * tailSway * 0.5);
      const ty    = by + Math.floor((bH - th) / 2) + yDroop;
      const col   = blend(body, outline, prog * 0.4);
      rect(ctx, f(tx), ty, 2, th, col);
      for (let dy = 0; dy < th; dy++) {
        if (noise(tx, ty + dy) > 0.74) px(ctx, f(tx), ty + dy, scaleTex);
      }
    }

    // Legs — 2 visible pairs; toes reach y≈50 (FEET_ANCHOR_Y ground plane)
    // Rear leg (body x≈22-24)
    const rLX = bx + 4;
    rect(ctx, f(rLX - 2), by + bH + legShift,     4, 2, shadow);
    rect(ctx, f(rLX - 3), by + bH + 2 + legShift, 3, 2, outline);
    px(ctx,   f(rLX - 5), by + bH + 4 + legShift, outline);
    px(ctx,   f(rLX - 3), by + bH + 4 + legShift, outline);
    px(ctx,   f(rLX - 1), by + bH + 4 + legShift, outline);

    // Front leg (body x≈35-37)
    const fLX = bx + bW - 5;
    rect(ctx, f(fLX + 2), by + bH - legShift,     4, 2, shadow);
    rect(ctx, f(fLX + 3), by + bH + 2 - legShift, 3, 2, outline);
    px(ctx,   f(fLX + 3), by + bH + 4 - legShift, outline);
    px(ctx,   f(fLX + 5), by + bH + 4 - legShift, outline);
    px(ctx,   f(fLX + 7), by + bH + 4 - legShift, outline);
  }
}
