/**
 * Dead template — universal stage 6 for all plant species.
 * 64×64 design grid.
 */
import { px, rect, speckle, quadraticThick, thickLine, ao } from '../../helpers.js';
import { drawGroundBase } from '../bodyParts.js';

export function drawDead(ctx, params, frame) {
  const brown     = '#8a7a55';
  const darkBrown = '#6a5a40';
  const dryLeaf   = '#a09060';
  const dryTip    = '#c8b870';
  const cx   = 28;
  const baseY = 56;

  // Wind-lean offset varies per frame
  const leanX = frame === 1 ? 2 : frame === 2 ? -2 : 0;

  // Wilted main stem — organic curve from base up and over
  quadraticThick(ctx, cx + leanX, baseY, cx + 3 + leanX, baseY - 20, cx + 5 + leanX * 2, baseY - 34, 1, darkBrown, 0.6);

  // Left drooping branch with dry leaf tip
  thickLine(ctx, cx + 2 + leanX, baseY - 16, cx - 5 + leanX, baseY - 12, 0, brown);
  thickLine(ctx, cx - 5 + leanX, baseY - 12, cx - 9 + leanX, baseY - 9,  0, dryLeaf);
  px(ctx, cx - 10 + leanX, baseY - 8,  dryTip);
  px(ctx, cx - 9  + leanX, baseY - 7,  dryTip);

  // Right drooping branch with dry leaf tip
  thickLine(ctx, cx + 3 + leanX, baseY - 10, cx + 10 + leanX, baseY - 7,  0, brown);
  thickLine(ctx, cx + 10 + leanX, baseY - 7, cx + 14 + leanX, baseY - 5,  0, dryLeaf);
  px(ctx, cx + 14 + leanX, baseY - 4, dryTip);
  px(ctx, cx + 15 + leanX, baseY - 5, dryTip);

  // Upper wilted leaves drooping from stem tip
  const tipX = cx + 5 + leanX * 2;
  const tipY = baseY - 34;
  thickLine(ctx, tipX, tipY, tipX - 4, tipY + 5,  0, brown);
  thickLine(ctx, tipX, tipY, tipX + 4, tipY + 4,  0, brown);
  px(ctx, tipX - 4, tipY + 6, dryLeaf);
  px(ctx, tipX + 4, tipY + 5, dryLeaf);
  // Extra dead leaf curl on frame 1
  if (frame === 1) thickLine(ctx, tipX, tipY, tipX + 2, tipY - 4, 0, dryLeaf);

  // Stem texture
  speckle(ctx, cx - 2 + leanX, baseY - 34, 12, 34, [brown, dryLeaf, darkBrown], 0.09);

  // Ground debris — fallen twigs and dried leaves
  thickLine(ctx, cx - 8, baseY + 2, cx - 3, baseY + 4, 0, darkBrown);
  thickLine(ctx, cx + 7, baseY + 1, cx + 12, baseY + 3, 0, darkBrown);
  px(ctx, cx - 2, baseY + 4, dryLeaf);
  px(ctx, cx + 9, baseY + 5, dryLeaf);
  rect(ctx, cx + 1, baseY + 3, 4, 2, brown);

  drawGroundBase(ctx, cx - 4, baseY, 14, darkBrown, 2);
  ao(ctx, cx - 8, baseY + 2, 24, 3, 0.10);
}
