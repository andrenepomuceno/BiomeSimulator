/**
 * Grass template — draws multiple thin angled blades growing from the ground.
 * Stages 2-5 at 64×64 design grid, 3 animation frames for sway.
 */
import { px, rect, darken, lighten, blend } from '../../helpers.js';
import { drawGrassBlade, drawSeedHead, drawGroundBase } from '../bodyParts.js';

export function drawGrass(ctx, params, stage, frame) {
  const { stem, leaf, leafDark, fruit } = params;
  const baseY = 56;

  // Stage 2 sways 1px, stages 3+ sway 2px as blades are taller
  const swayAmt = stage === 2 ? 1 : 2;
  const swayOff = frame === 0 ? 0 : frame === 1 ? swayAmt : -swayAmt;

  function blade(bx, by, h, lean, dark = false, seedTip = null) {
    drawGrassBlade(ctx, bx, by, h, lean, stem, leaf, leafDark, dark, seedTip);
  }

  // ── Stage 2: young sprout — 3 short blades ────────────────────────
  if (stage === 2) {
    blade(24 + swayOff, baseY, 10, -3);
    blade(27 + swayOff, baseY, 12,  0);
    blade(31 + swayOff, baseY, 10,  3, true);
    // Ground cluster
    drawGroundBase(ctx, 22, baseY, 14, stem, 2);

  // ── Stage 3: adult sprout — 5 blades, medium height ───────────────
  } else if (stage === 3) {
    blade(20 + swayOff, baseY, 16, -6, true);
    blade(24 + swayOff, baseY, 19, -2);
    blade(27 + swayOff, baseY, 20,  0);
    blade(31 + swayOff, baseY, 19,  2, true);
    blade(35 + swayOff, baseY, 16,  6);
    drawGroundBase(ctx, 18, baseY, 20, stem, 2);

  // ── Stage 4: adult — 7 blades, tall ──────────────────────────────
  } else if (stage === 4) {
    blade(16 + swayOff, baseY, 22, -8, true);
    blade(20 + swayOff, baseY, 26, -4);
    blade(23 + swayOff, baseY, 28, -1);
    blade(27 + swayOff, baseY, 29,  0);
    blade(31 + swayOff, baseY, 28,  1, true);
    blade(34 + swayOff, baseY, 26,  4);
    blade(38 + swayOff, baseY, 22,  8, false);
    drawGroundBase(ctx, 14, baseY, 28, stem, 2);

  // ── Stage 5: seed-bearing — same blades + seed-head tips ─────────
  } else if (stage === 5) {
    const seedCol = fruit || lighten(leaf, 0.22);
    const tips = [
      { x: 16 + swayOff, h: 22, lean: -8, dark: true },
      { x: 20 + swayOff, h: 26, lean: -4, dark: false },
      { x: 23 + swayOff, h: 28, lean: -1, dark: false },
      { x: 27 + swayOff, h: 29, lean:  0, dark: false },
      { x: 31 + swayOff, h: 28, lean:  1, dark: true },
      { x: 34 + swayOff, h: 26, lean:  4, dark: false },
      { x: 38 + swayOff, h: 22, lean:  8, dark: false },
    ];
    for (const tip of tips) {
      blade(tip.x, baseY, tip.h, tip.lean, tip.dark, seedCol);
      const tipX = tip.x + Math.round(tip.lean * ((tip.h - 1) / Math.max(1, tip.h - 1)));
      const tipY = baseY - tip.h + 1;
      drawSeedHead(ctx, tipX, tipY, seedCol);
    }
    drawGroundBase(ctx, 14, baseY, 28, stem, 2);
  }
}
