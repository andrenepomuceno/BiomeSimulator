/**
 * Quadruped drawing template — 64x64 design grid.
 * Used by: rabbit, squirrel, fox, wolf, raccoon, goat, deer, boar, bear.
 *
 * Rich shading model:
 *   - 4-tone body: highlight -> body -> shadow -> outline
 *   - Fur texture via noise-driven speckle
 *   - Detailed eyes with sclera, iris, pupil, highlight
 *   - Inner-ear detail, paw pads, species-specific markings
 */
import { px, rect, dither, darken, lighten, blend, gradientV, rimLight, ao, speckle, softCircle, anisotropicSpeckle, DOWN, UP, LEFT } from '../../helpers.js';
import { drawEyePair, drawEarPair, drawEarSide, drawNose, drawCheekPair, drawHorns, drawAntlers, drawTusks, drawMask, drawMuzzle, drawFurTexture, drawHead, drawQuadrupedLeg, drawQuadrupedLegSide, drawEyeSide, drawQuadrupedTailTop, drawQuadrupedTailBack, drawQuadrupedTailSide } from '../bodyParts.js';

export function drawQuadruped(ctx, params, dir, frame) {
  const { body, accent, eye, w, h } = params;
  const shadow = darken(body, 0.15);
  const shadow2 = darken(body, 0.25);
  const highlight = lighten(body, 0.10);
  const highlight2 = lighten(body, 0.18);
  const outline = darken(body, 0.35);
  const bellyCol = params.bellyColor || accent;
  const pawCol = params.pawColor || outline;
  const spotCol = params.spotColor || accent;
  const eyeIris = params.eyeIris || eye;
  const eyeWhite = params.eyeWhite || '#ffffff';
  const furTex = params.furTexture || darken(body, 0.06);
  const antlerBase = params.antlerBase || '#b08050';
  const antlerMid = params.antlerMid || '#c09868';
  const antlerTip = params.antlerTip || '#d0b080';
  const hornBase = params.hornBase || '#d0d0d0';
  const hornTip = params.hornTip || '#e8e8e8';
  const beardLen = params.beardLen || 2;
  const roundedBody = !!params.roundedBody;
  const heavyPaws = !!params.heavyPaws;
  const shoulderHump = !!params.shoulderHump;
  const wolfScruff = !!params.wolfScruff;
  const longSnout = !!params.longSnout;

  const cx = 32;
  const cy = 36;
  const legShift = frame === 0 ? -3 : frame === 2 ? 3 : 0;

  if (dir === DOWN) {
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);

    // -- Back legs (behind body) --
    drawQuadrupedLeg(ctx, bx + 1, by + h + legShift, shadow, outline, pawCol);
    drawQuadrupedLeg(ctx, bx + w - 5, by + h - legShift, shadow, outline, pawCol);

    // -- Body -- rounded with multi-tone shading --
    rect(ctx, bx + 4, by, w - 8, 3, highlight2);
    rect(ctx, bx + 2, by + 2, w - 4, 2, highlight);
    gradientV(ctx, bx, by + 4, w, h - 8, body, shadow);
    rect(ctx, bx + 2, by + h - 4, w - 4, 2, shadow);
    rect(ctx, bx + 4, by + h - 2, w - 8, 2, shadow2);
    // Left edge shadow
    for (let r = 4; r < h - 4; r++) { px(ctx, bx, by + r, shadow); px(ctx, bx + 1, by + r, shadow); }
    // Right edge subtle shadow
    for (let r = 4; r < h - 4; r++) px(ctx, bx + w - 1, by + r, shadow);
    // Top highlight stripe
    rect(ctx, bx + 6, by + 4, Math.max(4, w - 12), 2, highlight2);
    // Rim light on back
    rimLight(ctx, bx + 4, by, w - 8, 3, highlight2, 'top');
    // Belly accent
    rect(ctx, bx + 3, by + h - 6, w - 6, 3, bellyCol);
    // Underside ambient occlusion
    ao(ctx, bx + 2, by + h - 3, w - 4, 3, 0.08);
    // Fur texture — vertical streaks (head-to-tail direction in top-down view)
    drawFurTexture(ctx, bx + 3, by + 6, w - 6, h - 12, body, Math.PI / 2);
    if (roundedBody) {
      rect(ctx, bx + 1, by + 5, 1, h - 10, body);
      rect(ctx, bx + w - 2, by + 5, 1, h - 10, body);
      rect(ctx, bx + 5, by - 1, w - 10, 1, highlight);
    }
    if (shoulderHump) {
      rect(ctx, bx + 7, by, w - 14, 1, lighten(body, 0.14));
      rect(ctx, bx + 8, by + 1, w - 16, 1, highlight2);
    }
    if (wolfScruff) {
      px(ctx, bx + 6, by + 1, darken(body, 0.10));
      px(ctx, bx + 9, by, darken(body, 0.14));
      px(ctx, bx + 12, by + 1, darken(body, 0.10));
      px(ctx, bx + w - 11, by, darken(body, 0.14));
      px(ctx, bx + w - 8, by + 1, darken(body, 0.10));
    }
    // Spots (deer)
    if (params.spots) {
      rect(ctx, bx + 6, by + 6, 3, 3, spotCol);
      rect(ctx, bx + w - 9, by + 8, 3, 2, spotCol);
      rect(ctx, bx + 4, by + h - 10, 2, 2, spotCol);
      rect(ctx, bx + w - 7, by + 4, 2, 2, spotCol);
    }
    // Bristles (boar) — dorsal ridge crest
    if (params.bristles) {
      const bristleCol = params.bristleColor || lighten(body, 0.12);
      const step = Math.floor((w - 8) / 5);
      for (let i = 0; i < 5; i++) {
        const bri = bx + 4 + i * step;
        px(ctx, bri, by - 1, bristleCol);
        px(ctx, bri + 1, by, bristleCol);
        px(ctx, bri, by, darken(bristleCol, 0.08));
      }
    }

    // -- Head --
    const headW = Math.max(12, w - 2);
    const hx = cx - Math.floor(headW / 2);
    const hy = by - 8;
    drawHead(ctx, hx, hy, headW, 8, body, highlight, shadow);
    // Cheeks
    if (params.cheeks) {
      drawCheekPair(ctx, hx, hy + 4, headW, 0, params.cheeks);
    }
    // -- Eyes -- sclera, iris, pupil, highlight
    drawEyePair(ctx, hx, hy + 3, headW, 3, 0, eyeWhite, eyeIris);
    // Nose
    if (params.noseColor) {
      drawNose(ctx, cx, hy + 7, params.noseColor, true);
      if (longSnout) rect(ctx, cx - 1, hy + 8, 2, 1, params.noseColor);
    }

    // -- Ears --
    if (params.earH) {
      drawEarPair(ctx, hx, hy, headW, params.earH, body, params.earInner, params.pointedEars);
    }
    // Horns
    if (params.horns) {
      drawHorns(ctx, hx, hy - 2, headW, 3, hornBase, hornTip);
    }
    // Antlers
    if (params.antlers) {
      drawAntlers(ctx, hx, hy - 3, headW, antlerBase, antlerMid, antlerTip);
    }
    // Tusks
    if (params.tusks) {
      drawTusks(ctx, hx + 1, by - 1);
    }
    // Mask (raccoon)
    if (params.mask) {
      drawMask(ctx, hx + 3, hy + 2);
    }
    // Beard
    if (params.beard) {
      rect(ctx, cx - 2, by - 1, 4, 3, accent);
      rect(ctx, cx - 1, by + 2, 2, beardLen, accent);
    }
    // Muzzle (bear)
    if (params.muzzle) {
      rect(ctx, cx - 3, hy + 5, 6, 3, params.muzzle);
      px(ctx, cx - 2, hy + 5, lighten(params.muzzle, 0.1));
    }

    // -- Front legs --
    const legY = by + h;
    drawQuadrupedLeg(ctx, bx + 3, legY - legShift, body, outline, pawCol, heavyPaws);
    drawQuadrupedLeg(ctx, bx + w - 7, legY + legShift, body, outline, pawCol, heavyPaws);

    // -- Tail --
    if (params.tail) {
      const tailStyle = params.squirrelTail
        ? 'squirrel'
        : params.cottonTail
          ? 'cotton'
          : params.bushyTail
            ? 'bushy'
            : params.tailStripes
              ? 'striped'
              : 'plain';
      drawQuadrupedTailTop(ctx, cx, by + h, tailStyle, body, accent, shadow);
    }

  } else if (dir === UP) {
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);

    // -- Back legs --
    drawQuadrupedLeg(ctx, bx + 1, by + h + legShift, shadow, outline);
    drawQuadrupedLeg(ctx, bx + w - 5, by + h - legShift, shadow, outline);

    // -- Body --
    rect(ctx, bx + 4, by, w - 8, 3, body);
    rect(ctx, bx + 2, by + 2, w - 4, 2, body);
    gradientV(ctx, bx, by + 4, w, h - 8, body, shadow);
    rect(ctx, bx + 2, by + h - 4, w - 4, 2, shadow);
    rect(ctx, bx + 4, by + h - 2, w - 8, 2, shadow2);
    for (let r = 4; r < h - 4; r++) { px(ctx, bx, by + r, shadow); px(ctx, bx + 1, by + r, shadow); }
    rect(ctx, bx + 6, by + 4, Math.max(4, w - 12), 2, highlight);
    rimLight(ctx, bx + 4, by, w - 8, 3, highlight, 'top');
    drawFurTexture(ctx, bx + 3, by + 6, w - 6, h - 12, body, Math.PI / 2);
    if (wolfScruff) {
      px(ctx, bx + 6, by + 1, darken(body, 0.10));
      px(ctx, bx + 9, by, darken(body, 0.14));
      px(ctx, bx + 12, by + 1, darken(body, 0.10));
      px(ctx, bx + w - 11, by, darken(body, 0.14));
      px(ctx, bx + w - 8, by + 1, darken(body, 0.10));
    }
    if (params.spots) {
      rect(ctx, bx + 6, by + 6, 3, 3, spotCol);
      rect(ctx, bx + w - 9, by + 10, 2, 2, spotCol);
    }

    // -- Head (back view) --
    const headW = Math.max(12, w - 2);
    const hx = cx - Math.floor(headW / 2);
    const hy = by - 8;
    drawHead(ctx, hx, hy, headW, 8, body, highlight, shadow);
    // Ears
    if (params.earH) {
      drawEarPair(ctx, hx, hy, headW, params.earH, body, params.earInner, params.pointedEars);
    }
    if (params.horns) {
      drawHorns(ctx, hx, hy - 2, headW, 3, hornBase, hornTip);
    }
    if (params.antlers) {
      drawAntlers(ctx, hx, hy - 3, headW, antlerBase, antlerMid, antlerTip);
    }

    // -- Front legs --
    const legY = by + h;
    drawQuadrupedLeg(ctx, bx + 3, legY - legShift, body, outline);
    drawQuadrupedLeg(ctx, bx + w - 7, legY + legShift, body, outline);

    // -- Tail (back view) --
    if (params.tail) {
      const tailStyle = params.squirrelTail
        ? 'squirrel'
        : params.cottonTail
          ? 'cotton'
          : params.bushyTail
            ? 'bushy'
            : params.tailStripes
              ? 'striped'
              : 'plain';
      drawQuadrupedTailBack(ctx, cx, hy, tailStyle, body, accent, shadow);
    }

  } else {
    // -- LEFT / RIGHT --
    const flip = dir === LEFT;
    const f = flip ? (x) => 63 - x : (x) => x;
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);

    // -- Back legs --
    drawQuadrupedLegSide(ctx, f, bx, by + h, shadow, outline, pawCol, -legShift);
    rect(ctx, f(bx + 3), by + h, 3, 4, shadow);   // rear stub
    // -- Front legs --
    drawQuadrupedLegSide(ctx, f, bx + w - 6, by + h, body, outline, pawCol, legShift);
    rect(ctx, f(bx + w - 3), by + h, 3, 4, body);  // front stub

    // -- Body -- dorsal-to-ventral gradient with directional fur streaks
    // Body is symmetric around cx=32 so gradientV coords work for both flip directions
    gradientV(ctx, bx, by, w, h, highlight2, shadow2);
    // Dorsal ridge (back) — bright highlight along spine
    for (let i = 2; i < w - 2; i++) { px(ctx, f(bx + i), by, highlight2); px(ctx, f(bx + i), by + 1, highlight2); }
    for (let i = 2; i < w - 2; i++) { px(ctx, f(bx + i), by + 2, highlight); px(ctx, f(bx + i), by + 3, highlight); }
    // Ventral shadow
    for (let i = 2; i < w - 2; i++) { px(ctx, f(bx + i), by + h - 2, shadow); px(ctx, f(bx + i), by + h - 1, shadow2); }
    // Belly accent
    for (let i = 3; i < w - 3; i++) {
      px(ctx, f(bx + i), by + h - 5, blend(bellyCol, body, 0.4));
      px(ctx, f(bx + i), by + h - 4, bellyCol);
      px(ctx, f(bx + i), by + h - 3, bellyCol);
    }
    // Horizontal fur streaks along movement axis (body is symmetric, no flip needed for texture)
    anisotropicSpeckle(ctx, bx + 2, by + 3, w - 4, h - 6, [furTex, darken(body, 0.10), lighten(body, 0.06)], 0.28, 0, 3.5);
    if (params.spots) {
      rect(ctx, f(bx + 6), by + 6, 3, 3, spotCol);
      rect(ctx, f(bx + w - 9), by + 4, 2, 2, spotCol);
    }

    // -- Head --
    const headH = Math.max(10, h - 2);
    const headW = longSnout ? 11 : 10;
    const headX = bx + w;
    const headY = by - 3;
    // Gradient fill: top-highlight to bottom-shadow; compute real screen left for gradientV
    const headLeft = flip ? (64 - bx - w - headW) : (bx + w);
    gradientV(ctx, headLeft, headY + 1, headW, headH - 2, highlight, shadow);
    // Cap top/bottom (rounded)
    for (let hxo = 2; hxo < headW - 2; hxo++) px(ctx, f(headX + hxo), headY, body);
    for (let hxo = 2; hxo < headW - 2; hxo++) px(ctx, f(headX + hxo), headY + headH - 1, shadow2);
    // Cranium highlight ridge
    for (let hxo = 1; hxo < headW - 1; hxo++) { px(ctx, f(headX + hxo), headY + 1, highlight2); }
    for (let hxo = 1; hxo < headW - 1; hxo++) { px(ctx, f(headX + hxo), headY + 2, highlight); px(ctx, f(headX + hxo), headY + 3, highlight); }
    // Front face edge shadow (snout side)
    for (let hyo = 2; hyo < headH - 2; hyo++) px(ctx, f(headX + headW - 1), headY + hyo, shadow);

    // -- Eye (side) --
    drawEyeSide(ctx, f, headX + headW - 6, headY + 2, eyeWhite, eyeIris, outline);
    // Nose
    if (params.noseColor) rect(ctx, f(headX + headW - 3), headY + headH - 4, 3, 3, params.noseColor);
    if (longSnout && params.noseColor) rect(ctx, f(headX + headW - 1), headY + headH - 3, 2, 1, params.noseColor);
    // Cheeks
    if (params.cheeks) rect(ctx, f(headX + 1), headY + 6, 3, 3, params.cheeks);
    // Muzzle (bear)
    if (params.muzzle) {
      rect(ctx, f(headX + 3), headY + headH - 4, 7, 3, params.muzzle);
    }

    // -- Ear (side) --
    if (params.earH) {
      drawEarSide(ctx, f, headX + 3, headY - 2, params.earH, body, params.earInner, params.pointedEars);
    }
    // Horns (side)
    if (params.horns) {
      rect(ctx, f(headX + 3), headY - 3, 3, 3, hornBase);
      rect(ctx, f(headX + 3), headY - 7, 3, 4, hornTip);
    }
    // Antlers (side)
    if (params.antlers) {
      const ac = antlerBase, al = antlerMid;
      rect(ctx, f(headX + 3), headY - 3, 3, 3, ac);
      rect(ctx, f(headX + 3), headY - 7, 3, 4, ac);
      rect(ctx, f(headX), headY - 7, 3, 3, al);
      rect(ctx, f(headX + 6), headY - 10, 3, 3, antlerTip);
    }
    // Tusks (side)
    if (params.tusks) rect(ctx, f(headX + headW - 3), headY + headH, 3, 3, '#f0f0e0');
    // Mask (raccoon side)
    if (params.mask) {
      rect(ctx, f(headX + headW - 5), headY + 1, 3, 3, '#111111');
      rect(ctx, f(headX + headW - 5), headY + 6, 3, 3, '#111111');
    }
    // Beard (goat side)
    if (params.beard) rect(ctx, f(headX + 3), headY + headH, 3, beardLen + 2, accent);
    // Bristles (boar side) — dorsal crest spikes
    if (params.bristles) {
      const bristleCol = params.bristleColor || lighten(body, 0.12);
      for (let i = 0; i < 5; i++) {
        const bri = bx + 4 + i * Math.floor((w - 8) / 5);
        px(ctx, f(bri), by - 2, bristleCol);
        px(ctx, f(bri), by - 1, bristleCol);
        px(ctx, f(bri), by, darken(bristleCol, 0.06));
      }
    }
    if (wolfScruff) {
      px(ctx, f(bx + 7), by + 1, darken(body, 0.10));
      px(ctx, f(bx + 10), by, darken(body, 0.14));
      px(ctx, f(bx + 13), by + 1, darken(body, 0.10));
    }

    // -- Tail --
    if (params.tail) {
      const tailX = bx - 3;
      const tailY = by + 3;
      const tailStyle = params.squirrelTail
        ? 'squirrel'
        : params.cottonTail
          ? 'cotton'
          : params.bushyTail
            ? 'bushy'
            : params.tailStripes
              ? 'striped'
              : 'plain';
      drawQuadrupedTailSide(ctx, f, tailX, tailY, tailStyle, body, accent, shadow, shadow2);
    }
  }
}
