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
import { px, rect, dither, darken, lighten, blend, noise, DOWN, UP, LEFT } from '../../helpers.js';

export function drawQuadruped(ctx, params, dir, frame) {
  const { body, accent, eye, w, h } = params;
  const shadow = darken(body, 0.15);
  const shadow2 = darken(body, 0.25);
  const highlight = lighten(body, 0.10);
  const highlight2 = lighten(body, 0.18);
  const outline = darken(body, 0.35);
  const bellyCol = params.bellyColor || accent;
  const pawCol = params.pawColor || outline;
  const eyeIris = params.eyeIris || eye;
  const eyeWhite = params.eyeWhite || '#ffffff';
  const furTex = params.furTexture || darken(body, 0.06);

  const cx = 32;
  const cy = 36;
  const legShift = frame === 0 ? -3 : frame === 2 ? 3 : 0;

  // Helper: add fur noise to a rectangular region
  function furRegion(x, y, rw, rh, baseColor) {
    for (let dy = 0; dy < rh; dy++) {
      for (let dx = 0; dx < rw; dx++) {
        const n = noise(x + dx, y + dy);
        if (n > 0.78) px(ctx, x + dx, y + dy, furTex);
      }
    }
  }

  if (dir === DOWN) {
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);

    // -- Back legs (behind body) --
    rect(ctx, bx + 1, by + h + legShift, 4, 4, shadow);
    rect(ctx, bx + 1, by + h + 4 + legShift, 4, 3, outline);
    rect(ctx, bx + 2, by + h + 6 + legShift, 2, 2, pawCol);
    rect(ctx, bx + w - 5, by + h - legShift, 4, 4, shadow);
    rect(ctx, bx + w - 5, by + h + 4 - legShift, 4, 3, outline);
    rect(ctx, bx + w - 4, by + h + 6 - legShift, 2, 2, pawCol);

    // -- Body -- rounded with multi-tone shading --
    rect(ctx, bx + 4, by, w - 8, 3, highlight2);
    rect(ctx, bx + 2, by + 2, w - 4, 2, highlight);
    rect(ctx, bx, by + 4, w, h - 8, body);
    rect(ctx, bx + 2, by + h - 4, w - 4, 2, shadow);
    rect(ctx, bx + 4, by + h - 2, w - 8, 2, shadow2);
    // Left edge shadow
    for (let r = 4; r < h - 4; r++) { px(ctx, bx, by + r, shadow); px(ctx, bx + 1, by + r, shadow); }
    // Right edge subtle shadow
    for (let r = 4; r < h - 4; r++) px(ctx, bx + w - 1, by + r, shadow);
    // Top highlight stripe
    rect(ctx, bx + 6, by + 4, Math.max(4, w - 12), 2, highlight2);
    // Belly accent
    rect(ctx, bx + 3, by + h - 6, w - 6, 3, bellyCol);
    // Fur texture
    furRegion(bx + 3, by + 6, w - 6, h - 12, body);
    // Spots (deer)
    if (params.spots) {
      rect(ctx, bx + 6, by + 6, 3, 3, accent);
      rect(ctx, bx + w - 9, by + 8, 3, 2, accent);
      rect(ctx, bx + 4, by + h - 10, 2, 2, accent);
      rect(ctx, bx + w - 7, by + 4, 2, 2, accent);
    }
    // Bristles (boar)
    if (params.bristles) {
      for (let i = 0; i < 4; i++) {
        px(ctx, bx + 4 + i * 3, by + 1, darken(body, 0.12));
        px(ctx, bx + 5 + i * 3, by + 2, darken(body, 0.08));
      }
    }

    // -- Head --
    const headW = Math.max(12, w - 2);
    const hx = cx - Math.floor(headW / 2);
    const hy = by - 8;
    // Head shape
    rect(ctx, hx + 2, hy, headW - 4, 3, body);
    rect(ctx, hx, hy + 3, headW, 5, body);
    rect(ctx, hx + 1, hy + 1, headW - 2, 2, body);
    // Head highlight
    rect(ctx, hx + 3, hy + 1, headW - 6, 2, highlight);
    // Left/right shadow
    px(ctx, hx, hy + 4, shadow); px(ctx, hx + 1, hy + 4, shadow);
    px(ctx, hx, hy + 5, shadow); px(ctx, hx + 1, hy + 5, shadow);
    // Cheeks
    if (params.cheeks) {
      rect(ctx, hx, hy + 4, 3, 3, params.cheeks);
      rect(ctx, hx + headW - 3, hy + 4, 3, 3, params.cheeks);
    }
    // -- Eyes -- sclera, iris, pupil, highlight
    rect(ctx, hx + 3, hy + 3, 4, 4, eyeWhite);
    rect(ctx, hx + 4, hy + 4, 2, 2, eyeIris);
    px(ctx, hx + 4, hy + 4, darken(eyeIris, 0.3));
    px(ctx, hx + 3, hy + 3, eyeWhite);
    rect(ctx, hx + headW - 7, hy + 3, 4, 4, eyeWhite);
    rect(ctx, hx + headW - 6, hy + 4, 2, 2, eyeIris);
    px(ctx, hx + headW - 5, hy + 4, darken(eyeIris, 0.3));
    px(ctx, hx + headW - 4, hy + 3, eyeWhite);
    // Nose
    if (params.noseColor) {
      rect(ctx, cx - 2, hy + 7, 4, 3, params.noseColor);
      px(ctx, cx - 1, hy + 7, lighten(params.noseColor, 0.2));
    }

    // -- Ears --
    if (params.earH) {
      const earH = params.earH;
      for (let e = 0; e < earH; e++) {
        const ew = e < earH - 2 ? 3 : 2;
        rect(ctx, hx, hy - 1 - e, ew, 1, body);
        rect(ctx, hx + headW - ew, hy - 1 - e, ew, 1, body);
      }
      if (params.earInner && earH >= 6) {
        for (let e = 1; e < earH - 2; e++) {
          px(ctx, hx + 1, hy - 1 - e, params.earInner);
          px(ctx, hx + headW - 2, hy - 1 - e, params.earInner);
        }
      }
    }
    // Horns
    if (params.horns) {
      const hc = '#d0d0d0', hl = '#e8e8e8';
      rect(ctx, hx - 3, hy - 2, 3, 3, hc);
      rect(ctx, hx + headW, hy - 2, 3, 3, hc);
      rect(ctx, hx - 3, hy - 5, 3, 3, hl);
      rect(ctx, hx + headW, hy - 5, 3, 3, hl);
      px(ctx, hx - 2, hy - 6, hl); px(ctx, hx + headW + 1, hy - 6, hl);
    }
    // Antlers
    if (params.antlers) {
      const ac = '#b08050', al = '#c09868', at = '#d0b080';
      rect(ctx, hx - 3, hy - 3, 3, 3, ac);
      rect(ctx, hx + headW, hy - 3, 3, 3, ac);
      rect(ctx, hx - 3, hy - 7, 3, 4, ac);
      rect(ctx, hx + headW, hy - 7, 3, 4, ac);
      rect(ctx, hx - 6, hy - 7, 3, 3, al);
      rect(ctx, hx + headW + 3, hy - 7, 3, 3, al);
      rect(ctx, hx - 6, hy - 11, 3, 4, at);
      rect(ctx, hx + headW + 3, hy - 11, 3, 4, at);
      px(ctx, hx - 3, hy - 10, al); px(ctx, hx + headW + 2, hy - 10, al);
    }
    // Tusks
    if (params.tusks) {
      rect(ctx, hx + 1, by - 1, 3, 3, '#f0f0e0');
      rect(ctx, hx + headW - 4, by - 1, 3, 3, '#f0f0e0');
      px(ctx, hx + 2, by - 1, '#fffff0');
      px(ctx, hx + headW - 3, by - 1, '#fffff0');
    }
    // Mask (raccoon)
    if (params.mask) {
      rect(ctx, hx + 3, hy + 2, 4, 3, '#111111');
      rect(ctx, hx + headW - 7, hy + 2, 4, 3, '#111111');
      px(ctx, hx + 4, hy + 2, '#222222');
      px(ctx, hx + headW - 5, hy + 2, '#222222');
    }
    // Beard
    if (params.beard) {
      rect(ctx, cx - 2, by - 1, 4, 3, accent);
      rect(ctx, cx - 1, by + 2, 2, 2, accent);
    }
    // Muzzle (bear)
    if (params.muzzle) {
      rect(ctx, cx - 3, hy + 5, 6, 3, params.muzzle);
      px(ctx, cx - 2, hy + 5, lighten(params.muzzle, 0.1));
    }

    // -- Front legs --
    const legY = by + h;
    rect(ctx, bx + 3, legY - legShift, 4, 4, body);
    rect(ctx, bx + 3, legY + 4 - legShift, 4, 3, outline);
    rect(ctx, bx + 4, legY + 6 - legShift, 2, 2, pawCol);
    rect(ctx, bx + w - 7, legY + legShift, 4, 4, body);
    rect(ctx, bx + w - 7, legY + 4 + legShift, 4, 3, outline);
    rect(ctx, bx + w - 6, legY + 6 + legShift, 2, 2, pawCol);

    // -- Tail --
    if (params.tail) {
      if (params.bushyTail) {
        rect(ctx, cx - 1, by + h - 3, 4, 4, accent);
        rect(ctx, cx + 2, by + h - 1, 3, 3, accent);
        rect(ctx, cx, by + h - 2, 3, 2, lighten(accent, 0.1));
      } else if (params.tailStripes) {
        rect(ctx, cx - 1, by + h, 3, 3, body);
        rect(ctx, cx - 1, by + h + 3, 3, 3, '#333333');
        rect(ctx, cx - 1, by + h + 6, 3, 2, body);
      } else {
        rect(ctx, cx - 1, by + h, 3, 4, shadow);
      }
    }

  } else if (dir === UP) {
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);

    // -- Back legs --
    rect(ctx, bx + 1, by + h + legShift, 4, 4, shadow);
    rect(ctx, bx + 1, by + h + 4 + legShift, 4, 3, outline);
    rect(ctx, bx + w - 5, by + h - legShift, 4, 4, shadow);
    rect(ctx, bx + w - 5, by + h + 4 - legShift, 4, 3, outline);

    // -- Body --
    rect(ctx, bx + 4, by, w - 8, 3, body);
    rect(ctx, bx + 2, by + 2, w - 4, 2, body);
    rect(ctx, bx, by + 4, w, h - 8, body);
    rect(ctx, bx + 2, by + h - 4, w - 4, 2, shadow);
    rect(ctx, bx + 4, by + h - 2, w - 8, 2, shadow2);
    for (let r = 4; r < h - 4; r++) { px(ctx, bx, by + r, shadow); px(ctx, bx + 1, by + r, shadow); }
    rect(ctx, bx + 6, by + 4, Math.max(4, w - 12), 2, highlight);
    furRegion(bx + 3, by + 6, w - 6, h - 12, body);
    if (params.spots) {
      rect(ctx, bx + 6, by + 6, 3, 3, accent);
      rect(ctx, bx + w - 9, by + 10, 2, 2, accent);
    }

    // -- Head (back view) --
    const headW = Math.max(12, w - 2);
    const hx = cx - Math.floor(headW / 2);
    const hy = by - 8;
    rect(ctx, hx + 3, hy, headW - 6, 3, body);
    rect(ctx, hx, hy + 3, headW, 5, body);
    rect(ctx, hx + 1, hy + 1, headW - 2, 2, body);
    rect(ctx, hx + 4, hy + 2, headW - 8, 2, highlight);
    // Ears
    if (params.earH) {
      const earH = params.earH;
      for (let e = 0; e < earH; e++) {
        const ew = e < earH - 2 ? 3 : 2;
        rect(ctx, hx, hy - 1 - e, ew, 1, body);
        rect(ctx, hx + headW - ew, hy - 1 - e, ew, 1, body);
      }
    }
    if (params.horns) {
      rect(ctx, hx - 3, hy - 2, 3, 3, '#d0d0d0');
      rect(ctx, hx + headW, hy - 2, 3, 3, '#d0d0d0');
      rect(ctx, hx - 3, hy - 5, 3, 3, '#e8e8e8');
      rect(ctx, hx + headW, hy - 5, 3, 3, '#e8e8e8');
    }
    if (params.antlers) {
      const ac = '#b08050', al = '#c09868';
      rect(ctx, hx - 3, hy - 3, 3, 3, ac);
      rect(ctx, hx + headW, hy - 3, 3, 3, ac);
      rect(ctx, hx - 3, hy - 7, 3, 4, ac);
      rect(ctx, hx + headW, hy - 7, 3, 4, ac);
      rect(ctx, hx - 6, hy - 7, 3, 3, al);
      rect(ctx, hx + headW + 3, hy - 7, 3, 3, al);
    }

    // -- Front legs --
    const legY = by + h;
    rect(ctx, bx + 3, legY - legShift, 4, 4, body);
    rect(ctx, bx + 3, legY + 4 - legShift, 4, 3, outline);
    rect(ctx, bx + w - 7, legY + legShift, 4, 4, body);
    rect(ctx, bx + w - 7, legY + 4 + legShift, 4, 3, outline);

    // -- Tail (back view) --
    if (params.tail) {
      if (params.bushyTail) {
        rect(ctx, cx - 1, hy, 4, 4, accent);
        rect(ctx, cx - 3, hy + 1, 3, 3, lighten(accent, 0.08));
      } else if (params.tailStripes) {
        rect(ctx, cx - 1, hy, 3, 3, body);
        rect(ctx, cx - 1, hy - 3, 3, 3, '#333333');
      } else {
        rect(ctx, cx - 1, hy + 2, 3, 4, shadow);
      }
    }

  } else {
    // -- LEFT / RIGHT --
    const flip = dir === LEFT;
    const f = flip ? (x) => 63 - x : (x) => x;
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);

    // -- Back legs --
    rect(ctx, f(bx), by + h, 3, 4, shadow);
    rect(ctx, f(bx), by + h + 4 - legShift, 3, 3, outline);
    px(ctx, f(bx + 1), by + h + 6 - legShift, pawCol);
    rect(ctx, f(bx + 3), by + h, 3, 4, shadow);
    // -- Front legs --
    rect(ctx, f(bx + w - 6), by + h, 3, 4, body);
    rect(ctx, f(bx + w - 6), by + h + 4 + legShift, 3, 3, outline);
    px(ctx, f(bx + w - 5), by + h + 6 + legShift, pawCol);
    rect(ctx, f(bx + w - 3), by + h, 3, 4, body);

    // -- Body --
    for (let i = 3; i < w - 3; i++) { px(ctx, f(bx + i), by, body); px(ctx, f(bx + i), by + 1, highlight); }
    for (let r = 2; r < h - 2; r++) for (let c = 0; c < w; c++) px(ctx, f(bx + c), by + r, body);
    for (let i = 3; i < w - 3; i++) { px(ctx, f(bx + i), by + h - 2, shadow); px(ctx, f(bx + i), by + h - 1, shadow2); }
    // Back highlight
    for (let i = 3; i < w - 3; i++) { px(ctx, f(bx + i), by + 3, highlight); px(ctx, f(bx + i), by + 4, highlight2); }
    // Belly accent
    for (let i = 3; i < w - 3; i++) {
      px(ctx, f(bx + i), by + h - 5, bellyCol);
      px(ctx, f(bx + i), by + h - 4, bellyCol);
      px(ctx, f(bx + i), by + h - 3, bellyCol);
    }
    // Fur texture
    for (let r = 5; r < h - 5; r++) {
      for (let c = 2; c < w - 2; c++) {
        if (noise(bx + c, by + r) > 0.8) px(ctx, f(bx + c), by + r, furTex);
      }
    }
    if (params.spots) {
      rect(ctx, f(bx + 6), by + 6, 3, 3, accent);
      rect(ctx, f(bx + w - 9), by + 4, 2, 2, accent);
    }

    // -- Head --
    const headH = Math.max(10, h - 2);
    const headW = 10;
    const headX = bx + w;
    const headY = by - 3;
    for (let hy = 1; hy < headH - 1; hy++) for (let hxo = 0; hxo < headW; hxo++) px(ctx, f(headX + hxo), headY + hy, body);
    for (let hxo = 2; hxo < headW - 2; hxo++) px(ctx, f(headX + hxo), headY, body);
    for (let hxo = 2; hxo < headW - 2; hxo++) px(ctx, f(headX + hxo), headY + headH - 1, shadow);
    for (let hxo = 2; hxo < headW - 2; hxo++) { px(ctx, f(headX + hxo), headY + 2, highlight); px(ctx, f(headX + hxo), headY + 3, highlight); }

    // -- Eye (side) --
    rect(ctx, f(headX + headW - 5), headY + 3, 4, 4, eyeWhite);
    rect(ctx, f(headX + headW - 4), headY + 4, 2, 2, eyeIris);
    px(ctx, f(headX + headW - 3), headY + 4, darken(eyeIris, 0.3));
    px(ctx, f(headX + headW - 5), headY + 3, eyeWhite);
    // Nose
    if (params.noseColor) rect(ctx, f(headX + headW - 3), headY + headH - 4, 3, 3, params.noseColor);
    // Cheeks
    if (params.cheeks) rect(ctx, f(headX + 1), headY + 6, 3, 3, params.cheeks);
    // Muzzle (bear)
    if (params.muzzle) {
      rect(ctx, f(headX + 3), headY + headH - 4, 7, 3, params.muzzle);
    }

    // -- Ear (side) --
    if (params.earH) {
      const earX = headX + 3;
      const earH = params.earH;
      for (let e = 0; e < earH; e++) {
        px(ctx, f(earX), headY - 2 - e, body);
        px(ctx, f(earX + 1), headY - 2 - e, body);
        px(ctx, f(earX + 2), headY - 2 - e, body);
      }
      if (params.earInner && earH >= 6) {
        for (let e = 1; e < earH - 2; e++) {
          px(ctx, f(earX + 1), headY - 2 - e, params.earInner);
          px(ctx, f(earX + 2), headY - 2 - e, params.earInner);
        }
      }
    }
    // Horns (side)
    if (params.horns) {
      rect(ctx, f(headX + 3), headY - 3, 3, 3, '#d0d0d0');
      rect(ctx, f(headX + 3), headY - 7, 3, 4, '#e8e8e8');
    }
    // Antlers (side)
    if (params.antlers) {
      const ac = '#b08050', al = '#c09868';
      rect(ctx, f(headX + 3), headY - 3, 3, 3, ac);
      rect(ctx, f(headX + 3), headY - 7, 3, 4, ac);
      rect(ctx, f(headX), headY - 7, 3, 3, al);
      rect(ctx, f(headX + 6), headY - 10, 3, 3, al);
    }
    // Tusks (side)
    if (params.tusks) rect(ctx, f(headX + headW - 3), headY + headH, 3, 3, '#f0f0e0');
    // Mask (raccoon side)
    if (params.mask) {
      rect(ctx, f(headX + headW - 5), headY + 1, 3, 3, '#111111');
      rect(ctx, f(headX + headW - 5), headY + 6, 3, 3, '#111111');
    }
    // Beard (goat side)
    if (params.beard) rect(ctx, f(headX + 3), headY + headH, 3, 4, accent);
    // Bristles (boar side)
    if (params.bristles) {
      for (let i = 0; i < 3; i++) {
        px(ctx, f(bx + 4 + i * 4), by, darken(body, 0.12));
        px(ctx, f(bx + 4 + i * 4), by + 1, darken(body, 0.08));
      }
    }

    // -- Tail --
    if (params.tail) {
      const tailX = bx - 3;
      const tailY = by + 3;
      if (params.bushyTail) {
        rect(ctx, f(tailX), tailY, 4, 4, accent);
        rect(ctx, f(tailX - 3), tailY, 3, 3, accent);
        rect(ctx, f(tailX - 3), tailY - 3, 3, 3, lighten(accent, 0.1));
        px(ctx, f(tailX + 1), tailY + 1, lighten(accent, 0.12));
      } else if (params.tailStripes) {
        rect(ctx, f(tailX), tailY, 3, 3, body);
        rect(ctx, f(tailX - 3), tailY, 3, 3, '#333333');
        rect(ctx, f(tailX), tailY + 3, 3, 3, '#333333');
      } else {
        rect(ctx, f(tailX), tailY, 3, 4, shadow);
        rect(ctx, f(tailX), tailY + 4, 3, 3, shadow2);
      }
    }
  }
}
