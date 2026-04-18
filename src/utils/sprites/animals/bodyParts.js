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

import { px, rect, darken, lighten, rimLight, ao, anisotropicSpeckle, ellipse, speckle, fillPolygon, blend, thickLine } from '../helpers.js';

const _id = (x) => x;

function _drawIrisPupilHighlight(ctx, f, x, y, w, h, irisColor, pupil, highlight) {
  rect(ctx, f(x), y, w, h, irisColor);
  if (pupil) {
    px(ctx, f(x + pupil.dx), y + pupil.dy, pupil.color);
  }
  if (highlight) {
    px(ctx, f(x + highlight.dx), y + highlight.dy, highlight.color);
  }
}

/**
 * Maps a normalized feather position t ∈ [0,1] to a feather zone color.
 * t=0 is the innermost covert; t=1 is the outermost primary tip.
 * Coverts: t < 0.28 → lighten; Secondary: 0.28–0.65 → accent; Primary: > 0.65 → darken.
 */
function _featherZoneColor(t, accent) {
  if (t < 0.28) return lighten(accent, 0.10);
  if (t < 0.65) return accent;
  return darken(accent, 0.11);
}

function _drawJointedLegCore(ctx, f, hipX, hipY, kneeX, kneeY, footX, footY, upperColor, lowerColor, options = {}) {
  const {
    upperThickness = 1,
    lowerThickness = 0,
    claw = null,
    toes = null,
  } = options;

  thickLine(ctx, f(hipX), hipY, f(kneeX), kneeY, upperThickness, upperColor);
  thickLine(ctx, f(kneeX), kneeY, f(footX), footY, lowerThickness, lowerColor);

  if (claw) {
    px(ctx, f(claw.x), claw.y, claw.color);
  }

  if (toes) {
    for (const toe of toes) {
      thickLine(
        ctx,
        f(toe.x0),
        toe.y0,
        f(toe.x1),
        toe.y1,
        toe.thickness ?? 0,
        toe.color || lowerColor,
      );
    }
  }
}

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
  // Sclera
  rect(ctx, x, y, size, size, eyeWhite);
  const irisOff = Math.floor(size / 4);
  const irisSize = Math.ceil(size / 2);
  const irisX = x + irisOff;
  const irisY = y + irisOff;
  _drawIrisPupilHighlight(
    ctx,
    _id,
    irisX,
    irisY,
    irisSize,
    irisSize,
    eyeIris,
    { dx: irisSize - 1, dy: irisSize - 1, color: darken(eyeIris, 0.40) },
    { dx: 0, dy: 0, color: lighten(eyeWhite, 0.06) },
  );
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
 * Draw a side-view eye with sclera, iris, pupil, and specular highlight.
 * Simple mode (outlineColor=null): 3×3 sclera, 1-pixel iris.
 * Detailed mode: 5×5 outline ring, 4×4 sclera, 2×2 iris with depth shading.
 * @param {Function} f - x-flip function
 * @param {number} x - eye top-left x (before flip)
 * @param {string|null} outlineColor - ring color; enables detailed 5px mode when set
 */
export function drawEyeSide(ctx, f, x, y, eyeWhite, eyeIris, outlineColor = null) {
  if (outlineColor) {
    rect(ctx, f(x), y, 5, 5, outlineColor);
    rect(ctx, f(x + 1), y + 1, 4, 4, eyeWhite);
    _drawIrisPupilHighlight(
      ctx,
      f,
      x + 2,
      y + 2,
      2,
      2,
      eyeIris,
      { dx: 0, dy: 1, color: darken(eyeIris, 0.35) },
      { dx: -1, dy: -1, color: '#ffffff' },
    );
    px(ctx, f(x + 3), y + 2, darken(eyeIris, 0.3));
  } else {
    rect(ctx, f(x), y, 3, 3, eyeWhite);
    _drawIrisPupilHighlight(
      ctx,
      f,
      x + 1,
      y + 1,
      1,
      1,
      eyeIris,
      null,
      { dx: -1, dy: -1, color: '#ffffff' },
    );
  }
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
 * Draw side-view insect leg used by non-overhead templates.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Function} f - x-flip function
 * @param {number} x - hip x (before flip)
 * @param {number} y - body baseline y
 * @param {number} off - gait offset
 * @param {string} femurColor
 * @param {string} tibiaColor
 * @param {boolean} jumpLeg
 */
