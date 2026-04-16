/**
 * Tree template — round-canopy trees (apple, mango, oak, olive).
 * Stages 2-5 at 64×64 design grid, 3 animation frames for sway.
 */
import { px, rect, darken, lighten, gradientH, ao } from '../../helpers.js';
import { drawBarkTexture, drawTrunk, drawCanopyBase, drawFoliageMound, drawLeafHighlight, drawGroundBase, drawFruit } from '../bodyParts.js';

export function drawTree(ctx, params, stage, frame) {
  const { trunk, trunkDark, leaf, leafDark, fruit, fruitAccent } = params;
  const lh = params.leafHighlight || lighten(leaf, 0.25);
  const cw = params.canopyW || 32;
  const ch = params.canopyH || 22;
  const th = params.trunkH || 32;
  const cx = 28;
  const baseY = 60;

  const swayOff = frame === 0 ? 0 : (frame === 1 ? 2 : -2);
  const hw = (cw / 2) | 0;

  if (stage === 2) {
    const sh = (th * 0.6) | 0;
    const sw = (cw * 0.35) | 0;
    const sch = (ch * 0.45) | 0;
    gradientH(ctx, cx + 2, baseY - sh, 4, sh, trunk, trunkDark);
    rect(ctx, cx, baseY - sh, 2, (sh * 0.4) | 0, trunkDark);
    drawBarkTexture(ctx, cx, baseY - sh, 6, sh, trunk, trunkDark);
    drawFoliageMound(ctx, cx + swayOff, baseY - sh - sch, (sw / 2) | 0, (sch / 2) | 0, leaf, leafDark);
    rect(ctx, cx - (sw / 2 | 0) + 1 + swayOff, baseY - sh + 1, sw - 2, 3, leafDark);
    drawGroundBase(ctx, cx - 2, baseY, 12, trunk);
  } else if (stage === 3) {
    const sh = (th * 0.85) | 0;
    const sw = (cw * 0.7) | 0;
    const sch = (ch * 0.7) | 0;
    const shw = (sw / 2) | 0;
    gradientH(ctx, cx + 2, baseY - sh, 6, sh, trunk, trunkDark);
    rect(ctx, cx, baseY - ((sh * 0.7) | 0), 2, (sh * 0.55) | 0, trunkDark);
    drawBarkTexture(ctx, cx, baseY - sh, 8, sh, trunk, trunkDark);
    drawFoliageMound(ctx, cx + swayOff, baseY - sh - sch, shw, (sch / 2) | 0, leaf, leafDark);
    rect(ctx, cx - shw + 2 + swayOff, baseY - sh + 3, sw - 4, 3, leafDark);
    drawLeafHighlight(ctx, cx - 2 + swayOff, baseY - sh - sch + 2, 8, 5, lh);
    drawGroundBase(ctx, cx - 4, baseY, 16, trunk);
  } else if (stage === 4) {
    drawTrunk(ctx, cx, baseY, th, 8, trunk, trunkDark);
    drawCanopyBase(ctx, cx, hw, cw, ch, baseY, th, swayOff, leaf, leafDark);
    // Leaf cluster highlights
    drawLeafHighlight(ctx, cx - hw + 4 + swayOff, baseY - th - ((ch * 0.65) | 0), 7, 6, lh);
    drawLeafHighlight(ctx, cx + 1 + swayOff,       baseY - th - ((ch * 0.85) | 0), 8, 6, lh);
    rect(ctx, cx + hw - 11 + swayOff, baseY - th - ((ch * 0.45) | 0), 6, 5, lh);
    drawGroundBase(ctx, cx - 6, baseY, 20, trunk);
    ao(ctx, cx - 8, baseY + 2, 24, 3, 0.12);
  } else if (stage === 5) {
    drawTrunk(ctx, cx, baseY, th, 8, trunk, trunkDark);
    drawCanopyBase(ctx, cx, hw, cw, ch, baseY, th, swayOff, leaf, leafDark);
    // Leaf cluster highlights
    drawLeafHighlight(ctx, cx - hw + 4 + swayOff, baseY - th - ((ch * 0.65) | 0), 7, 6, lh);
    drawLeafHighlight(ctx, cx + 1 + swayOff,       baseY - th - ((ch * 0.85) | 0), 8, 6, lh);
    // Fruit
    const fy = (baseY - th - (ch * 0.3)) | 0;
    drawFruit(ctx, cx - hw + 4 + swayOff, fy,      8, fruit, fruitAccent);
    drawFruit(ctx, cx + hw - 10 + swayOff, fy - 6, 8, fruit, fruitAccent);
    drawFruit(ctx, cx + swayOff,           fy + 4,  8, fruit, fruitAccent);
    drawFruit(ctx, cx - hw + 6 + swayOff,  fy - 10, 6, fruitAccent || fruit, null);
    drawFruit(ctx, cx + hw - 8 + swayOff,  fy + 2,  6, fruitAccent || fruit, null);
    drawGroundBase(ctx, cx - 6, baseY, 20, trunk);
    ao(ctx, cx - 8, baseY + 2, 24, 3, 0.12);
  }
}
