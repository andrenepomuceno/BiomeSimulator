/**
 * Grass template — draws multiple thin angled blades growing from the ground.
 * Stages 2-5 at 64×64 design grid, 3 animation frames for sway.
 */
import { px, rect, darken, lighten, blend } from '../../helpers.js';

export function drawGrass(ctx, params, stage, frame) {
  const { stem, leaf, leafDark, fruit } = params;
  const baseY = 56;

  // Stage 2 sways 1px, stages 3+ sway 2px as blades are taller
  const swayAmt = stage === 2 ? 1 : 2;
  const swayOff = frame === 0 ? 0 : frame === 1 ? swayAmt : -swayAmt;

  /**
   * Draw a single grass blade.
   * @param {number} bx   - base x (64-grid)
   * @param {number} by   - base y (64-grid), blade grows upward
   * @param {number} h    - blade height in pixels
   * @param {number} lean - total horizontal drift at tip (+ve = right)
   * @param {boolean} dark - use darker colour variant for shading variety
   * @param {string|null} seedTip - colour for seed head at tip (null = plain tip)
   */
  function blade(bx, by, h, lean, dark = false, seedTip = null) {
    const baseCol = darken(dark ? leafDark : stem, 0.08);
    const midCol  = dark ? leafDark : leaf;
    const tipCol  = dark ? leaf : lighten(leaf, 0.18);

    for (let i = 0; i < h; i++) {
      const y = by - i;
      const x = bx + Math.round(lean * (i / Math.max(1, h - 1)));
      const t = i / h;

      let col;
      if (seedTip && i >= h - 3) {
        col = i === h - 1 ? lighten(seedTip, 0.18) : seedTip;
      } else if (t < 0.3) {
        col = blend(baseCol, midCol, t / 0.3);
      } else if (t < 0.8) {
        col = midCol;
      } else {
        col = blend(midCol, tipCol, (t - 0.8) / 0.2);
      }

      px(ctx, x, y, col);
      // 2px wide at the lower third of the blade for a chunky base
      if (i < Math.ceil(h * 0.35) && !dark) {
        px(ctx, x + 1, y, darken(col, 0.14));
      }
    }
  }

  // ── Stage 2: young sprout — 3 short blades ────────────────────────
  if (stage === 2) {
    blade(24 + swayOff, baseY, 10, -3);
    blade(27 + swayOff, baseY, 12,  0);
    blade(31 + swayOff, baseY, 10,  3, true);
    // Ground cluster
    rect(ctx, 22, baseY, 14, 2, darken(stem, 0.28));

  // ── Stage 3: adult sprout — 5 blades, medium height ───────────────
  } else if (stage === 3) {
    blade(20 + swayOff, baseY, 16, -6, true);
    blade(24 + swayOff, baseY, 19, -2);
    blade(27 + swayOff, baseY, 20,  0);
    blade(31 + swayOff, baseY, 19,  2, true);
    blade(35 + swayOff, baseY, 16,  6);
    rect(ctx, 18, baseY, 20, 2, darken(stem, 0.28));

  // ── Stage 4: adult — 7 blades, tall ──────────────────────────────
  } else if (stage === 4) {
    blade(16 + swayOff, baseY, 22, -8, true);
    blade(20 + swayOff, baseY, 26, -4);
    blade(23 + swayOff, baseY, 28, -1);
    blade(27 + swayOff, baseY, 29,  0);
    blade(31 + swayOff, baseY, 28,  1, true);
    blade(34 + swayOff, baseY, 26,  4);
    blade(38 + swayOff, baseY, 22,  8, false);
    rect(ctx, 14, baseY, 28, 2, darken(stem, 0.28));

  // ── Stage 5: seed-bearing — same blades + seed-head tips ─────────
  } else if (stage === 5) {
    blade(16 + swayOff, baseY, 22, -8, true,  fruit);
    blade(20 + swayOff, baseY, 26, -4, false, fruit);
    blade(23 + swayOff, baseY, 28, -1, false, fruit);
    blade(27 + swayOff, baseY, 29,  0, false, fruit);
    blade(31 + swayOff, baseY, 28,  1, true,  fruit);
    blade(34 + swayOff, baseY, 26,  4, false, fruit);
    blade(38 + swayOff, baseY, 22,  8, false, fruit);
    rect(ctx, 14, baseY, 28, 2, darken(stem, 0.28));
  }
}
