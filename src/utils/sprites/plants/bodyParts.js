/**
 * Reusable drawing helpers for plant sprite templates.
 * Covers: leaf/bark/cap textures, foliage mounds, trunk, ground base,
 * mushroom cap, and fruit — shared across bush, tree, mushroom and others.
 */
import {
  px, rect, ellipse,
  darken, lighten, blend,
  gradientH, gradientV,
  rimLight, ao,
  speckle, anisotropicSpeckle,
} from '../helpers.js';

// ─── Texture helpers ────────────────────────────────────────────────────────

/**
 * Directional leaf texture — vertical streaks + sunlight glints.
 * Used by tree canopy, bush mounds, herb leaves.
 */
export function drawLeafTexture(ctx, x, y, w, h, leaf, leafDark) {
  anisotropicSpeckle(ctx, x, y, w, h,
    [leafDark, darken(leaf, 0.12), lighten(leaf, 0.06)], 0.26, Math.PI / 2, 2.5);
  speckle(ctx, x, y, w, h, [lighten(leaf, 0.12)], 0.05);
}

/**
 * Vertical bark texture — simulates trunk furrows.
 * Used by tree trunk (and palm, etc.).
 */
export function drawBarkTexture(ctx, x, y, w, h, trunk, trunkDark) {
  anisotropicSpeckle(ctx, x, y, w, h,
    [trunkDark, darken(trunk, 0.12), lighten(trunk, 0.05)], 0.30, Math.PI / 2, 5.0);
}

/**
 * Isotropic cap/spore texture — used by mushroom caps.
 */
export function drawCapTexture(ctx, x, y, w, h, cap, capDark) {
  speckle(ctx, x, y, w, h, [capDark, darken(cap, 0.12), lighten(cap, 0.06)], 0.22);
}

// ─── Ground base ────────────────────────────────────────────────────────────

/**
 * Draw the dark ground-contact rect shared by all plant stages.
 * @param {number} cx    - left edge of the rect
 * @param {number} baseY - ground y
 * @param {number} w     - rect width
 * @param {string} stemColor
 * @param {number} h     - rect height (default 4)
 */
export function drawGroundBase(ctx, cx, baseY, w, stemColor, h = 4) {
  rect(ctx, cx, baseY, w, h, darken(stemColor, 0.30));
}

// ─── Bush foliage ───────────────────────────────────────────────────────────

/**
 * Private: apply leaf speckle texture clipped to an ellipse boundary.
 * Prevents rectangular texture artifacts on white atlas backgrounds.
 */
function drawEllipseLeafTexture(ctx, mCx, mCy, rx, ry, leaf, leafDark) {
  const colors = [leafDark, darken(leaf, 0.12), lighten(leaf, 0.06)];
  for (let dy = -ry; dy <= ry; dy++) {
    const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
    if (hw > 0) speckle(ctx, mCx - hw, mCy + dy, hw * 2 + 1, 1, colors, 0.26);
  }
}

/**
 * Draw a shaded foliage mound (front/centre lobe).
 * Ellipse with gradient shadow, top highlight, leaf texture, and ground AO.
 * @param {number} mCx  - horizontal centre (includes swayOff)
 * @param {number} topY - y of the top of the mound
 * @param {number} rx   - horizontal radius
 * @param {number} ry   - vertical radius
 */
export function drawFoliageMound(ctx, mCx, topY, rx, ry, leaf, leafDark) {
  const mCy = topY + ry;
  ellipse(ctx, mCx, mCy, rx, ry, leaf);
  // Gradient shadow on lower half
  for (let dy = 2; dy <= ry; dy++) {
    const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
    if (hw > 0) rect(ctx, mCx - hw, mCy + dy, hw * 2 + 1, 1, darken(leaf, 0.05 + dy * 0.005));
  }
  // Top highlight
  const hiRx = Math.max(2, Math.floor(rx * 0.52));
  const hiRy = Math.max(1, Math.floor(ry * 0.30));
  ellipse(ctx, mCx, topY + hiRy, hiRx, hiRy, lighten(leaf, 0.17));
  // Leaf texture
  // Leaf texture — clipped to ellipse to avoid rectangular artifacts
  drawEllipseLeafTexture(ctx, mCx, mCy, rx, ry, leaf, leafDark);
  // Ground contact AO
  ao(ctx, mCx - rx + 2, mCy + ry - 2, rx * 2 - 3, 4, 0.12);
}

/**
 * Draw a shaded side/back lobe (uses leafDark for depth contrast).
 */
