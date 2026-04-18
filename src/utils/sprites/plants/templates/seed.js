/**
 * Seed template — universal stage 1 for all plant species.
 * 64×64 design grid.
 */
import { rect } from '../../helpers.js';
import { drawSeedBody, drawSeedSprout, drawGroundBase } from '../bodyParts.js';

export function drawSeed(ctx, params, frame) {
  const { seedColor, sproutColor } = params;
  const seedHighlight = params.seedHighlight || null;
  const cx = 32;
  const cy = 42;
  const srx = 5, sry = 4;

  drawSeedBody(ctx, cx, cy, srx, sry, seedColor, seedHighlight);
  drawSeedSprout(ctx, cx, cy, sry, sproutColor, frame);

  // Ground shadow
  rect(ctx, cx - srx - 2, cy + sry + 3, (srx + 2) * 2, 2, 'rgba(0,0,0,0.08)');
}
