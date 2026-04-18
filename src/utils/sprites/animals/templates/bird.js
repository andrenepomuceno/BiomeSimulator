/**
 * Bird drawing template — 64x64 design grid.
 * Used by: crow, hawk.
 *
 * Feather texture, wing layering, detailed beak and eye ring.
 */
import { px, rect, dither, darken, lighten, blend, gradientV, rimLight, ao, speckle, anisotropicSpeckle, DOWN, UP, LEFT } from '../../helpers.js';
import { drawFurTexture, drawBirdFoot, drawRaptorBeak, drawBirdHeadTop, drawBirdWingTop, drawBirdTailUp, drawBirdWingSide, drawBirdTailSide } from '../bodyParts.js';

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
    drawBirdHeadTop(ctx, cx, by, body, highlight, eyeRing, eye, dir === DOWN);
    if (dir === DOWN) {
      // Beak
      rect(ctx, cx - 2, by - 1, 4, 3, beak);
      rect(ctx, cx - 1, by - 1, 2, 2, beakHi);
      px(ctx, cx - 1, by + 1, beakSh);
    }

    // Wings
    const wingY = by + 4 + wingUp;
    drawBirdWingTop(ctx, bx, by, w, wingSpan, wingY, accent, shadow2, highlight, highlight2);

    // Tail feathers
    if (dir === UP) {
      const tailLen = params.tailLen || 6;
      const tailCol = params.tailAccent || accent;
      drawBirdTailUp(ctx, cx, by, h, tailLen, tailCol);
    }
    // Feet — per-toe detail matching crow.js convention
    const fId = (x) => x;
    drawBirdFoot(ctx, fId, cx - 3, by + h + 1, outline);
    drawBirdFoot(ctx, fId, cx + 3, by + h + 1, outline);

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
    // Beak (hooked raptor)
    drawRaptorBeak(ctx, f, headX + 7, by - 2, beak, beakHi, beakSh);

    // Wing (folded) — covert, secondary, and primary feather zones
    const wingY = by + 3 - wingUp;
    const wingW = Math.max(6, w - 4);
    drawBirdWingSide(ctx, f, bx, wingY, wingW, accent, featherTex, shadow2);

    // Tail
    const tailLen = params.tailLen || 6;
    const tailCol = params.tailAccent || accent;
    drawBirdTailSide(ctx, f, bx, by, h, tailLen, tailCol, shadow);

    // Feet
    drawBirdFoot(ctx, f, bx + 3,  by + h + 1, outline);
    drawBirdFoot(ctx, f, bx + 7,  by + h + 1, outline);
  }
}
