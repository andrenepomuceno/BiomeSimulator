/**
 * Reusable body part drawing functions for animal sprites.
 * Promotes code reuse across templates (quadruped, bird, insect, etc.)
 * 
 * Usage:
 *   import { drawEye, drawLeg, drawHead, drawBody } from './bodyParts.js';
 *   
 *   drawEye(ctx, x, y, eyeWhite, eyeIris);
 *   drawLeg(ctx, x, y, shadow, outline, pawColor);
 *   drawHead(ctx, x, y, width, height, bodyColor, highlight, shadow);
 */

import { px, rect, darken, lighten, rimLight, ao, anisotropicSpeckle } from '../helpers.js';

/**
 * Draw a single eye with sclera, iris, pupil, and highlight.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - top-left x
 * @param {number} y - top-left y
 * @param {string} eyeWhite - sclera color
 * @param {string} eyeIris - iris color
 * @param {number} size - eye size (default 4, resulting in 4x4 sclera box)
 */
export function drawEye(ctx, x, y, eyeWhite, eyeIris, size = 4) {
  // Sclera (white)
  rect(ctx, x, y, size, size, eyeWhite);
  // Iris (colored center)
  const irisSize = Math.ceil(size / 2);
  rect(ctx, x + Math.floor(size / 4), y + Math.floor(size / 4), irisSize, irisSize, eyeIris);
  // Pupil (dark center)
  px(ctx, x + Math.floor(size / 4), y + Math.floor(size / 4), darken(eyeIris, 0.3));
  // Highlight (top-left rim light)
  px(ctx, x, y, eyeWhite);
}

/**
 * Draw a pair of eyes (symmetrical on a head).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} headX - head left edge
 * @param {number} headY - head top edge
 * @param {number} headWidth - head width (to center right eye)
 * @param {number} eyeOffsetLeft - x offset from head left
 * @param {number} eyeOffsetTop - y offset from head top
 * @param {string} eyeWhite
 * @param {string} eyeIris
 * @param {number} size - eye size
 */
export function drawEyePair(ctx, headX, headY, headWidth, eyeOffsetLeft, eyeOffsetTop, eyeWhite, eyeIris, size = 4) {
  drawEye(ctx, headX + eyeOffsetLeft, headY + eyeOffsetTop, eyeWhite, eyeIris, size);
  drawEye(ctx, headX + headWidth - eyeOffsetLeft - size, headY + eyeOffsetTop, eyeWhite, eyeIris, size);
}

/**
 * Draw an insect leg (femur, tibia, tarsus joints).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - hip attachment point x
 * @param {number} y - hip attachment point y
 * @param {boolean} rightSide - true for right leg, false for left
 * @param {string} femurColor - upper leg color (thickest)
 * @param {string} tibiaColor - middle leg color
 * @param {string} tarsusColor - foot tip color
 * @param {number} extension - how far leg extends out
 */
export function drawInsectLeg(ctx, x, y, rightSide, femurColor, tibiaColor, tarsusColor, extension = 6) {
  const dir = rightSide ? 1 : -1;
  
  // Femur (coxa — thick upper segment)
  rect(ctx, x + dir * 0, y, 4, 2, femurColor);
  // Tibia (angled middle segment)
  rect(ctx, x + dir * extension, y + 1, 3, 2, tibiaColor);
  // Tarsus (tip)
  px(ctx, x + dir * (extension + 3), y + 2, tarsusColor);
}

/**
 * Draw a quadruped/mammal leg (simple thick joint).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - leg x position
 * @param {number} y - leg y position
 * @param {number} legLength - height of leg
 * @param {string} legColor - primary leg color
 * @param {string} shadowColor - shadow color (bottom)
 * @param {string} pawColor - paw/hoof color
 */
export function drawQuadrupedLeg(ctx, x, y, legLength, legColor, shadowColor, pawColor) {
  // Upper leg
  rect(ctx, x, y, 4, Math.floor(legLength * 0.6), legColor);
  // Lower leg (darker)
  rect(ctx, x, y + Math.floor(legLength * 0.6), 4, Math.floor(legLength * 0.3), shadowColor);
  // Paw/hoof
  rect(ctx, x, y + legLength - 2, 4, 2, pawColor);
}

