import { ITEM_PARAMS } from './sprites/items/catalog.js';
import { drawFruit } from './sprites/items/templates/fruit.js';
import { drawSeed } from './sprites/items/templates/seed.js';
import { drawMeat } from './sprites/items/templates/meat.js';

const TEMPLATE_DRAW = {
  fruit: drawFruit,
  seed: drawSeed,
  meat: drawMeat,
};

export function drawItemFrame(ctx, itemKey, frame = 0) {
  const params = ITEM_PARAMS[itemKey];
  if (!params) {
    throw new Error(`[itemSpriteGenerator] Unknown item key: ${itemKey}`);
  }

  const draw = TEMPLATE_DRAW[params.template];
  if (!draw) {
    throw new Error(`[itemSpriteGenerator] Unknown item template: ${params.template}`);
  }

  // Keep the same contract as fauna/flora generators: clear cell each draw.
  ctx.clearRect(0, 0, 256, 256);
  draw(ctx, params, frame);
}
