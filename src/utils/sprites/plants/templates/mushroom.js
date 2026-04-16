/**
 * Mushroom template — mushroom (cap + stem).
 * Stages 2-5 at 64×64 design grid, 3 frames (slight cap wobble).
 */
import { px, rect, darken, lighten, gradientV, rimLight, ao } from '../../helpers.js';
import { drawCapTexture, drawMushroomCap, drawGroundBase } from '../bodyParts.js';

export function drawMushroom(ctx, params, stage, frame) {
  const { stem, stemDark, cap, capDark, spots, fruit } = params;
  const cx = 28;
  const baseY = 56;

  const wobble = frame === 1 ? 2 : (frame === 2 ? -2 : 0);

  if (stage === 2) {
    rect(ctx, cx + 2, baseY - 8, 4, 8, stem);
    rect(ctx, cx, baseY - 12, 8, 6, cap);
    rect(ctx, cx + 2, baseY - 12, 4, 2, lighten(cap, 0.2));
    drawCapTexture(ctx, cx, baseY - 12, 8, 6, cap, capDark);
    drawGroundBase(ctx, cx - 2, baseY, 12, stem);
  } else if (stage === 3) {
    rect(ctx, cx + 2, baseY - 16, 6, 16, stem);
    rect(ctx, cx, baseY - 12, 2, 8, stemDark);
    // Cap
    rect(ctx, cx - 4 + wobble, baseY - 24, 16, 10, cap);
    rect(ctx, cx - 2 + wobble, baseY - 28, 12, 6, cap);
    rect(ctx, cx - 2 + wobble, baseY - 16, 12, 4, capDark);
    rect(ctx, cx + wobble, baseY - 28, 8, 4, lighten(cap, 0.2));
    drawCapTexture(ctx, cx - 4 + wobble, baseY - 28, 16, 14, cap, capDark);
    if (spots) {
      rect(ctx, cx + wobble, baseY - 24, 4, 4, spots);
      rect(ctx, cx + 6 + wobble, baseY - 22, 4, 4, spots);
    }
    drawGroundBase(ctx, cx - 4, baseY, 16, stem);
  } else if (stage === 4) {
    drawMushroomCap(ctx, cx, baseY, cap, capDark, stem, stemDark, spots, wobble, true, true);
    drawGroundBase(ctx, cx - 6, baseY, 20, stem);
  } else if (stage === 5) {
    drawMushroomCap(ctx, cx, baseY, cap, capDark, stem, stemDark, spots, wobble, false, false);
    // Spore clusters
    rect(ctx, cx - 6 + wobble, baseY - 20, 4, 4, fruit);
    rect(ctx, cx + 10 + wobble, baseY - 20, 4, 4, fruit);
    rect(ctx, cx + 2 + wobble, baseY - 18, 4, 4, fruit);
    drawGroundBase(ctx, cx - 6, baseY, 20, stem);
  }
}