/**
 * Draw a head shape with highlight.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - head left edge
 * @param {number} y - head top edge
 * @param {number} width - head width
 * @param {number} height - head height
 * @param {string} bodyColor - primary head color
 * @param {string} highlightColor - top highlight
 * @param {string} shadowColor - side shadow
 */
export function drawHead(ctx, x, y, width, height, bodyColor, highlightColor, shadowColor) {
  // Head shape
  rect(ctx, x + 2, y, width - 4, 3, bodyColor);
  rect(ctx, x, y + 3, width, height - 3, bodyColor);
  rect(ctx, x + 1, y + 1, width - 2, 2, bodyColor);
  
  // Top highlight
  rect(ctx, x + 3, y + 1, width - 6, 2, highlightColor);
  
  // Left/right shadow
  for (let r = 3; r < height; r++) {
    px(ctx, x, y + r, shadowColor);
    px(ctx, x + 1, y + r, shadowColor);
  }
  px(ctx, x + width - 1, y + 3, shadowColor);
}

/**
 * Draw an ear on a head.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - ear x position (left or right side)
 * @param {number} y - ear top y (typically head top)
 * @param {number} earHeight - how tall the ear is
 * @param {string} earColor - primary ear color
 * @param {string} innerColor - optional ear inner color
 * @param {boolean} pointed - true for pointed ears, false for rounded
 */
export function drawEar(ctx, x, y, earHeight, earColor, innerColor, pointed = false) {
  for (let e = 0; e < earHeight; e++) {
    const ew = pointed
      ? Math.max(1, 3 - Math.floor(e * 2 / Math.max(1, earHeight - 1)))
      : (e < earHeight - 2 ? 3 : 2);
    rect(ctx, x, y - 1 - e, ew, 1, earColor);
  }
  
  // Ear inner texture
  if (innerColor && !pointed && earHeight >= 6) {
    for (let e = 1; e < earHeight - 2; e++) {
      px(ctx, x + 1, y - 1 - e, innerColor);
    }
  }
}

/**
 * Draw ears on both sides of a head.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} headX - head left edge
 * @param {number} headY - head top edge
 * @param {number} headWidth - head width
 * @param {number} earHeight - ear height
 * @param {string} earColor
 * @param {string} innerColor - optional inner ear color
 * @param {boolean} pointed
 */
export function drawEarPair(ctx, headX, headY, headWidth, earHeight, earColor, innerColor, pointed = false) {
  drawEar(ctx, headX, headY, earHeight, earColor, innerColor, pointed);
  drawEar(ctx, headX + headWidth, headY, earHeight, earColor, innerColor, pointed);
}

/**
 * Draw a nose on a head.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - nose center x
 * @param {number} y - nose y
 * @param {string} noseColor - nose color
 * @param {boolean} highlight - add highlight (true for wet nose)
 */
export function drawNose(ctx, x, y, noseColor, highlight = true) {
  rect(ctx, x - 2, y, 4, 3, noseColor);
  if (highlight) {
    px(ctx, x - 1, y, lighten(noseColor, 0.2));
  }
}

/**
 * Draw horns on a head.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} headX
 * @param {number} headY
 * @param {number} headWidth
 * @param {number} hornHeight - how tall horns extend
 * @param {string} hornColor - horn color
 * @param {string} tipColor - horn tip color (lighter)
 */
export function drawHorns(ctx, headX, headY, headWidth, hornHeight, hornColor, tipColor) {
  const hc = hornColor;
  const hl = tipColor;
  
  // Left horn
  rect(ctx, headX - 3, headY - 2, 3, 3, hc);
  rect(ctx, headX - 3, headY - 2 - hornHeight, 3, hornHeight, hl);
  px(ctx, headX - 2, headY - 3 - hornHeight, hl);
  
  // Right horn
  rect(ctx, headX + headWidth, headY - 2, 3, 3, hc);
  rect(ctx, headX + headWidth, headY - 2 - hornHeight, 3, hornHeight, hl);
  px(ctx, headX + headWidth + 1, headY - 3 - hornHeight, hl);
}

/**
 * Draw antlers on a head (branching structure).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} headX
 * @param {number} headY
 * @param {number} headWidth
 * @param {string} baseColor - antler base
 * @param {string} midColor - antler mid-tones
 * @param {string} tipColor - antler tips
 */
