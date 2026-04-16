import { px, rect, ellipse, darken, lighten } from '../../helpers.js';

export function drawFruit(ctx, params) {
  const body = params.body;
  const shade = params.shade || darken(body, 0.15);
  const stem = params.stem || '#5a3a1b';
  const seed = params.seed || '#f0ddb2';
  const cx = 32;
  const cy = 34;
  const rX = params.rX || 8;
  const rY = params.rY || 8;

  ellipse(ctx, cx, cy, rX, rY, body);
  ellipse(ctx, cx + 1, cy + 2, Math.max(2, rX - 2), Math.max(2, rY - 2), shade);
  ellipse(ctx, cx - 2, cy - 2, Math.max(1, rX - 4), Math.max(1, rY - 4), lighten(body, 0.12));

  rect(ctx, cx - 1, cy - rY - 3, 2, 3, stem);
  px(ctx, cx - 2, cy - rY - 2, lighten(stem, 0.12));

  px(ctx, cx - 1, cy + 1, seed);
  px(ctx, cx + 2, cy - 1, seed);
  px(ctx, cx - 3, cy - 2, '#ffffff');
}
