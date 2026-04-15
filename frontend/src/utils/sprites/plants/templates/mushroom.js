/**
 * Mushroom template — mushroom (cap + stem).
 * Stages 2-5 at 64×64 design grid, 3 frames (slight cap wobble).
 */
import { px, rect, darken, lighten, noise, gradientV, rimLight, ao, speckle } from '../../helpers.js';

export function drawMushroom(ctx, params, stage, frame) {
  const { stem, stemDark, cap, capDark, spots, fruit } = params;
  const cx = 28;
  const baseY = 56;

  const wobble = frame === 1 ? 2 : (frame === 2 ? -2 : 0);

  function capTex(x, y, w, h) {
    speckle(ctx, x, y, w, h, [capDark, darken(cap, 0.12), lighten(cap, 0.06)], 0.22);
  }

  if (stage === 2) {
    rect(ctx, cx + 2, baseY - 8, 4, 8, stem);
    rect(ctx, cx, baseY - 12, 8, 6, cap);
    rect(ctx, cx + 2, baseY - 12, 4, 2, lighten(cap, 0.2));
    capTex(cx, baseY - 12, 8, 6);
    rect(ctx, cx - 2, baseY, 12, 4, darken(stem, 0.3));
  } else if (stage === 3) {
    rect(ctx, cx + 2, baseY - 16, 6, 16, stem);
    rect(ctx, cx, baseY - 12, 2, 8, stemDark);
    // Cap
    rect(ctx, cx - 4 + wobble, baseY - 24, 16, 10, cap);
    rect(ctx, cx - 2 + wobble, baseY - 28, 12, 6, cap);
    rect(ctx, cx - 2 + wobble, baseY - 16, 12, 4, capDark);
    rect(ctx, cx + wobble, baseY - 28, 8, 4, lighten(cap, 0.2));
    capTex(cx - 4 + wobble, baseY - 28, 16, 14);
    if (spots) {
      rect(ctx, cx + wobble, baseY - 24, 4, 4, spots);
      rect(ctx, cx + 6 + wobble, baseY - 22, 4, 4, spots);
    }
    rect(ctx, cx - 4, baseY, 16, 4, darken(stem, 0.3));
  } else if (stage === 4) {
    rect(ctx, cx + 2, baseY - 20, 6, 20, stem);
    rect(ctx, cx, baseY - 12, 2, 12, stemDark);
    // Large cap with gradient
    gradientV(ctx, cx - 8 + wobble, baseY - 32, 24, 14, cap, capDark);
    rect(ctx, cx - 6 + wobble, baseY - 36, 20, 6, cap);
    rect(ctx, cx - 6 + wobble, baseY - 20, 20, 4, capDark);
    rect(ctx, cx - 4 + wobble, baseY - 36, 16, 4, lighten(cap, 0.2));
    rimLight(ctx, cx - 4 + wobble, baseY - 36, 16, 2, lighten(cap, 0.15), 'top');
    capTex(cx - 8 + wobble, baseY - 36, 24, 20);
    if (spots) {
      rect(ctx, cx - 4 + wobble, baseY - 32, 4, 4, spots);
      rect(ctx, cx + 4 + wobble, baseY - 28, 4, 4, spots);
      rect(ctx, cx + 10 + wobble, baseY - 30, 4, 4, spots);
    }
    // Gills
    rect(ctx, cx - 4 + wobble, baseY - 20, 16, 2, darken(stem, 0.15));
    rect(ctx, cx - 6, baseY, 20, 4, darken(stem, 0.3));
  } else if (stage === 5) {
    rect(ctx, cx + 2, baseY - 20, 6, 20, stem);
    rect(ctx, cx, baseY - 12, 2, 12, stemDark);
    gradientV(ctx, cx - 8 + wobble, baseY - 32, 24, 14, cap, capDark);
    rect(ctx, cx - 6 + wobble, baseY - 36, 20, 6, cap);
    rect(ctx, cx - 6 + wobble, baseY - 20, 20, 4, capDark);
    rect(ctx, cx - 4 + wobble, baseY - 36, 16, 4, lighten(cap, 0.2));
    rimLight(ctx, cx - 4 + wobble, baseY - 36, 16, 2, lighten(cap, 0.15), 'top');
    capTex(cx - 8 + wobble, baseY - 36, 24, 20);
    if (spots) {
      rect(ctx, cx - 4 + wobble, baseY - 32, 4, 4, spots);
      rect(ctx, cx + 4 + wobble, baseY - 28, 4, 4, spots);
    }
    // Spore clusters
    rect(ctx, cx - 6 + wobble, baseY - 20, 4, 4, fruit);
    rect(ctx, cx + 10 + wobble, baseY - 20, 4, 4, fruit);
    rect(ctx, cx + 2 + wobble, baseY - 18, 4, 4, fruit);
    rect(ctx, cx - 6, baseY, 20, 4, darken(stem, 0.3));
  }
}