export function drawAntlers(ctx, headX, headY, headWidth, baseColor, midColor, tipColor) {
  const ac = baseColor;
  const al = midColor;
  const at = tipColor;
  
  // Left antler
  rect(ctx, headX - 3, headY - 3, 3, 3, ac);
  rect(ctx, headX - 3, headY - 7, 3, 4, ac);
  rect(ctx, headX - 6, headY - 7, 3, 3, al);
  rect(ctx, headX - 6, headY - 11, 3, 4, at);
  px(ctx, headX - 3, headY - 10, al);
  
  // Right antler
  rect(ctx, headX + headWidth, headY - 3, 3, 3, ac);
  rect(ctx, headX + headWidth, headY - 7, 3, 4, ac);
  rect(ctx, headX + headWidth + 3, headY - 7, 3, 3, al);
  rect(ctx, headX + headWidth + 3, headY - 11, 3, 4, at);
  px(ctx, headX + headWidth + 2, headY - 10, al);
}

/**
 * Draw tusks (boar/warthog).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - tusk start x
 * @param {number} y - tusk start y
 * @param {string} tuskColor - color
 */
export function drawTusks(ctx, x, y, tuskColor = '#f0f0e0') {
  rect(ctx, x + 1, y, 3, 3, tuskColor);
  rect(ctx, x + 4, y, 3, 3, tuskColor);
  px(ctx, x + 2, y, '#fffff0');
  px(ctx, x + 5, y, '#fffff0');
}

/**
 * Draw a mask (raccoon).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {string} maskColor - typically dark
 */
export function drawMask(ctx, x, y, maskColor = '#111111') {
  rect(ctx, x, y, 4, 3, maskColor);
  rect(ctx, x + 3, y, 4, 3, maskColor);
  px(ctx, x + 1, y, '#222222');
  px(ctx, x + 4, y, '#222222');
}

/**
 * Draw a muzzle (bear).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - muzzle center x
 * @param {number} y - muzzle y
 * @param {string} muzzleColor - muzzle color
 */
export function drawMuzzle(ctx, x, y, muzzleColor) {
  rect(ctx, x - 3, y, 6, 3, muzzleColor);
  px(ctx, x - 2, y, lighten(muzzleColor, 0.1));
}

/**
 * Draw a cheek (fox, deer).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - cheek x
 * @param {number} y - cheek y
 * @param {string} cheekColor - color
 */
export function drawCheek(ctx, x, y, cheekColor) {
  rect(ctx, x, y, 3, 3, cheekColor);
}

/**
 * Draw cheeks on both sides.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} headX
 * @param {number} headY
 * @param {number} headWidth
 * @param {number} cheekOffsetY
 * @param {string} cheekColor
 */
export function drawCheekPair(ctx, headX, headY, headWidth, cheekOffsetY, cheekColor) {
  drawCheek(ctx, headX, headY + cheekOffsetY, cheekColor);
  drawCheek(ctx, headX + headWidth - 3, headY + cheekOffsetY, cheekColor);
}

/**
 * Draw fur texture on a rectangular region.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {string} baseColor - base fur color
 * @param {number} angle - texture angle (0=horizontal, PI/2=vertical)
 * @param {number} intensity - 0-1, texture strength
 */
export function drawFurTexture(ctx, x, y, w, h, baseColor, angle = 0, intensity = 0.26) {
  const darkVariant = darken(baseColor, 0.10);
  const lightVariant = lighten(baseColor, 0.06);
  anisotropicSpeckle(ctx, x, y, w, h, [darkVariant, baseColor, lightVariant], intensity, angle, 3.5);
}

/**
 * Draw a simple body with gradient shading.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {string} bodyColor
 * @param {string} highlightColor
 * @param {string} shadowColor
 */
export function drawSimpleBody(ctx, x, y, w, h, bodyColor, highlightColor, shadowColor) {
  // Top highlight
  rect(ctx, x + 4, y, w - 8, 3, highlightColor);
  // Main body gradient
  rect(ctx, x + 2, y + 2, w - 4, 2, highlightColor);
  rect(ctx, x, y + 4, w, h - 8, bodyColor);
  // Bottom shadow
  rect(ctx, x + 2, y + h - 4, w - 4, 2, shadowColor);
  rect(ctx, x + 4, y + h - 2, w - 8, 2, darken(shadowColor, 0.1));
  
  // Rim light and AO
  rimLight(ctx, x + 4, y, w - 8, 3, highlightColor, 'top');
  ao(ctx, x + 2, y + h - 3, w - 4, 3, 0.08);
}
