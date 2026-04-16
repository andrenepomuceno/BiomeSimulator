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

// ── HSL colour helpers ──────────────────────────────────────────────

function _rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function _hue2rgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function _hslToRgb(h, s, l) {
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(_hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(_hue2rgb(p, q, h) * 255),
    Math.round(_hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

/** Boost (or reduce) the saturation of a hex colour. amount=0.2 → +20%. */
export function saturate(hex, amount) {
  const [r, g, b] = _parseHex(hex);
  const [h, s, l] = _rgbToHsl(r, g, b);
  const ns = Math.min(1, Math.max(0, s * (1 + amount)));
  const [nr, ng, nb] = _hslToRgb(h, ns, l);
  return _toHex(nr, ng, nb);
}

// ── Advanced drawing tools ──────────────────────────────────────────

/** Fill a rect with a vertical colour gradient (top→bottom). */
export function gradientV(ctx, x, y, w, h, topColor, bottomColor) {
  for (let dy = 0; dy < h; dy++) {
    const t = h <= 1 ? 0 : dy / (h - 1);
    rect(ctx, x, y + dy, w, 1, blend(topColor, bottomColor, t));
  }
}

/** Fill a rect with a horizontal colour gradient (left→right). */
export function gradientH(ctx, x, y, w, h, leftColor, rightColor) {
  for (let dx = 0; dx < w; dx++) {
    const t = w <= 1 ? 0 : dx / (w - 1);
    rect(ctx, x + dx, y, 1, h, blend(leftColor, rightColor, t));
  }
}

/** Draw a 1-2 px bright strip on one side of a region. side: 'top'|'left'|'right'|'bottom'. */
export function rimLight(ctx, x, y, w, h, color, side = 'top') {
  const dim = lighten(color, -0.15);
  switch (side) {
    case 'top':
      rect(ctx, x, y, w, 1, color);
      rect(ctx, x, y + 1, w, 1, dim);
      break;
    case 'bottom':
      rect(ctx, x, y + h - 1, w, 1, color);
      rect(ctx, x, y + h - 2, w, 1, dim);
      break;
    case 'left':
      rect(ctx, x, y, 1, h, color);
      rect(ctx, x + 1, y, 1, h, dim);
      break;
    case 'right':
      rect(ctx, x + w - 1, y, 1, h, color);
      rect(ctx, x + w - 2, y, 1, h, dim);
      break;
  }
}

/** Darken the inner border of a region to simulate ambient occlusion / depth. */
export function ao(ctx, x, y, w, h, intensity = 0.12) {
  const alpha = Math.round(intensity * 255);
  const col = `rgba(0,0,0,${(alpha / 255).toFixed(2)})`;
  // bottom edge (strongest)
  ctx.fillStyle = col;
  ctx.fillRect(x * _CM * SCALE, (y + h - 1) * _CM * SCALE, w * _CM * SCALE, _CM * SCALE);
  // sides — thinner
  const col2 = `rgba(0,0,0,${(alpha * 0.6 / 255).toFixed(2)})`;
  ctx.fillStyle = col2;
  ctx.fillRect(x * _CM * SCALE, y * _CM * SCALE, _CM * SCALE, h * _CM * SCALE);
  ctx.fillRect((x + w - 1) * _CM * SCALE, y * _CM * SCALE, _CM * SCALE, h * _CM * SCALE);
}

/** Multi-color noise stipple. colors is an array of hex colours. density 0-1. */
export function speckle(ctx, x, y, w, h, colors, density = 0.3) {
  const len = colors.length;
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const n = noise(x + dx + 7919, y + dy + 6271);
      if (n < density) {
        const ci = Math.floor(noise(x + dx + 3571, y + dy + 2393) * len) % len;
        px(ctx, x + dx, y + dy, colors[ci]);
      }
    }
  }
}

/** Filled circle with a radial gradient from centerColor to edgeColor. */
export function softCircle(ctx, cx, cy, r, centerColor, edgeColor) {
  for (let dy = -r; dy <= r; dy++) {
    const hw = Math.round(Math.sqrt(r * r - dy * dy));
    for (let dx = -hw; dx <= hw; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy) / r;
      px(ctx, cx + dx, cy + dy, blend(centerColor, edgeColor, Math.min(1, dist)));
    }
  }
}

