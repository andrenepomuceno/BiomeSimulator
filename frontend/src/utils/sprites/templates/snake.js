/**
 * Snake drawing template — 32×32 design grid.
 * Used by: snake.
 */
import { px, rect, darken, lighten, DOWN, UP, LEFT } from '../helpers.js';

export function drawSnake(ctx, params, dir, frame) {
  const { body, accent, eye, pattern, belly } = params;
  const shadow = darken(body, 0.15);
  const highlight = lighten(body, 0.1);
  const cx = 16;
  const cy = 16;
  const phase = frame * 0.9;

  if (dir === DOWN || dir === UP) {
    const segCount = 11;
    const headEnd = dir === DOWN ? 0 : segCount - 1;
    for (let i = 0; i < segCount; i++) {
      const y = dir === DOWN ? cy - 10 + i * 2 : cy + 10 - i * 2;
      const waveX = Math.sin(i * 0.65 + phase) * 3.6;
      const x = cx + Math.round(waveX);
      const isHead = i === headEnd;
      const color = isHead ? body : (i % 3 === 0 ? pattern : (i % 2 === 0 ? body : accent));
      rect(ctx, x, y, 2, 2, color);
      rect(ctx, x + 2, y, 2, 2, shadow);
      if (belly && waveX < 0) rect(ctx, x + 2, y, 2, 2, belly);
    }
    // Head
    const hy = dir === DOWN ? cy - 12 : cy + 10;
    rect(ctx, cx - 2, hy, 8, 4, body);
    rect(ctx, cx + 4, hy, 2, 2, highlight);
    rect(ctx, cx - 2, hy + 2, 2, 2, shadow);
    if (dir === DOWN) {
      rect(ctx, cx - 2, hy + 2, 2, 2, eye);
      rect(ctx, cx + 4, hy + 2, 2, 2, eye);
      // Tongue
      rect(ctx, cx, hy + 4, 2, 2, '#ff0000');
      rect(ctx, cx + 2, hy + 4, 2, 2, '#ff0000');
      rect(ctx, cx - 2, hy + 6, 2, 2, '#cc0000');
      rect(ctx, cx + 4, hy + 6, 2, 2, '#cc0000');
    }
  } else {
    const flip = dir === LEFT;
    const f = flip ? (x) => 31 - x : (x) => x;
    const segCount = 11;
    for (let i = 0; i < segCount; i++) {
      const sx = cx - 10 + i * 2;
      const wave = Math.sin(i * 0.65 + phase) * 3.6;
      const y = cy + Math.round(wave);
      const color = i % 3 === 0 ? pattern : (i % 2 === 0 ? body : accent);
      rect(ctx, f(sx), y, 2, 2, color);
      rect(ctx, f(sx), y + 2, 2, 2, belly || shadow);
    }
    // Head
    const hx = cx + 12;
    for (let r = -2; r <= 2; r += 2) {
      rect(ctx, f(hx), cy + r, 2, 2, body);
      rect(ctx, f(hx + 2), cy + r, 2, 2, body);
    }
    rect(ctx, f(hx + 2), cy - 2, 2, 2, highlight);
    rect(ctx, f(hx), cy + 2, 2, 2, shadow);
    rect(ctx, f(hx + 2), cy - 2, 2, 2, eye);
    // Tongue
    rect(ctx, f(hx + 4), cy, 2, 2, '#ff0000');
    rect(ctx, f(hx + 6), cy - 2, 2, 2, '#cc0000');
    rect(ctx, f(hx + 6), cy + 2, 2, 2, '#cc0000');
  }
}
