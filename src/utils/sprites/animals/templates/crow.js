/**
 * Crow template — compact rounded body, folded dark wing, wedge tail,
 * and stout pointed beak for a recognizable corvid silhouette.
 * 64x64 design grid.
 */
import { px, rect, darken, lighten, blend, speckle, shadedEllipse, fillPolygon, thickLine, DOWN, UP, LEFT } from '../../helpers.js';

export function drawCrow(ctx, params, dir, frame) {
  const { body, accent, eye, beak } = params;
  const cx = 32;
  // Crow is can_fly=true → anchor.y=1.0, sprite floats above shadow intentionally
  const cy = 33;
  const shadow  = darken(body, 0.20);
  const shadow2 = darken(body, 0.32);
  const highlight = lighten(body, 0.11);
  const featherTex = darken(body, 0.08);
  const wingOff = frame === 0 ? -2 : frame === 2 ? 2 : 0;

  // Shared feather texture overlay
  function feathers(x, y, w, h) {
    speckle(ctx, x, y, w, h,
      [featherTex, darken(body, 0.12), lighten(body, 0.03)], 0.22);
  }

  if (dir === DOWN || dir === UP) {
    const facingDown = dir === DOWN;
    const bx = cx - 10;
    const by = cy - 7;

    // Torso — shadedEllipse replaces the manual row-by-row roundBody
    shadedEllipse(ctx, cx, by + 8, 9, 8, body, {
      highlight, shadow,
      texture: true,
      texColors: [featherTex, darken(body, 0.12), lighten(body, 0.03)],
      texDensity: 0.22,
    });

    // Folded wings hugging body sides (unchanged, already clean)
    rect(ctx, bx - 2, by + 5 + wingOff, 5, 8, accent);
    rect(ctx, bx + 17, by + 5 + wingOff, 5, 8, accent);
    rect(ctx, bx - 1, by + 6 + wingOff, 3, 6, shadow);
    rect(ctx, bx + 18, by + 6 + wingOff, 3, 6, shadow);
    feathers(bx - 1, by + 6 + wingOff, 3, 5);
    feathers(bx + 18, by + 6 + wingOff, 3, 5);

    // Head — shadedEllipse
    const hy = facingDown ? by - 6 : by + 13;
    shadedEllipse(ctx, cx, hy + 3, 4, 3, body, { highlight });

    if (facingDown) {
      // Eyes — shadedEllipse per eye with iris depth
      shadedEllipse(ctx, cx - 3, hy + 3, 1, 1, darken(body, 0.35));
      px(ctx, cx - 3, hy + 3, eye);
      shadedEllipse(ctx, cx + 2, hy + 3, 1, 1, darken(body, 0.35));
      px(ctx, cx + 2, hy + 3, eye);

      // Beak — fillPolygon triangle (cleaner wedge than rect+px)
      fillPolygon(ctx, [
        [cx - 2, hy + 6],
        [cx + 2, hy + 6],
        [cx,     hy + 9],
      ], beak);
      px(ctx, cx, hy + 9, darken(beak, 0.18));
    }

    // Tail — fillPolygon fan wedge
    const ty = facingDown ? by + 16 : by - 5;
    const tDir = facingDown ? 1 : -1;
    fillPolygon(ctx, [
      [cx - 5, ty],
      [cx + 5, ty],
      [cx + 3, ty + tDir * 3],
      [cx - 3, ty + tDir * 3],
    ], accent);
    rect(ctx, cx - 3, ty + tDir, 6, 2, shadow2);

    // Legs/feet — thickLine
    const fy = by + 15;
    thickLine(ctx, cx - 3, fy, cx - 3, fy + 3, 0, shadow2);
    thickLine(ctx, cx + 3, fy, cx + 3, fy + 3, 0, shadow2);
    thickLine(ctx, cx - 3, fy + 3, cx - 5, fy + 3, 0, shadow2); // toe L
    thickLine(ctx, cx + 3, fy + 3, cx + 5, fy + 3, 0, shadow2); // toe R

  } else {
    const flip = dir === LEFT;
    const f = flip ? (x) => 63 - x : (x) => x;
    const bx = cx - 9;
    const by = cy - 8;

    // Body — shadedEllipse (side oval)
    shadedEllipse(ctx, f(bx + 9), by + 8, 9, 7, body, {
      highlight, shadow,
      texture: true,
      texColors: [featherTex, darken(body, 0.12), lighten(body, 0.03)],
      texDensity: 0.22,
    });

    // Folded wing over body
    fillPolygon(ctx, [
      [f(bx + 4), by + 5 - wingOff],
      [f(bx + 14), by + 5 - wingOff],
      [f(bx + 13), by + 11 - wingOff],
      [f(bx + 5),  by + 11 - wingOff],
    ], accent);
    feathers(f(flip ? bx + 5 : bx + 4), by + 6 - wingOff, 9, 4);
    // Feather tip details
    px(ctx, f(bx + 12), by + 11 - wingOff, shadow2);
    px(ctx, f(bx + 13), by + 10 - wingOff, shadow2);

    // Head — shadedEllipse
    const hx = bx + 17;
    shadedEllipse(ctx, f(hx + 3), by + 5, 3, 3, body, { highlight });

    // Eye
    shadedEllipse(ctx, f(hx + 4), by + 4, 1, 1, darken(body, 0.35));
    px(ctx, f(hx + 4), by + 4, eye);

    // Beak — fillPolygon pointed wedge (horizontal, forward)
    fillPolygon(ctx, [
      [f(hx + 6), by + 3],
      [f(hx + 9), by + 5],
      [f(hx + 6), by + 6],
    ], beak);

    // Tail — fillPolygon backward wedge
    fillPolygon(ctx, [
      [f(bx - 1), by + 6],
      [f(bx - 6), by + 9],
      [f(bx - 1), by + 11],
    ], accent);
    px(ctx, f(bx - 5), by + 9, shadow2);

    // Legs — thickLine + toe stubs
    thickLine(ctx, f(bx + 7), by + 15, f(bx + 7), by + 19, 0, shadow2);
    thickLine(ctx, f(bx + 11), by + 15, f(bx + 11), by + 19, 0, shadow2);
    thickLine(ctx, f(bx + 7),  by + 19, f(bx + 5),  by + 19, 0, shadow2);
    thickLine(ctx, f(bx + 11), by + 19, f(bx + 13), by + 19, 0, shadow2);
  }
}