export function drawSideLobe(ctx, mCx, topY, rx, ry, leafDark) {
  const mCy = topY + ry;
  ellipse(ctx, mCx, mCy, rx, ry, leafDark);
  // Underside shadow
  for (let dy = Math.floor(ry * 0.5); dy <= ry; dy++) {
    const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
    if (hw > 0) rect(ctx, mCx - hw, mCy + dy, hw * 2 + 1, 1, darken(leafDark, 0.04 + dy * 0.004));
  }
  // Top highlight
  const hiRx = Math.max(1, Math.floor(rx * 0.45));
  const hiRy = Math.max(1, Math.floor(ry * 0.28));
  ellipse(ctx, mCx, topY + hiRy, hiRx, hiRy, lighten(leafDark, 0.12));
  // Texture
  // Texture — clipped to ellipse
  const sideColors = [darken(leafDark, 0.08), lighten(leafDark, 0.04)];
  for (let dy = -ry; dy <= ry; dy++) {
    const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
    if (hw > 0) speckle(ctx, mCx - hw, mCy + dy, hw * 2 + 1, 1, sideColors, 0.18);
  }
}

// ─── Tree helpers ───────────────────────────────────────────────────────────

/**
 * Draw a tree trunk with gradient, bark texture, and rim light.
 * @param {number} cx      - left edge of the trunk
 * @param {number} baseY   - ground y
 * @param {number} trunkH  - trunk height
 * @param {number} trunkW  - trunk width
 */
export function drawTrunk(ctx, cx, baseY, trunkH, trunkW, trunkColor, trunkDark) {
  gradientH(ctx, cx, baseY - trunkH, trunkW, trunkH, trunkColor, trunkDark);
  rect(ctx, cx - 2, baseY - ((trunkH * 0.6) | 0), 4, (trunkH * 0.5) | 0, trunkDark);
  drawBarkTexture(ctx, cx, baseY - trunkH, trunkW, trunkH, trunkColor, trunkDark);
  for (let r = 4; r < trunkH - 4; r++) px(ctx, cx - 1, baseY - trunkH + r, lighten(trunkColor, 0.08));
}

/**
 * Draw the three stacked canopy rects + underside shadow — shared by tree stages 4+5.
 * @param {number} cx      - trunk left edge (tree uses cx=28)
 * @param {number} hw      - half of canopy width
 * @param {number} cw      - full canopy width
 * @param {number} ch      - canopy height
 * @param {number} baseY   - ground y
 * @param {number} th      - trunk height
 * @param {number} swayOff - frame sway offset
 */
