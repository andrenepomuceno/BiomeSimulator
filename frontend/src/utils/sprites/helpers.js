/**
 * Shared pixel-art drawing helpers for the sprite generator.
 * Design grid: 32×32, upscaled 4× to 128×128.
 */

export const DESIGN = 32;
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

/**
 * Post-processing outline: scans the canvas and draws a 1-design-pixel dark
 * border around all opaque regions. Called once per frame at atlas build time.
 */
export function addOutline(ctx) {
  const size = DESIGN * SCALE;
  const imgData = ctx.getImageData(0, 0, size, size);
  const { data, width, height } = imgData;
  // Step in real pixels equals SCALE (one design pixel)
  const s = SCALE;

  // Build a grid of which design-pixels are opaque
  const cols = DESIGN;
  const rows = DESIGN;
  const opaque = new Uint8Array(cols * rows);
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      // Sample the center of each design pixel
      const px = gx * s + (s >> 1);
      const py = gy * s + (s >> 1);
      const i = (py * width + px) * 4;
      if (data[i + 3] > 10) opaque[gy * cols + gx] = 1;
    }
  }

  // Draw outline on transparent design-pixels adjacent to opaque ones
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      if (opaque[gy * cols + gx]) continue;
      // Check 4 neighbors
      const hasNeighbor =
        (gx > 0 && opaque[gy * cols + gx - 1]) ||
        (gx < cols - 1 && opaque[gy * cols + gx + 1]) ||
        (gy > 0 && opaque[(gy - 1) * cols + gx]) ||
        (gy < rows - 1 && opaque[(gy + 1) * cols + gx]);
      if (hasNeighbor) {
        ctx.fillRect(gx * s, gy * s, s, s);
      }
    }
  }
}
