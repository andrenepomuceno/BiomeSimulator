/**
 * Bush template — low round-mound plants with no visible trunk.
 * Uses overlapping ellipses to produce a multi-lobe bushy silhouette.
 * Stages 2-5 at 64×64 design grid, 3 animation frames for sway.
 */
import { px, rect, ellipse, darken, lighten, speckle, anisotropicSpeckle, ao } from '../../helpers.js';

export function drawBush(ctx, params, stage, frame) {
  const { stem, leaf, leafDark, fruit, fruitAccent } = params;
  const cx = 28;
  const baseY = 56;
  // Reduced sway — wide low shapes move less convincingly with large offsets
  const swayOff = frame === 0 ? 0 : (frame === 1 ? 1 : -1);

  /**
   * Draw a shaded foliage mound (ellipse) with top highlight and speckle texture.
   * @param {number} mCx  - horizontal centre (includes swayOff)
   * @param {number} topY - y-coordinate of the top of the mound
   * @param {number} rx   - horizontal radius
   * @param {number} ry   - vertical radius
   */
  function mound(mCx, topY, rx, ry) {
    const mCy = topY + ry;               // ellipse centre so top == topY
    ellipse(ctx, mCx, mCy, rx, ry, leaf);
    // Gradient shadow on lower half — darken progressively toward the ground
    for (let dy = 2; dy <= ry; dy++) {
      const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
      if (hw > 0) rect(ctx, mCx - hw, mCy + dy, hw * 2 + 1, 1, darken(leaf, 0.05 + dy * 0.005));
    }
    // Small top highlight
    const hiRx = Math.max(2, Math.floor(rx * 0.52));
    const hiRy = Math.max(1, Math.floor(ry * 0.30));
    ellipse(ctx, mCx, topY + hiRy, hiRx, hiRy, lighten(leaf, 0.17));
    // Directional leaf texture (vertical streaks simulate hanging foliage)
    anisotropicSpeckle(ctx, mCx - rx, topY, rx * 2 + 1, ry * 2 + 1,
      [leafDark, darken(leaf, 0.10), lighten(leaf, 0.06)], 0.22, Math.PI / 2, 2.5);
    speckle(ctx, mCx - rx, topY, rx * 2 + 1, ry * 2 + 1, [lighten(leaf, 0.14)], 0.05); // sunlight glints
    // Ground contact ambient occlusion
    ao(ctx, mCx - rx + 2, mCy + ry - 2, rx * 2 - 3, 4, 0.12);
  }

  // Simpler lobe for side/back positions: uses leafDark for depth contrast
  function sideLobe(mCx, topY, rx, ry) {
    const mCy = topY + ry;
    ellipse(ctx, mCx, mCy, rx, ry, leafDark);
    // Underside shadow
    for (let dy = Math.floor(ry * 0.5); dy <= ry; dy++) {
      const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
      if (hw > 0) rect(ctx, mCx - hw, mCy + dy, hw * 2 + 1, 1, darken(leafDark, 0.04 + dy * 0.004));
    }
    // Top highlight (sun-lit top of side lobe)
    const hiRx = Math.max(1, Math.floor(rx * 0.45));
    const hiRy = Math.max(1, Math.floor(ry * 0.28));
    ellipse(ctx, mCx, topY + hiRy, hiRx, hiRy, lighten(leafDark, 0.12));
    // Texture
    anisotropicSpeckle(ctx, mCx - rx, topY, rx * 2 + 1, ry * 2 + 1,
      [darken(leafDark, 0.08), lighten(leafDark, 0.04)], 0.18, Math.PI / 2, 2.5);
  }

  if (stage === 2) {
    // Small round sprout cluster sitting directly on the ground — no trunk
    mound(cx + swayOff, baseY - 14, 7, 7);
    rect(ctx, cx - 5, baseY, 11, 3, darken(stem, 0.28));

  } else if (stage === 3) {
    // Medium wide mound, wider than tall
    mound(cx + swayOff, baseY - 18, 12, 11);
    rect(ctx, cx - 10, baseY, 21, 3, darken(stem, 0.28));

  } else if (stage === 4) {
    // Multi-lobe adult bush: two side lobes (behind) + taller centre lobe (front)
    // Side lobes — shaded mounds using leafDark for depth contrast
    sideLobe(cx - 11 + swayOff, baseY - 20, 10, 10);
    sideLobe(cx + 11 + swayOff, baseY - 20, 10, 10);
    // Centre lobe — tallest, fully shaded mound
    mound(cx + swayOff, baseY - 22, 12, 13);
    rect(ctx, cx - 17, baseY, 35, 3, darken(stem, 0.28));

  } else if (stage === 5) {
    // Multi-lobe bush with scattered fruit
    sideLobe(cx - 11 + swayOff, baseY - 20, 10, 10);
    sideLobe(cx + 11 + swayOff, baseY - 20, 10, 10);
    mound(cx + swayOff, baseY - 22, 12, 13);
    // Fruit: small dots scattered across lobes with specular highlights
    const fCol = fruit;
    const fAcc = fruitAccent || lighten(fruit, 0.22);
    rect(ctx, cx - 16 + swayOff, baseY - 13, 5, 5, fCol);
    rect(ctx, cx - 6  + swayOff, baseY - 20, 5, 5, fCol);
    rect(ctx, cx + 3  + swayOff, baseY - 19, 5, 5, fCol);
    rect(ctx, cx + 13 + swayOff, baseY - 13, 5, 5, fCol);
    rect(ctx, cx - 2  + swayOff, baseY - 14, 5, 5, fCol);
    // Specular highlights on each fruit
    px(ctx, cx - 15 + swayOff, baseY - 12, fAcc);
    px(ctx, cx - 15 + swayOff, baseY - 13, lighten(fAcc, 0.12));
    px(ctx, cx - 5  + swayOff, baseY - 19, fAcc);
    px(ctx, cx - 5  + swayOff, baseY - 20, lighten(fAcc, 0.12));
    px(ctx, cx + 4  + swayOff, baseY - 18, fAcc);
    px(ctx, cx + 4  + swayOff, baseY - 19, lighten(fAcc, 0.12));
    px(ctx, cx + 14 + swayOff, baseY - 12, fAcc);
    px(ctx, cx - 1  + swayOff, baseY - 13, fAcc);
    rect(ctx, cx - 17, baseY, 35, 3, darken(stem, 0.28));
  }
}
