/**
 * Bird drawing template — 64x64 design grid.
 * Used by: crow, hawk.
 *
 * Feather texture, wing layering, detailed beak and eye ring.
 */
import { px, rect, dither, darken, lighten, blend, gradientV, rimLight, ao, speckle, anisotropicSpeckle, DOWN, UP, LEFT } from '../../helpers.js';
import { drawFurTexture } from '../bodyParts.js';

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

  if (dir === DOWN || dir === UP) {
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);

    // Body oval
    rect(ctx, bx + 3, by, w - 6, 3, body);
    rect(ctx, bx + 1, by + 2, w - 2, 2, body);
    gradientV(ctx, bx, by + 4, w, h - 8, body, shadow);
    rect(ctx, bx + 1, by + h - 4, w - 2, 2, shadow);
    rect(ctx, bx + 3, by + h - 2, w - 6, 2, shadow2);
    // Highlight ridge
    rect(ctx, cx - 2, by + 1, 4, 2, highlight2);
    rimLight(ctx, bx + 3, by, w - 6, 3, highlight2, 'top');
    // Feather texture
    drawFurTexture(ctx, bx + 2, by + 4, w - 4, h - 8, body, Math.PI / 2, 0.24);
    // Breast colour
    if (params.breast && dir === DOWN) {
      rect(ctx, bx + 3, by + h - 7, w - 6, 4, breastCol);
      dither(ctx, bx + 3, by + h - 8, w - 6, 1, body, breastCol);
    }
    ao(ctx, bx + 2, by + h - 3, w - 4, 3, 0.08);

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
      const t = (i - 1) / Math.max(1, wingSpan - 1); // 0=inner covert, 1=primary tip
      const wc = t < 0.25 ? lighten(accent, 0.10)  // covert (near body)
               : t < 0.65 ? accent                  // secondary
               : darken(accent, 0.12);               // primary (tip)
      const wh = Math.max(1, 5 - Math.round(i * 3 / wingSpan));
      rect(ctx, bx - i * 3, wingY, 3, wh, wc);
      rect(ctx, bx + w - 3 + i * 3, wingY, 3, wh, wc);
      // Leading edge highlight on coverts
      if (t < 0.3) {
        px(ctx, bx - i * 3, wingY, lighten(wc, 0.10));
        px(ctx, bx + w - 3 + i * 3 + 2, wingY, lighten(wc, 0.10));
      }
      // Feather separation lines on primaries
      if (t >= 0.65 && i % 2 === 1) {
        px(ctx, bx - i * 3, wingY + wh - 1, shadow2);
        px(ctx, bx + w - 3 + i * 3 + 2, wingY + wh - 1, shadow2);
      }
    }
    // Covert leading edge highlight
    if (wingSpan > 4) {
      rect(ctx, bx - 3, wingY - 2, 3, 2, highlight);
      rect(ctx, bx + w, wingY - 2, 3, 2, highlight);
      rect(ctx, bx - 5, wingY - 1, 2, 1, highlight2);
      rect(ctx, bx + w + 3, wingY - 1, 2, 1, highlight2);
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

    // Body — dorsal-to-ventral gradient with directional feather texture
    // Body is symmetric around cx=32 so gradientV works without flipping
    gradientV(ctx, bx, by, w, h, highlight2, shadow2);
    // Dorsal ridge
    for (let i = 2; i < w - 2; i++) { px(ctx, f(bx + i), by, highlight2); px(ctx, f(bx + i), by + 1, highlight2); }
    for (let i = 2; i < w - 2; i++) { px(ctx, f(bx + i), by + 2, highlight); px(ctx, f(bx + i), by + 3, highlight); }
    // Ventral shadow
    for (let i = 2; i < w - 2; i++) { px(ctx, f(bx + i), by + h - 2, shadow); px(ctx, f(bx + i), by + h - 1, shadow2); }
    // Breast
    if (params.breast) {
      for (let i = 3; i < w - 3; i++) {
        px(ctx, f(bx + i), by + h - 6, blend(breastCol, body, 0.4));
        px(ctx, f(bx + i), by + h - 5, breastCol);
        px(ctx, f(bx + i), by + h - 4, breastCol);
        px(ctx, f(bx + i), by + h - 3, breastCol);
      }
    }
    // Horizontal feather streaks (body symmetric, no flip needed for texture)
    anisotropicSpeckle(ctx, bx + 1, by + 3, w - 2, h - 5, [featherTex, darken(body, 0.10), lighten(body, 0.05)], 0.26, 0, 3.5);

    // Head — gradient fill with cranium highlight and front-face shadow
    const headX = bx + w;
    const headHW = 7;
    const headLeft = flip ? (64 - bx - w - headHW) : (bx + w);
    gradientV(ctx, headLeft, by - 3, headHW, 8, highlight, shadow);
    // Rounded cap rows
    for (let dx = 1; dx < 6; dx++) { px(ctx, f(headX + dx), by - 4, body); px(ctx, f(headX + dx), by + 4, shadow2); }
    // Cranium highlight
    for (let dx = 1; dx < headHW - 1; dx++) px(ctx, f(headX + dx), by - 3, highlight2);
    // Front face edge shadow (beak side)
    for (let dy = -2; dy < 3; dy++) px(ctx, f(headX + headHW - 1), by + dy, shadow);
    // Eye — ring, iris, specular highlight
    rect(ctx, f(headX + 4), by - 3, 3, 3, eyeRing);
    px(ctx, f(headX + 5), by - 2, eye);
    px(ctx, f(headX + 4), by - 3, '#ffffff');  // specular
    // Beak (hooked — hawk) with upper/lower mandible
    rect(ctx, f(headX + 7), by - 2, 4, 2, beak);  // upper mandible
    rect(ctx, f(headX + 7), by - 2, 3, 1, beakHi);  // top highlight
    px(ctx, f(headX + 10), by - 1, beakSh);  // hook tip
    rect(ctx, f(headX + 8), by, 3, 2, darken(beak, 0.08));  // lower mandible
    px(ctx, f(headX + 10), by + 1, beakSh);

    // Wing (folded) — covert, secondary, and primary feather zones
    const wingY = by + 3 - wingUp;
    const wingW = Math.max(6, w - 4);
    const covW = Math.floor(wingW * 0.3);
    const priW = Math.floor(wingW * 0.35);
    for (let i = 0; i < wingW; i++) {
      const wc = i < covW
        ? lighten(accent, 0.10)              // covert (lighter, near root)
        : (i >= wingW - priW ? darken(accent, 0.10) : accent); // primary (darker, tip)
      px(ctx, f(bx + 2 + i), wingY, lighten(wc, 0.06));
      px(ctx, f(bx + 2 + i), wingY + 1, wc);
      px(ctx, f(bx + 2 + i), wingY + 2, darken(wc, 0.08));
    }
    // Feather separation lines on primaries
    for (let i = wingW - priW; i < wingW - 1; i += 2) {
      px(ctx, f(bx + 2 + i), wingY + 2, shadow2);
    }
    // Feather texture overlay (body-symmetric coords)
    anisotropicSpeckle(ctx, bx + 2, wingY, wingW, 3, [featherTex, darken(accent, 0.06)], 0.16, Math.PI / 2, 2.0);

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