/** Tapered feather / leaf shape with colour transition from base to tip, pointing upward. */
export function feather(ctx, x, y, w, h, baseColor, tipColor) {
  for (let dy = 0; dy < h; dy++) {
    const t = h <= 1 ? 0 : dy / (h - 1);
    const rowW = Math.max(1, Math.round(w * (1 - t * 0.7)));
    const ox = Math.floor((w - rowW) / 2);
    const col = blend(baseColor, tipColor, t);
    rect(ctx, x + ox, y + dy, rowW, 1, col);
  }
}

// ── Shape primitives ────────────────────────────────────────────────

/**
 * Pixel-art rounded rectangle. r is the corner radius in design pixels.
 * r=0 is identical to rect(). r is clamped to Math.floor(min(w,h)/2).
 */
export function roundRect(ctx, x, y, w, h, r, color) {
  r = Math.min(r, Math.floor(Math.min(w, h) / 2));
  if (r <= 0) { rect(ctx, x, y, w, h, color); return; }
  ctx.fillStyle = color;
  // Horizontal fill (full width, inner height)
  ctx.fillRect((x) * _CM * SCALE, (y + r) * _CM * SCALE, w * _CM * SCALE, (h - r * 2) * _CM * SCALE);
  // Top + bottom strips (inner width)
  ctx.fillRect((x + r) * _CM * SCALE, y * _CM * SCALE, (w - r * 2) * _CM * SCALE, r * _CM * SCALE);
  ctx.fillRect((x + r) * _CM * SCALE, (y + h - r) * _CM * SCALE, (w - r * 2) * _CM * SCALE, r * _CM * SCALE);
  // Pixel-art corners — quarter-circle approximation
  for (let dy = 0; dy < r; dy++) {
    const hw = Math.round(Math.sqrt(r * r - (r - 1 - dy) * (r - 1 - dy)));
    const fill = hw;
    ctx.fillRect((x + r - fill) * _CM * SCALE, (y + dy) * _CM * SCALE, fill * _CM * SCALE, _CM * SCALE);
    ctx.fillRect((x + w - r) * _CM * SCALE, (y + dy) * _CM * SCALE, fill * _CM * SCALE, _CM * SCALE);
    ctx.fillRect((x + r - fill) * _CM * SCALE, (y + h - 1 - dy) * _CM * SCALE, fill * _CM * SCALE, _CM * SCALE);
    ctx.fillRect((x + w - r) * _CM * SCALE, (y + h - 1 - dy) * _CM * SCALE, fill * _CM * SCALE, _CM * SCALE);
  }
}

/**
 * Filled triangle via scanline rasterisation. All coords in design-pixel space.
 * Works for any winding order.
 */
export function triangle(ctx, x1, y1, x2, y2, x3, y3, color) {
  // Sort vertices by y
  let ax = x1, ay = y1, bx = x2, by = y2, cx = x3, cy = y3;
  if (ay > by) { let tx = ax, ty = ay; ax = bx; ay = by; bx = tx; by = ty; }
  if (ay > cy) { let tx = ax, ty = ay; ax = cx; ay = cy; cx = tx; cy = ty; }
  if (by > cy) { let tx = bx, ty = by; bx = cx; by = cy; cx = tx; cy = ty; }
  ctx.fillStyle = color;
  const totalH = cy - ay;
  if (totalH === 0) return;
  for (let y = ay; y <= cy; y++) {
    const isLower = y > by || by === ay;
    const segH = isLower ? cy - by : by - ay;
    if (segH === 0) continue;
    const alpha = (y - ay) / totalH;
    const beta = isLower ? (y - by) / (cy - by) : (y - ay) / (by - ay);
    let sx = Math.round(ax + (cx - ax) * alpha);
    let ex = Math.round(isLower ? bx + (cx - bx) * beta : ax + (bx - ax) * beta);
    if (sx > ex) { let t = sx; sx = ex; ex = t; }
    ctx.fillRect(sx * _CM * SCALE, y * _CM * SCALE, (ex - sx + 1) * _CM * SCALE, _CM * SCALE);
  }
}

/**
 * Draw an arc outline of the given thickness (in design pixels).
 * startAngle / endAngle in radians (0 = right, clockwise).
 */
