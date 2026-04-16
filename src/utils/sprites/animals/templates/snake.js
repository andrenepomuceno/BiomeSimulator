/**
 * Snake drawing template — 64x64 design grid.
 * Used by: snake species.
 *
 * Smooth sinusoidal body using overlapping elliptical segments.
 * Avoids blocky "square" segment look while preserving direction animations.
 */
import { px, rect, ellipse, darken, lighten, noise, speckle, DOWN, UP, LEFT } from '../../helpers.js';

export function drawSnake(ctx, params, dir, frame) {
  const { body, accent, pattern, belly, eye, headW, headH, segments, segW } = params;
  const shadow = darken(body, 0.18);
  const highlight = lighten(body, 0.12);
  const outline = darken(body, 0.32);
  const patternDark = pattern ? darken(pattern, 0.1) : null;
  const cx = 32;
  const cy = 37;  // shifted down: vertical view head at y≈6, tail at y≈55
  const phase = (frame / 3) * Math.PI * 2;
  const isVert = dir === DOWN || dir === UP;

  const segCount = segments || 9;
  const sw = segW || 6;

  function drawBlob(x, y, rx, ry, primary, secondary) {
    ellipse(ctx, x, y, rx, ry, primary);
    // Lower half shading to reinforce rounded volume
    for (let dy = 0; dy <= ry; dy++) {
      const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
      if (hw > 0) rect(ctx, x - hw, y + dy, hw * 2 + 1, 1, darken(primary, 0.04 + dy * 0.01));
    }
    // Top highlight strip
    ellipse(ctx, x, y - Math.max(1, Math.floor(ry * 0.45)), Math.max(1, rx - 2), Math.max(1, Math.floor(ry * 0.3)), highlight);
    // Scale texture
    speckle(ctx, x - rx, y - ry, rx * 2 + 1, ry * 2 + 1,
      [secondary || shadow, darken(primary, 0.10), lighten(primary, 0.04)], 0.18);
    // Belly stripe
    if (isVert) rect(ctx, x - 1, y - ry + 1, 2, ry * 2 - 1, belly || accent);
    else rect(ctx, x - rx + 1, y + ry - 1, rx * 2 - 1, 2, belly || accent);
  }

  function bridge(x0, y0, r0, x1, y1, r1, primary, secondary) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.max(Math.abs(dx), Math.abs(dy));
    if (dist <= 1) return;
    for (let s = 1; s < dist; s++) {
      const t = s / dist;
      const xi = Math.round(x0 + dx * t);
      const yi = Math.round(y0 + dy * t);
      const ri = Math.max(2, Math.round(r0 + (r1 - r0) * t));
      drawBlob(xi, yi, ri, Math.max(2, ri - 1), primary, secondary);
    }
  }

  if (isVert) {
    const direction = dir === DOWN ? 1 : -1;
    const spacing = sw - 1;
    const startY = cy - direction * Math.floor(segCount * spacing / 2);
    let prevX = null;
    let prevY = null;
    let prevR = null;

    for (let i = 0; i < segCount; i++) {
      const yOff = startY + i * spacing * direction;
      const xOff = cx + Math.round(Math.sin(phase + i * 0.6) * 8);
      const r = Math.max(2, Math.round(sw * 0.5 + (i < 2 ? 2 - i : i > segCount - 3 ? (segCount - 1 - i) * 0.6 : 0)));
      const col = i % 3 === 0 && pattern ? pattern : (i % 2 === 0 ? body : accent);
      const secCol = i % 3 === 0 && patternDark ? patternDark : shadow;

      if (prevX !== null) bridge(prevX, prevY, prevR, xOff, yOff, r, col, secCol);
      drawBlob(xOff, yOff, r, Math.max(2, r - 1), col, secCol);
      prevX = xOff;
      prevY = yOff;
      prevR = r;

      // Dorsal diamond pattern
      if (pattern && i > 0 && i < segCount - 1 && i % 2 === 1) {
        px(ctx, xOff, yOff, pattern);
        px(ctx, xOff - 1, yOff + 1, pattern);
        px(ctx, xOff + 1, yOff + 1, pattern);
        px(ctx, xOff, yOff + 2, pattern);
      }
    }

    // Head
    const hw = headW || 10;
    const hh = headH || 7;
    const headY = dir === DOWN ? startY - hh - 2 : startY + segCount * spacing;
    const hx = cx - Math.floor(hw / 2);

    // Rounded triangular-ish head
    ellipse(ctx, cx, headY + Math.floor(hh / 2), Math.max(4, Math.floor(hw / 2)), Math.max(3, Math.floor(hh / 2)), body);
    ellipse(ctx, cx, headY + 1, Math.max(3, Math.floor(hw / 2) - 2), 1, highlight);
    speckle(ctx, hx, headY, hw, hh, [shadow, darken(body, 0.10)], 0.15);

    // Eyes (slit pupil)
    if (dir === DOWN) {
      rect(ctx, hx + 1, headY + 2, 3, 3, eye);
      rect(ctx, hx + hw - 4, headY + 2, 3, 3, eye);
      px(ctx, hx + 2, headY + 3, '#000000');
      px(ctx, hx + hw - 3, headY + 3, '#000000');
      px(ctx, hx + 1, headY + 2, '#ffffff');
      px(ctx, hx + hw - 2, headY + 2, '#ffffff');
    }

    // Forked tongue
    const tongueY = dir === DOWN ? headY + hh : headY - 3;
    const tongueDir = dir === DOWN ? 1 : -1;
    px(ctx, cx, tongueY, '#cc2222');
    px(ctx, cx, tongueY + tongueDir, '#cc2222');
    px(ctx, cx - 1, tongueY + tongueDir * 2, '#cc2222');
    px(ctx, cx + 1, tongueY + tongueDir * 2, '#cc2222');
  } else {
    // LEFT / RIGHT
    const flip = dir === LEFT;
    const f = flip ? (x) => 63 - x : (x) => x;
    const spacing = sw - 1;
    const startX = cx - Math.floor(segCount * spacing / 2);
    let prevX = null;
    let prevY = null;
    let prevR = null;
    // Shift side body toward bottom so the snake appears grounded (≈y 41-53)
    const sideY = cy + 10;

    for (let i = 0; i < segCount; i++) {
      const xOff = startX + i * spacing;
      const yOff = sideY + Math.round(Math.sin(phase + i * 0.6) * 6);
      const r = Math.max(2, Math.round(sw * 0.5 + (i < 2 ? 2 - i : i > segCount - 3 ? (segCount - 1 - i) * 0.6 : 0)));
      const col = i % 3 === 0 && pattern ? pattern : (i % 2 === 0 ? body : accent);
      const secCol = i % 3 === 0 && patternDark ? patternDark : shadow;

      if (prevX !== null) {
        const dx = xOff - prevX;
        const dy = yOff - prevY;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        for (let s = 1; s < dist; s++) {
          const t = s / dist;
          const xi = Math.round(prevX + dx * t);
          const yi = Math.round(prevY + dy * t);
          const ri = Math.max(2, Math.round(prevR + (r - prevR) * t));
          for (let oy = -Math.max(2, ri - 1); oy <= Math.max(2, ri - 1); oy++) {
            const hw = Math.round(ri * Math.sqrt(Math.max(0, 1 - (oy * oy) / ((Math.max(2, ri - 1) * Math.max(2, ri - 1))))));
            for (let ox = -hw; ox <= hw; ox++) {
              const c = oy >= Math.max(1, ri - 2) ? (belly || accent) : col;
              px(ctx, f(xi + ox), yi + oy, c);
            }
          }
        }
      }

      for (let oy = -Math.max(2, r - 1); oy <= Math.max(2, r - 1); oy++) {
        const hw = Math.round(r * Math.sqrt(Math.max(0, 1 - (oy * oy) / ((Math.max(2, r - 1) * Math.max(2, r - 1))))));
        for (let ox = -hw; ox <= hw; ox++) {
          const c = oy >= Math.max(1, r - 2) ? (belly || accent) : col;
          px(ctx, f(xOff + ox), yOff + oy, c);
          if (noise(xOff + ox, yOff + oy) > 0.82) px(ctx, f(xOff + ox), yOff + oy, secCol);
        }
      }
      // top highlight on each segment
      for (let ox = -Math.max(1, r - 2); ox <= Math.max(1, r - 2); ox++) px(ctx, f(xOff + ox), yOff - Math.max(2, r - 1), highlight);

      prevX = xOff;
      prevY = yOff;
      prevR = r;

      // Dorsal pattern
      if (pattern && i > 0 && i < segCount - 1 && i % 2 === 1) {
        px(ctx, f(xOff), yOff - 1, pattern);
        px(ctx, f(xOff - 1), yOff, pattern);
        px(ctx, f(xOff + 1), yOff, pattern);
        px(ctx, f(xOff), yOff + 1, pattern);
      }
    }

    // Head
    const hw = headW || 10;
    const hh = headH || 7;
    const headX = startX + segCount * spacing + 1;
    const hy = sideY - Math.floor(hh / 2);

    ellipse(ctx, f(headX + Math.floor(hw / 2)), hy + Math.floor(hh / 2), Math.max(4, Math.floor(hw / 2)), Math.max(3, Math.floor(hh / 2)), body);
    ellipse(ctx, f(headX + Math.floor(hw / 2)), hy + 1, Math.max(3, Math.floor(hw / 2) - 2), 1, highlight);
    speckle(ctx, headX, hy, hw, hh, [shadow, darken(body, 0.10)], 0.18);

    // Eye
    rect(ctx, f(headX + hw - 3), hy + 1, 2, 2, eye);
    px(ctx, f(headX + hw - 2), hy + 2, '#000000');
    px(ctx, f(headX + hw - 3), hy + 1, '#ffffff');

    // Forked tongue
    px(ctx, f(headX + hw), sideY, '#cc2222');
    px(ctx, f(headX + hw + 1), sideY, '#cc2222');
    px(ctx, f(headX + hw + 2), sideY - 1, '#cc2222');
    px(ctx, f(headX + hw + 2), sideY + 1, '#cc2222');
  }
}
