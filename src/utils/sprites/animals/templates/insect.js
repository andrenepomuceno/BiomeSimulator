/**
 * Insect drawing template (including caterpillar) — 64x64 design grid.
 * Used by: beetle, mosquito, caterpillar, cricket.
 *
 * Shell sheen, translucent wings, segmented antennae, caterpillar prolegs.
 */
import { px, rect, dither, darken, lighten, blend, gradientV, rimLight, ao, speckle, anisotropicSpeckle, DOWN, UP, LEFT } from '../../helpers.js';
import { drawInsectLeg, drawInsectLegSide, drawFurTexture, drawCaterpillarChainTop } from '../bodyParts.js';

export function drawInsect(ctx, params, dir, frame) {
  const { body, accent, eye, w, h } = params;
  const shadow = darken(body, 0.15);
  const shadow2 = darken(body, 0.25);
  const highlight = lighten(body, 0.10);
  const outline = darken(body, 0.3);
  const cx = 32;
  const cy = 32;
  const legOff = frame === 0 ? -3 : frame === 2 ? 3 : 0;

  if (params.segments) {
    drawCaterpillar(ctx, params, dir, frame);
    return;
  }

  if (dir === DOWN || dir === UP) {
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);

    if (params.shell) {
      // Shell body with sheen and gradient
      rect(ctx, bx + 3, by, w - 6, 3, accent);
      rect(ctx, bx + 1, by + 2, w - 2, 2, accent);
      gradientV(ctx, bx, by + 4, w, h - 8, accent, darken(accent, 0.10));
      rect(ctx, bx + 1, by + h - 4, w - 2, 2, darken(accent, 0.1));
      rect(ctx, bx + 3, by + h - 2, w - 6, 2, darken(accent, 0.15));
      // Center line
      for (let r = 0; r < h; r++) { px(ctx, cx, by + r, params.shellLine || body); px(ctx, cx + 1, by + r, params.shellLine || body); }
      // Sheen highlights
      if (params.sheen) {
        rect(ctx, bx + 3, by + 3, 3, 3, params.sheen);
        rect(ctx, bx + w - 6, by + 4, 2, 2, params.sheen);
        px(ctx, bx + 4, by + 6, lighten(params.sheen, 0.1));
      }
      rimLight(ctx, bx + 3, by, w - 6, 3, lighten(accent, 0.12), 'top');
      // Shell micro-texture — anisotropic pattern for chitin facets
      anisotropicSpeckle(ctx, bx + 1, by + 3, w - 2, h - 6, [darken(accent, 0.08), darken(accent, 0.14), lighten(accent, 0.05)], 0.20, Math.PI / 4, 1.8);
      ao(ctx, bx + 2, by + h - 3, w - 4, 3, 0.10);
    } else {
      // Non-shell body
      rect(ctx, bx + 3, by, w - 6, 3, body);
      rect(ctx, bx + 1, by + 2, w - 2, 2, body);
      rect(ctx, bx, by + 4, w, h - 8, body);
      rect(ctx, bx + 1, by + h - 4, w - 2, 2, shadow);
      rect(ctx, bx + 3, by + h - 2, w - 6, 2, shadow2);
      // Highlight stripe
      rect(ctx, bx + 3, by + 3, w - 6, 2, highlight);
    }

    // Head
    const headW = Math.min(w, Math.max(8, w - 2));
    const hx = cx - Math.floor(headW / 2);
    const hy = dir === DOWN ? by - 4 : by + h;
    rect(ctx, hx + 1, hy, headW - 2, 2, body);
    rect(ctx, hx, hy + 1, headW, 2, body);
    if (dir === DOWN) {
      // Eyes
      rect(ctx, hx + 1, hy, 3, 3, eye);
      rect(ctx, hx + headW - 4, hy, 3, 3, eye);
      px(ctx, hx + 1, hy, '#ffffff');
      px(ctx, hx + headW - 2, hy, '#ffffff');
      if (params.proboscis) {
        rect(ctx, cx - 1, hy + 3, 2, 4, '#cc0000');
        px(ctx, cx - 1, hy + 6, '#990000');
      }
    }

    // Antennae
    if (params.antennae || params.proboscis) {
      const ay = dir === DOWN ? hy - 4 : hy + 4;
      rect(ctx, hx, ay, 2, 3, outline);
      rect(ctx, hx + headW - 2, ay, 2, 3, outline);
      px(ctx, hx - 1, ay, outline); px(ctx, hx + headW, ay, outline);
    }

    // Legs (3 pairs)
    for (let i = 0; i < 3; i++) {
      const legY = by + Math.round(i * (h - 4) / 2) + 2;
      const off = (i === 1) ? -legOff : legOff;
      
      // Left legs
      drawInsectLeg(ctx, bx - 4, legY + off, false, shadow, outline, outline, 3);
      
      // Right legs
      drawInsectLeg(ctx, bx + w, legY - off, true, shadow, outline, outline, 3);
      
      if (params.jumpLegs && i === 2) {
        rect(ctx, bx - 9, legY + off + 3, 4, 2, shadow);
        rect(ctx, bx + w + 5, legY - off + 3, 4, 2, shadow);
        px(ctx, bx - 10, legY + off + 4, outline);
        px(ctx, bx + w + 9, legY - off + 4, outline);
      }
    }

    // Wings (translucent)
    if (params.wings) {
      const wy = by - 3 + (frame === 1 ? 0 : -3);
      const wingCol = 'rgba(180,190,220,0.35)';
      const wingHi = 'rgba(220,230,255,0.25)';
      rect(ctx, bx - 6, wy, 6, 4, wingCol);
      rect(ctx, bx + w, wy, 6, 4, wingCol);
      rect(ctx, bx - 4, wy + 3, 4, 3, wingCol);
      rect(ctx, bx + w + 2, wy + 3, 4, 3, wingCol);
      // Wing vein hint
      px(ctx, bx - 3, wy + 1, wingHi);
      px(ctx, bx + w + 3, wy + 1, wingHi);
    }
  } else {
    // LEFT / RIGHT
    const flip = dir === LEFT;
    const f = flip ? (x) => 63 - x : (x) => x;
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);

    if (params.shell) {
      // Shell body — dorsal gradient + keel line (body symmetric around cx=32)
      gradientV(ctx, bx, by, w, h, lighten(accent, 0.14), darken(accent, 0.16));
      for (let i = 2; i < w - 2; i++) { px(ctx, f(bx + i), by, lighten(accent, 0.18)); px(ctx, f(bx + i), by + 1, lighten(accent, 0.12)); }
      // Dorsal keel
      for (let r = 2; r < h - 2; r++) px(ctx, cx, by + r, darken(accent, 0.10));
      // Ventral shadow
      for (let i = 2; i < w - 2; i++) { px(ctx, f(bx + i), by + h - 2, darken(accent, 0.12)); px(ctx, f(bx + i), by + h - 1, darken(accent, 0.18)); }
      if (params.sheen) {
        rect(ctx, f(bx + 3), by + 3, 3, 3, params.sheen);
        px(ctx, f(bx + 4), by + 5, lighten(params.sheen, 0.1));
      }
      // Shell micro-texture (body symmetric coords)
      anisotropicSpeckle(ctx, bx + 1, by + 2, w - 2, h - 4, [darken(accent, 0.08), darken(accent, 0.13), lighten(accent, 0.05)], 0.18, Math.PI / 4, 1.8);
    } else {
      // Non-shell body — dorsal-to-ventral gradient
      gradientV(ctx, bx, by, w, h, highlight, shadow);
      for (let i = 2; i < w - 2; i++) { px(ctx, f(bx + i), by, highlight); px(ctx, f(bx + i), by + 1, lighten(body, 0.08)); }
      for (let i = 2; i < w - 2; i++) px(ctx, f(bx + i), by + h - 1, shadow2);
    }

    // Head (side)
    const headX = bx + w;
    for (let r = 0; r < Math.min(h, 7); r++) {
      px(ctx, f(headX), by + r, body);
      px(ctx, f(headX + 1), by + r, body);
      px(ctx, f(headX + 2), by + r, body);
    }
    rect(ctx, f(headX + 1), by, 2, 3, eye);
    px(ctx, f(headX + 1), by, '#ffffff');
    if (params.proboscis) rect(ctx, f(headX + 3), by + 3, 3, 2, '#cc0000');

    // Legs (side)
    for (let i = 0; i < 3; i++) {
      const lx = bx + Math.round(i * (w - 4) / 2) + 2;
      const off = (i === 1) ? -legOff : legOff;
      drawInsectLegSide(ctx, f, lx, by + h, off, shadow, outline, params.jumpLegs && i === 2);
    }

    // Wings (side)
    if (params.wings) {
      const wingCol = 'rgba(180,190,220,0.40)';
      const wingVein = 'rgba(140,160,200,0.55)';
      const wingHi = 'rgba(230,240,255,0.30)';
      const wy = by - 3 + (frame === 1 ? 0 : -3);
      for (let i = 2; i < w - 2; i++) {
        px(ctx, f(bx + i), wy, wingHi);       // leading edge (lighter)
        px(ctx, f(bx + i), wy + 1, wingCol);
        px(ctx, f(bx + i), wy + 2, wingCol);
      }
      // Wing cross-veins
      px(ctx, f(bx + 4), wy, wingVein); px(ctx, f(bx + 4), wy + 1, wingVein);
      if (w > 10) { px(ctx, f(bx + 7), wy, wingVein); px(ctx, f(bx + 7), wy + 1, wingVein); }
    }

    // Antennae (side)
    if (params.antennae) {
      rect(ctx, f(headX + 3), by - 3, 2, 3, outline);
      px(ctx, f(headX + 4), by - 4, outline);
    }
  }
}

