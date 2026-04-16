import { px, rect, ellipse, darken, lighten, anisotropicSpeckle } from '../../helpers.js';

export function drawMeat(ctx, params) {
  const flesh = params.flesh || '#c75b54';
  const fat = params.fat || '#edd6c2';
  const edge = params.edge || darken(flesh, 0.18);
  const veins = params.veins || lighten(flesh, 0.16);
  const w = params.w || 18;
  const h = params.h || 12;
  const x = 32 - Math.floor(w / 2);
  const y = 34 - Math.floor(h / 2);

  ellipse(ctx, 32, 34, Math.floor(w / 2), Math.floor(h / 2), edge);
  rect(ctx, x + 1, y + 1, w - 2, h - 2, flesh);
  rect(ctx, x + 2, y + 2, w - 4, 3, lighten(flesh, 0.08));

  // Fat band and marbling keep meat readable at low zoom.
  rect(ctx, x + Math.floor(w * 0.12), y + Math.floor(h * 0.55), Math.floor(w * 0.76), 2, fat);
  px(ctx, x + Math.floor(w * 0.30), y + Math.floor(h * 0.38), fat);
  px(ctx, x + Math.floor(w * 0.58), y + Math.floor(h * 0.28), fat);

  anisotropicSpeckle(ctx, x + 1, y + 1, w - 2, h - 2, [veins, flesh, darken(flesh, 0.12)], 0.15, 0, 2.8);
  px(ctx, x + 2, y + 2, '#ffffff');
}
