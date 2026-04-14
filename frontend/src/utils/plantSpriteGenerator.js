/**
 * Procedural pixel-art sprite generator for flora.
 *
 * Draws each plant species × stage × frame at 32×32 design resolution,
 * upscaled 4× to 128×128.  Species parameters live in plants/species/,
 * drawing templates in plants/templates/.
 *
 * Public API:
 *   drawPlantFrame(ctx, typeId, stage, frame)
 *   PLANT_SPECIES_PARAMS
 */
import { DESIGN, SCALE, addOutline } from './sprites/helpers.js';

import { drawSeed } from './sprites/plants/templates/seed.js';
import { drawDead } from './sprites/plants/templates/dead.js';
import { drawHerb } from './sprites/plants/templates/herb.js';
import { drawBush } from './sprites/plants/templates/bush.js';
import { drawTree } from './sprites/plants/templates/tree.js';
import { drawPalm } from './sprites/plants/templates/palm.js';
import { drawFlower } from './sprites/plants/templates/flower.js';
import { drawMushroom } from './sprites/plants/templates/mushroom.js';
import { drawCactus } from './sprites/plants/templates/cactus.js';

import grass from './sprites/plants/species/grass.js';
import strawberry from './sprites/plants/species/strawberry.js';
import blueberry from './sprites/plants/species/blueberry.js';
import apple_tree from './sprites/plants/species/apple_tree.js';
import mango_tree from './sprites/plants/species/mango_tree.js';
import carrot from './sprites/plants/species/carrot.js';
import sunflower from './sprites/plants/species/sunflower.js';
import tomato from './sprites/plants/species/tomato.js';
import mushroom from './sprites/plants/species/mushroom.js';
import oak_tree from './sprites/plants/species/oak_tree.js';
import cactus from './sprites/plants/species/cactus.js';
import coconut_palm from './sprites/plants/species/coconut_palm.js';
import potato from './sprites/plants/species/potato.js';
import chili_pepper from './sprites/plants/species/chili_pepper.js';
import olive_tree from './sprites/plants/species/olive_tree.js';

/** Keyed by typeId (1-15). */
export const PLANT_SPECIES_PARAMS = {
  1: grass,
  2: strawberry,
  3: blueberry,
  4: apple_tree,
  5: mango_tree,
  6: carrot,
  7: sunflower,
  8: tomato,
  9: mushroom,
  10: oak_tree,
  11: cactus,
  12: coconut_palm,
  13: potato,
  14: chili_pepper,
  15: olive_tree,
};

const TEMPLATE_DRAW = {
  herb: drawHerb,
  bush: drawBush,
  tree: drawTree,
  palm: drawPalm,
  flower: drawFlower,
  mushroom: drawMushroom,
  cactus: drawCactus,
};

/**
 * Draw a single plant sprite frame onto the given context at (0,0).
 * @param {CanvasRenderingContext2D} ctx - cleared 128×128 context
 * @param {number} typeId - plant type 1-15
 * @param {number} stage - 1=seed, 2=youngSprout, 3=adultSprout, 4=adult, 5=fruit, 6=dead
 * @param {number} frame - animation frame 0, 1, or 2
 */
export function drawPlantFrame(ctx, typeId, stage, frame) {
  ctx.clearRect(0, 0, DESIGN * SCALE, DESIGN * SCALE);
  ctx.imageSmoothingEnabled = false;

  const params = PLANT_SPECIES_PARAMS[typeId];
  if (!params) return;

  if (stage === 1) {
    drawSeed(ctx, params, frame);
  } else if (stage === 6) {
    drawDead(ctx, params, frame);
  } else {
    const draw = TEMPLATE_DRAW[params.template];
    if (draw) draw(ctx, params, stage, frame);
  }

  addOutline(ctx);
}
