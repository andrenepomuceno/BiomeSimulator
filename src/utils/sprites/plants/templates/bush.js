/**
 * Bush template — low round-mound plants with no visible trunk.
 * Uses overlapping ellipses to produce a multi-lobe bushy silhouette.
 * Stages 2-5 at 64×64 design grid, 3 animation frames for sway.
 */
import { drawFoliageMound, drawSideLobe, drawGroundBase, drawFruit } from '../bodyParts.js';

export function drawBush(ctx, params, stage, frame) {
  const { stem, leaf, leafDark, fruit, fruitAccent } = params;
  const cx = 28;
  const baseY = 56;
  // Reduced sway — wide low shapes move less convincingly with large offsets
  const swayOff = frame === 0 ? 0 : (frame === 1 ? 1 : -1);

  const mound     = (mCx, topY, rx, ry) => drawFoliageMound(ctx, mCx, topY, rx, ry, leaf, leafDark);
  const sideLobe_ = (mCx, topY, rx, ry) => drawSideLobe(ctx, mCx, topY, rx, ry, leafDark);

  if (stage === 2) {
    // Small round sprout cluster sitting directly on the ground — no trunk
    mound(cx + swayOff, baseY - 14, 7, 7);
    drawGroundBase(ctx, cx - 5, baseY, 11, stem, 3);

  } else if (stage === 3) {
    // Medium wide mound, wider than tall
    mound(cx + swayOff, baseY - 18, 12, 11);
    drawGroundBase(ctx, cx - 10, baseY, 21, stem, 3);

  } else if (stage === 4) {
    // Multi-lobe adult bush: two side lobes (behind) + taller centre lobe (front)
    sideLobe_(cx - 11 + swayOff, baseY - 20, 10, 10);
    sideLobe_(cx + 11 + swayOff, baseY - 20, 10, 10);
    mound(cx + swayOff, baseY - 22, 12, 13);
    drawGroundBase(ctx, cx - 17, baseY, 35, stem, 3);

  } else if (stage === 5) {
    // Multi-lobe bush with scattered fruit
    sideLobe_(cx - 11 + swayOff, baseY - 20, 10, 10);
    sideLobe_(cx + 11 + swayOff, baseY - 20, 10, 10);
    mound(cx + swayOff, baseY - 22, 12, 13);
    // Fruit scattered across lobes
    drawFruit(ctx, cx - 16 + swayOff, baseY - 13, 5, fruit, fruitAccent);
    drawFruit(ctx, cx - 6  + swayOff, baseY - 20, 5, fruit, fruitAccent);
    drawFruit(ctx, cx + 3  + swayOff, baseY - 19, 5, fruit, fruitAccent);
    drawFruit(ctx, cx + 13 + swayOff, baseY - 13, 5, fruit, fruitAccent);
    drawFruit(ctx, cx - 2  + swayOff, baseY - 14, 5, fruit, fruitAccent);
    drawGroundBase(ctx, cx - 17, baseY, 35, stem, 3);
  }
}
