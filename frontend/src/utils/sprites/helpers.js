/**
 * Shared pixel-art drawing helpers for the sprite generator.
 * Design grid: 64×64, upscaled 4× to 256×256.
 * Templates authored on the old 32-grid use _CM = 2 so coordinates auto-double.
 */

export const DESIGN = 64;
export const SCALE = 4;

/** Coordinate multiplier — legacy 32-grid templates keep _CM = 2. */
let _CM = 2;
export function setCoordMultiplier(v) { _CM = v; }

export const DOWN = 0;
export const LEFT = 1;
export const RIGHT = 2;
export const UP = 3;

export function px(ctx, x, y, color) {
  const mx = x * _CM;
  const my = y * _CM;
  if (mx < 0 || my < 0 || mx >= DESIGN || my >= DESIGN) return;
  ctx.fillStyle = color;
  ctx.fillRect(mx * SCALE, my * SCALE, _CM * SCALE, _CM * SCALE);
}

export function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * _CM * SCALE, y * _CM * SCALE, w * _CM * SCALE, h * _CM * SCALE);
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
 * Post-processing outline: 2-pass dark border around all opaque regions.
 * Pass 1: strong dark edge directly adjacent to opaque pixels.
 * Pass 2: softer outer glow one more design-pixel out.
 */
export function addOutline(ctx) {
  const size = DESIGN * SCALE;
  const imgData = ctx.getImageData(0, 0, size, size);
  const { data, width, height } = imgData;
  const s = SCALE;

  const cols = DESIGN;
  const rows = DESIGN;
  const opaque = new Uint8Array(cols * rows);
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const cx = gx * s + (s >> 1);
      const cy = gy * s + (s >> 1);
      const i = (cy * width + cx) * 4;
      if (data[i + 3] > 10) opaque[gy * cols + gx] = 1;
    }
  }

  // Pass 1 — strong inner outline
  const pass1 = new Uint8Array(cols * rows);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      if (opaque[gy * cols + gx]) continue;
      const hasNeighbor =
        (gx > 0 && opaque[gy * cols + gx - 1]) ||
        (gx < cols - 1 && opaque[gy * cols + gx + 1]) ||
        (gy > 0 && opaque[(gy - 1) * cols + gx]) ||
        (gy < rows - 1 && opaque[(gy + 1) * cols + gx]);
      if (hasNeighbor) {
        ctx.fillRect(gx * s, gy * s, s, s);
        pass1[gy * cols + gx] = 1;
      }
    }
  }

  // Pass 2 — softer outer glow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      if (opaque[gy * cols + gx] || pass1[gy * cols + gx]) continue;
      const hasP1 =
        (gx > 0 && pass1[gy * cols + gx - 1]) ||
        (gx < cols - 1 && pass1[gy * cols + gx + 1]) ||
        (gy > 0 && pass1[(gy - 1) * cols + gx]) ||
        (gy < rows - 1 && pass1[(gy + 1) * cols + gx]);
      if (hasP1) {
        ctx.fillRect(gx * s, gy * s, s, s);
      }
    }
  }
}
