/**
 * Mushroom template — mushroom (cap + stem).
 * Stages 2-5 at 64×64 design grid, 3 frames (slight cap wobble).
 */
import { px, rect, darken, lighten, blend, shadedEllipse } from '../../helpers.js';
import { drawCapTexture, drawMushroomCap, drawGroundBase } from '../bodyParts.js';

export function drawMushroom(ctx, params, stage, frame) {
  const { stem, stemDark, cap, capDark, spots, fruit } = params;
  const cx = 28;
  const baseY = 56;

  const wobble = frame === 1 ? 2 : (frame === 2 ? -2 : 0);

  if (stage === 2) {
    // Stem
    rect(ctx, cx + 2, baseY - 8, 4, 8, stem);
    rect(ctx, cx + 2, baseY - 8, 2, 8, stemDark);
    // Cap — rounder dome
    shadedEllipse(ctx, cx + 4, baseY - 12, 6, 5, cap, {
      highlight: lighten(cap, 0.20),
    });
    drawCapTexture(ctx, cx - 1, baseY - 16, 11, 8, cap, capDark);
    if (spots) px(ctx, cx + 4, baseY - 14, spots);
    drawGroundBase(ctx, cx - 2, baseY, 12, stem);

  } else if (stage === 3) {
    // Stem
    rect(ctx, cx + 2, baseY - 16, 6, 16, stem);
    rect(ctx, cx + 2, baseY - 16, 2, 10, stemDark);
    // Cap — rounder dome with deeper ry and skirt flare
    shadedEllipse(ctx, cx + 4 + wobble, baseY - 22, 11, 10, cap, {
      highlight: lighten(cap, 0.22),
    });
    // Skirt flare at brim
    for (let i = 0; i < 3; i++) {
      const fw = 11 + 1 + i;
      const fy = baseY - 22 + 10 - 1 + i;
      rect(ctx, cx + 4 + wobble - fw, fy, fw * 2 + 1, 1, blend(cap, darken(cap, 0.14), (i + 2) / 5));
    }
    // Gill underside (dark fringe where cap meets stem)
    rect(ctx, cx - 8 + wobble, baseY - 12, 22, 3, darken(stem, 0.10));
    drawCapTexture(ctx, cx - 6 + wobble, baseY - 28, 22, 16, cap, capDark);
    if (spots) {
      rect(ctx, cx + 1 + wobble, baseY - 22, 4, 4, spots);
      rect(ctx, cx + 8 + wobble, baseY - 20, 4, 4, spots);
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
