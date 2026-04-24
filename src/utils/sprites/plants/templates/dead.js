/**
 * Dead template — universal stage 6 for all plant species.
 * 64×64 design grid.
 */
import { px, rect, ellipse, speckle, darken, lighten, blend, quadraticThick, thickLine } from '../../helpers.js';
import { drawGroundBase, drawGrassBlade, drawCactusColumn, drawCactusSpines, drawCapTexture, drawPalmTrunk, drawPalmFrond } from '../bodyParts.js';

export function drawDead(ctx, params, frame) {
  const cx   = 28;
  const baseY = 56;

  // ── Grass variant: collapsed dry blades, no tree silhouette ─────────
  if (params.template === 'grass') {
    const dStem = '#8a6a28';
    const dLeaf = '#b09040';
    const dDark = '#906828';
    const leanX = frame === 1 ? 1 : frame === 2 ? -1 : 0;
    drawGrassBlade(ctx, 16 + leanX, baseY,  7, -7, dStem, dLeaf, dDark, true);
    drawGrassBlade(ctx, 20 + leanX, baseY,  9, -5, dStem, dLeaf, dDark, false);
    drawGrassBlade(ctx, 24 + leanX, baseY, 10, -3, dStem, dLeaf, dDark, false);
    drawGrassBlade(ctx, 28 + leanX, baseY, 11,  0, dStem, dLeaf, dDark, true);
    drawGrassBlade(ctx, 32 + leanX, baseY, 10,  3, dStem, dLeaf, dDark, false);
    drawGrassBlade(ctx, 36 + leanX, baseY,  9,  5, dStem, dLeaf, dDark, false);
    drawGrassBlade(ctx, 40 + leanX, baseY,  7,  7, dStem, dLeaf, dDark, true);
    speckle(ctx, 12, baseY + 1, 30, 2, [dLeaf, dDark, '#c8b060'], 0.18);
    drawGroundBase(ctx, 12, baseY, 30, dDark, 2);
    return;
  }

  // ── Bush variant: collapsed dried shrub clumps + brittle twigs ──────────
  if (params.template === 'bush') {
    const dryStem = '#8a6a3b';
    const dryLeaf = '#a4884c';
    const dryDark = '#6b5230';
    const ash = '#b79f72';
    const leanX = frame === 1 ? 1 : frame === 2 ? -1 : 0;

    // Rear collapsed clumps
    ellipse(ctx, cx - 7 + leanX, baseY - 11, 7, 5, dryDark);
    ellipse(ctx, cx + 9 + leanX, baseY - 11, 7, 5, dryDark);
    // Main brittle mound with darker lower half
    ellipse(ctx, cx + 1 + leanX, baseY - 12, 10, 7, dryLeaf);
    for (let y = 0; y < 4; y++) {
      rect(ctx, cx - 8 + leanX, baseY - 9 + y, 18, 1, blend(dryLeaf, dryDark, (y + 1) / 5));
    }

    // Dry texture and sparse highlights
    speckle(ctx, cx - 14 + leanX, baseY - 16, 30, 12, [dryDark, dryStem, ash], 0.24);

    // Brittle twig skeleton protruding from the mound
    thickLine(ctx, cx + leanX, baseY - 16, cx + 1 + leanX, baseY - 25, 0, dryStem);
    thickLine(ctx, cx + 1 + leanX, baseY - 23, cx - 4 + leanX, baseY - 20, 0, dryStem);
    thickLine(ctx, cx + 1 + leanX, baseY - 22, cx + 6 + leanX, baseY - 19, 0, dryStem);
    px(ctx, cx - 5 + leanX, baseY - 20, ash);
    px(ctx, cx + 7 + leanX, baseY - 19, ash);

    // Fallen dry debris at the contact point
    rect(ctx, cx - 9 + leanX, baseY - 2, 4, 1, dryStem);
    rect(ctx, cx + 6 + leanX, baseY - 1, 5, 1, dryStem);
    px(ctx, cx - 1 + leanX, baseY, ash);

    drawGroundBase(ctx, cx - 15 + leanX, baseY, 30, dryDark, 2);
    return;
  }

  // ── Cactus variant: shrunken desiccated column + fallen arm ─────────
  if (params.template === 'cactus') {
    const dBody  = darken(params.body, 0.15);
    const dDark  = darken(params.bodyDark, 0.12);
    const dHi    = lighten(dBody, 0.06);
    const spine  = '#9a9a68';
    const leanX  = frame === 1 ? 2 : frame === 2 ? -2 : 0;
    // Shrunken column — shorter + narrower than any live stage
    drawCactusColumn(ctx, cx + leanX, baseY, 6, 22, dBody, dHi, dDark, spine);
    // Extra crack/wrinkle texture on top
    speckle(ctx, cx + leanX, baseY - 22, 6, 22, [darken(dBody, 0.18), lighten(dBody, 0.06)], 0.28);
    // Fallen arm segment on the ground
    rect(ctx, cx - 9, baseY - 3, 10, 4, dBody);
    speckle(ctx, cx - 9, baseY - 3, 10, 4, [dDark, darken(dBody, 0.10)], 0.22);
    drawCactusSpines(ctx, cx - 9, baseY - 3, 10, 4, spine);
    drawGroundBase(ctx, cx - 4, baseY, 16, dDark, 3);
    return;
  }

  // ── Mushroom variant: broken stub + collapsed cap on ground ─────────
  if (params.template === 'mushroom') {
    const { stem, stemDark, cap, capDark } = params;
    const dStem = darken(stemDark, 0.18);
    const dCap  = darken(capDark, 0.14);
    const leanX = frame === 1 ? 1 : frame === 2 ? -1 : 0;
    // Broken stem stub
    rect(ctx, cx + 2 + leanX, baseY - 10, 5, 10, stemDark);
    rect(ctx, cx + 2 + leanX, baseY - 10, 2, 10, dStem);
    px(ctx, cx + 3 + leanX, baseY - 10, dStem);
    // Collapsed cap lying flat on the ground
    rect(ctx, cx - 10, baseY - 6, 22, 8, dCap);
    drawCapTexture(ctx, cx - 10, baseY - 6, 22, 8, cap, capDark);
    speckle(ctx, cx - 10, baseY - 6, 22, 8, [darken(dCap, 0.14), darken(cap, 0.18)], 0.28);
    // Underside of cap (dark fringe)
    rect(ctx, cx - 10, baseY - 6, 22, 2, darken(dCap, 0.10));
    drawGroundBase(ctx, cx - 8, baseY, 20, stemDark, 2);
    return;
  }

  // ── Palm variant: bare trunk + dried drooping fronds ────────────────
  if (params.template === 'palm') {
    const { trunk, trunkDark } = params;
    const dLeaf     = '#8a7a42';
    const dLeafDark = '#6a5a2e';
    const leanX = frame === 1 ? 1 : frame === 2 ? -1 : 0;
    // Dead trunk — medium height, slightly darker
    drawPalmTrunk(ctx, cx + leanX, baseY, 36, darken(trunk, 0.12), darken(trunkDark, 0.10), 22, [28, 20]);
    // Dried drooping fronds hanging from crown
    drawPalmFrond(ctx, cx + 4 + leanX, baseY - 40, 14, -1, 12, dLeaf, dLeafDark);
    drawPalmFrond(ctx, cx + 4 + leanX, baseY - 40, 14,  1, 12, dLeaf, dLeafDark);
    drawPalmFrond(ctx, cx + 4 + leanX, baseY - 40, 10,  0, 10, dLeaf, dLeafDark);
    drawGroundBase(ctx, cx - 4 + leanX, baseY, 16, darken(trunkDark, 0.10), 3);
    return;
  }

  const brown     = '#8a7a55';
  const darkBrown = '#6a5a40';
  const dryLeaf   = '#a09060';
  const dryTip    = '#c8b870';

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
}
