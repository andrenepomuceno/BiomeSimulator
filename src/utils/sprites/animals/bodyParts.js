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

import { px, rect, darken, lighten, rimLight, ao, anisotropicSpeckle, ellipse, speckle, fillPolygon, blend } from '../helpers.js';

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
  // Iris
  rect(ctx, irisX, irisY, irisSize, irisSize, eyeIris);
  // Pupil — centered toward bottom-right of iris for depth
  px(ctx, irisX + irisSize - 1, irisY + irisSize - 1, darken(eyeIris, 0.40));
  // Specular highlight — bright pixel at iris top-left
  px(ctx, irisX, irisY, lighten(eyeWhite, 0.06));
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

// ─── Reptile / Snake helpers ───────────────────────────────────────────────

/**
 * Draw a slit-pupil eye for reptiles.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {string} irisColor
 */
export function drawReptileEye(ctx, x, y, irisColor) {
  rect(ctx, x, y, 3, 3, irisColor);            // iris square
  px(ctx, x + 1, y + 1, '#000000');            // slit pupil
  px(ctx, x, y, '#ffffff');                    // highlight
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
