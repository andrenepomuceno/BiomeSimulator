/**
 * Crocodile template — long, low silhouette with broad snout and armored tail.
 * 64x64 design grid.
 */
import { px, rect, darken, lighten, blend, speckle, shadedEllipse, scalePattern, quadraticThick, thickLine, fillPolygon, DOWN, UP, LEFT } from '../../helpers.js';

export function drawCrocodile(ctx, params, dir, frame) {
  const { body, accent, eye } = params;
  const cx = 32;
  const cy = 34;
  const outline  = darken(body, 0.36);
  const bodyHi   = lighten(body, 0.10);
  const bodySh   = darken(body, 0.18);
  const scuteCol = params.scutes || darken(body, 0.28);
  const jawCol   = lighten(accent, 0.10);
  const legOff   = frame === 0 ? 0 : frame === 1 ? -2 : 2;

  // Shared: armored body fill using scalePattern + gradient
  function armoredBody(x, y, w, h) {
    // Base gradient (highlight top → shadow bottom)
    for (let dy = 0; dy < h; dy++) {
      const t = h <= 1 ? 0 : dy / (h - 1);
      const inset = dy === 0 || dy === h - 1 ? 2 : (dy === 1 || dy === h - 2 ? 1 : 0);
      rect(ctx, x + inset, y + dy, Math.max(1, w - inset * 2), 1, blend(bodyHi, bodySh, t));
    }
    // scalePattern gives overlapping armored-plate texture
    scalePattern(ctx, x + 1, y + 1, w - 2, h - 2, blend(bodyHi, bodySh, 0.5), scuteCol, 4);
  }

  if (dir === DOWN || dir === UP) {
    const facingDown = dir === DOWN;
    const bx = cx - 12;
    const by = cy - 5;

    // Body: wide armored ellipse
    armoredBody(bx, by, 24, 11);

    // Raised dorsal scute ridge
    for (let i = 0; i < 5; i++) {
      const sx = cx - 8 + i * 4;
      const sy = by + 2 + (i % 2);
      shadedEllipse(ctx, sx + 1, sy + 1, 1, 1, scuteCol, { highlight: lighten(scuteCol, 0.12) });
    }

    // Head + snout (broad, flat) — fillPolygon for trapezoidal skull
    const headY = facingDown ? by - 8 : by + 11;
    const hDir  = facingDown ? 1 : -1;
    fillPolygon(ctx, [
      [cx - 6, headY],
      [cx + 6, headY],
      [cx + 8, headY + 6 * hDir],
      [cx - 8, headY + 6 * hDir],
    ], body);
    // Lower jaw
    rect(ctx, cx - 6, headY + 6 * hDir, 12, 2, jawCol);
    // Nostrils
    px(ctx, cx - 3, facingDown ? headY + 1 : headY - 1, outline);
    px(ctx, cx + 3, facingDown ? headY + 1 : headY - 1, outline);

    if (facingDown) {
      // Eyes — shadedEllipse on each side
      shadedEllipse(ctx, cx - 6, headY + 3, 1, 1, eye, { highlight: '#ffffff' });
      px(ctx, cx - 6, headY + 4, '#000000');
      shadedEllipse(ctx, cx + 6, headY + 3, 1, 1, eye, { highlight: '#ffffff' });
      px(ctx, cx + 6, headY + 4, '#000000');
      if (params.teeth) {
        for (const tx of [cx - 5, cx - 1, cx + 2, cx + 5])
          px(ctx, tx, headY + 7, '#f0f0e0');
      }
    }

    // Tail — quadraticThick tapering curve
    const tailBaseY = facingDown ? by + 11 : by - 1;
    const tailTipY  = facingDown ? tailBaseY + 20 : tailBaseY - 20;
    const tailCpX   = cx + 6; // curve slightly off-center
    quadraticThick(ctx, cx, tailBaseY, tailCpX, (tailBaseY + tailTipY) / 2, cx + 4, tailTipY, 5, body, 0.9);
    // Scute ridge along tail spine
    for (let t = 0; t < 8; t++) {
      const prog = t / 7;
      const ty   = facingDown ? tailBaseY + t * 2 : tailBaseY - t * 2;
      px(ctx, cx + Math.round(prog * 2), ty, scuteCol);
    }

    // Legs — thickLine: femur + claw stubs
    const legYFront = by + 1, legYBack = by + 7;
    thickLine(ctx, bx,      legYFront + legOff, bx - 5, legYFront + legOff + 1, 1, outline);
    thickLine(ctx, bx + 24, legYFront - legOff, bx + 29, legYFront - legOff + 1, 1, outline);
    thickLine(ctx, bx,      legYBack - legOff,  bx - 5, legYBack - legOff + 1,  1, outline);
    thickLine(ctx, bx + 24, legYBack + legOff,  bx + 29, legYBack + legOff + 1,  1, outline);

  } else {
    const flip = dir === LEFT;
    const f = flip ? (x) => 63 - x : (x) => x;
    const bx = cx - 8;
    // Placed so leg tips (by+13) land at y≈50 = FEET_ANCHOR_Y ground plane
    const by = cy + 3;

    // Long low torso with armored plates
    armoredBody(bx, by, 18, 10);

    // Head — broad flat wedge (fillPolygon)
    const hx = bx + 18;
    fillPolygon(ctx, [
      [f(hx),      by],
      [f(hx + 14), by + 2],
      [f(hx + 14), by + 5],
      [f(hx),      by + 6],
    ], body);
    // Jaw underline
    rect(ctx, f(hx + 6), by + 5, 8, 1, jawCol);
    // Eye — shadedEllipse
    shadedEllipse(ctx, f(hx + 3), by + 1, 1, 1, eye, { highlight: '#ffffff' });
    px(ctx, f(hx + 3), by + 2, '#000000');
    // Nostrils
    px(ctx, f(hx + 13), by + 2, outline);
    px(ctx, f(hx + 13), by + 3, outline);
    if (params.teeth) {
      px(ctx, f(hx + 9),  by + 5, '#f0f0e0');
      px(ctx, f(hx + 11), by + 5, '#f0f0e0');
    }

    // Tail — quadraticThick tapering curve backward
    const tailStartX = flip ? 63 - bx : bx;
    quadraticThick(ctx, f(bx), by + 5, f(bx - 8), by + 6, f(bx - 16), by + 7, 4, body, 0.9);
    // Scute spine
    for (let t = 0; t < 8; t++) {
      px(ctx, f(bx - t * 2), by + 4 + Math.floor(t * 0.4), scuteCol);
    }

    // Legs — thickLine femur + tibia, reaches y≈50
    thickLine(ctx, f(bx + 3),  by + 9, f(bx + 1),  by + 13, 1, outline);
    thickLine(ctx, f(bx + 8),  by + 9, f(bx + 6),  by + 13, 1, outline);
    thickLine(ctx, f(bx + 13), by + 9, f(bx + 11), by + 13, 1, outline);
    thickLine(ctx, f(bx + 17), by + 9, f(bx + 15), by + 13, 1, outline);
  }
}

