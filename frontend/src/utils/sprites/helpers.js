/**
 * Shared pixel-art drawing helpers for the sprite generator.
 * Design grid: 16×16, upscaled 4× to 64×64.
 */

export const DESIGN = 16;
export const SCALE = 4;

export const DOWN = 0;
export const LEFT = 1;
export const RIGHT = 2;
export const UP = 3;

export function px(ctx, x, y, color) {
  if (x < 0 || y < 0 || x >= DESIGN || y >= DESIGN) return;
  ctx.fillStyle = color;
  ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
}

export function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * SCALE, y * SCALE, w * SCALE, h * SCALE);
}

export function darken(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 255) - Math.round(255 * amount));
  const g = Math.max(0, ((n >> 8) & 255) - Math.round(255 * amount));
  const b = Math.max(0, (n & 255) - Math.round(255 * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function lighten(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) + Math.round(255 * amount));
  const g = Math.min(255, ((n >> 8) & 255) + Math.round(255 * amount));
  const b = Math.min(255, (n & 255) + Math.round(255 * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
