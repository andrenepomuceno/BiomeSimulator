/**
 * Shared pixel-art drawing helpers for the sprite generator.
 * Design grid: 64×64, upscaled 4× to 256×256.
 * All templates now author directly in the 64×64 coordinate space (_CM = 1).
 */

export const DESIGN = 64;
export const SCALE = 4;

/** Coordinate multiplier — now defaults to 1 (native 64×64 grid). */
let _CM = 1;
export function setCoordMultiplier(v) { _CM = v; }

export const DOWN = 0;
export const LEFT = 1;
export const RIGHT = 2;
export const UP = 3;

// ── Core drawing ────────────────────────────────────────────────────

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

export function vline(ctx, x, y, h, color) {
  rect(ctx, x, y, 1, h, color);
}

export function hline(ctx, x, y, w, color) {
  rect(ctx, x, y, w, 1, color);
}

/** Filled circle via midpoint algorithm. */
export function circle(ctx, cx, cy, r, color) {
  for (let dy = -r; dy <= r; dy++) {
    const hw = Math.round(Math.sqrt(r * r - dy * dy));
    rect(ctx, cx - hw, cy + dy, hw * 2 + 1, 1, color);
  }
}

/** Filled ellipse. */
export function ellipse(ctx, cx, cy, rx, ry, color) {
  for (let dy = -ry; dy <= ry; dy++) {
    const hw = Math.round(rx * Math.sqrt(1 - (dy * dy) / (ry * ry)));
    rect(ctx, cx - hw, cy + dy, hw * 2 + 1, 1, color);
  }
}

/** Checkerboard dither pattern between two colours. */
export function dither(ctx, x, y, w, h, color1, color2) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      px(ctx, x + dx, y + dy, (dx + dy) & 1 ? color2 : color1);
    }
  }
}

// ── Colour math ─────────────────────────────────────────────────────

function _parseHex(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function _toHex(r, g, b) {
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function darken(hex, amount) {
  const [r, g, b] = _parseHex(hex);
  const a = Math.round(255 * amount);
  return _toHex(Math.max(0, r - a), Math.max(0, g - a), Math.max(0, b - a));
}

export function lighten(hex, amount) {
  const [r, g, b] = _parseHex(hex);
  const a = Math.round(255 * amount);
  return _toHex(Math.min(255, r + a), Math.min(255, g + a), Math.min(255, b + a));
}

/** Linearly interpolate between two hex colours. t=0→hex1, t=1→hex2. */
export function blend(hex1, hex2, t) {
  const [r1, g1, b1] = _parseHex(hex1);
  const [r2, g2, b2] = _parseHex(hex2);
  return _toHex(
    Math.round(r1 + (r2 - r1) * t),
    Math.round(g1 + (g2 - g1) * t),
    Math.round(b1 + (b2 - b1) * t),
  );
}

/** Simple deterministic hash for per-pixel texture variation. Returns 0-1. */
export function noise(x, y) {
  let h = (x * 374761393 + y * 668265263 + 1013904223) | 0;
  h = ((h >> 13) ^ h) * 1274126177;
  h = (h >> 16) ^ h;
  return (h & 0x7fff) / 0x7fff;
}

// ── Post-processing ─────────────────────────────────────────────────

/**
 * Post-processing outline: 2-pass dark border around all opaque regions.
 * Pass 1: strong dark edge directly adjacent to opaque pixels.
 * Pass 2: softer outer glow one more design-pixel out.
 */
export function addOutline(ctx) {
  const size = DESIGN * SCALE;
  const imgData = ctx.getImageData(0, 0, size, size);
  const { data, width } = imgData;
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