export function drawCrocodile(ctx, params, dir, frame) {
  const { body, accent, eye } = params;
  const cx = 32;
  const cy = 34;
  const outline = darken(body, 0.36);
  const bodyHi = lighten(body, 0.10);
  const bodySh = darken(body, 0.18);
  const scuteCol = params.scutes || darken(body, 0.28);
  const jawCol = lighten(accent, 0.10);
  const legOff = frame === 0 ? 0 : frame === 1 ? -2 : 2;

  function lowBody(x, y, w, h) {
    for (let dy = 0; dy < h; dy++) {
      const t = h <= 1 ? 0 : dy / (h - 1);
      const col = blend(bodyHi, bodySh, t);
      const inset = dy === 0 || dy === h - 1 ? 2 : (dy === 1 || dy === h - 2 ? 1 : 0);
      rect(ctx, x + inset, y + dy, w - inset * 2, 1, col);
    }
    speckle(ctx, x + 2, y + 1, Math.max(1, w - 4), Math.max(1, h - 2),
      [darken(body, 0.10), scuteCol, lighten(body, 0.04)], 0.20);
  }

  if (dir === DOWN || dir === UP) {
    const facingDown = dir === DOWN;
    const bx = cx - 12;
    const by = cy - 5;

    // Body: very low and wide
    lowBody(bx, by, 24, 11);

    // Dorsal scutes along spine
    for (let i = 0; i < 5; i++) {
      const sx = cx - 8 + i * 4;
      const sy = by + 2 + (i % 2);
      rect(ctx, sx, sy, 2, 2, scuteCol);
    }

    // Head + snout (broad, flat)
    const headY = facingDown ? by - 8 : by + 11;
    rect(ctx, cx - 7, headY, 14, 3, body);
    rect(ctx, cx - 8, headY + 3, 16, 3, body);
    rect(ctx, cx - 6, headY + 6, 12, 2, jawCol);
    // Nostrils at snout tip
    px(ctx, cx - 3, headY + 1, outline);
    px(ctx, cx + 3, headY + 1, outline);

    if (facingDown) {
      // Eyes sit high and lateral
      rect(ctx, cx - 7, headY + 3, 3, 2, eye);
      rect(ctx, cx + 4, headY + 3, 3, 2, eye);
      px(ctx, cx - 6, headY + 3, '#ffffff');
      px(ctx, cx + 5, headY + 3, '#ffffff');
      px(ctx, cx - 6, headY + 4, '#000000');
      px(ctx, cx + 5, headY + 4, '#000000');
      // Teeth hints
      if (params.teeth) {
        px(ctx, cx - 5, headY + 7, '#f0f0e0');
        px(ctx, cx - 1, headY + 7, '#f0f0e0');
        px(ctx, cx + 2, headY + 7, '#f0f0e0');
        px(ctx, cx + 5, headY + 7, '#f0f0e0');
      }
    }

    // Tail: armored taper opposite of head direction
    const tailBaseY = facingDown ? by + 10 : by - 3;
    for (let t = 0; t < 10; t++) {
      const tw = Math.max(2, 12 - t);
      const ty = facingDown ? tailBaseY + t * 2 : tailBaseY - t * 2;
      rect(ctx, cx - Math.floor(tw / 2), ty, tw, 2, darken(body, t * 0.01));
      if (t < 8) px(ctx, cx, ty, scuteCol);
    }

    // Short splayed legs
    const legYFront = by + 1;
    const legYBack = by + 7;
    rect(ctx, bx - 3, legYFront + legOff, 3, 2, outline);
    rect(ctx, bx + 24, legYFront - legOff, 3, 2, outline);
    rect(ctx, bx - 3, legYBack - legOff, 3, 2, outline);
    rect(ctx, bx + 24, legYBack + legOff, 3, 2, outline);
    px(ctx, bx - 4, legYFront + legOff + 1, outline);
    px(ctx, bx + 27, legYFront - legOff + 1, outline);

  } else {
    const flip = dir === LEFT;
    const f = flip ? (x) => 63 - x : (x) => x;
    const bx = cx - 8;
    // Placed so leg tips (by+13) land at y≈50 = FEET_ANCHOR_Y ground plane
    const by = cy + 3;

    // Long low torso
    lowBody(bx, by, 18, 10);

    // Scutes ridge
    for (let i = 0; i < 5; i++) px(ctx, f(bx + 3 + i * 3), by + 1 + (i % 2), scuteCol);

    // Head and long snout forward
    const hx = bx + 18;
    rect(ctx, f(hx), by + 1, 7, 4, body);
    rect(ctx, f(hx + 6), by + 2, 8, 3, body);
    rect(ctx, f(hx + 6), by + 5, 8, 1, jawCol);
    // Eye on top side
    rect(ctx, f(hx + 2), by + 1, 2, 2, eye);
    px(ctx, f(hx + 2), by + 1, '#ffffff');
    px(ctx, f(hx + 3), by + 2, '#000000');
    // Nostrils
    px(ctx, f(hx + 12), by + 2, outline);
    px(ctx, f(hx + 12), by + 3, outline);

    if (params.teeth) {
      px(ctx, f(hx + 9), by + 5, '#f0f0e0');
      px(ctx, f(hx + 11), by + 5, '#f0f0e0');
    }

    // Tail backward taper
    for (let t = 0; t < 12; t++) {
      const tx = bx - 2 - t;
      const th = Math.max(1, 8 - Math.floor(t * 0.6));
      const ty = by + 1 + Math.floor((10 - th) / 2);
      rect(ctx, f(tx), ty, 1, th, darken(body, t * 0.01));
      if (t < 9 && th > 1) px(ctx, f(tx), ty + Math.floor(th / 2), scuteCol);
    }

    // Legs
    rect(ctx, f(bx + 2), by + 10 + legOff, 2, 3, outline);
    rect(ctx, f(bx + 7), by + 10 - legOff, 2, 3, outline);
    rect(ctx, f(bx + 12), by + 10 + legOff, 2, 3, outline);
    rect(ctx, f(bx + 16), by + 10 - legOff, 2, 3, outline);
  }
}