export function drawCrow(ctx, params, dir, frame) {
  const { body, accent, eye, beak } = params;
  const cx = 32;
  // Crow is can_fly=true → anchor.y=1.0, sprite floats above shadow intentionally
  const cy = 33;
  const shadow = darken(body, 0.20);
  const shadow2 = darken(body, 0.32);
  const highlight = lighten(body, 0.11);
  const featherTex = darken(body, 0.08);
  const wingOff = frame === 0 ? -2 : frame === 2 ? 2 : 0;

  function roundBody(x, y, w, h) {
    for (let dy = 0; dy < h; dy++) {
      const t = h <= 1 ? 0 : dy / (h - 1);
      const inset = dy === 0 || dy === h - 1 ? 3 : (dy === 1 || dy === h - 2 ? 1 : 0);
      const col = blend(highlight, shadow, t);
      rect(ctx, x + inset, y + dy, Math.max(1, w - inset * 2), 1, col);
    }
    speckle(ctx, x + 2, y + 2, Math.max(1, w - 4), Math.max(1, h - 4),
      [featherTex, darken(body, 0.12), lighten(body, 0.03)], 0.22);
  }

  if (dir === DOWN || dir === UP) {
    const facingDown = dir === DOWN;
    const bx = cx - 10;
    const by = cy - 7;

    // Compact torso
    roundBody(bx, by, 20, 16);

    // Folded wings hugging body sides
    rect(ctx, bx - 2, by + 5 + wingOff, 5, 8, accent);
    rect(ctx, bx + 17, by + 5 + wingOff, 5, 8, accent);
    rect(ctx, bx - 1, by + 6 + wingOff, 3, 6, shadow);
    rect(ctx, bx + 18, by + 6 + wingOff, 3, 6, shadow);

    // Head (distinct rounded bump)
    const hy = facingDown ? by - 6 : by + 13;
    rect(ctx, cx - 4, hy + 1, 8, 6, body);
    rect(ctx, cx - 3, hy, 6, 2, highlight);

    if (facingDown) {
      // Eyes
      rect(ctx, cx - 4, hy + 3, 3, 2, darken(body, 0.35));
      rect(ctx, cx + 1, hy + 3, 3, 2, darken(body, 0.35));
      px(ctx, cx - 3, hy + 3, eye);
      px(ctx, cx + 2, hy + 3, eye);

      // Beak — stout triangular wedge
      rect(ctx, cx - 2, hy + 6, 4, 2, beak);
      px(ctx, cx - 1, hy + 8, beak);
      px(ctx, cx, hy + 8, darken(beak, 0.18));
    }

    // Tail — wedge fan opposite head
    const ty = facingDown ? by + 16 : by - 5;
    rect(ctx, cx - 5, ty, 10, 2, accent);
    rect(ctx, cx - 3, ty + (facingDown ? 2 : -2), 6, 2, shadow2);

    // Legs/feet
    const fy = by + 15;
    rect(ctx, cx - 4, fy, 2, 3, shadow2);
    rect(ctx, cx + 2, fy, 2, 3, shadow2);
    px(ctx, cx - 5, fy + 2, shadow2);
    px(ctx, cx + 4, fy + 2, shadow2);

  } else {
    const flip = dir === LEFT;
    const f = flip ? (x) => 63 - x : (x) => x;
    const bx = cx - 9;
    const by = cy - 8;

    // Body (side profile, rounded chest)
    roundBody(bx, by + 1, 18, 15);
    rect(ctx, f(bx + 2), by + 4, 14, 8, body);

    // Folded wing with feather edge (less boxy than generic bird)
    rect(ctx, f(bx + 4), by + 5 - wingOff, 10, 6, accent);
    rect(ctx, f(bx + 5), by + 6 - wingOff, 8, 5, shadow);
    px(ctx, f(bx + 12), by + 11 - wingOff, shadow2);
    px(ctx, f(bx + 13), by + 10 - wingOff, shadow2);

    // Head forward
    const hx = bx + 17;
    rect(ctx, f(hx), by + 2, 6, 6, body);
    rect(ctx, f(hx + 1), by + 2, 4, 2, highlight);

    // Eye
    rect(ctx, f(hx + 3), by + 4, 2, 2, darken(body, 0.35));
    px(ctx, f(hx + 3), by + 4, eye);

    // Beak — pointed wedge
    rect(ctx, f(hx + 6), by + 4, 3, 2, beak);
    px(ctx, f(hx + 9), by + 5, darken(beak, 0.22));

    // Tail wedge
    rect(ctx, f(bx - 4), by + 8, 5, 2, accent);
    rect(ctx, f(bx - 6), by + 9, 3, 2, shadow2);

    // Legs
    rect(ctx, f(bx + 6), by + 16, 2, 3, shadow2);
    rect(ctx, f(bx + 10), by + 16, 2, 3, shadow2);
    px(ctx, f(bx + 5), by + 18, shadow2);
    px(ctx, f(bx + 12), by + 18, shadow2);
  }
}
