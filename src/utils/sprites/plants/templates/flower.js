/**
 * Flower template — sunflower (tall stem + flower head).
 * Stages 2-5 at 64×64 design grid, 3 animation frames for sway.
 */
import { px, rect, ellipse, darken, lighten } from '../../helpers.js';
import { drawFlowerStem, drawPetalRing, drawFlowerCenter, drawGroundBase } from '../bodyParts.js';

export function drawFlower(ctx, params, stage, frame) {
  const { stem, leaf, leafDark, petal, petalDark, center, fruit } = params;
  const cx = 28;
  const baseY = 56;

  const swayOff = frame === 0 ? 0 : (frame === 1 ? 2 : -2);

  if (stage === 2) {
    // Stem + leaves
    drawFlowerStem(ctx, cx, baseY, 16, stem, swayOff);
    rect(ctx, cx - 2 + swayOff, baseY - 12, 6, 4, leaf);
    rect(ctx, cx + 4 + swayOff, baseY - 14, 6, 4, leaf);

    // Tight bud — 4 sepals (green) with petal tips showing through
    const budCx = cx + 4 + swayOff;
    const budCy = baseY - 21;
    rect(ctx, budCx - 2, budCy - 6, 4, 4, leaf);
    rect(ctx, budCx - 2, budCy + 2, 4, 4, leaf);
    rect(ctx, budCx - 6, budCy - 2, 4, 4, leaf);
    rect(ctx, budCx + 2, budCy - 2, 4, 4, leaf);
    px(ctx, budCx - 1, budCy - 5, lighten(leaf, 0.15));
    px(ctx, budCx - 1, budCy + 3, lighten(leaf, 0.12));
    px(ctx, budCx - 5, budCy - 1, lighten(leaf, 0.12));
    px(ctx, budCx + 3, budCy - 1, lighten(leaf, 0.12));
    // Petal color peeking through
    rect(ctx, budCx - 1, budCy - 2, 2, 4, petal);
    px(ctx, budCx, budCy - 1, lighten(petal, 0.12));

    drawGroundBase(ctx, cx - 2, baseY, 12, stem);

  } else if (stage === 3) {
    // Stem + leaves
    drawFlowerStem(ctx, cx, baseY, 28, stem, swayOff);
    rect(ctx, cx - 4 + swayOff, baseY - 20, 8, 4, leaf);
    rect(ctx, cx + 4 + swayOff, baseY - 16, 8, 4, leaf);
    rect(ctx, cx - 2 + swayOff, baseY - 24, 6, 4, leafDark);

    // Opening bud — 6 petals unfurling; tips lighter
    const centerX3 = cx + 4 + swayOff;
    const centerY3 = baseY - 33;
    drawPetalRing(ctx, centerX3, centerY3, petal, lighten(petal, 0.12), 6, 4, 8, 1.8, 0.8);

    // Center disc barely showing — no seed texture yet
    drawFlowerCenter(ctx, centerX3, centerY3, 5, 4, center);

    drawGroundBase(ctx, cx - 4, baseY, 16, stem);

  } else if (stage === 4) {
    // Stem + leaves
    drawFlowerStem(ctx, cx, baseY, 32, stem, swayOff);
    rect(ctx, cx - 4 + swayOff, baseY - 24, 8, 4, leaf);
    rect(ctx, cx + 4 + swayOff, baseY - 20, 8, 4, leaf);

    // Full bloom — 8 petals radiating from center
    const centerX = cx + 4 + swayOff;
    const centerY = baseY - 36;
    drawPetalRing(ctx, centerX, centerY, petal, petalDark, 8, 8, 10, 2.5, 0.5);

    // Center disc with seed texture
    drawFlowerCenter(ctx, centerX, centerY, 7, 6, center, null, true, false);

    drawGroundBase(ctx, cx - 4, baseY, 16, stem);

  } else if (stage === 5) {
    // Stem + leaves
    drawFlowerStem(ctx, cx, baseY, 32, stem, swayOff);
    rect(ctx, cx - 4 + swayOff, baseY - 24, 8, 4, leaf);
    rect(ctx, cx + 4 + swayOff, baseY - 20, 8, 4, leaf);

    // Drooping flower — 8 petals hanging downward
    const centerX5 = cx + 4 + swayOff;
    const centerY5 = baseY - 34;
    const petalDead = petalDark || darken(petal, 0.15);
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const dropLen = 10 + (i % 2) * 2;
      const numCircles = 5;
      for (let j = 0; j < numCircles; j++) {
        const t = j / (numCircles - 1);
        const cr = Math.max(1, Math.round(2.0 * (1 - t * 0.8)));
        const ex = centerX5 + Math.round(cosA * 4);
        const ey = centerY5 + Math.round(sinA * 4) + Math.round(t * dropLen);
        ellipse(ctx, ex, ey, cr, cr, j >= numCircles - 2 ? darken(petalDead, 0.12) : petalDead);
      }
    }

    // Mature seed head — large domed disc with ripe seed patches
    drawFlowerCenter(ctx, centerX5, centerY5, 8, 7, center, fruit || lighten(center, 0.20), true, true);

    drawGroundBase(ctx, cx - 4, baseY, 16, stem);
  }
}
