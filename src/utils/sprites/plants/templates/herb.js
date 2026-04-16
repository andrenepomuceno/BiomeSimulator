/**
 * Herb template — low ground plants (grass, carrot, potato).
 * Stages 2-5 at 64×64 design grid, 3 animation frames for sway.
 */
import { px, rect, darken, lighten, noise, rimLight, ao, speckle } from '../../helpers.js';
import { drawHerbCanopy, drawGroundBase, drawFruit, drawCarrotRoot, drawPotatoTubers } from '../bodyParts.js';

export function drawHerb(ctx, params, stage, frame) {
  const { stem, leaf, leafDark, fruit, fruitAccent } = params;
  const variant = params.herbVariant || 'generic';
  const cx = 28;
  const baseY = 56;

  const swayOff = frame === 0 ? 0 : (frame === 1 ? 2 : -2);

  function leafTex(x, y, w, h) {
    speckle(ctx, x, y, w, h, [leafDark, darken(leaf, 0.10), lighten(leaf, 0.06)], 0.22);
  }

  if (stage === 2) {
    rect(ctx, cx + 2 + swayOff, baseY - 16, 4, 16, stem);
    rect(ctx, cx - 2 + swayOff, baseY - 16, 8, 6, leaf);
    rect(ctx, cx + 4 + swayOff, baseY - 14, 8, 6, leaf);
    leafTex(cx - 2 + swayOff, baseY - 16, 14, 6);
    drawGroundBase(ctx, cx - 2, baseY, 12, stem);
  } else if (stage === 3) {
    rect(ctx, cx + 2 + swayOff, baseY - 28, 4, 28, stem);
    drawHerbCanopy(ctx, cx - 6 + swayOff, baseY - 24, 20, 12, leaf, leafDark);
    rect(ctx, cx - 4 + swayOff, baseY - 30, 8, 3, lighten(leaf, 0.16));
    drawGroundBase(ctx, cx - 4, baseY, 16, stem);
  } else if (stage === 4) {
    rect(ctx, cx + 2 + swayOff, baseY - 36, 4, 36, stem);
    drawHerbCanopy(ctx, cx - 8 + swayOff, baseY - 34, 24, 14, leaf, leafDark);
    rect(ctx, cx - 5 + swayOff, baseY - 42, 18, 6, leaf);
    rect(ctx, cx + swayOff, baseY - 42, 8, 4, lighten(leaf, 0.2));
    leafTex(cx - 8 + swayOff, baseY - 42, 24, 18);
    if (variant === 'carrot') {
      drawCarrotRoot(ctx, cx + 4 + swayOff, baseY - 1, 8, fruit, fruitAccent);
    } else if (variant === 'potato') {
      drawPotatoTubers(ctx, cx + 4 + swayOff, baseY - 1, fruit, fruitAccent, 2);
    }
    drawGroundBase(ctx, cx - 6, baseY, 20, stem);
  } else if (stage === 5) {
    rect(ctx, cx + 2 + swayOff, baseY - 36, 4, 36, stem);
    drawHerbCanopy(ctx, cx - 8 + swayOff, baseY - 34, 24, 14, leaf, leafDark);
    rect(ctx, cx - 5 + swayOff, baseY - 42, 18, 6, leaf);
    leafTex(cx - 8 + swayOff, baseY - 42, 24, 18);
    if (variant === 'carrot') {
      drawCarrotRoot(ctx, cx + 4 + swayOff, baseY - 1, 11, fruit, fruitAccent);
      drawCarrotRoot(ctx, cx - 2 + swayOff, baseY + 1, 7, lighten(fruit, 0.08), fruitAccent);
    } else if (variant === 'potato') {
      drawPotatoTubers(ctx, cx + 4 + swayOff, baseY - 1, fruit, fruitAccent, 4);
    } else {
      drawFruit(ctx, cx - 6 + swayOff, baseY - 37, 7, fruit, fruitAccent);
      drawFruit(ctx, cx + 6 + swayOff, baseY - 35, 7, fruit, fruitAccent);
      drawFruit(ctx, cx + swayOff, baseY - 33, 6, fruitAccent || fruit, lighten(fruitAccent || fruit, 0.2));
    }
    drawGroundBase(ctx, cx - 6, baseY, 20, stem);
  }
}
