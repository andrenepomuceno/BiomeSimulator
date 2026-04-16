/**
 * Flower template — sunflower (tall stem + flower head).
 * Stages 2-5 at 64×64 design grid, 3 animation frames for sway.
 */
import { px, rect, ellipse, darken, lighten, rimLight, ao, speckle, anisotropicSpeckle } from '../../helpers.js';

export function drawFlower(ctx, params, stage, frame) {
  const { stem, leaf, leafDark, petal, petalDark, center, fruit } = params;
  const cx = 28;
  const baseY = 56;

  const swayOff = frame === 0 ? 0 : (frame === 1 ? 2 : -2);

  // Directional petal texture — diagonal streaks simulate petal veins
  function petalTex(x, y, w, h) {
    anisotropicSpeckle(ctx, x, y, w, h,
      [petalDark || darken(petal, 0.15), darken(petal, 0.10), lighten(petal, 0.06)], 0.22, Math.PI / 4, 2.0);
  }

  if (stage === 2) {
    // Stem
    rect(ctx, cx + 2 + swayOff, baseY - 16, 4, 16, stem);
    px(ctx, cx + 2 + swayOff, baseY - 14, lighten(stem, 0.10));
    rect(ctx, cx - 2 + swayOff, baseY - 12, 6, 4, leaf);
    rect(ctx, cx + 4 + swayOff, baseY - 14, 6, 4, leaf);
    // Tight bud — mostly green sepals, petal tips just visible
    rect(ctx, cx + swayOff, baseY - 24, 8, 8, leaf);           // sepal body
    rect(ctx, cx + 2 + swayOff, baseY - 26, 4, 3, leaf);       // tapered tip
    rect(ctx, cx + 2 + swayOff, baseY - 24, 4, 3, petal);      // petal colour showing through
    px(ctx, cx + 3 + swayOff, baseY - 24, lighten(petal, 0.15)); // highlight
    rect(ctx, cx + 1 + swayOff, baseY - 22, 6, 2, lighten(leaf, 0.12)); // sepal highlight
    rect(ctx, cx - 2, baseY, 12, 4, darken(stem, 0.3));
  } else if (stage === 3) {
    rect(ctx, cx + 2 + swayOff, baseY - 28, 4, 28, stem);
    // Stem highlight (cylindrical look)
    for (let r = 4; r < 24; r++) px(ctx, cx + 2 + swayOff, baseY - 28 + r, lighten(stem, 0.10));
    rect(ctx, cx - 4 + swayOff, baseY - 20, 8, 4, leaf);
    rect(ctx, cx + 4 + swayOff, baseY - 16, 8, 4, leaf);
    rect(ctx, cx - 2 + swayOff, baseY - 24, 6, 4, leafDark);
    // Opening bud — petals loosening from sepal, center just visible
    rect(ctx, cx - 2 + swayOff, baseY - 37, 12, 11, petal);    // outer petal ring
    rect(ctx, cx + swayOff, baseY - 40, 8, 5, petal);          // top petals arching up
    rect(ctx, cx - 1 + swayOff, baseY - 27, 10, 4, darken(petal, 0.12)); // bottom drooping
    // Petal highlights
    rect(ctx, cx + 1 + swayOff, baseY - 40, 6, 2, lighten(petal, 0.18)); // top highlight
    petalTex(cx - 2 + swayOff, baseY - 40, 12, 14);
    // Center disc barely showing
    rect(ctx, cx + swayOff, baseY - 33, 8, 7, center);
    px(ctx, cx + 1 + swayOff, baseY - 32, lighten(center, 0.12));
    rect(ctx, cx - 4, baseY, 16, 4, darken(stem, 0.3));
  } else if (stage === 4) {
    rect(ctx, cx + 2 + swayOff, baseY - 32, 4, 32, stem);
    // Stem highlight (cylindrical)
    for (let r = 4; r < 28; r++) px(ctx, cx + 2 + swayOff, baseY - 32 + r, lighten(stem, 0.10));
    rect(ctx, cx - 4 + swayOff, baseY - 24, 8, 4, leaf);
    rect(ctx, cx + 4 + swayOff, baseY - 20, 8, 4, leaf);
    // Full flower head
    rect(ctx, cx - 6 + swayOff, baseY - 44, 20, 16, petal);
    rect(ctx, cx - 4 + swayOff, baseY - 48, 16, 4, petal);
    rect(ctx, cx - 4 + swayOff, baseY - 32, 16, 4, petalDark || darken(petal, 0.15));
    // Petal ring highlights and shadows for depth
    rect(ctx, cx - 3 + swayOff, baseY - 48, 14, 2, lighten(petal, 0.20)); // top sun cap
    rect(ctx, cx - 5 + swayOff, baseY - 28, 18, 2, darken(petal, 0.20));  // bottom shadow cap
    petalTex(cx - 6 + swayOff, baseY - 48, 20, 20);
    // Center disc (ellipse for roundness)
    ellipse(ctx, cx + 4 + swayOff, baseY - 36, 7, 6, center);
    ellipse(ctx, cx + 3 + swayOff, baseY - 38, 4, 3, lighten(center, 0.12)); // highlight lobe
    // Center seed texture
    anisotropicSpeckle(ctx, cx - 2 + swayOff, baseY - 42, 14, 12,
      [darken(center, 0.18), darken(center, 0.24)], 0.38, 0, 1.0);
    rect(ctx, cx - 4, baseY, 16, 4, darken(stem, 0.3));
  } else if (stage === 5) {
    rect(ctx, cx + 2 + swayOff, baseY - 32, 4, 32, stem);
    // Stem highlight
    for (let r = 4; r < 28; r++) px(ctx, cx + 2 + swayOff, baseY - 32 + r, lighten(stem, 0.10));
    rect(ctx, cx - 4 + swayOff, baseY - 24, 8, 4, leaf);
    rect(ctx, cx + 4 + swayOff, baseY - 20, 8, 4, leaf);
    // Drooping flower — petals hanging, more bottom weight
    rect(ctx, cx - 6 + swayOff, baseY - 40, 20, 12, petal);
    rect(ctx, cx - 4 + swayOff, baseY - 44, 16, 6, petal);
    rect(ctx, cx - 4 + swayOff, baseY - 29, 16, 6, darken(petal, 0.20)); // heavy drooping bottom
    rect(ctx, cx - 4 + swayOff, baseY - 44, 14, 2, lighten(petal, 0.12)); // faint top highlight
    petalTex(cx - 6 + swayOff, baseY - 44, 20, 20);
    // Mature seed head (large, domed)
    ellipse(ctx, cx + 4 + swayOff, baseY - 34, 8, 7, darken(center, 0.10));
    ellipse(ctx, cx + 3 + swayOff, baseY - 36, 5, 4, center); // dome highlight
    // Dense seed texture
    anisotropicSpeckle(ctx, cx - 3 + swayOff, baseY - 41, 16, 14,
      [darken(center, 0.22), darken(center, 0.28)], 0.42, 0, 1.0);
    // Ripe seeds visible
    rect(ctx, cx + 1 + swayOff, baseY - 35, 5, 5, fruit || lighten(center, 0.20));
    rect(ctx, cx + 5 + swayOff, baseY - 33, 4, 4, fruit || lighten(center, 0.20));
    px(ctx, cx + 2 + swayOff, baseY - 34, lighten(fruit || lighten(center, 0.20), 0.15));
    rect(ctx, cx - 4, baseY, 16, 4, darken(stem, 0.3));
  }
}
