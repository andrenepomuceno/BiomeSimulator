/**
 * Snake drawing template.
 * Used by: snake.
 */
import { px, rect, darken, lighten, DOWN, UP, LEFT } from '../helpers.js';

export function drawSnake(ctx, params, dir, frame) {
  const { body, accent, eye, pattern, belly } = params;
  const shadow = darken(body, 0.15);
  const highlight = lighten(body, 0.1);
  const cx = 8;
  const cy = 8;
  const phase = frame * 0.9;

  if (dir === DOWN || dir === UP) {
    const segCount = 11;
    const headEnd = dir === DOWN ? 0 : segCount - 1;
    for (let i = 0; i < segCount; i++) {
      const y = dir === DOWN ? cy - 5 + i : cy + 5 - i;
      const waveX = Math.sin(i * 0.65 + phase) * 1.8;
      const x = cx + Math.round(waveX);
      const isHead = i === headEnd;
      const color = isHead ? body : (i % 3 === 0 ? pattern : (i % 2 === 0 ? body : accent));
      px(ctx, x, y, color);
      px(ctx, x + 1, y, shadow);
      if (belly && waveX < 0) px(ctx, x + 1, y, belly);
    }
    const hy = dir === DOWN ? cy - 6 : cy + 5;
    rect(ctx, cx - 1, hy, 4, 2, body);
    px(ctx, cx + 2, hy, highlight);
    px(ctx, cx - 1, hy + 1, shadow);
    if (dir === DOWN) {
      px(ctx, cx - 1, hy + 1, eye);
      px(ctx, cx + 2, hy + 1, eye);
      px(ctx, cx, hy + 2, '#ff0000');
      px(ctx, cx + 1, hy + 2, '#ff0000');
      px(ctx, cx - 1, hy + 3, '#cc0000');
      px(ctx, cx + 2, hy + 3, '#cc0000');
    }
  } else {
    const flip = dir === LEFT;
    const f = flip ? (x) => 15 - x : (x) => x;
    const segCount = 11;
    for (let i = 0; i < segCount; i++) {
      const sx = cx - 5 + i;
      const wave = Math.sin(i * 0.65 + phase) * 1.8;
      const y = cy + Math.round(wave);
      const color = i % 3 === 0 ? pattern : (i % 2 === 0 ? body : accent);
      px(ctx, f(sx), y, color);
      px(ctx, f(sx), y + 1, belly || shadow);
    }
    const hx = cx + 6;
    px(ctx, f(hx), cy - 1, body); px(ctx, f(hx), cy, body); px(ctx, f(hx), cy + 1, body);
    px(ctx, f(hx + 1), cy - 1, body); px(ctx, f(hx + 1), cy, body); px(ctx, f(hx + 1), cy + 1, body);
    px(ctx, f(hx + 1), cy - 1, highlight);
    px(ctx, f(hx), cy + 1, shadow);
    px(ctx, f(hx + 1), cy - 1, eye);
    px(ctx, f(hx + 2), cy, '#ff0000');
    px(ctx, f(hx + 3), cy - 1, '#cc0000');
    px(ctx, f(hx + 3), cy + 1, '#cc0000');
  }
}