function drawCaterpillar(ctx, params, dir, frame) {
  const { body, accent, eye, segments, spotColor } = params;
  const shadow = darken(body, 0.12);
  const shadow2 = darken(body, 0.2);
  const highlight = lighten(body, 0.12);
  const highlight2 = lighten(body, 0.2);
  const cx = 32;
  const cy = 36;
  const wavePhase = frame * 0.7;

  if (dir === DOWN || dir === UP) {
    const headAtTop = dir === DOWN;
    drawCaterpillarChainTop(ctx, cx, cy, segments, headAtTop, body, accent, spotColor);
    const hy = headAtTop ? cy - segments - 4 : cy + segments;
    // Head
    rect(ctx, cx - 5, hy, 10, 4, body);
    rect(ctx, cx - 4, hy, 8, 2, highlight);
    if (headAtTop) {
      // Eyes
      rect(ctx, cx - 5, hy + 1, 3, 3, eye);
      rect(ctx, cx + 3, hy + 1, 3, 3, eye);
      px(ctx, cx - 4, hy + 1, '#ffffff');
      px(ctx, cx + 4, hy + 1, '#ffffff');
      // Antennae
      rect(ctx, cx - 5, hy - 3, 2, 3, shadow);
      rect(ctx, cx + 4, hy - 3, 2, 3, shadow);
    }
  } else {
    const flip = dir === LEFT;
    const f = flip ? (x) => 63 - x : (x) => x;
    for (let s = 0; s < segments; s++) {
      const sx = cx - segments + s * 3 + 2;
      const wave = Math.round(Math.sin((s + wavePhase) * 1.1) * 2);
      const sy = cy - 3 + wave;
      const color = s % 2 === 0 ? body : accent;
      const segHi = lighten(color, 0.15);
      const segSh = darken(color, 0.15);
      // Segment with dorsal highlight and ventral shadow
      rect(ctx, f(sx), sy, 3, 4, color);
      rect(ctx, f(sx), sy, 3, 1, segHi);              // dorsal highlight
      rect(ctx, f(sx), sy + 3, 3, 1, segSh);          // ventral shadow
      px(ctx, f(sx + 2), sy + 1, segSh);              // trailing edge gap
      // Prolegs (wider for visibility)
      rect(ctx, f(sx), sy + 4, 2, 2, shadow2);
      // Spots
      if (spotColor && s % 2 === 0) {
        px(ctx, f(sx + 1), sy + 1, spotColor);
        px(ctx, f(sx + 1), sy + 2, darken(spotColor, 0.15));
      }
    }
    // Head
    const hx = cx + segments;
    rect(ctx, f(hx), cy - 4, 4, 8, body);
    rect(ctx, f(hx), cy - 3, 3, 2, highlight);
    rect(ctx, f(hx + 1), cy - 4, 2, 3, eye);
    px(ctx, f(hx + 1), cy - 4, '#ffffff');
    // Antennae
    rect(ctx, f(hx + 3), cy - 7, 2, 4, shadow);
  }
}
