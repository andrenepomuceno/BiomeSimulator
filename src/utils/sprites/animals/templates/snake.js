/**
 * Snake drawing template — 64x64 design grid.
 * Used by: snake species.
 *
 * Smooth sinusoidal body using segmentChain (overlapping circle stamps).
 * Avoids blocky "square" segment look while preserving direction animations.
 */
import { px, rect, ellipse, darken, lighten, speckle, segmentChain, shadedEllipse, DOWN, UP, LEFT } from '../../helpers.js';

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

    // Belly stripe down the spine
    const minPtY = Math.min(...pts.map(p => p[1]));
    const maxPtY = Math.max(...pts.map(p => p[1]));
    rect(ctx, cx - 1, minPtY, 3, maxPtY - minPtY + 1, bellyCol);

    // Top highlight on each segment
    for (let i = 0; i < pts.length; i++) {
      const [px_, py_] = pts[i];
      const r = radii[i];
      for (let ox = -Math.max(1, r - 2); ox <= Math.max(1, r - 2); ox++) {
        px(ctx, px_ + ox, py_ - r + 1, highlight);
      }
    }

    // Dorsal diamond pattern
    if (pattern) {
      for (let i = 1; i < segCount - 1; i += 2) {
        const [px_, py_] = pts[i];
        px(ctx, px_, py_, pattern);
        px(ctx, px_ - 1, py_ + 1, pattern);
        px(ctx, px_ + 1, py_ + 1, pattern);
        px(ctx, px_, py_ + 2, pattern);
      }
    }

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
      rect(ctx, hx + 1, headY + 2, 3, 3, eye);
      rect(ctx, hx + hw - 4, headY + 2, 3, 3, eye);
      px(ctx, hx + 2, headY + 3, '#000000');
      px(ctx, hx + hw - 3, headY + 3, '#000000');
      px(ctx, hx + 1, headY + 2, '#ffffff');
      px(ctx, hx + hw - 2, headY + 2, '#ffffff');
    }

    // Forked tongue
    const tongueY   = dir === DOWN ? headY + hh : headY - 3;
    const tongueDir = dir === DOWN ? 1 : -1;
    px(ctx, cx, tongueY, '#cc2222');
    px(ctx, cx, tongueY + tongueDir, '#cc2222');
    px(ctx, cx - 1, tongueY + tongueDir * 2, '#cc2222');
    px(ctx, cx + 1, tongueY + tongueDir * 2, '#cc2222');

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

    // Belly stripe along bottom
    for (let i = 0; i < pts.length; i++) {
      const [bx_, by_] = pts[i];
      const r = radii[i];
      rect(ctx, bx_ - r + 1, by_ + r - 1, r * 2 - 1, 2, bellyCol);
    }

    // Top highlight on each segment
    for (let i = 0; i < pts.length; i++) {
      const [px_, py_] = pts[i];
      const r = radii[i];
      for (let ox = -Math.max(1, r - 2); ox <= Math.max(1, r - 2); ox++) {
        px(ctx, px_ + ox, py_ - r + 1, highlight);
      }
    }

    // Dorsal diamond pattern
    if (pattern) {
      for (let i = 1; i < segCount - 1; i += 2) {
        const [px_, py_] = pts[i];
        px(ctx, px_, py_ - 1, pattern);
        px(ctx, px_ - 1, py_,  pattern);
        px(ctx, px_ + 1, py_,  pattern);
        px(ctx, px_, py_ + 1, pattern);
      }
    }

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
    rect(ctx, f(headX + hw - 3), hCy - 1, 2, 2, eye);
    px(ctx, f(headX + hw - 2), hCy, '#000000');
    px(ctx, f(headX + hw - 3), hCy - 1, '#ffffff');

    // Forked tongue
    px(ctx, f(headX + hw),     sideY, '#cc2222');
    px(ctx, f(headX + hw + 1), sideY, '#cc2222');
    px(ctx, f(headX + hw + 2), sideY - 1, '#cc2222');
    px(ctx, f(headX + hw + 2), sideY + 1, '#cc2222');
  }
}
