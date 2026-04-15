/**
 * Snake drawing template — 64x64 design grid.
 * Used by: snake species.
 *
 * Sinusoidal body segments with scale patterns, forked tongue, belly plates.
 */
import { px, rect, darken, lighten, noise, gradientV, rimLight, ao, speckle, DOWN, UP, LEFT } from '../../helpers.js';

export function drawSnake(ctx, params, dir, frame) {
  const { body, accent, pattern, belly, eye, headW, headH, segments, segW } = params;
  const shadow = darken(body, 0.15);
  const highlight = lighten(body, 0.10);
  const outline = darken(body, 0.3);
  const patternDark = pattern ? darken(pattern, 0.1) : null;
  const cx = 32;
  const cy = 32;
  const phase = (frame / 3) * Math.PI * 2;
  const isVert = dir === DOWN || dir === UP;

  // Segment helpers
  const segCount = segments || 9;
  const sw = segW || 6;
  const segH = sw;

  // Draw a single segment with scale detail and gradient
  function seg(sx, sy, w, h, primary, secondary) {
    gradientV(ctx, sx, sy, w, h, lighten(primary, 0.06), darken(primary, 0.06));
    // Belly stripe
    if (isVert) {
      rect(ctx, sx + 1, sy, 2, h, belly || accent);
    } else {
      rect(ctx, sx, sy + h - 2, w, 2, belly || accent);
    }
    // Scale pattern (multi-tone)
    speckle(ctx, sx, sy, w, h, [secondary || shadow, darken(primary, 0.10), lighten(primary, 0.04)], 0.22);
  }

  if (isVert) {
    const direction = dir === DOWN ? 1 : -1;
    const startY = cy - direction * Math.floor(segCount * segH / 2);

    for (let i = 0; i < segCount; i++) {
      const yOff = startY + i * segH * direction;
      const xOff = cx + Math.round(Math.sin(phase + i * 0.6) * 8);
      const w = sw + (i < 2 ? 2 : i > segCount - 3 ? -(segCount - 1 - i) : 0);
      const col = i % 3 === 0 && pattern ? pattern : (i % 2 === 0 ? body : accent);
      const secCol = i % 3 === 0 && patternDark ? patternDark : shadow;

      seg(xOff - Math.floor(w / 2), yOff, w, segH, col, secCol);

      // Dorsal diamond pattern
      if (pattern && i > 0 && i < segCount - 1 && i % 2 === 1) {
        px(ctx, xOff, yOff + 1, pattern);
        px(ctx, xOff - 1, yOff + 2, pattern);
        px(ctx, xOff + 1, yOff + 2, pattern);
        px(ctx, xOff, yOff + 3, pattern);
      }
    }

    // Head
    const hw = headW || 10;
    const hh = headH || 7;
    const headY = dir === DOWN ? startY - hh - 1 : startY + segCount * segH + 1;
    const hx = cx - Math.floor(hw / 2);

    // Head shape (slightly rounded)
    rect(ctx, hx + 1, headY, hw - 2, 1, body);
    gradientV(ctx, hx, headY + 1, hw, hh - 2, body, shadow);
    rect(ctx, hx + 1, headY + hh - 1, hw - 2, 1, shadow);
    rimLight(ctx, hx + 1, headY, hw - 2, 2, lighten(body, 0.10), 'top');
    // Scale texture on head
    speckle(ctx, hx, headY, hw, hh, [shadow, darken(body, 0.10)], 0.18);
    // Eyes (slit pupil)
    if (dir === DOWN) {
      rect(ctx, hx + 2, headY + 2, 3, 3, eye);
      rect(ctx, hx + hw - 5, headY + 2, 3, 3, eye);
      px(ctx, hx + 3, headY + 2, '#000000');
      px(ctx, hx + hw - 4, headY + 2, '#000000');
      px(ctx, hx + 2, headY + 2, '#ffffff');
      px(ctx, hx + hw - 3, headY + 2, '#ffffff');
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
    const direction = 1;
    const startX = cx - Math.floor(segCount * sw / 2);

    for (let i = 0; i < segCount; i++) {
      const xOff = startX + i * sw * direction;
      const yOff = cy + Math.round(Math.sin(phase + i * 0.6) * 6);
      const h = sw + (i < 2 ? 2 : i > segCount - 3 ? -(segCount - 1 - i) : 0);
      const col = i % 3 === 0 && pattern ? pattern : (i % 2 === 0 ? body : accent);
      const secCol = i % 3 === 0 && patternDark ? patternDark : shadow;

      for (let dx = 0; dx < sw; dx++) {
        for (let dy = 0; dy < h; dy++) {
          const c = dy < h - 2 ? col : (belly || accent);
          px(ctx, f(xOff + dx), yOff - Math.floor(h / 2) + dy, c);
          if (noise(xOff + dx, yOff + dy) > 0.78) px(ctx, f(xOff + dx), yOff - Math.floor(h / 2) + dy, secCol);
        }
      }

      // Dorsal pattern
      if (pattern && i > 0 && i < segCount - 1 && i % 2 === 1) {
        const py = yOff - Math.floor(h / 2);
        px(ctx, f(xOff + 2), py + 1, pattern);
        px(ctx, f(xOff + 1), py + 2, pattern);
        px(ctx, f(xOff + 3), py + 2, pattern);
        px(ctx, f(xOff + 2), py + 3, pattern);
      }
    }

    // Head
    const hw = headW || 10;
    const hh = headH || 7;
    const headX = startX + segCount * sw + 1;
    const hy = cy - Math.floor(hh / 2);

    for (let dx = 0; dx < hw; dx++) for (let dy = 0; dy < hh; dy++) px(ctx, f(headX + dx), hy + dy, body);
    rimLight(ctx, headX, hy, hw, 2, lighten(body, 0.10), 'top');
    speckle(ctx, headX, hy, hw, hh, [shadow, darken(body, 0.10)], 0.18);
    // Eye
    rect(ctx, f(headX + hw - 4), hy + 1, 3, 3, eye);
    px(ctx, f(headX + hw - 3), hy + 2, '#000000');
    px(ctx, f(headX + hw - 4), hy + 1, '#ffffff');
    // Forked tongue
    px(ctx, f(headX + hw), cy, '#cc2222');
    px(ctx, f(headX + hw + 1), cy, '#cc2222');
    px(ctx, f(headX + hw + 2), cy - 1, '#cc2222');
    px(ctx, f(headX + hw + 2), cy + 1, '#cc2222');
  }
}
