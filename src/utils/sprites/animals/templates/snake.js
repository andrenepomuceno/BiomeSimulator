/**
 * Snake drawing template — 64x64 design grid.
 * Used by: snake species.
 *
 * Smooth sinusoidal body using segmentChain (overlapping circle stamps).
 * Avoids blocky "square" segment look while preserving direction animations.
 */
import { px, rect, ellipse, darken, lighten, speckle, segmentChain, shadedEllipse, DOWN, UP, LEFT } from '../../helpers.js';
import { drawReptileEye, drawTongue, drawBellyStripe, drawDorsalPattern, drawSegmentHighlights } from '../bodyParts.js';

export function drawSnake(ctx, params, dir, frame) {
  const { body, accent, pattern, belly, eye, headW, headH, segments, segW } = params;
  const shadow    = darken(body, 0.18);
  const highlight = lighten(body, 0.12);
  const outline   = darken(body, 0.32);
  const cx = 32;
  const cy = 37;
  const phase    = (frame / 3) * Math.PI * 2;
  const isVert   = dir === DOWN || dir === UP;
  const segCount = segments || 9;
  const sw       = segW || 6;
  const bellyCol = belly || accent;

  if (isVert) {
    const direction = dir === DOWN ? 1 : -1;
    const spacing   = sw - 1;
    const startY    = cy - direction * Math.floor(segCount * spacing / 2);

    // Build segment points / radii / colors
    const pts   = [];
    const radii = [];
    const cols  = [];
    for (let i = 0; i < segCount; i++) {
      const yOff = startY + i * spacing * direction;
      const xOff = cx + Math.round(Math.sin(phase + i * 0.6) * 8);
      const edgeFade = i < 2 ? 2 - i : i > segCount - 3 ? (segCount - 1 - i) * 0.6 : 0;
      const r = Math.max(2, Math.round(sw * 0.5 + edgeFade));
      pts.push([xOff, yOff]);
      radii.push(r);
      cols.push(i % 3 === 0 && pattern ? pattern : (i % 2 === 0 ? body : accent));
    }
    segmentChain(ctx, pts, radii, cols);

    // Belly stripe, segment highlights, dorsal pattern
    drawBellyStripe(ctx, pts, radii, bellyCol, false);
    drawSegmentHighlights(ctx, pts, radii, highlight, false);
    if (pattern) drawDorsalPattern(ctx, pts, pattern, false);

    // Head — shadedEllipse
    const hw = headW || 10;
    const hh = headH || 7;
    const headY = dir === DOWN ? startY - hh - 2 : startY + segCount * spacing;
    const hCx = cx, hCy = headY + Math.floor(hh / 2);
    shadedEllipse(ctx, hCx, hCy, Math.floor(hw / 2), Math.floor(hh / 2), body, {
      highlight, shadow,
      texture: true, texColors: [shadow, darken(body, 0.10)], texDensity: 0.15,
    });

    // Eyes (slit pupil)
    if (dir === DOWN) {
      const hx = hCx - Math.floor(hw / 2);
      drawReptileEye(ctx, hx + 1, headY + 2, eye);
      drawReptileEye(ctx, hx + hw - 4, headY + 2, eye);
    }

    // Forked tongue
    const tongueY   = dir === DOWN ? headY + hh : headY - 3;
    const tongueDir = dir === DOWN ? 1 : -1;
    drawTongue(ctx, cx, tongueY, 2, tongueDir);

  } else {
    // LEFT / RIGHT
    const flip    = dir === LEFT;
    const f       = flip ? (x) => 63 - x : (x) => x;
    const spacing = sw - 1;
    const startX  = cx - Math.floor(segCount * spacing / 2);
    const sideY   = cy + 10;

    // Build segment points / radii / colors
    const pts   = [];
    const radii = [];
    const cols  = [];
    for (let i = 0; i < segCount; i++) {
      const xOff = startX + i * spacing;
      const yOff = sideY + Math.round(Math.sin(phase + i * 0.6) * 6);
      const edgeFade = i < 2 ? 2 - i : i > segCount - 3 ? (segCount - 1 - i) * 0.6 : 0;
      const r = Math.max(2, Math.round(sw * 0.5 + edgeFade));
      pts.push([f(xOff), yOff]);
      radii.push(r);
      cols.push(i % 3 === 0 && pattern ? pattern : (i % 2 === 0 ? body : accent));
    }
    segmentChain(ctx, pts, radii, cols);

    // Belly stripe, segment highlights, dorsal pattern
    drawBellyStripe(ctx, pts, radii, bellyCol, true);
    drawSegmentHighlights(ctx, pts, radii, highlight, true);
    if (pattern) drawDorsalPattern(ctx, pts, pattern, true);

    // Head — shadedEllipse
    const hw = headW || 10;
    const hh = headH || 7;
    const headX = startX + segCount * spacing + 1;
    const hCx = f(headX + Math.floor(hw / 2));
    const hCy = sideY;
    shadedEllipse(ctx, hCx, hCy, Math.floor(hw / 2), Math.floor(hh / 2), body, {
      highlight, shadow,
      texture: true, texColors: [shadow, darken(body, 0.10)], texDensity: 0.15,
    });

    // Eye
    drawReptileEye(ctx, f(headX + hw - 3), hCy - 1, eye);

    // Forked tongue
    drawTongue(ctx, f(headX + hw), sideY, 2, flip ? -1 : 1);
  }
}
