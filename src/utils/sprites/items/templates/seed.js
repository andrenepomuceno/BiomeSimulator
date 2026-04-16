import { px, rect, ellipse, darken, lighten } from '../../helpers.js';

export function drawSeed(ctx, params) {
  const shell = params.shell || '#7a4d28';
  const core = params.core || lighten(shell, 0.14);
  const accent = params.accent || '#d3b485';
  const cx = 32;
  const cy = 35;
  const rX = params.rX || 4;
  const rY = params.rY || 6;

  ellipse(ctx, cx, cy, rX, rY, shell);
  ellipse(ctx, cx, cy + 1, Math.max(1, rX - 1), Math.max(2, rY - 2), core);
  rect(ctx, cx - 1, cy - rY + 2, 2, 1, accent);

  px(ctx, cx - 1, cy - 1, darken(shell, 0.12));
  px(ctx, cx + 1, cy + 2, darken(shell, 0.18));
  px(ctx, cx - 2, cy - 3, '#ffffff');
}
