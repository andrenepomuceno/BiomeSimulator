/**
 * Special-state sprite helpers — 64x64 design grid.
 * drawSleeping, drawDead, drawEgg, drawPupa.
 */
import { px, rect, ellipse, darken, lighten, noise, gradientV, rimLight, ao, speckle, anisotropicSpeckle } from '../../helpers.js';
import { drawFurTexture } from '../bodyParts.js';

/**
 * Draw a sleeping animal as a curled lump with Zzz.
 */
export function drawSleeping(ctx, params = {}) {
  const body = params.body || '#808080';
  const shadow = darken(body, 0.15);
  const highlight = lighten(body, 0.10);
  const outline = darken(body, 0.30);
  const cx = 32;
  const cy = 32;

  // Curled body lump with gradient
  rect(ctx, cx - 10, cy - 4, 20, 2, highlight);
  gradientV(ctx, cx - 12, cy - 2, 24, 4, body, shadow);
  gradientV(ctx, cx - 13, cy + 2, 26, 4, body, shadow);
  rect(ctx, cx - 12, cy + 6, 24, 4, shadow);
  rect(ctx, cx - 10, cy + 10, 20, 2, shadow);

  // Directional fur texture — vertical streaks for a resting mammal
  drawFurTexture(ctx, cx - 13, cy - 4, 26, 16, body, Math.PI / 2, 0.22);
  rimLight(ctx, cx - 10, cy - 4, 20, 2, highlight, 'top');
  ao(ctx, cx - 12, cy + 8, 24, 4, 0.08);

  // Breathing highlight
  rect(ctx, cx - 4, cy + 1, 8, 2, highlight);

  // Tail curl to right
  rect(ctx, cx + 12, cy + 4, 3, 2, body);
  rect(ctx, cx + 14, cy + 2, 3, 2, body);
  rect(ctx, cx + 16, cy, 2, 2, body);

  // Zzz letters
  drawZ(ctx, cx + 10, cy - 12, 5, outline);
  drawZ(ctx, cx + 16, cy - 18, 4, shadow);
  drawZ(ctx, cx + 20, cy - 23, 3, highlight);
}

function drawZ(ctx, x, y, size, color) {
  for (let i = 0; i < size; i++) px(ctx, x + i, y, color);
  for (let i = 0; i < size; i++) px(ctx, x + size - 1 - i, y + i, color);
  for (let i = 0; i < size; i++) px(ctx, x + i, y + size - 1, color);
}

/**
 * Draw a dead animal as a skeleton.
 */
export function drawDead(ctx, params = {}) {
  const body = params.body || '#808080';
  const bone = '#e8e0d0';
  const boneSh = '#c8bfad';
  const outline = darken(body, 0.3);
  const cx = 32;
  const cy = 32;

  // Skull — rounded via ellipse for organic shape
  ellipse(ctx, cx, cy - 1, 6, 5, bone);
  // Cheekbones shadow
  for (let dy = 2; dy <= 5; dy++) {
    const hw = Math.round(6 * Math.sqrt(Math.max(0, 1 - (dy * dy) / 25)));
    if (hw > 0) rect(ctx, cx - hw, cy - 1 + dy, hw * 2 + 1, 1, boneSh);
  }
  // Highlight on crown
  ellipse(ctx, cx - 1, cy - 3, 3, 2, lighten(bone, 0.12));

  // Eye sockets — sunken dark ovals
  ellipse(ctx, cx - 3, cy, 2, 2, '#1a1a1a');
  ellipse(ctx, cx + 3, cy, 2, 2, '#1a1a1a');
  // Nose cavity
  px(ctx, cx - 1, cy + 3, '#1a1a1a');
  px(ctx, cx, cy + 3, '#1a1a1a');
  // Jaw
  rect(ctx, cx - 4, cy + 6, 8, 2, boneSh);
  // Teeth
  for (let i = 0; i < 4; i++) px(ctx, cx - 3 + i * 2, cy + 6, bone);

  // Spine
  for (let s = 0; s < 7; s++) {
    rect(ctx, cx - 1, cy + 9 + s * 3, 2, 2, bone);
    if (s % 2 === 0) {
      px(ctx, cx - 2, cy + 10 + s * 3, boneSh);
      px(ctx, cx + 1, cy + 10 + s * 3, boneSh);
    }
  }

  // Ribs (3 pairs)
  for (let r = 0; r < 3; r++) {
    const ry = cy + 11 + r * 5;
    rect(ctx, cx - 2, ry, 1, 1, bone);
    rect(ctx, cx - 4, ry + 1, 2, 1, bone);
    rect(ctx, cx - 6, ry + 2, 2, 1, bone);
    rect(ctx, cx - 7, ry + 3, 2, 1, boneSh);
    rect(ctx, cx + 1, ry, 1, 1, bone);
    rect(ctx, cx + 2, ry + 1, 2, 1, bone);
    rect(ctx, cx + 4, ry + 2, 2, 1, bone);
    rect(ctx, cx + 5, ry + 3, 2, 1, boneSh);
  }

  // Ground shadow
  rect(ctx, cx - 10, cy + 30, 20, 2, 'rgba(0,0,0,0.12)');
}