export function arc(ctx, cx, cy, r, startAngle, endAngle, thickness, color) {
  ctx.fillStyle = color;
  const steps = Math.max(24, r * 4);
  let angle = startAngle;
  const step = (endAngle - startAngle) / steps;
  for (let i = 0; i <= steps; i++, angle += step) {
    for (let t = 0; t < thickness; t++) {
      const ri = r - t;
      if (ri < 0) break;
      const px_ = Math.round(cx + Math.cos(angle) * ri);
      const py_ = Math.round(cy + Math.sin(angle) * ri);
      if (px_ < 0 || py_ < 0 || px_ >= DESIGN || py_ >= DESIGN) continue;
      ctx.fillRect(px_ * _CM * SCALE, py_ * _CM * SCALE, _CM * SCALE, _CM * SCALE);
    }
  }
}

// ── Texture / fill helpers ───────────────────────────────────────────

/**
 * Repeating stripes at an arbitrary angle (radians, 0=horizontal).
 * stripeW is the width of each colour band in design pixels.
 */
export function stripes(ctx, x, y, w, h, color1, color2, stripeW, angle = 0) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const proj = (x + dx) * cos + (y + dy) * sin;
      const band = Math.floor(proj / stripeW);
      px(ctx, x + dx, y + dy, band & 1 ? color2 : color1);
    }
  }
}

/**
 * Direction-aware speckle — grains are stretched along `angle` (radians).
 * ratio controls elongation (1 = isotropic, 3 = strongly directional).
 */
export function anisotropicSpeckle(ctx, x, y, w, h, colors, density = 0.3, angle = 0, ratio = 2.5) {
  const len = colors.length;
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const lx = (x + dx) * cos - (y + dy) * sin;
      const ly = ((x + dx) * sin + (y + dy) * cos) / ratio;
      const n = noise(Math.round(lx * 3) + 7919, Math.round(ly * 3) + 6271);
      if (n < density) {
        const ci = Math.floor(noise(Math.round(lx * 5) + 3571, Math.round(ly * 5) + 2393) * len) % len;
        px(ctx, x + dx, y + dy, colors[ci]);
      }
    }
  }
}

/**
 * Crosshatch fill pattern. Lines at 45° and 135°, spaced `spacing` design pixels apart.
 * color is drawn over whatever is already on the canvas (additive/overlay texture).
 */
export function crosshatch(ctx, x, y, w, h, color, spacing = 4) {
  ctx.fillStyle = color;
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const s45 = (x + dx + y + dy) % spacing === 0;
      const s135 = (x + dx - (y + dy) + 1024 * spacing) % spacing === 0;
      if (s45 || s135) {
        ctx.fillRect((x + dx) * _CM * SCALE, (y + dy) * _CM * SCALE, _CM * SCALE, _CM * SCALE);
      }
    }
  }
}

// ── Lighting / shading helpers ───────────────────────────────────────

/**
 * Classic 3D bevel: highlight strip on top/left, shadow strip on bottom/right.
 * thickness is in design pixels. Replaces manual rimLight+ao combos.
 */
export function bevel(ctx, x, y, w, h, hiColor, shColor, thickness = 1) {
  for (let t = 0; t < thickness; t++) {
    // top
    rect(ctx, x + t, y + t, w - t * 2, 1, hiColor);
    // left
    rect(ctx, x + t, y + t, 1, h - t * 2, hiColor);
    // bottom
    rect(ctx, x + t, y + h - 1 - t, w - t * 2, 1, shColor);
    // right
    rect(ctx, x + w - 1 - t, y + t, 1, h - t * 2, shColor);
  }
}

/**
 * Elliptical radial gradient fill — centerColor at (cx,cy) fading to outerColor at (rx,ry).
 * Useful for sphere-like body shading and eyes.
 */
export function gradientRadial(ctx, cx, cy, rx, ry, innerColor, outerColor) {
  for (let dy = -ry; dy <= ry; dy++) {
    const cosLat = Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry)));
    const hw = Math.round(rx * cosLat);
    for (let dx = -hw; dx <= hw; dx++) {
      const dist = Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
      px(ctx, cx + dx, cy + dy, blend(innerColor, outerColor, Math.min(1, dist)));
    }
  }
}

/**
 * Post-process: brighten interior pixels that are close to a transparent edge.
 * Creates a subtle inner-glow effect (good for eyes, bioluminescent plants).
 * radius is in design pixels. intensity 0-1.
 */