export function drawCanopyBase(ctx, cx, hw, cw, ch, baseY, th, swayOff, leaf, leafDark) {
  const mCx = cx + swayOff;
  const ry  = (ch / 2) | 0;
  const mCy = baseY - th - ry;

  // Round canopy ellipse
  ellipse(ctx, mCx, mCy, hw, ry, leaf);

  // Gradient shadow — lower half darkens toward trunk
  for (let dy = 1; dy <= ry; dy++) {
    const ehw = Math.round(hw * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
    if (ehw > 0) rect(ctx, mCx - ehw, mCy + dy, ehw * 2 + 1, 1, darken(leaf, 0.04 + dy * 0.018));
  }

  // Top highlight ellipse (sun-lit crown)
  const hiRx = Math.max(3, (hw * 0.52) | 0);
  const hiRy = Math.max(2, (ry * 0.30) | 0);
  ellipse(ctx, mCx, mCy - ry + hiRy, hiRx, hiRy, lighten(leaf, 0.17));

  // Leaf texture clipped to ellipse — no rectangular bleed
  drawEllipseLeafTexture(ctx, mCx, mCy, hw, ry, leaf, leafDark);
}

/**
 * Draw a leaf-cluster highlight lobe (sun-lit patch).
 * @param {number} x   - left edge
 * @param {number} y   - top edge
 * @param {number} w   - width
 * @param {number} h   - height
 * @param {string} lh  - leaf highlight colour
 */
export function drawLeafHighlight(ctx, x, y, w, h, lh) {
  rect(ctx, x, y, w, h, lh);
  px(ctx, x + 1, y + 1, lighten(lh, 0.15));
}

// ─── Mushroom helpers ───────────────────────────────────────────────────────

/**
 * Draw the large mushroom cap (stages 4 and 5).
 * @param {number} cx       - trunk left reference (same cx used throughout mushroom.js)
 * @param {number} baseY    - ground y
 * @param {number} wobble   - frame wobble offset
 * @param {boolean} extraSpot - whether to draw the third spot (stage 4 only)
 * @param {boolean} gills   - whether to draw the gills line (stage 4 only)
 */
export function drawMushroomCap(ctx, cx, baseY, capColor, capDark, stemColor, stemDark, spots, wobble, extraSpot = false, gills = false) {
  // Stem (stages 4+5 share the same tall stem)
  rect(ctx, cx + 2, baseY - 20, 6, 20, stemColor);
  rect(ctx, cx,     baseY - 12, 2, 12, stemDark);

  // Cap gradient fill
  gradientV(ctx, cx - 8 + wobble, baseY - 32, 24, 14, capColor, capDark);
  rect(ctx, cx - 6 + wobble, baseY - 36, 20, 6, capColor);
  rect(ctx, cx - 6 + wobble, baseY - 20, 20, 4, capDark);

  // Top highlight + rim
  rect(ctx, cx - 4 + wobble, baseY - 36, 16, 4, lighten(capColor, 0.20));
  rimLight(ctx, cx - 4 + wobble, baseY - 36, 16, 2, lighten(capColor, 0.15), 'top');

  // Cap texture
  drawCapTexture(ctx, cx - 8 + wobble, baseY - 36, 24, 20, capColor, capDark);

  // Spots
  if (spots) {
    rect(ctx, cx - 4 + wobble, baseY - 32, 4, 4, spots);
    rect(ctx, cx + 4 + wobble, baseY - 28, 4, 4, spots);
    if (extraSpot) rect(ctx, cx + 10 + wobble, baseY - 30, 4, 4, spots);
  }

  // Gills (stage 4 only)
  if (gills) rect(ctx, cx - 4 + wobble, baseY - 20, 16, 2, darken(stemColor, 0.15));
}

// ─── Fruit helpers ──────────────────────────────────────────────────────────

/**
 * Draw a single fruit rect with a specular highlight pixel.
 * @param {number} x    - left edge
 * @param {number} y    - top edge
 * @param {number} size - width and height of the fruit rect
 * @param {string} fruitColor
 * @param {string} fruitAccent - highlight colour (defaults to lightened fruit)
 */
export function drawFruit(ctx, x, y, size, fruitColor, fruitAccent) {
  const hi   = fruitAccent || lighten(fruitColor, 0.22);
  const sh   = darken(fruitColor, 0.22);
  const cx_  = x + Math.floor(size / 2);
  const cy_  = y + Math.floor(size / 2);
  const rx   = Math.max(2, Math.floor(size / 2));
  const ry   = Math.max(2, Math.floor(size / 2));

  // Base circle
  ellipse(ctx, cx_, cy_, rx, ry, fruitColor);

  // Shadow crescent (bottom-right quadrant — one darker ring)
  ellipse(ctx, cx_ + 1, cy_ + 1, Math.max(1, rx - 1), Math.max(1, ry - 1), sh);
  ellipse(ctx, cx_,     cy_,     Math.max(1, rx - 1), Math.max(1, ry - 1), fruitColor);

  // Specular highlight (top-left)
  px(ctx, cx_ - 1, cy_ - 1, hi);
  px(ctx, cx_ - 1, cy_ - 2, lighten(hi, 0.14));

  // Stem pip (tiny dark pixel at the top)
  px(ctx, cx_, y - 1, darken(fruitColor, 0.40));
}

/**
 * Draw a single curved grass blade with vertical color grading.
 */
export function drawGrassBlade(ctx, bx, by, h, lean, stem, leaf, leafDark, dark = false, seedTip = null) {
  const baseCol = darken(dark ? leafDark : stem, 0.08);
  const midCol = dark ? leafDark : leaf;
  const tipCol = dark ? leaf : lighten(leaf, 0.18);

  for (let i = 0; i < h; i++) {
    const y = by - i;
    const x = bx + Math.round(lean * (i / Math.max(1, h - 1)));
    const t = i / Math.max(1, h);

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
    if (i < Math.ceil(h * 0.35) && !dark) {
      px(ctx, x + 1, y, darken(col, 0.14));
    }
  }
}

/**
 * Draw a small seed panicle cluster at a blade tip.
 */
export function drawSeedHead(ctx, tipX, tipY, seedColor) {
  const sh = darken(seedColor, 0.16);
  const hi = lighten(seedColor, 0.16);
  px(ctx, tipX, tipY, seedColor);
  px(ctx, tipX - 1, tipY + 1, sh);
  px(ctx, tipX + 1, tipY + 1, sh);
  px(ctx, tipX, tipY + 2, seedColor);
  px(ctx, tipX - 1, tipY + 2, hi);
}

/**
 * Draw a low herb canopy with layered color and texture.
 */
export function drawHerbCanopy(ctx, x, y, w, h, leaf, leafDark) {
  rect(ctx, x, y, w, h, leaf);
  rect(ctx, x + 2, y - 4, Math.max(4, w - 4), 4, leaf);
  rect(ctx, x + 3, y + 2, Math.max(4, w - 6), 2, leafDark);
  drawLeafTexture(ctx, x, y - 4, w, h + 4, leaf, leafDark);
  ao(ctx, x + 1, y + h - 1, Math.max(2, w - 2), 2, 0.08);
}

/**
 * Draw a palm frond made of a central rachis and short leaflets.
 */
export function drawPalmFrond(ctx, startX, startY, length, dir, drop, leaf, leafDark) {
  for (let i = 0; i < length; i++) {
    const x = startX + i * dir;
    const y = startY + Math.round((i / Math.max(1, length - 1)) * drop);
    px(ctx, x, y, darken(leaf, 0.12));
    if (i > 1 && i < length - 1) {
      px(ctx, x, y - 1, leaf);
      if (i % 2 === 0) px(ctx, x, y + 1, leafDark);
    }
  }
}

/**
 * Draw evenly spaced cactus spines over a rectangular region.
 */
export function drawCactusSpines(ctx, x, y, w, h, spineColor) {
  for (let yy = y + 2; yy < y + h - 1; yy += 4) {
    px(ctx, x - 1, yy, spineColor);
    px(ctx, x + w, yy + 1, spineColor);
  }
}
