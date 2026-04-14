/**
 * Bird drawing template — 64x64 design grid.
 * Used by: crow, hawk.
 *
 * Feather texture, wing layering, detailed beak and eye ring.
 */
import { px, rect, dither, darken, lighten, noise, DOWN, UP, LEFT } from '../../helpers.js';

export function drawBird(ctx, params, dir, frame) {
  const { body, accent, eye, beak, w, h, wingSpan } = params;
  const shadow = darken(body, 0.15);
  const shadow2 = darken(body, 0.25);
  const highlight = lighten(body, 0.12);
  const highlight2 = lighten(body, 0.20);
  const outline = darken(body, 0.3);
  const featherTex = darken(body, 0.06);
  const breastCol = params.breast || accent;
  const eyeRing = darken(body, 0.2);
  const beakHi = lighten(beak, 0.15);
  const beakSh = darken(beak, 0.15);
  const cx = 32;
  const cy = 32;
  const wingUp = frame === 0 ? -3 : frame === 2 ? 3 : 0;

  function featherRegion(x, y, rw, rh, base) {
    for (let dy = 0; dy < rh; dy++) {
      for (let dx = 0; dx < rw; dx++) {
        if (noise(x + dx, y + dy) > 0.75) px(ctx, x + dx, y + dy, featherTex);
      }
    }
  }

  if (dir === DOWN || dir === UP) {
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);

    // Body oval
    rect(ctx, bx + 3, by, w - 6, 3, body);
    rect(ctx, bx + 1, by + 2, w - 2, 2, body);
    rect(ctx, bx, by + 4, w, h - 8, body);
    rect(ctx, bx + 1, by + h - 4, w - 2, 2, shadow);
    rect(ctx, bx + 3, by + h - 2, w - 6, 2, shadow2);
    // Highlight ridge
    rect(ctx, cx - 2, by + 1, 4, 2, highlight2);
    // Feather texture
    featherRegion(bx + 2, by + 4, w - 4, h - 8, body);
    // Breast colour
    if (params.breast && dir === DOWN) {
      rect(ctx, bx + 3, by + h - 7, w - 6, 4, breastCol);
      dither(ctx, bx + 3, by + h - 8, w - 6, 1, body, breastCol);
    }

    // Head
    rect(ctx, cx - 4, by - 7, 8, 7, body);
    rect(ctx, cx - 3, by - 9, 6, 3, body);
    rect(ctx, cx - 2, by - 9, 4, 2, highlight);
    if (dir === DOWN) {
      // Eyes with ring
      rect(ctx, cx - 4, by - 5, 3, 3, eyeRing);
      rect(ctx, cx + 1, by - 5, 3, 3, eyeRing);
      px(ctx, cx - 3, by - 4, eye);
      px(ctx, cx + 2, by - 4, eye);
      px(ctx, cx - 3, by - 5, '#ffffff');
      px(ctx, cx + 2, by - 5, '#ffffff');
      // Beak
      rect(ctx, cx - 2, by - 1, 4, 3, beak);
      rect(ctx, cx - 1, by - 1, 2, 2, beakHi);
      px(ctx, cx - 1, by + 1, beakSh);
    }

    // Wings
    const wingY = by + 4 + wingUp;
    for (let i = 1; i <= wingSpan; i++) {
      const wc = i <= 2 ? body : (i >= wingSpan - 1 ? shadow2 : accent);
      const wh = Math.max(2, 4 - Math.floor(i / 3));
      rect(ctx, bx - i * 3, wingY, 3, wh, wc);
      rect(ctx, bx + w - 3 + i * 3, wingY, 3, wh, wc);
      // Feather tips
      if (i >= wingSpan - 2) {
        px(ctx, bx - i * 3, wingY + wh, shadow2);
        px(ctx, bx + w - 3 + i * 3 + 2, wingY + wh, shadow2);
      }
    }
    // Wing covert highlight
    if (wingSpan > 4) {
      rect(ctx, bx - 3, wingY - 2, 3, 2, highlight);
      rect(ctx, bx + w, wingY - 2, 3, 2, highlight);
    }

    // Tail feathers
    if (dir === UP) {
      const tailLen = params.tailLen || 6;
      for (let t = 0; t < tailLen; t += 2) {
        rect(ctx, cx - 3 + t, by + h + t, 3, 3, accent);
        rect(ctx, cx + 3 - t, by + h + t, 3, 3, accent);
      }
    }
    rect(ctx, cx - 3, by + h, 3, 3, outline);
    rect(ctx, cx + 3, by + h, 3, 3, outline);

  } else {
    // LEFT / RIGHT
    const flip = dir === LEFT;
    const f = flip ? (x) => 63 - x : (x) => x;
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);

    // Body
    for (let i = 3; i < w - 3; i++) { px(ctx, f(bx + i), by, body); px(ctx, f(bx + i), by + 1, body); }
    for (let r = 2; r < h - 2; r++) for (let i = 0; i < w; i++) px(ctx, f(bx + i), by + r, body);
    for (let i = 3; i < w - 3; i++) { px(ctx, f(bx + i), by + h - 2, shadow); px(ctx, f(bx + i), by + h - 1, shadow2); }
    // Back highlight
    for (let i = 3; i < w - 3; i++) { px(ctx, f(bx + i), by + 2, highlight); px(ctx, f(bx + i), by + 3, highlight2); }
    // Feather texture
    for (let r = 4; r < h - 3; r++) {
      for (let c = 1; c < w - 1; c++) {
        if (noise(bx + c, by + r) > 0.77) px(ctx, f(bx + c), by + r, featherTex);
      }
    }
    // Breast
    if (params.breast) {
      for (let i = 3; i < w - 3; i++) {
        px(ctx, f(bx + i), by + h - 5, breastCol);
        px(ctx, f(bx + i), by + h - 4, breastCol);
        px(ctx, f(bx + i), by + h - 3, breastCol);
      }
    }

    // Head
    const headX = bx + w;
    for (let dy = -3; dy < 4; dy++) for (let dx = 0; dx < 7; dx++) px(ctx, f(headX + dx), by + dy, body);
    // Rounding
    for (let dx = 1; dx < 6; dx++) { px(ctx, f(headX + dx), by - 4, body); px(ctx, f(headX + dx), by + 4, shadow); }
    // Highlight
    for (let dx = 1; dx < 5; dx++) px(ctx, f(headX + dx), by - 3, highlight);
    // Eye
    rect(ctx, f(headX + 4), by - 3, 3, 3, eyeRing);
    px(ctx, f(headX + 5), by - 2, eye);
    px(ctx, f(headX + 5), by - 3, '#ffffff');
    // Beak
    rect(ctx, f(headX + 7), by - 1, 3, 3, beak);
    rect(ctx, f(headX + 7), by - 1, 2, 2, beakHi);
    px(ctx, f(headX + 8), by + 1, beakSh);

    // Wing (folded)
    const wingY = by + 3 - wingUp;
    for (let i = 0; i < Math.max(6, w - 4); i++) {
      px(ctx, f(bx + 2 + i), wingY, accent);
      px(ctx, f(bx + 2 + i), wingY + 1, accent);
      px(ctx, f(bx + 2 + i), wingY + 2, shadow);
    }

    // Tail
    const tailLen = params.tailLen || 6;
    for (let t = 0; t < tailLen; t++) {
      px(ctx, f(bx - 3 - t), by + h - 5 + t, accent);
      px(ctx, f(bx - 3 - t), by + h - 4 + t, accent);
      px(ctx, f(bx - 2 - t), by + h - 4 + t, shadow);
    }
    rect(ctx, f(bx - tailLen - 2), by + h - 5 + tailLen - 1, 3, 3, shadow2);

    // Feet
    rect(ctx, f(bx + 2), by + h, 3, 3, outline);
    rect(ctx, f(bx + 5), by + h, 3, 3, outline);
    rect(ctx, f(bx + 2), by + h + 3, 3, 2, outline);
  }
}