export function innerGlow(ctx, color, intensity = 0.5, radius = 2) {
  const size = DESIGN * SCALE;
  const imgData = ctx.getImageData(0, 0, size, size);
  const { data, width } = imgData;
  const s = SCALE;
  const cols = DESIGN;
  const rows = DESIGN;
  const [gr, gg, gb] = _parseHex(color);

  // Build opaque mask
  const opaque = new Uint8Array(cols * rows);
  for (let gy = 0; gy < rows; gy++)
    for (let gx = 0; gx < cols; gx++) {
      const i = (gy * s + (s >> 1)) * width * 4 + (gx * s + (s >> 1)) * 4;
      if (data[i + 3] > 10) opaque[gy * cols + gx] = 1;
    }

  // For each opaque pixel, compute min distance to a transparent neighbour
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      if (!opaque[gy * cols + gx]) continue;
      let minDist = radius + 1;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = gx + dx, ny = gy + dy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) { minDist = 0; break; }
          if (!opaque[ny * cols + nx]) {
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < minDist) minDist = d;
          }
        }
        if (minDist === 0) break;
      }
      if (minDist > radius) continue;
      const t = 1 - minDist / radius; // 1 at edge, 0 at radius
      const alpha = t * intensity;
      // Blend glow colour into all physical pixels for this design cell
      for (let py = 0; py < s; py++) {
        for (let pxp = 0; pxp < s; pxp++) {
          const idx = ((gy * s + py) * width + (gx * s + pxp)) * 4;
          data[idx]     = Math.min(255, data[idx]     + (gr - data[idx])     * alpha);
          data[idx + 1] = Math.min(255, data[idx + 1] + (gg - data[idx + 1]) * alpha);
          data[idx + 2] = Math.min(255, data[idx + 2] + (gb - data[idx + 2]) * alpha);
        }
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

// ── Organic curve helpers ────────────────────────────────────────────

/**
 * Draw a 1-design-pixel wide quadratic Bézier curve from (x0,y0) to (x1,y1)
 * with control point (cpx,cpy). Useful for tails, tendrils, vines.
 */
export function quadraticLine(ctx, x0, y0, cpx, cpy, x1, y1, color) {
  const steps = Math.max(16, Math.round(
    Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2) +
    Math.sqrt((cpx - x0) ** 2 + (cpy - y0) ** 2) * 0.5
  ) * 2);
  ctx.fillStyle = color;
  let prevGx = -1, prevGy = -1;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const gx = Math.round(mt * mt * x0 + 2 * mt * t * cpx + t * t * x1);
    const gy = Math.round(mt * mt * y0 + 2 * mt * t * cpy + t * t * y1);
    if (gx === prevGx && gy === prevGy) continue;
    if (gx >= 0 && gy >= 0 && gx < DESIGN && gy < DESIGN)
      ctx.fillRect(gx * _CM * SCALE, gy * _CM * SCALE, _CM * SCALE, _CM * SCALE);
    prevGx = gx; prevGy = gy;
  }
}

/**
 * Symmetrical tapered leaf shape centred at (cx,cy), rotated by angle (radians,
 * 0 = pointing right). Generalises feather() to any direction.
 * color can be a single hex string or [baseColor, tipColor] for a gradient.
 */
export function leafShape(ctx, cx, cy, w, h, angle, color) {
  const useGrad = Array.isArray(color);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const halfH = h / 2;
  for (let s = 0; s <= h; s++) {
    const t = s / h;
    // Width profile: widest at s≈0.35*h, tapers to 0 at both ends
    const profile = Math.sin(t * Math.PI) * (1 - 0.3 * t);
    const hw = Math.round(w * 0.5 * profile);
    if (hw <= 0) continue;
    // Centre of this row in local space (along axis, -halfH → +halfH)
    const along = s - halfH;
    const col = useGrad ? blend(color[0], color[1], t) : color;
    // Draw hw pixels on each side perpendicular to the axis
    for (let d = -hw; d <= hw; d++) {
      const gx = Math.round(cx + cos * along - sin * d);
      const gy = Math.round(cy + sin * along + cos * d);
      if (gx >= 0 && gy >= 0 && gx < DESIGN && gy < DESIGN) px(ctx, gx, gy, col);
    }
  }
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