/**
 * Draw an egg with smooth ellipse body, shell texture and speckles.
 */
export function drawEgg(ctx, params = {}) {
  const body = params.body || '#e8dcc0';
  const accent = params.accent || '#c0a880';
  const shell = lighten(body, 0.18);
  const shellSh = darken(body, 0.08);
  const speckleCol = accent || darken(body, 0.20);
  const cx = 32, cy = 30;
  const rx = 8, ry = 12;

  // Egg base ellipse
  ellipse(ctx, cx, cy, rx, ry, shell);

  // Tapered shadow on lower half — darker rows toward bottom
  for (let dy = 2; dy <= ry; dy++) {
    const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
    if (hw > 0) rect(ctx, cx - hw, cy + dy, hw * 2 + 1, 1, darken(shell, 0.04 + dy * 0.010));
  }

  // Top highlight — sun-lit crown (narrowed for tapering feel)
  const hiRx = Math.max(2, (rx * 0.48) | 0);
  const hiRy = Math.max(1, (ry * 0.28) | 0);
  ellipse(ctx, cx - 1, cy - ry + hiRy, hiRx, hiRy, lighten(shell, 0.16));
  rimLight(ctx, cx - 4, cy - ry, 8, 2, lighten(shell, 0.12), 'top');

  // Shell texture — isotropic speckle clipped to ellipse
  for (let dy = -ry; dy <= ry; dy++) {
    const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
    if (hw > 0) speckle(ctx, cx - hw, cy + dy, hw * 2 + 1, 1,
      [darken(shell, 0.10), darken(shell, 0.06), lighten(shell, 0.04)], 0.16);
  }

  // Speckle pigment marks
  const specklePositions = [
    [-3, -4], [2, -6], [5, -2], [-5, 2], [1, 4], [-2, 7], [4, 6],
    [-4, -1], [3, 1], [-1, 5], [5, 8], [-5, 6], [0, -3], [2, 9],
  ];
  for (const [dx, dy] of specklePositions) {
    if (noise(cx + dx, cy + dy) > 0.45) {
      px(ctx, cx + dx, cy + dy, speckleCol);
      if (noise(cx + dx + 1, cy + dy) > 0.6) px(ctx, cx + dx + 1, cy + dy, speckleCol);
    }
  }

  ao(ctx, cx - rx + 2, cy + ry - 2, (rx - 1) * 2, 4, 0.08);
  rect(ctx, cx - rx + 1, cy + ry + 2, (rx - 1) * 2, 2, 'rgba(0,0,0,0.10)');
}

/**
 * Draw a pupa / cocoon with ellipse body, silk texture and segment bands.
 */
export function drawPupa(ctx, params = {}) {
  const body = params.body || '#8a7a50';
  const accent = params.accent || '#6a5a30';
  const silk = lighten(body, 0.16);
  const silkSh = darken(body, 0.08);
  const silkHi = lighten(body, 0.28);
  const band = accent || darken(body, 0.15);
  const cx = 32, cy = 28;
  const rx = 6, ry = 14;

  // Pupa base ellipse — tapered both ends
  ellipse(ctx, cx, cy, rx, ry, silk);

  // Gradient shadow — both upper and lower halves darken
  for (let dy = 1; dy <= ry; dy++) {
    const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
    if (hw > 0) {
      rect(ctx, cx - hw, cy + dy, hw * 2 + 1, 1, darken(silk, 0.04 + dy * 0.010));
      rect(ctx, cx - hw, cy - dy, hw * 2 + 1, 1, darken(silk, 0.02 + dy * 0.006));
    }
  }

  // Top highlight (narrow — tapered tip)
  ellipse(ctx, cx - 1, cy - ry + 3, Math.max(1, rx - 2), 3, silkHi);
  rimLight(ctx, cx - 2, cy - ry, 4, 2, silkHi, 'top');

  // Side highlight shimmer
  for (let dy = -ry + 3; dy <= -2; dy++) {
    const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
    if (hw >= 2) px(ctx, cx - hw + 1, cy + dy, silkHi);
  }

  // Silk texture — diagonal anisotropic for wound-thread look
  for (let dy = -ry; dy <= ry; dy++) {
    const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
    if (hw > 0) {
      anisotropicSpeckle(ctx, cx - hw, cy + dy, hw * 2 + 1, 1,
        [darken(silk, 0.08), lighten(silk, 0.06)], 0.28, Math.PI / 6, 2.0);
    }
  }

  // Segment bands — clipped to ellipse width
  for (let s = -ry + 4; s <= ry - 2; s += 4) {
    const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (s * s) / (ry * ry))));
    if (hw > 0) rect(ctx, cx - hw, cy + s, hw * 2 + 1, 1, band);
  }

  // Suspension thread from tip
  for (let t = 0; t < 6; t++) {
    px(ctx, cx + (t % 2 === 0 ? 0 : 1), cy - ry - 1 - t, band);
  }

  // Ground shadow
  rect(ctx, cx - rx + 1, cy + ry + 2, (rx - 1) * 2, 2, 'rgba(0,0,0,0.10)');
}
