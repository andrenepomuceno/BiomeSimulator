/**
 * Special-state sprite helpers — 64x64 design grid.
 * drawSleeping, drawDead, drawEgg, drawPupa.
 */
import { px, rect, darken, lighten, noise } from '../../helpers.js';

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

  // Curled body lump
  rect(ctx, cx - 10, cy - 4, 20, 2, highlight);
  rect(ctx, cx - 12, cy - 2, 24, 4, body);
  rect(ctx, cx - 13, cy + 2, 26, 4, body);
  rect(ctx, cx - 12, cy + 6, 24, 4, shadow);
  rect(ctx, cx - 10, cy + 10, 20, 2, shadow);

  // Fur / texture
  for (let dy = -4; dy < 12; dy++) {
    for (let dx = -13; dx < 13; dx++) {
      const ax = cx + dx;
      const ay = cy + dy;
      if (noise(ax, ay) > 0.78) px(ctx, ax, ay, shadow);
    }
  }

  // Breathing highlight (only frame-dependent in animation, but static here)
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

  // Skull (oval)
  rect(ctx, cx - 5, cy - 6, 10, 3, bone);
  rect(ctx, cx - 6, cy - 3, 12, 6, bone);
  rect(ctx, cx - 5, cy + 3, 10, 2, boneSh);
  // Eye sockets
  rect(ctx, cx - 4, cy - 2, 3, 3, '#1a1a1a');
  rect(ctx, cx + 1, cy - 2, 3, 3, '#1a1a1a');
  // Nose hole
  px(ctx, cx - 1, cy + 2, '#1a1a1a');
  px(ctx, cx, cy + 2, '#1a1a1a');
  // Jaw
  rect(ctx, cx - 4, cy + 5, 8, 2, boneSh);
  // Teeth
  for (let i = 0; i < 4; i++) { px(ctx, cx - 3 + i * 2, cy + 5, bone); }

  // Spine
  for (let s = 0; s < 7; s++) {
    rect(ctx, cx - 1, cy + 8 + s * 3, 2, 2, bone);
    if (s % 2 === 0) { px(ctx, cx - 2, cy + 9 + s * 3, boneSh); px(ctx, cx + 1, cy + 9 + s * 3, boneSh); }
  }

  // Ribs (3 pairs)
  for (let r = 0; r < 3; r++) {
    const ry = cy + 10 + r * 5;
    // Left rib curves out and down
    rect(ctx, cx - 2, ry, 1, 1, bone);
    rect(ctx, cx - 4, ry + 1, 2, 1, bone);
    rect(ctx, cx - 6, ry + 2, 2, 1, bone);
    rect(ctx, cx - 7, ry + 3, 2, 1, boneSh);
    // Right rib
    rect(ctx, cx + 1, ry, 1, 1, bone);
    rect(ctx, cx + 2, ry + 1, 2, 1, bone);
    rect(ctx, cx + 4, ry + 2, 2, 1, bone);
    rect(ctx, cx + 5, ry + 3, 2, 1, boneSh);
  }

  // Ground shadow
  rect(ctx, cx - 10, cy + 30, 20, 2, 'rgba(0,0,0,0.12)');
}

/**
 * Draw an egg with shell texture and speckles.
 */
export function drawEgg(ctx, params = {}) {
  const body = params.body || '#e8dcc0';
  const accent = params.accent || '#c0a880';
  const shell = lighten(body, 0.2);
  const shellSh = darken(body, 0.05);
  const speckle = accent || darken(body, 0.2);
  const cx = 32;
  const cy = 32;

  // Egg shape (slightly tapered top)
  rect(ctx, cx - 4, cy - 10, 8, 2, shell);
  rect(ctx, cx - 6, cy - 8, 12, 3, shell);
  rect(ctx, cx - 7, cy - 5, 14, 6, shell);
  rect(ctx, cx - 8, cy + 1, 16, 6, shell);
  rect(ctx, cx - 7, cy + 7, 14, 3, shellSh);
  rect(ctx, cx - 6, cy + 10, 12, 2, shellSh);
  rect(ctx, cx - 4, cy + 12, 8, 2, shellSh);

  // Highlight band
  rect(ctx, cx - 3, cy - 8, 4, 2, lighten(shell, 0.1));

  // Speckles
  const specklePositions = [
    [-3, -4], [2, -6], [5, -2], [-5, 2], [1, 4], [-2, 7], [4, 6],
    [-4, -1], [3, 1], [-1, 5], [5, 8], [-5, 6], [0, -3], [2, 9],
  ];
  for (const [dx, dy] of specklePositions) {
    if (noise(cx + dx, cy + dy) > 0.45) {
      px(ctx, cx + dx, cy + dy, speckle);
      if (noise(cx + dx + 1, cy + dy) > 0.6) px(ctx, cx + dx + 1, cy + dy, speckle);
    }
  }

  // Ground shadow
  rect(ctx, cx - 6, cy + 14, 12, 2, 'rgba(0,0,0,0.10)');
}

/**
 * Draw a pupa / cocoon with silk texture and segment bands.
 */
export function drawPupa(ctx, params = {}) {
  const body = params.body || '#8a7a50';
  const accent = params.accent || '#6a5a30';
  const silk = lighten(body, 0.15);
  const silkSh = darken(body, 0.05);
  const silkHi = lighten(body, 0.25);
  const band = accent || darken(body, 0.15);
  const cx = 32;
  const cy = 32;

  // Pupa shape (tapered both ends)
  rect(ctx, cx - 3, cy - 12, 6, 2, silk);
  rect(ctx, cx - 5, cy - 10, 10, 3, silk);
  rect(ctx, cx - 6, cy - 7, 12, 5, silk);
  rect(ctx, cx - 7, cy - 2, 14, 8, silk);
  rect(ctx, cx - 6, cy + 6, 12, 4, silkSh);
  rect(ctx, cx - 5, cy + 10, 10, 2, silkSh);
  rect(ctx, cx - 3, cy + 12, 6, 2, silkSh);

  // Highlight shimmer
  rect(ctx, cx - 2, cy - 10, 3, 2, silkHi);
  rect(ctx, cx - 1, cy - 7, 2, 3, silkHi);

  // Segment bands
  for (let s = -8; s <= 10; s += 4) {
    rect(ctx, cx - 5, cy + s, 10, 1, band);
  }

  // Silk texture
  for (let dy = -12; dy <= 13; dy++) {
    for (let dx = -7; dx <= 7; dx++) {
      if (noise(cx + dx, cy + dy) > 0.82) px(ctx, cx + dx, cy + dy, silkHi);
    }
  }

  // Thread from top
  for (let t = 0; t < 6; t++) {
    px(ctx, cx + (t % 2 === 0 ? 0 : 1), cy - 13 - t, band);
  }

  // Ground shadow
  rect(ctx, cx - 5, cy + 15, 10, 2, 'rgba(0,0,0,0.10)');
}
