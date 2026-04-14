/**
 * Quadruped drawing template — 32×32 design grid.
 * Used by: rabbit, squirrel, fox, wolf, raccoon, goat, deer, boar, bear.
 */
import { px, rect, darken, lighten, DOWN, UP, LEFT } from '../helpers.js';

export function drawQuadruped(ctx, params, dir, frame) {
  const { body, accent, eye, w, h } = params;
  const shadow = darken(body, 0.15);
  const highlight = lighten(body, 0.1);
  const outline = darken(body, 0.35);
  const cx = 16;
  const cy = 18;
  const legShift = frame === 0 ? -2 : frame === 2 ? 2 : 0;

  if (dir === DOWN) {
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);

    // Back legs
    rect(ctx, bx, by + h + legShift, 2, 2, shadow);
    rect(ctx, bx, by + h + 2 + legShift, 2, 2, outline);
    rect(ctx, bx + w - 2, by + h - legShift, 2, 2, shadow);
    rect(ctx, bx + w - 2, by + h + 2 - legShift, 2, 2, outline);

    // Body — rounded
    rect(ctx, bx + 2, by, w - 4, 2, highlight);
    rect(ctx, bx, by + 2, w, h - 4, body);
    rect(ctx, bx + 2, by + h - 2, w - 4, 2, shadow);
    // Left edge shadow
    for (let r = 2; r < h - 2; r++) px(ctx, bx, by + r, shadow);
    for (let r = 2; r < h - 2; r++) px(ctx, bx + 1, by + r, shadow);
    // Top highlight stripe
    rect(ctx, bx + 4, by + 2, Math.max(2, w - 8), 2, highlight);
    // Belly accent
    rect(ctx, bx + 2, by + h - 4, w - 4, 2, accent);

    // Head
    const headW = Math.max(6, w - 2);
    const hx = cx - Math.floor(headW / 2);
    const hy = by - 4;
    // Head shape: rounded
    rect(ctx, hx, hy + 2, headW, 2, body);
    rect(ctx, hx + 2, hy, headW - 4, 2, body);
    rect(ctx, hx + 1, hy + 1, headW - 2, 1, body);
    px(ctx, hx, hy + 2, shadow);
    px(ctx, hx + 1, hy + 2, shadow);
    // Cheeks
    if (params.cheeks) {
      rect(ctx, hx, hy + 2, 2, 2, params.cheeks);
      rect(ctx, hx + headW - 2, hy + 2, 2, 2, params.cheeks);
    }
    // Eyes with pupils
    rect(ctx, hx + 2, hy + 2, 2, 2, eye);
    rect(ctx, hx + headW - 4, hy + 2, 2, 2, eye);
    // Eye highlights
    px(ctx, hx + 2, hy + 2, '#ffffff');
    px(ctx, hx + headW - 4, hy + 2, '#ffffff');
    // Nose
    if (params.noseColor) rect(ctx, cx - 1, by > hy + 4 ? by - 1 : hy + 4, 2, 2, params.noseColor);

    // Ears
    if (params.earH) {
      for (let e = 0; e < params.earH; e++) {
        px(ctx, hx, hy - e, body);
        px(ctx, hx + 1, hy - e, body);
        px(ctx, hx + headW - 1, hy - e, body);
        px(ctx, hx + headW - 2, hy - e, body);
      }
      if (params.earInner && params.earH >= 4) {
        for (let e = 1; e < params.earH - 1; e++) {
          px(ctx, hx + 1, hy - e, params.earInner);
          px(ctx, hx + headW - 2, hy - e, params.earInner);
        }
      }
    }
    // Horns
    if (params.horns) {
      rect(ctx, hx - 2, hy - 2, 2, 2, '#d0d0d0');
      rect(ctx, hx + headW, hy - 2, 2, 2, '#d0d0d0');
      rect(ctx, hx - 2, hy - 4, 2, 2, '#e0e0e0');
      rect(ctx, hx + headW, hy - 4, 2, 2, '#e0e0e0');
    }
    // Antlers
    if (params.antlers) {
      const ac = '#b08050', al = '#c09868';
      rect(ctx, hx - 2, hy - 2, 2, 2, ac); rect(ctx, hx + headW, hy - 2, 2, 2, ac);
      rect(ctx, hx - 2, hy - 4, 2, 2, ac); rect(ctx, hx + headW, hy - 4, 2, 2, ac);
      rect(ctx, hx - 4, hy - 4, 2, 2, al); rect(ctx, hx + headW + 2, hy - 4, 2, 2, al);
      rect(ctx, hx - 4, hy - 6, 2, 2, al); rect(ctx, hx + headW + 2, hy - 6, 2, 2, al);
    }
    // Tusks
    if (params.tusks) {
      rect(ctx, hx, by, 2, 2, '#f0f0e0');
      rect(ctx, hx + headW - 2, by, 2, 2, '#f0f0e0');
    }
    // Mask (raccoon)
    if (params.mask) {
      rect(ctx, hx + 2, hy, 2, 2, '#111111'); rect(ctx, hx + headW - 4, hy, 2, 2, '#111111');
      rect(ctx, hx + 2, hy + 2, 2, 2, '#111111'); rect(ctx, hx + headW - 4, hy + 2, 2, 2, '#111111');
    }
    // Beard (goat)
    if (params.beard) {
      rect(ctx, cx - 1, by, 2, 2, accent); rect(ctx, cx - 1, by + 2, 2, 2, accent);
    }
    // Muzzle (bear)
    if (params.muzzle) {
      rect(ctx, cx - 1, hy + 2, 2, 2, params.muzzle);
      rect(ctx, cx - 2, by, 4, 2, params.muzzle);
    }
    // Spots (deer)
    if (params.spots) {
      rect(ctx, bx + 4, by + 4, 2, 2, accent);
      rect(ctx, bx + w - 6, by + 2, 2, 2, accent);
    }

    // Front legs
    const legY = by + h;
    rect(ctx, bx + 2, legY - legShift, 2, 2, body);
    rect(ctx, bx + 2, legY + 2 - legShift, 2, 2, outline);
    rect(ctx, bx + w - 4, legY + legShift, 2, 2, body);
    rect(ctx, bx + w - 4, legY + 2 + legShift, 2, 2, outline);

    // Tail
    if (params.tail) {
      if (params.bushyTail) {
        rect(ctx, cx, by + h - 2, 2, 2, accent);
        rect(ctx, cx + 2, by + h, 2, 2, accent);
        rect(ctx, cx, by + h, 2, 2, lighten(accent, 0.08));
      } else if (params.tailStripes) {
        rect(ctx, cx, by + h, 2, 2, body);
        rect(ctx, cx, by + h + 2, 2, 2, '#333333');
      } else {
        rect(ctx, cx, by + h, 2, 2, shadow);
      }
    }
    if (params.bristles) {
      rect(ctx, bx + 4, by, 2, 2, darken(body, 0.1));
      rect(ctx, bx + w - 6, by, 2, 2, darken(body, 0.1));
    }

  } else if (dir === UP) {
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);

    // Back legs
    rect(ctx, bx, by + h + legShift, 2, 2, shadow);
    rect(ctx, bx, by + h + 2 + legShift, 2, 2, outline);
    rect(ctx, bx + w - 2, by + h - legShift, 2, 2, shadow);
    rect(ctx, bx + w - 2, by + h + 2 - legShift, 2, 2, outline);

    // Body
    rect(ctx, bx + 2, by, w - 4, 2, body);
    rect(ctx, bx, by + 2, w, h - 4, body);
    rect(ctx, bx + 2, by + h - 2, w - 4, 2, shadow);
    for (let r = 2; r < h - 2; r++) px(ctx, bx, by + r, shadow);
    for (let r = 2; r < h - 2; r++) px(ctx, bx + 1, by + r, shadow);
    rect(ctx, bx + 4, by + 2, Math.max(2, w - 8), 2, highlight);
    if (params.spots) {
      rect(ctx, bx + 4, by + 4, 2, 2, accent);
      rect(ctx, bx + w - 6, by + 6, 2, 2, accent);
    }

    // Head (back view, no eyes)
    const headW = Math.max(6, w - 2);
    const hx = cx - Math.floor(headW / 2);
    const hy = by - 4;
    rect(ctx, hx + 2, hy, headW - 4, 2, body);
    rect(ctx, hx, hy + 2, headW, 2, body);
    // Ears
    if (params.earH) {
      for (let e = 0; e < params.earH; e++) {
        px(ctx, hx, hy - e, body); px(ctx, hx + 1, hy - e, body);
        px(ctx, hx + headW - 1, hy - e, body); px(ctx, hx + headW - 2, hy - e, body);
      }
    }
    if (params.horns) {
      rect(ctx, hx - 2, hy - 2, 2, 2, '#d0d0d0'); rect(ctx, hx + headW, hy - 2, 2, 2, '#d0d0d0');
      rect(ctx, hx - 2, hy - 4, 2, 2, '#e0e0e0'); rect(ctx, hx + headW, hy - 4, 2, 2, '#e0e0e0');
    }
    if (params.antlers) {
      const ac = '#b08050', al = '#c09868';
      rect(ctx, hx - 2, hy - 2, 2, 2, ac); rect(ctx, hx + headW, hy - 2, 2, 2, ac);
      rect(ctx, hx - 2, hy - 4, 2, 2, ac); rect(ctx, hx + headW, hy - 4, 2, 2, ac);
      rect(ctx, hx - 4, hy - 4, 2, 2, al); rect(ctx, hx + headW + 2, hy - 4, 2, 2, al);
      rect(ctx, hx - 4, hy - 6, 2, 2, al); rect(ctx, hx + headW + 2, hy - 6, 2, 2, al);
    }

    // Front legs
    const legY = by + h;
    rect(ctx, bx + 2, legY - legShift, 2, 2, body);
    rect(ctx, bx + 2, legY + 2 - legShift, 2, 2, outline);
    rect(ctx, bx + w - 4, legY + legShift, 2, 2, body);
    rect(ctx, bx + w - 4, legY + 2 + legShift, 2, 2, outline);

    // Tail (visible from back)
    if (params.tail) {
      if (params.bushyTail) {
        rect(ctx, cx, hy, 2, 2, accent);
        rect(ctx, cx - 2, hy, 2, 2, lighten(accent, 0.05));
      } else if (params.tailStripes) {
        rect(ctx, cx, hy, 2, 2, body);
        rect(ctx, cx, hy - 2, 2, 2, '#333333');
      } else {
        rect(ctx, cx, hy + 2, 2, 2, shadow);
      }
    }

  } else {
    // LEFT / RIGHT
    const flip = dir === LEFT;
    const f = flip ? (x) => 31 - x : (x) => x;
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);

    // Back legs
    rect(ctx, f(bx), by + h, 2, 2, shadow);
    px(ctx, f(bx), by + h + 2 - legShift, outline);
    px(ctx, f(bx + 1), by + h + 2 - legShift, outline);
    rect(ctx, f(bx + 2), by + h, 2, 2, shadow);
    // Front legs
    rect(ctx, f(bx + w - 4), by + h, 2, 2, body);
    px(ctx, f(bx + w - 4), by + h + 2 + legShift, outline);
    px(ctx, f(bx + w - 3), by + h + 2 + legShift, outline);
    rect(ctx, f(bx + w - 2), by + h, 2, 2, body);

    // Body
    for (let r = 2; r < h - 2; r++) for (let c = 0; c < w; c++) px(ctx, f(bx + c), by + r, body);
    for (let i = 2; i < w - 2; i++) {
      px(ctx, f(bx + i), by, body); px(ctx, f(bx + i), by + 1, body);
      px(ctx, f(bx + i), by + h - 2, shadow); px(ctx, f(bx + i), by + h - 1, shadow);
    }
    // Highlight along back
    for (let i = 2; i < w - 2; i++) { px(ctx, f(bx + i), by + 2, highlight); px(ctx, f(bx + i), by + 3, highlight); }
    // Belly
    for (let i = 2; i < w - 2; i++) { px(ctx, f(bx + i), by + h - 4, accent); px(ctx, f(bx + i), by + h - 3, accent); }
    if (params.spots) {
      rect(ctx, f(bx + 4), by + 4, 2, 2, accent);
      rect(ctx, f(bx + w - 6), by + 2, 2, 2, accent);
    }

    // Head (extends from front of body)
    const headH = Math.max(6, h - 2);
    const headW = 6;
    const headX = bx + w;
    const headY = by - 2;
    for (let hy = 0; hy < headH; hy++) for (let hxo = 0; hxo < headW; hxo++) px(ctx, f(headX + hxo), headY + hy, body);
    // Round the head
    px(ctx, f(headX), headY, body); px(ctx, f(headX + 1), headY, body);
    px(ctx, f(headX + headW - 1), headY, body); px(ctx, f(headX + headW - 2), headY, body);

    // Eye
    rect(ctx, f(headX + headW - 3), headY + 2, 2, 2, eye);
    px(ctx, f(headX + headW - 3), headY + 2, '#ffffff');
    // Nose
    if (params.noseColor) rect(ctx, f(headX + headW - 2), headY + headH - 2, 2, 2, params.noseColor);
    // Cheeks
    if (params.cheeks) rect(ctx, f(headX), headY + 4, 2, 2, params.cheeks);
    // Muzzle (bear)
    if (params.muzzle) {
      rect(ctx, f(headX + 2), headY + headH - 2, 4, 2, params.muzzle);
    }

    // Ear
    if (params.earH) {
      const earX = headX + 2;
      for (let e = 0; e < params.earH; e++) {
        px(ctx, f(earX), headY - 2 - e, body);
        px(ctx, f(earX + 1), headY - 2 - e, body);
      }
      if (params.earInner && params.earH >= 4) {
        for (let e = 1; e < params.earH - 1; e++) px(ctx, f(earX + 1), headY - 2 - e, params.earInner);
      }
    }
    // Horns (side)
    if (params.horns) {
      rect(ctx, f(headX + 2), headY - 2, 2, 2, '#d0d0d0');
      rect(ctx, f(headX + 2), headY - 4, 2, 2, '#e0e0e0');
    }
    // Antlers (side — branching)
    if (params.antlers) {
      const ac = '#b08050', al = '#c09868';
      rect(ctx, f(headX + 2), headY - 2, 2, 2, ac);
      rect(ctx, f(headX + 2), headY - 4, 2, 2, ac);
      rect(ctx, f(headX), headY - 4, 2, 2, al);
      rect(ctx, f(headX + 4), headY - 6, 2, 2, al);
    }
    // Tusks (side)
    if (params.tusks) rect(ctx, f(headX + headW - 2), headY + headH, 2, 2, '#f0f0e0');
    // Mask (raccoon side)
    if (params.mask) {
      rect(ctx, f(headX + headW - 3), headY, 2, 2, '#111111');
      rect(ctx, f(headX + headW - 3), headY + 4, 2, 2, '#111111');
    }
    // Beard (goat side)
    if (params.beard) rect(ctx, f(headX + 2), headY + headH, 2, 2, accent);
    // Bristles (boar side)
    if (params.bristles) {
      rect(ctx, f(bx + 4), by, 2, 2, darken(body, 0.1));
      rect(ctx, f(bx + 8), by, 2, 2, darken(body, 0.1));
    }

    // Tail
    if (params.tail) {
      const tailX = bx - 2;
      const tailY = by + 2;
      if (params.bushyTail) {
        rect(ctx, f(tailX), tailY, 2, 2, accent);
        rect(ctx, f(tailX - 2), tailY, 2, 2, lighten(accent, 0.08));
        rect(ctx, f(tailX - 2), tailY - 2, 2, 2, accent);
      } else if (params.tailStripes) {
        rect(ctx, f(tailX), tailY, 2, 2, body);
        rect(ctx, f(tailX - 2), tailY, 2, 2, '#333333');
        rect(ctx, f(tailX), tailY + 2, 2, 2, '#333333');
      } else {
        rect(ctx, f(tailX), tailY, 2, 2, shadow);
        rect(ctx, f(tailX), tailY + 2, 2, 2, shadow);
      }
    }
  }
}