export function drawInsectLegSide(ctx, f, x, y, off, femurColor, tibiaColor, jumpLeg = false) {
  rect(ctx, f(x), y + off, 2, 2, femurColor);
  rect(ctx, f(x - 1), y + 2 + off, 2, 2, tibiaColor);
  px(ctx, f(x - 2), y + 4 + off, tibiaColor);
  if (jumpLeg) {
    rect(ctx, f(x), y + 2 + off, 3, 2, femurColor);
    rect(ctx, f(x - 2), y + 4 + off, 3, 2, tibiaColor);
  }
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
export function drawQuadrupedLeg(ctx, x, y, upperColor, jointColor, pawColor = null, heavyPaw = false) {
  rect(ctx, x, y, 4, 4, upperColor);
  rect(ctx, x, y + 4, 4, 3, jointColor);
  if (pawColor !== null) {
    rect(ctx, x + 1, y + 6, 2, 2, pawColor);
    if (heavyPaw) rect(ctx, x, y + 7, 4, 1, pawColor);
  }
}

/**
 * Draw a quadruped leg (side view, 3px wide).
 * Upper half is fixed; lower half shifts to animate ankle flexion.
 * @param {Function} f - x-flip function
 * @param {number} x - leg top-left x (before flip)
 * @param {number} lowerShift - y offset on joint+paw for animation
 */
export function drawQuadrupedLegSide(ctx, f, x, y, upperColor, jointColor, pawColor, lowerShift = 0) {
  rect(ctx, f(x), y, 3, 4, upperColor);
  rect(ctx, f(x), y + 4 + lowerShift, 3, 3, jointColor);
  px(ctx, f(x + 1), y + 6 + lowerShift, pawColor);
}

/**
 * Draw a slender ungulate leg ending in a small hoof.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} legLength
 * @param {string} legColor
 * @param {string} shadowColor
 * @param {string} hoofColor
 */
export function drawHoofLeg(ctx, x, y, legLength, legColor, shadowColor, hoofColor) {
  const upper = Math.max(2, Math.floor(legLength * 0.45));
  const lower = Math.max(2, legLength - upper - 1);
  _drawJointedLegCore(
    ctx, _id,
    x + 1, y,
    x + 1, y + upper,
    x + 1, y + upper + lower,
    legColor, shadowColor,
    { upperThickness: 1, lowerThickness: 1, claw: { x: x, y: y + upper + lower, color: hoofColor } },
  );
  rect(ctx, x, y + upper + lower, 4, 1, hoofColor);
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
 * Draw a canid top-view head: ellipse skull + highlight ridge + optional nose + optional ears.
 * Caller is responsible for eyes (drawEyePair) and cheeks (drawCheekPair) after this call.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx - horizontal center
 * @param {number} hy - head top y
 * @param {number} headW - head width (default 12)
 * @param {string} body - body color
 * @param {string} highlight - highlight color
 */
export function drawCanidHeadTop(ctx, cx, hy, headW, body, highlight) {
  ellipse(ctx, cx, hy + 4, Math.floor(headW / 2), 4, body);
  rect(ctx, cx - Math.floor(headW / 2) + 2, hy + 1, headW - 4, 2, highlight);
}

/**
 * Draw a canid side-view head: ellipse cranium + snout rect + optional nose.
 * Caller places eye (drawEyeSide) and ear rects separately.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Function} f - horizontal flip function
 * @param {number} headX - logical left x of head block
 * @param {number} headY - top y of head
 * @param {string} body - body color
 * @param {string|null} noseColor - nose color, or null to skip
 */
export function drawCanidHeadSide(ctx, f, headX, headY, body, noseColor) {
  ellipse(ctx, f(headX + 4), headY + 6, 5, 5, body);
  rect(ctx, f(headX + 7), headY + 7, 3, 2, darken(body, 0.05));
  if (noseColor) rect(ctx, f(headX + 9), headY + 7, 2, 2, noseColor);
}

/**
 * Draw a lizard top-view triangular head (fillPolygon wedge) with highlight and optional eyes.
 * Derives colors internally from body.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx - horizontal center
 * @param {number} headBase - y coordinate of the base (neck end)
 * @param {number} headTip - y coordinate of the pointed snout
 * @param {string} body
 * @param {string} highlight
 * @param {string} eye - iris color
 * @param {boolean} showEyes
 */
export function drawLizardHeadTop(ctx, cx, headBase, headTip, body, highlight, eye, showEyes) {
  fillPolygon(ctx, [
    [cx - 4, headBase],
    [cx + 4, headBase],
    [cx + 1, headTip],
    [cx - 1, headTip],
  ], blend(body, darken(body, 0.16), 0.5));
  rect(ctx, cx - 3, headBase, 7, 1, highlight);
  if (showEyes) {
    drawReptileEye(ctx, cx - 5, headBase + 1, eye);
    drawReptileEye(ctx, cx + 3, headBase + 1, eye);
  }
}

/**
 * Draw a lizard side-view triangular head (fillPolygon wedge) with highlight and eye.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Function} f - horizontal flip function
 * @param {number} hBaseX - logical left edge of head base
 * @param {number} by - body top y
 * @param {number} bH - body height
 * @param {string} body
 * @param {string} highlight
 * @param {string} eye
 */
export function drawLizardHeadSide(ctx, f, hBaseX, by, bH, body, highlight, eye) {
  fillPolygon(ctx, [
    [f(hBaseX),      by + 1],
    [f(hBaseX + 10), by + 4],
    [f(hBaseX),      by + bH - 1],
  ], blend(body, darken(body, 0.15), 0.5));
  rect(ctx, f(hBaseX), by + 1, 3, 1, highlight);
  drawReptileEye(ctx, f(hBaseX + 2), by + 1, eye);
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

/**
 * Draw a side-view ear using a shared profile for mammals.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Function} f - x-flip function
 * @param {number} x - base x (before flip)
 * @param {number} y - base y
 * @param {number} earH - ear height
 * @param {string} earColor
 * @param {string|null} innerColor
 * @param {boolean} pointed
 */
export function drawEarSide(ctx, f, x, y, earH, earColor, innerColor = null, pointed = false) {
  for (let e = 0; e < earH; e++) {
    const ew = pointed
      ? Math.max(1, 3 - Math.floor(e * 2 / Math.max(1, earH - 1)))
      : 3;
    for (let i = 0; i < ew; i++) px(ctx, f(x + i), y - e, earColor);
  }
  if (!pointed && innerColor && earH >= 6) {
    for (let e = 1; e < earH - 2; e++) {
      px(ctx, f(x + 1), y - e, innerColor);
      px(ctx, f(x + 2), y - e, innerColor);
    }
  }
}

/**
 * Catalog of tail styles for quadruped variants.
 * Each entry defines three orientation renderers: top, back, side.
 * To add a new style, add one entry here — wrappers pick it up automatically.
 *
 * @type {Record<string, {
 *   top: (ctx, cx, y, bodyColor, accent, shadow) => void,
 *   back: (ctx, cx, y, bodyColor, accent, shadow) => void,
 *   side: (ctx, f, x, y, bodyColor, accent, shadow, shadow2) => void
 * }>}
 */
const _TAIL_STYLES = {
  squirrel: {
    top(ctx, cx, y, bodyColor, accent, shadow) {
      rect(ctx, cx - 4, y - 1, 9, 8, accent);
      rect(ctx, cx - 3, y + 7, 7, 3, lighten(accent, 0.1));
      px(ctx, cx - 1, y + 1, lighten(accent, 0.18));
    },
    back(ctx, cx, y, bodyColor, accent, shadow) {
      rect(ctx, cx - 4, y - 3, 9, 7, accent);
      rect(ctx, cx - 3, y + 3, 7, 3, lighten(accent, 0.1));
      px(ctx, cx - 1, y - 1, lighten(accent, 0.18));
    },
    side(ctx, f, x, y, bodyColor, accent, shadow, shadow2) {
      rect(ctx, f(x - 1), y + 3, 6, 6, accent);
      rect(ctx, f(x - 4), y - 1, 5, 6, accent);
      rect(ctx, f(x - 3), y - 7, 8, 7, accent);
      rect(ctx, f(x + 4), y - 9, 7, 5, lighten(accent, 0.08));
      rect(ctx, f(x + 9), y - 6, 5, 4, lighten(accent, 0.14));
      px(ctx, f(x - 1), y + 4, lighten(accent, 0.18));
    },
  },
  cotton: {
    top(ctx, cx, y, bodyColor, accent, shadow) {
      rect(ctx, cx - 2, y, 4, 4, '#fffff4');
      px(ctx, cx, y + 1, '#ffffff');
    },
    back(ctx, cx, y, bodyColor, accent, shadow) {
      rect(ctx, cx - 2, y + 2, 5, 5, '#fffff4');
      px(ctx, cx, y + 3, '#ffffff');
      px(ctx, cx - 1, y + 4, '#ffffff');
    },
    side(ctx, f, x, y, bodyColor, accent, shadow, shadow2) {
      rect(ctx, f(x - 1), y, 5, 5, '#fffff4');
      px(ctx, f(x + 1), y + 1, '#ffffff');
      px(ctx, f(x), y + 2, '#ffffff');
    },
  },
  bushy: {
    top(ctx, cx, y, bodyColor, accent, shadow) {
      rect(ctx, cx - 1, y - 3, 4, 4, accent);
      rect(ctx, cx + 2, y - 1, 3, 3, accent);
      rect(ctx, cx, y - 2, 3, 2, lighten(accent, 0.1));
    },
    back(ctx, cx, y, bodyColor, accent, shadow) {
      rect(ctx, cx - 1, y, 4, 4, accent);
      rect(ctx, cx - 3, y + 1, 3, 3, lighten(accent, 0.08));
    },
    side(ctx, f, x, y, bodyColor, accent, shadow, shadow2) {
      rect(ctx, f(x), y, 4, 4, accent);
      rect(ctx, f(x - 3), y, 3, 3, accent);
      rect(ctx, f(x - 3), y - 3, 3, 3, lighten(accent, 0.1));
      px(ctx, f(x + 1), y + 1, lighten(accent, 0.12));
    },
  },
  striped: {
    top(ctx, cx, y, bodyColor, accent, shadow) {
      rect(ctx, cx - 1, y, 3, 3, bodyColor);
      rect(ctx, cx - 1, y + 3, 3, 3, '#333333');
      rect(ctx, cx - 1, y + 6, 3, 2, bodyColor);
    },
    back(ctx, cx, y, bodyColor, accent, shadow) {
      rect(ctx, cx - 1, y, 3, 3, bodyColor);
      rect(ctx, cx - 1, y - 3, 3, 3, '#333333');
    },
    side(ctx, f, x, y, bodyColor, accent, shadow, shadow2) {
      rect(ctx, f(x), y, 3, 3, bodyColor);
      rect(ctx, f(x - 3), y, 3, 3, '#333333');
      rect(ctx, f(x), y + 3, 3, 3, '#333333');
    },
  },
  plain: {
    top(ctx, cx, y, bodyColor, accent, shadow) {
      rect(ctx, cx - 1, y, 3, 4, shadow);
    },
    back(ctx, cx, y, bodyColor, accent, shadow) {
      rect(ctx, cx - 1, y + 2, 3, 4, shadow);
    },
    side(ctx, f, x, y, bodyColor, accent, shadow, shadow2) {
      rect(ctx, f(x), y, 3, 4, shadow);
    },
  },
};

/**
 * Draw quadruped tail variants for DOWN view.
 * @param {string} style - 'squirrel'|'cotton'|'bushy'|'striped'|'plain'
 */
export function drawQuadrupedTailTop(ctx, cx, y, style, bodyColor, accent, shadow) {
  (_TAIL_STYLES[style] ?? _TAIL_STYLES.plain).top(ctx, cx, y, bodyColor, accent, shadow);
}

/**
 * Draw quadruped tail variants for UP view.
 * @param {string} style - 'squirrel'|'cotton'|'bushy'|'striped'|'plain'
 */
export function drawQuadrupedTailBack(ctx, cx, y, style, bodyColor, accent, shadow) {
  (_TAIL_STYLES[style] ?? _TAIL_STYLES.plain).back(ctx, cx, y, bodyColor, accent, shadow);
}

/**
 * Draw quadruped side tail variants.
 * @param {string} style - 'squirrel'|'cotton'|'bushy'|'striped'|'plain'
 */
export function drawQuadrupedTailSide(ctx, f, x, y, style, bodyColor, accent, shadow, shadow2) {
  (_TAIL_STYLES[style] ?? _TAIL_STYLES.plain).side(ctx, f, x, y, bodyColor, accent, shadow, shadow2);
}

/**
 * Draw bird top-view head and optional eye ring/iris/specular.
 */
export function drawBirdHeadTop(ctx, cx, by, bodyColor, highlightColor, eyeRing, eyeColor, withEyes) {
  rect(ctx, cx - 4, by - 7, 8, 7, bodyColor);
  rect(ctx, cx - 3, by - 9, 6, 3, bodyColor);
  rect(ctx, cx - 2, by - 9, 4, 2, highlightColor);
  if (!withEyes) return;
  rect(ctx, cx - 4, by - 5, 3, 3, eyeRing);
  rect(ctx, cx + 1, by - 5, 3, 3, eyeRing);
  px(ctx, cx - 3, by - 4, eyeColor);
  px(ctx, cx + 2, by - 4, eyeColor);
  px(ctx, cx - 3, by - 5, '#ffffff');
  px(ctx, cx + 2, by - 5, '#ffffff');
}

/**
 * Draw bird top-view wings with coverts/secondaries/primaries.
 */
export function drawBirdWingTop(ctx, bx, by, w, wingSpan, wingY, accent, shadow2, highlight, highlight2) {
  for (let i = 1; i <= wingSpan; i++) {
    const t = (i - 1) / Math.max(1, wingSpan - 1);
    const wc = _featherZoneColor(t, accent);
    const wh = Math.max(1, 5 - Math.round(i * 3 / wingSpan));
    rect(ctx, bx - i * 3, wingY, 3, wh, wc);
    rect(ctx, bx + w - 3 + i * 3, wingY, 3, wh, wc);
    if (t < 0.28) {
      px(ctx, bx - i * 3, wingY, lighten(wc, 0.10));
      px(ctx, bx + w - 3 + i * 3 + 2, wingY, lighten(wc, 0.10));
    }
    if (t >= 0.65 && i % 2 === 1) {
      px(ctx, bx - i * 3, wingY + wh - 1, shadow2);
      px(ctx, bx + w - 3 + i * 3 + 2, wingY + wh - 1, shadow2);
    }
  }
  if (wingSpan > 4) {
    rect(ctx, bx - 3, wingY - 2, 3, 2, highlight);
    rect(ctx, bx + w, wingY - 2, 3, 2, highlight);
    rect(ctx, bx - 5, wingY - 1, 2, 1, highlight2);
    rect(ctx, bx + w + 3, wingY - 1, 2, 1, highlight2);
  }
}

/**
 * Draw bird UP-view fan tail.
 */
export function drawBirdTailUp(ctx, cx, by, h, tailLen, tailColor) {
  for (let t = 0; t < tailLen; t += 2) {
    rect(ctx, cx - 3 + t, by + h + t, 3, 3, tailColor);
    rect(ctx, cx + 3 - t, by + h + t, 3, 3, tailColor);
  }
}

/**
 * Draw folded side wing strip for birds.
 */
export function drawBirdWingSide(ctx, f, bx, wingY, wingW, accent, featherTex, shadow2) {
  const priStart = Math.floor(wingW * 0.65);
  for (let i = 0; i < wingW; i++) {
    const t = wingW > 1 ? i / (wingW - 1) : 0;
    const wc = _featherZoneColor(t, accent);
    px(ctx, f(bx + 2 + i), wingY, lighten(wc, 0.06));
    px(ctx, f(bx + 2 + i), wingY + 1, wc);
    px(ctx, f(bx + 2 + i), wingY + 2, darken(wc, 0.08));
  }
  for (let i = priStart; i < wingW - 1; i += 2) {
    px(ctx, f(bx + 2 + i), wingY + 2, shadow2);
  }
  anisotropicSpeckle(ctx, bx + 2, wingY, wingW, 3, [featherTex, darken(accent, 0.06)], 0.16, Math.PI / 2, 2.0);
}

/**
 * Draw side-view tail streak for birds.
 */
export function drawBirdTailSide(ctx, f, bx, by, h, tailLen, tailColor, shadow) {
  for (let t = 0; t < tailLen; t++) {
    px(ctx, f(bx - 3 - t), by + h - 5 + t, tailColor);
    px(ctx, f(bx - 3 - t), by + h - 4 + t, tailColor);
    px(ctx, f(bx - 2 - t), by + h - 4 + t, shadow);
  }
  rect(ctx, f(bx - tailLen - 2), by + h - 5 + tailLen - 1, 3, 3, darken(tailColor, 0.18));
}

// ─── Reptile / Snake helpers ───────────────────────────────────────────────

/**
 * Draw a slit-pupil eye for reptiles.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {string} irisColor
 */
export function drawReptileEye(ctx, x, y, irisColor) {
  _drawIrisPupilHighlight(
    ctx,
    _id,
    x,
    y,
    3,
    3,
    irisColor,
    { dx: 1, dy: 1, color: '#000000' },
    { dx: 0, dy: 0, color: '#ffffff' },
  );
}

/**
 * Draw a reptile top/down-view head with optional snout brows, scale texture, eyes, and teeth.
 * Derives shadow and scale-texture tones internally from body color.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx - horizontal center of the head
 * @param {number} headY - top-left y of the head block
 * @param {number} headW - total head width in pixels
 * @param {string} body - main body color
 * @param {string} eye - iris color
 * @param {boolean} facingDown - true for DOWN direction (show eyes/teeth)
 * @param {object} [opts]
 * @param {boolean} [opts.snout] - add brow shadow above each eye position
 * @param {boolean} [opts.teeth] - add tooth nubs at the jaw
 */
export function drawReptileHeadTop(ctx, cx, headY, headW, body, eye, facingDown, opts = {}) {
  const hx = cx - Math.floor(headW / 2);
  const shadow = darken(body, 0.15);
  const scaleTex = darken(body, 0.07);
  const nibY = facingDown ? headY - 3 : headY;
  rect(ctx, hx + 1, headY, headW - 2, 3, body);
  rect(ctx, hx, headY + 3, headW, 4, body);
  rect(ctx, hx + 3, nibY, 3, 3, body);
  rect(ctx, hx + headW - 6, nibY, 3, 3, body);
  speckle(ctx, hx + 1, headY + 1, headW - 2, 4, [scaleTex, darken(body, 0.12), lighten(body, 0.04)], 0.28);
  if (facingDown) {
    drawReptileEye(ctx, hx + 3, headY + 3, eye);
    drawReptileEye(ctx, hx + headW - 6, headY + 3, eye);
    if (opts.snout) {
      rect(ctx, hx + 3, headY, 3, 2, shadow);
      rect(ctx, hx + headW - 6, headY, 3, 2, shadow);
    }
    if (opts.teeth) {
      rect(ctx, hx + 3, headY + 7, 2, 2, '#f0f0e0');
      rect(ctx, hx + headW - 5, headY + 7, 2, 2, '#f0f0e0');
      px(ctx, hx + 5, headY + 7, '#f0f0e0');
      px(ctx, hx + headW - 7, headY + 7, '#f0f0e0');
    }
  }
}

/**
 * Draw a reptile side-view head block with highlight, slit-pupil eye, and optional teeth.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Function} f - horizontal flip function (identity or 63−x mirror)
 * @param {number} headX - logical left edge of the head block
 * @param {number} by - top y of the head (same as body top)
 * @param {number} headW - head width in pixels
 * @param {number} h - head/body height
 * @param {string} body - main body color
 * @param {string} highlight - highlight color for the snout tip
 * @param {string} eye - iris color
 * @param {object} [opts]
 * @param {boolean} [opts.teeth] - draw tooth nubs at the jaw line
 */
export function drawReptileHeadSide(ctx, f, headX, by, headW, h, body, highlight, eye, opts = {}) {
  const rx = Math.min(f(headX), f(headX + headW - 1));
  rect(ctx, rx, by, headW, h, body);
  rect(ctx, f(headX + headW - 3), by, 3, 2, highlight);
  drawReptileEye(ctx, f(headX + headW - 3), by + (h > 6 ? 3 : 1), eye);
  if (opts.teeth) {
    rect(ctx, f(headX + headW - 2), by + h - 3, 2, 2, '#f0f0e0');
    rect(ctx, f(headX + headW), by + h - 3, 2, 2, '#f0f0e0');
  }
}

/**
 * Draw a forked tongue for snakes.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - base x
 * @param {number} y - base y (tip of mouth)
 * @param {number} length - total length in pixels
 * @param {number} direction - 1 for down/forward, -1 for up/back
 * @param {string} tongueColor - defaults to red
 */
export function drawTongue(ctx, x, y, length, direction = 1, tongueColor = '#cc2222') {
  // Stem
  px(ctx, x, y, tongueColor);
  px(ctx, x, y + direction, tongueColor);
  // Fork tips
  px(ctx, x - 1, y + direction * 2, tongueColor);
  px(ctx, x + 1, y + direction * 2, tongueColor);
}

/**
 * Draw a belly stripe that follows segment positions.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<[number,number]>} pts - segment center positions
 * @param {number[]} radii - segment radii
 * @param {string} bellyColor
 * @param {boolean} isHorizontal - true for LEFT/RIGHT orientation (belly on bottom)
 */
export function drawBellyStripe(ctx, pts, radii, bellyColor, isHorizontal = false) {
  for (let i = 0; i < pts.length; i++) {
    const [bx, by] = pts[i];
    const r = radii[i];
    if (isHorizontal) {
      rect(ctx, bx - r + 1, by + r - 1, r * 2 - 1, 2, bellyColor);
    } else {
      rect(ctx, bx - 1, by + r - 1, 3, 2, bellyColor);
    }
  }
}

/**
 * Draw dorsal diamond pattern (snake markings).
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<[number,number]>} pts - segment center positions
 * @param {string} patternColor
 * @param {boolean} isHorizontal - orientation
 */
export function drawDorsalPattern(ctx, pts, patternColor, isHorizontal = false) {
  for (let i = 1; i < pts.length - 1; i += 2) {
    const [sx, sy] = pts[i];
    if (isHorizontal) {
      px(ctx, sx, sy - 1, patternColor);
      px(ctx, sx - 1, sy, patternColor);
      px(ctx, sx + 1, sy, patternColor);
      px(ctx, sx, sy + 1, patternColor);
    } else {
      px(ctx, sx, sy, patternColor);
      px(ctx, sx - 1, sy + 1, patternColor);
      px(ctx, sx + 1, sy + 1, patternColor);
      px(ctx, sx, sy + 2, patternColor);
    }
  }
}

/**
 * Draw highlight dots on top of each segment (rim light).
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<[number,number]>} pts
 * @param {number[]} radii
 * @param {string} highlightColor
 * @param {boolean} isHorizontal
 */
export function drawSegmentHighlights(ctx, pts, radii, highlightColor, isHorizontal = false) {
  for (let i = 0; i < pts.length; i++) {
    const [sx, sy] = pts[i];
    const r = radii[i];
    const span = Math.max(1, r - 2);
    for (let ox = -span; ox <= span; ox++) {
      px(ctx, sx + ox, sy - r + 1, highlightColor);
    }
  }
}

/**
 * Draw a two-segment reptile leg with a claw tip (top/down views).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} hipX
 * @param {number} hipY
 * @param {number} dirX - -1 for left, +1 for right
 * @param {number} swing
 * @param {string} upperColor
 * @param {string} lowerColor
 * @param {string} clawColor
 */
export function drawReptileLegTop(ctx, hipX, hipY, dirX, swing, upperColor, lowerColor, clawColor) {
  const kneeX = hipX + dirX * 4;
  const kneeY = hipY + 2 + swing;
  const footX = hipX + dirX * 7;
  const footY = hipY + 4 + swing;
  _drawJointedLegCore(ctx, _id, hipX, hipY + swing, kneeX, kneeY, footX, footY, upperColor, lowerColor, {
    upperThickness: 1,
    lowerThickness: 0,
    claw: { x: footX, y: footY + 1, color: clawColor },
  });
}

/**
 * Draw a side-view reptile leg with a claw tip.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Function} f - x-flip function
 * @param {number} hipX
 * @param {number} hipY
 * @param {number} swing
 * @param {string} upperColor
 * @param {string} lowerColor
 * @param {string} clawColor
 * @param {number} kneeDx
 * @param {number} footDx
 */
export function drawReptileLegSide(ctx, f, hipX, hipY, swing, upperColor, lowerColor, clawColor, kneeDx = -2, footDx = -4) {
  const kneeX = hipX + kneeDx;
  const kneeY = hipY + 3 + swing;
  const footX = hipX + footDx;
  const footY = hipY + 5 + swing;
  const clawX = footX + (footDx >= 0 ? 1 : -1);
  _drawJointedLegCore(ctx, f, hipX, hipY + swing, kneeX, kneeY, footX, footY, upperColor, lowerColor, {
    upperThickness: 1,
    lowerThickness: 0,
    claw: { x: clawX, y: footY + 1, color: clawColor },
  });
}

/**
 * Draw a short reptile/crocodile limb stub.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x0
 * @param {number} y0
 * @param {number} x1
 * @param {number} y1
 * @param {string} color
 */
export function drawReptileStubLeg(ctx, x0, y0, x1, y1, color) {
  _drawJointedLegCore(ctx, _id, x0, y0, x1, y1, x1, y1, color, color, {
    upperThickness: 1,
    lowerThickness: 0,
  });
}

/**
 * Draw a lizard top/down leg with extra splayed toe hint.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} hipX
 * @param {number} hipY
 * @param {number} dirX - -1 for left, +1 for right
 * @param {number} swing
 * @param {string} upperColor
 * @param {string} lowerColor
 */
export function drawLizardLegTop(ctx, hipX, hipY, dirX, swing, upperColor, lowerColor) {
  const kneeX = hipX + dirX * 3;
  const kneeY = hipY + 3 + swing;
  const footX = hipX + dirX * 6;
  const footY = hipY + 5 + swing;
  const toeX = hipX + dirX * 4;
  _drawJointedLegCore(ctx, _id, hipX, hipY + swing, kneeX, kneeY, footX, footY, upperColor, lowerColor, {
    upperThickness: 1,
    lowerThickness: 0,
    toes: [{ x0: toeX, y0: footY, x1: toeX + dirX, y1: footY + 2, thickness: 0 }],
  });
}

/**
 * Draw a lizard side leg with splayed toe fan.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Function} f - x-flip function
 * @param {number} hipX
 * @param {number} hipY
 * @param {number} swing
 * @param {string} upperColor
 * @param {string} lowerColor
 * @param {number} dirX - -1 for rear leg, +1 for front leg
 */
export function drawLizardLegSide(ctx, f, hipX, hipY, swing, upperColor, lowerColor, dirX) {
  const kneeX = hipX + dirX * 3;
  const kneeY = hipY + 2 + swing;
  const footX = hipX + dirX * 5;
  const footY = hipY + 4 + swing;
  _drawJointedLegCore(ctx, f, hipX, hipY, kneeX, kneeY, footX, footY, upperColor, lowerColor, {
    upperThickness: 1,
    lowerThickness: 0,
    toes: [
      { x0: footX, y0: footY, x1: footX + dirX * 2, y1: footY + 1, thickness: 0 },
      { x0: footX, y0: footY, x1: footX, y1: footY + 2, thickness: 0 },
      { x0: footX, y0: footY, x1: footX - dirX * 2, y1: footY + 2, thickness: 0 },
    ],
  });
}

// ─── Bird helpers ──────────────────────────────────────────────────────────

/**
 * Draw a pointed beak (top-down view, symmetric).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx - center x
 * @param {number} y - beak base y
 * @param {number} length - beak length in pixels
 * @param {string} beakColor
 */
export function drawBeakDown(ctx, cx, y, length, beakColor) {
  const beakDark = darken(beakColor, 0.18);
  const beakHi   = lighten(beakColor, 0.15);
  for (let i = 0; i < length; i++) {
    const w = Math.max(1, length - i);
    rect(ctx, cx - Math.floor(w / 2), y + i, w, 1, beakColor);
  }
  px(ctx, cx, y + 1, beakHi);
  px(ctx, cx, y + length - 1, beakDark);
}

/**
 * Draw a sideways-facing beak (fillPolygon wedge).
 * @param {CanvasRenderingContext2D} ctx
 * @param {Function} f - x-flip function (e.g., (x) => x or (x) => 63 - x)
 * @param {number} tipX - beak tip x (before flip)
 * @param {number} baseY - vertical center of beak attachment
 * @param {number} length - beak length
 * @param {string} beakColor
 */
export function drawBeakSide(ctx, f, tipX, baseY, length, beakColor) {
  const beakDark = darken(beakColor, 0.15);
  fillPolygon(ctx, [
    [f(tipX - length), baseY - 1],
    [f(tipX),          baseY + 1],
    [f(tipX - length), baseY + 2],
  ], beakColor);
  px(ctx, f(tipX - 1), baseY + 1, beakDark);
}

/**
 * Draw a hooked raptor beak (side view) with upper and lower mandible.
 * @param {Function} f - x-flip function
 * @param {number} x - beak attachment x (before flip)
 * @param {number} y - beak attachment y
 * @param {string} beakHi - highlight on top edge
 * @param {string} beakSh - shadow on hook tip and lower edge
 */
export function drawRaptorBeak(ctx, f, x, y, beakColor, beakHi, beakSh) {
  rect(ctx, f(x), y, 4, 2, beakColor);
  rect(ctx, f(x), y, 3, 1, beakHi);
  px(ctx, f(x + 3), y + 1, beakSh);
  rect(ctx, f(x + 1), y + 2, 3, 2, darken(beakColor, 0.08));
  px(ctx, f(x + 3), y + 3, beakSh);
}

/**
 * Draw a bird foot (two toes in side view, or four toes from above).
 * @param {CanvasRenderingContext2D} ctx
 * @param {Function} f - x-flip function
 * @param {number} x - foot base x
 * @param {number} y - foot base y
 * @param {string} footColor
 */
export function drawBirdFoot(ctx, f, x, y, footColor) {
  const dark = darken(footColor, 0.22);
  // Tarsometatarsus (lower leg)
  px(ctx, f(x), y,     footColor);
  px(ctx, f(x), y + 1, footColor);
  px(ctx, f(x), y + 2, footColor);
  // Three forward toes fanning out
  px(ctx, f(x - 1), y + 3, footColor);  // inner toe
  px(ctx, f(x),     y + 3, footColor);  // middle toe
  px(ctx, f(x + 1), y + 3, footColor);  // outer toe
  // Claw tips
  px(ctx, f(x - 2), y + 4, dark);       // inner claw
  px(ctx, f(x + 2), y + 4, dark);       // outer claw
  // Hallux (rear toe) — darker hint at tarsus junction
  px(ctx, f(x - 1), y + 2, dark);
}

// ─── Insect / Compound-eye helpers ────────────────────────────────────────

/**
 * Draw an insect compound eye — oval filled with a cross-grid facet pattern
 * and a specular highlight, giving the classic multi-lens look at low resolution.
 * @param {number} cx - center x
 * @param {number} cy - center y
 * @param {number} rx - horizontal radius (1–3 design pixels)
 * @param {number} ry - vertical radius
 * @param {string} eyeColor - base facet color
 */
export function drawCompoundEye(ctx, cx, cy, rx, ry, eyeColor) {
  const dark = darken(eyeColor, 0.30);
  const hi   = lighten(eyeColor, 0.45);

  // Filled oval base
  ellipse(ctx, cx, cy, rx, ry, eyeColor);

  // Horizontal mid-line (facet row seam) — clipped to ellipse width
  const hmw = Math.round(rx * Math.sqrt(Math.max(0, 1 - 0)));
  if (hmw > 0) {
    for (let dx = -hmw; dx <= hmw; dx++) px(ctx, cx + dx, cy, dark);
  }
  // Vertical mid-line (facet column seam) — clipped to ellipse height
  for (let dy = -(ry - 1); dy <= (ry - 1); dy++) {
    const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
    if (hw >= 1) px(ctx, cx, cy + dy, dark);
  }

  // Specular highlight — top-left quadrant bright pixel
  px(ctx, cx - Math.max(0, rx - 1), cy - Math.max(0, ry - 1), hi);
  if (rx >= 2) px(ctx, cx - Math.max(0, rx - 2), cy - ry + 1, lighten(hi, 0.12));
}

// ─── Crocodile / Lizard helpers ───────────────────────────────────────────

/**
 * Draw dorsal scute ridge (raised bumps along spine).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} startX - first scute x
 * @param {number} y - scute y
 * @param {number} count - number of scutes
 * @param {number} spacing - pixels between scutes
 * @param {string} scuteColor
 */
export function drawScuteRidge(ctx, startX, y, count, spacing, scuteColor) {
  const hiColor = lighten(scuteColor, 0.12);
  for (let i = 0; i < count; i++) {
    const sx = startX + i * spacing;
    const sy = y + (i % 2);   // alternate Y for irregular look
    ellipse(ctx, sx, sy, 1, 1, scuteColor);
    px(ctx, sx, sy - 1, hiColor);
  }
}

/**
 * Draw an armored body fill (gradient + scale overlay).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {string} hiColor - top highlight color
 * @param {string} shColor - bottom shadow color
 * @param {string} scuteColor - scale/plate color
 * @param {Function} scalePatternFn - reference to the scalePattern helper from helpers.js
 */
export function drawArmoredBody(ctx, x, y, w, h, hiColor, shColor, scuteColor, scalePatternFn) {
  // Gradient fill row-by-row
  for (let dy = 0; dy < h; dy++) {
    const t = h <= 1 ? 0 : dy / (h - 1);
    const inset = dy === 0 || dy === h - 1 ? 2 : (dy === 1 || dy === h - 2 ? 1 : 0);
    rect(ctx, x + inset, y + dy, Math.max(1, w - inset * 2), 1, blend(hiColor, shColor, t));
  }
  // Scale/plate texture overlay
  scalePatternFn(ctx, x + 1, y + 1, w - 2, h - 2, blend(hiColor, shColor, 0.5), scuteColor, 4);
}

/**
 * Draw a rounded caterpillar segment with top highlight and belly shadow.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} rx
 * @param {number} ry
 * @param {string} color
 * @param {string} spotColor
 */
export function drawCaterpillarSegment(ctx, cx, cy, rx, ry, color, spotColor) {
  const hi = lighten(color, 0.14);
  const sh = darken(color, 0.16);
  ellipse(ctx, cx, cy, rx, ry, color);
  ellipse(ctx, cx - 1, cy - 1, Math.max(1, rx - 1), 1, hi);
  ellipse(ctx, cx, cy + 1, Math.max(1, rx - 1), 1, sh);
  if (spotColor) {
    px(ctx, cx, cy - 1, spotColor);
    px(ctx, cx, cy, darken(spotColor, 0.15));
  }
}

/**
 * Draw a vertical caterpillar chain for DOWN/UP views.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} segments
 * @param {boolean} headAtTop
 * @param {string} body
 * @param {string} accent
 * @param {string} spotColor
 */
export function drawCaterpillarChainTop(ctx, cx, cy, segments, headAtTop, body, accent, spotColor) {
  for (let s = 0; s < segments; s++) {
    const sy = headAtTop ? cy - segments + s * 3 : cy + segments - 3 - s * 3;
    const segColor = s % 2 === 0 ? body : accent;
    drawCaterpillarSegment(ctx, cx, sy + 1, 5, 2, segColor, s % 2 === 0 ? spotColor : null);
    rect(ctx, cx - 7, sy + 1, 2, 2, darken(segColor, 0.24));
    rect(ctx, cx + 6, sy + 1, 2, 2, darken(segColor, 0.24));
  }
}

// ─── Cricket-specific anatomy ──────────────────────────────────────────────

/**
 * Draw both cricket hind jump legs for top-down view.
 * The large femur runs outward-back; the tibia folds further out-down.
 * @param {number} bx  - body left x
 * @param {number} w   - body width
 * @param {number} by  - body top y
 * @param {number} h   - body height
 */
export function drawCricketJumpLegTop(ctx, bx, w, by, h, color, outline) {
  const legDark = darken(color, 0.12);
  // Left: femur outward-back, tibia extends further out and down
  thickLine(ctx, bx - 1, by + h - 6, bx - 10, by + h - 2, 1, color);
  thickLine(ctx, bx - 10, by + h - 2, bx - 15, by + h + 3, 0, legDark);
  px(ctx, bx - 16, by + h + 4, outline);
  // Right (mirror)
  thickLine(ctx, bx + w, by + h - 6, bx + w + 9, by + h - 2, 1, color);
  thickLine(ctx, bx + w + 9, by + h - 2, bx + w + 14, by + h + 3, 0, legDark);
  px(ctx, bx + w + 15, by + h + 4, outline);
}

/**
 * Draw one cricket hind jump leg for side view.
 * Femur rises steeply up-and-back from body rear; tibia folds straight back down.
 * @param {Function} f - x-flip function (identity for RIGHT, 63-x for LEFT)
 * @param {number} bx  - body left x (unflipped)
 * @param {number} w   - body width
 * @param {number} by  - body top y
 * @param {number} h   - body height
 */
export function drawCricketJumpLegSide(ctx, f, bx, w, by, h, color, outline) {
  const legDark = darken(color, 0.12);
  // Femur: thick diagonal rising steeply up-and-back from body rear-bottom
  thickLine(ctx, f(bx + w - 2), by + h - 2, f(bx + w + 4), by + 2, 1, color);
  // Tibia: folds from femur tip back down to foot
  thickLine(ctx, f(bx + w + 4), by + 2, f(bx + w + 6), by + h + 1, 0, legDark);
  px(ctx, f(bx + w + 6), by + h + 2, outline);
  px(ctx, f(bx + w + 7), by + h + 1, legDark);
}

/**
 * Draw both cricket cerci (backward-facing tail feelers) for top-down view.
 * @param {number} cx  - horizontal center
 * @param {number} by  - body top y
 * @param {number} h   - body height
 */
export function drawCerciTop(ctx, cx, by, h, color) {
  const tip = darken(color, 0.08);
  // Left cercus
  thickLine(ctx, cx - 1, by + h, cx - 3, by + h + 4, 0, color);
  px(ctx, cx - 4, by + h + 5, tip);
  // Right cercus
  thickLine(ctx, cx + 2, by + h, cx + 4, by + h + 4, 0, color);
  px(ctx, cx + 5, by + h + 5, tip);
}

/**
 * Draw a single cricket cercus (tail feeler) for side view.
 * Extends backward from the body tail end.
 * @param {Function} f - x-flip function
 * @param {number} bx  - body left x (unflipped)
 * @param {number} by  - body top y
 * @param {number} h   - body height
 */
export function drawCerciSide(ctx, f, bx, by, h, color) {
  thickLine(ctx, f(bx - 1), by + h - 6, f(bx - 5), by + h - 2, 0, color);
  px(ctx, f(bx - 6), by + h - 1, darken(color, 0.08));
}

/**
 * Draw flat cricket wing pads (tegmina) for top-down view.
 * Overlaid on the posterior body; split by a dorsal seam.
 * @param {string} body   - base body color (for pronotum boundary)
 * @param {string} accent - wing pad fill color
 */
export function drawCricketWingPads(ctx, bx, w, by, h, body, accent) {
  const padY = by + Math.floor(h * 0.38);
  const padH = Math.ceil(h * 0.52);
  const hw = Math.floor((w - 4) / 2);
  // Left wing pad (slightly lighter)
  rect(ctx, bx + 2, padY, hw, padH, lighten(accent, 0.06));
  // Right wing pad
  rect(ctx, bx + 2 + hw, padY, w - 4 - hw, padH, accent);
  // Center seam
  for (let dy = 1; dy < padH - 1; dy++) px(ctx, bx + 2 + hw, padY + dy, darken(accent, 0.12));
  // Pronotum boundary
  rect(ctx, bx + 2, padY, w - 4, 1, darken(body, 0.10));
}
