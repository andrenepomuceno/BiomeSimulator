/**
 * Snake drawing template — 64x64 design grid.
 * Used by: snake species.
 *
 * Smooth sinusoidal body using segmentChain (overlapping circle stamps).
 * Avoids blocky "square" segment look while preserving direction animations.
 */
import { px, rect, darken, lighten, segmentChain, shadedEllipse, DOWN, UP, LEFT } from '../../helpers.js';
import { drawReptileEye, drawReptileHeadSide, drawTongue, drawBellyStripe, drawDorsalPattern, drawSegmentHighlights } from '../bodyParts.js';

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

    // Head — connect to nearest body segment
    const hw = headW || 10;
    const hh = headH || 7;
    const headAnchorY = dir === DOWN ? pts[0][1] : pts[segCount - 1][1];
    const headY = headAnchorY - hh + 1;
    const hCx = cx, hCy = headY + Math.floor(hh / 2);
    shadedEllipse(ctx, hCx, hCy, Math.floor(hw / 2) + 1, Math.floor(hh / 2), body, {
      highlight, shadow,
      texture: true, texColors: [shadow, darken(body, 0.10)], texDensity: 0.15,
    });

    // Snout nib — tapers upward from head top
    for (let i = 0; i < 3; i++) {
      const w = i === 0 ? 3 : i === 1 ? 2 : 1;
      rect(ctx, hCx - Math.floor(w / 2), headY - 1 - i, w, 1, darken(body, 0.06 + i * 0.05));
    }

    // Eyes — near snout on each side
    const eyeY = headY + 1;
    drawReptileEye(ctx, hCx - Math.floor(hw / 2) + 0, eyeY, eye);
    drawReptileEye(ctx, hCx + Math.floor(hw / 2) - 2, eyeY, eye);

    // Forked tongue — exits snout upward
    drawTongue(ctx, hCx, headY - 4, 2, -1);

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

    // Head — connect to last body segment
    const hw = headW || 10;
    const hh = headH || 7;
    const headX   = startX + (segCount - 1) * spacing + 1;
    const lastSegY = pts[segCount - 1][1];
    const by       = lastSegY - Math.floor(hh / 2);
    drawReptileHeadSide(ctx, f, headX, by, hw, hh, body, highlight, eye);

    // Forked tongue — horizontal, exits snout
    const td       = flip ? -1 : 1;
    const snoutTip = f(headX + hw - 1);
    px(ctx, snoutTip,          lastSegY,     '#cc2222');
    px(ctx, snoutTip + td,     lastSegY - 1, '#cc2222');
    px(ctx, snoutTip + td,     lastSegY + 1, '#cc2222');
  }
}
