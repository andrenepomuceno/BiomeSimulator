/**
 * Procedural pixel-art sprite generator for fauna.
 *
 * Draws each species at 64×64 design resolution, upscaled 4× to 256×256.
 * Species parameters live in individual files under sprites/animals/species/.
 * Drawing templates live under sprites/animals/templates/.
 *
 * Public API (unchanged):
 *   drawSpeciesFrame(ctx, species, direction, frame)
 *   DIR_NAMES
 */
import { DESIGN, SCALE, addOutline } from './sprites/helpers.js';
import { drawQuadruped } from './sprites/animals/templates/quadruped.js';
import { drawBird } from './sprites/animals/templates/bird.js';
import { drawCrow } from './sprites/animals/templates/crow.js';
import { drawInsect } from './sprites/animals/templates/insect.js';
import { drawBeetle } from './sprites/animals/templates/beetle.js';
import { drawMosquito } from './sprites/animals/templates/mosquito.js';
import { drawReptile } from './sprites/animals/templates/reptile.js';
import { drawCrocodile } from './sprites/animals/templates/crocodile.js';
import { drawLizard } from './sprites/animals/templates/lizard.js';
import { drawSnake } from './sprites/animals/templates/snake.js';
import { drawCanid } from './sprites/animals/templates/canid.js';
import { drawUngulate } from './sprites/animals/templates/ungulate.js';
import { drawUrsid } from './sprites/animals/templates/ursid.js';
import { drawSleeping, drawDead, drawEgg, drawPupa } from './sprites/animals/templates/specials.js';

import rabbit from './sprites/animals/species/rabbit.js';
import squirrel from './sprites/animals/species/squirrel.js';
import fox from './sprites/animals/species/fox.js';
import wolf from './sprites/animals/species/wolf.js';
import raccoon from './sprites/animals/species/raccoon.js';
import goat from './sprites/animals/species/goat.js';
import deer from './sprites/animals/species/deer.js';
import boar from './sprites/animals/species/boar.js';
import bear from './sprites/animals/species/bear.js';
import crow from './sprites/animals/species/crow.js';
import hawk from './sprites/animals/species/hawk.js';
import beetle from './sprites/animals/species/beetle.js';
import mosquito from './sprites/animals/species/mosquito.js';
import caterpillar from './sprites/animals/species/caterpillar.js';
import cricket from './sprites/animals/species/cricket.js';
import lizard from './sprites/animals/species/lizard.js';
import crocodile from './sprites/animals/species/crocodile.js';
import snake from './sprites/animals/species/snake.js';

const SPECIES_PARAMS = {
  RABBIT: rabbit,
  SQUIRREL: squirrel,
  FOX: fox,
  WOLF: wolf,
  RACCOON: raccoon,
  GOAT: goat,
  DEER: deer,
  BOAR: boar,
  BEAR: bear,
  CROW: crow,
  HAWK: hawk,
  BEETLE: beetle,
  MOSQUITO: mosquito,
  CATERPILLAR: caterpillar,
  CRICKET: cricket,
  LIZARD: lizard,
  CROCODILE: crocodile,
  SNAKE: snake,
};

const TEMPLATE_DRAW = {
  quadruped: drawQuadruped,
  bird: drawBird,
  crow: drawCrow,
  insect: drawInsect,
  beetle: drawBeetle,
  mosquito: drawMosquito,
  reptile: drawReptile,
  crocodile: drawCrocodile,
  lizard: drawLizard,
  snake: drawSnake,
  canid: drawCanid,
  ungulate: drawUngulate,
  ursid: drawUrsid,
};

function normalizeSleepTemplate(template) {
  switch (template) {
    case 'canid':
    case 'ungulate':
    case 'ursid':
      return 'quadruped';
    case 'crow':
      return 'bird';
    case 'beetle':
    case 'mosquito':
      return 'insect';
    case 'crocodile':
    case 'lizard':
    case 'snake':
      return 'reptile';
    default:
      return template;
  }
}

export function getSleepingTextureKeyForSpecies(species) {
  return `${species}_SLEEPING`;
}

function getSleepingParamsForSpecies(species) {
  const params = SPECIES_PARAMS[species];
  if (!params) return null;
  return {
    sleepTemplate: normalizeSleepTemplate(params.template),
    body: params.body,
    accent: params.accent,
  };
}

/**
 * Draw a single sprite frame onto the given context at (0,0).
 * @param {CanvasRenderingContext2D} ctx - cleared 64×64 context
 * @param {string} species - species key or special state key
 * @param {number} direction - 0=DOWN, 1=LEFT, 2=RIGHT, 3=UP
 * @param {number} frame - walk frame 0, 1, or 2
 */
export function drawSpeciesFrame(ctx, species, direction, frame) {
  ctx.clearRect(0, 0, DESIGN * SCALE, DESIGN * SCALE);
  ctx.imageSmoothingEnabled = false;

  if (species.endsWith('_SLEEPING')) {
    const baseSpecies = species.slice(0, -9);
    const sleepingParams = getSleepingParamsForSpecies(baseSpecies);
    if (!sleepingParams) return;
    drawSleeping(ctx, sleepingParams);
    addOutline(ctx);
    return;
  }

  switch (species) {
    case 'SLEEPING': drawSleeping(ctx, { sleepTemplate: 'quadruped' }); break;
    case 'DEAD':     drawDead(ctx); break;
    case 'EGG':      drawEgg(ctx); break;
    case 'PUPA':     drawPupa(ctx); break;
    default: {
      const params = SPECIES_PARAMS[species];
      if (!params) return;
      const draw = TEMPLATE_DRAW[params.template];
      if (draw) draw(ctx, params, direction, frame);
    }
  }

  addOutline(ctx);
}

/** Direction names for building texture keys. */
export const DIR_NAMES = ['DOWN', 'LEFT', 'RIGHT', 'UP'];
