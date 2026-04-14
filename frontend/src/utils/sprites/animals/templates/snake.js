/**
 * Snake drawing template â€” 32Ã—32 design grid.
 * Used by: snake. Thick body (4Ã—4 segments), large head.
 */
import { px, rect, darken, lighten, DOWN, UP, LEFT } from '../../helpers.js';

export function drawSnake(ctx, params, dir, frame) {
  const { body, accent, eye, pattern, belly } = params;
  const shadow = darken(body, 0.15);
  const highlight = lighten(body, 0.1);
  const cx = 16;
  const cy = 16;
  const phase = frame * 0.9;

  if (dir === DOWN || dir === UP) {
    const segCount = 9;
    const headEnd = dir === DOWN ? 0 : segCount - 1;
    for (let i = 0; i < segCount; i++) {
      const y = dir === DOWN ? cy - 8 + i * 2 : cy + 8 - i * 2;
      const waveX = Math.sin(i * 0.7 + phase) * 3.0;
      const x = cx - 2 + Math.round(waveX);
      const isHead = i === headEnd;
      const color = isHead ? body : (i % 3 === 0 ? pattern : (i % 2 === 0 ? body : accent));
      rect(ctx, x, y, 4, 2, color);
      rect(ctx, x + 1, y, 2, 1, highlight);
      rect(ctx, x, y + 1, 4, 1, shadow);
      if (belly && waveX < 0) rect(ctx, x + 2, y + 1, 2, 1, belly);
    }
    // Head
    const hy = dir === DOWN ? cy - 10 : cy + 8;
    rect(ctx, cx - 4, hy, 8, 4, body);
    rect(ctx, cx - 3, hy, 6, 2, highlight);
    rect(ctx, cx - 4, hy + 2, 8, 2, shadow);
    if (dir === DOWN) {
      rect(ctx, cx - 3, hy + 2, 2, 2, eye);
      rect(ctx, cx + 2, hy + 2, 2, 2, eye);
      // Tongue
      rect(ctx, cx - 1, hy + 4, 2, 2, '#ff0000');
      rect(ctx, cx + 1, hy + 4, 2, 2, '#ff0000');
      rect(ctx, cx - 2, hy + 6, 2, 2, '#cc0000');
      rect(ctx, cx + 2, hy + 6, 2, 2, '#cc0000');
    }
  } else {
    const flip = dir === LEFT;
    const f = flip ? (x) => 31 - x : (x) => x;
    const segCount = 9;
    for (let i = 0; i < segCount; i++) {
      const sx = cx - 8 + i * 2;
      const wave = Math.sin(i * 0.7 + phase) * 3.0;
      const y = cy - 2 + Math.round(wave);
      const color = i % 3 === 0 ? pattern : (i % 2 === 0 ? body : accent);
      rect(ctx, f(sx), y, 2, 4, color);
      rect(ctx, f(sx), y, 1, 4, highlight);
      rect(ctx, f(sx + 1), y, 1, 4, shadow);
      if (belly) rect(ctx, f(sx), y + 3, 2, 1, belly);
    }
    // Head
    const hx = cx + 10;
    rect(ctx, f(hx), cy - 4, 4, 8, body);
    rect(ctx, f(hx), cy - 3, 2, 6, highlight);
    rect(ctx, f(hx + 2), cy - 3, 2, 6, shadow);
    rect(ctx, f(hx + 2), cy - 3, 2, 2, eye);
    // Tongue
    rect(ctx, f(hx + 4), cy - 1, 2, 2, '#ff0000');
    rect(ctx, f(hx + 6), cy - 2, 2, 2, '#cc0000');
    rect(ctx, f(hx + 6), cy + 1, 2, 2, '#cc0000');
  }
}
