/**
 * Quadruped drawing template.
 * Used by: rabbit, squirrel, fox, wolf, raccoon, goat, deer, boar, bear.
 */
import { px, rect, darken, lighten, DOWN, UP, LEFT } from '../helpers.js';

export function drawQuadruped(ctx, params, dir, frame) {
  const { body, accent, eye, w, h } = params;
  const shadow = darken(body, 0.15);
  const highlight = lighten(body, 0.1);
  const outline = darken(body, 0.35);
  const cx = 8;
  const cy = 9;
  const legShift = frame === 0 ? -1 : frame === 2 ? 1 : 0;

  if (dir === DOWN) {
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);

    // Back legs
    px(ctx, bx, by + h + legShift, shadow);
    px(ctx, bx, by + h + 1 + legShift, outline);
    px(ctx, bx + w - 1, by + h - legShift, shadow);
    px(ctx, bx + w - 1, by + h + 1 - legShift, outline);

    // Body — rounded
    rect(ctx, bx + 1, by, w - 2, 1, highlight);
    rect(ctx, bx, by + 1, w, h - 2, body);
    rect(ctx, bx + 1, by + h - 1, w - 2, 1, shadow);
    for (let r = 1; r < h - 1; r++) px(ctx, bx, by + r, shadow);
    rect(ctx, bx + 2, by + 1, Math.max(1, w - 4), 1, highlight);
    // Belly
    rect(ctx, bx + 1, by + h - 2, w - 2, 1, accent);

    // Head
    const headW = Math.max(3, w - 1);
    const hx = cx - Math.floor(headW / 2);
    const hy = by - 2;
    rect(ctx, hx, hy + 1, headW, 1, body);
    rect(ctx, hx + 1, hy, headW - 2, 1, body);
    px(ctx, hx, hy + 1, shadow);
    if (params.cheeks) {
      px(ctx, hx, hy + 1, params.cheeks);
      px(ctx, hx + headW - 1, hy + 1, params.cheeks);
    }
    // Eyes
    px(ctx, hx + 1, hy + 1, eye);
    px(ctx, hx + headW - 2, hy + 1, eye);
    if (params.noseColor) px(ctx, cx, hy + 2 > by ? by : hy + 2, params.noseColor);

    // Ears
    if (params.earH) {
      for (let e = 0; e < params.earH; e++) {
        px(ctx, hx, hy - e, body);
        px(ctx, hx + headW - 1, hy - e, body);
      }
      if (params.earInner && params.earH >= 2) {
        px(ctx, hx, hy - 1, params.earInner);
        px(ctx, hx + headW - 1, hy - 1, params.earInner);
      }
    }
    if (params.horns) {
      px(ctx, hx - 1, hy - 1, '#d0d0d0');
      px(ctx, hx + headW, hy - 1, '#d0d0d0');
      px(ctx, hx - 1, hy - 2, '#e0e0e0');
      px(ctx, hx + headW, hy - 2, '#e0e0e0');
    }
    if (params.antlers) {
      const ac = '#b08050', al = '#c09868';
      px(ctx, hx - 1, hy - 1, ac); px(ctx, hx + headW, hy - 1, ac);
      px(ctx, hx - 1, hy - 2, ac); px(ctx, hx + headW, hy - 2, ac);
      px(ctx, hx - 2, hy - 2, al); px(ctx, hx + headW + 1, hy - 2, al);
      px(ctx, hx - 2, hy - 3, al); px(ctx, hx + headW + 1, hy - 3, al);
    }
    if (params.tusks) {
      px(ctx, hx, by, '#f0f0e0');
      px(ctx, hx + headW - 1, by, '#f0f0e0');
    }
    if (params.mask) {
      px(ctx, hx + 1, hy, '#111111'); px(ctx, hx + headW - 2, hy, '#111111');
      px(ctx, hx + 1, hy + 1, '#111111'); px(ctx, hx + headW - 2, hy + 1, '#111111');
    }
    if (params.beard) {
      px(ctx, cx, by, accent); px(ctx, cx, by + 1, accent);
    }
    if (params.muzzle) {
      px(ctx, cx, hy + 1, params.muzzle);
      px(ctx, cx - 1, by, params.muzzle);
      px(ctx, cx + 1, by, params.muzzle);
    }
    if (params.spots) {
      px(ctx, bx + 2, by + 2, accent);
      px(ctx, bx + w - 3, by + 1, accent);
    }

    // Front legs
    const legY = by + h;
    px(ctx, bx + 1, legY - legShift, body);
    px(ctx, bx + 1, legY + 1 - legShift, outline);
    px(ctx, bx + w - 2, legY + legShift, body);
    px(ctx, bx + w - 2, legY + 1 + legShift, outline);

    // Tail
    if (params.tail) {
      if (params.bushyTail) {
        px(ctx, cx, by + h - 1, accent);
        px(ctx, cx + 1, by + h, accent);
        px(ctx, cx, by + h, lighten(accent, 0.08));
      } else if (params.tailStripes) {
        px(ctx, cx, by + h, body);
        px(ctx, cx, by + h + 1, '#333333');
      } else {
        px(ctx, cx, by + h, shadow);
      }
    }
    if (params.bristles) {
      px(ctx, bx + 2, by, darken(body, 0.1));
      px(ctx, bx + w - 3, by, darken(body, 0.1));
    }

  } else if (dir === UP) {
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);

    px(ctx, bx, by + h + legShift, shadow);
    px(ctx, bx, by + h + 1 + legShift, outline);
    px(ctx, bx + w - 1, by + h - legShift, shadow);
    px(ctx, bx + w - 1, by + h + 1 - legShift, outline);

    rect(ctx, bx + 1, by, w - 2, 1, body);
    rect(ctx, bx, by + 1, w, h - 2, body);
    rect(ctx, bx + 1, by + h - 1, w - 2, 1, shadow);
    for (let r = 1; r < h - 1; r++) px(ctx, bx, by + r, shadow);
    rect(ctx, bx + 2, by + 1, Math.max(1, w - 4), 1, highlight);
    if (params.spots) {
      px(ctx, bx + 2, by + 2, accent);
      px(ctx, bx + w - 3, by + 3, accent);
    }

    const headW = Math.max(3, w - 1);
    const hx = cx - Math.floor(headW / 2);
    const hy = by - 2;
    rect(ctx, hx + 1, hy, headW - 2, 1, body);
    rect(ctx, hx, hy + 1, headW, 1, body);
    if (params.earH) {
      for (let e = 0; e < params.earH; e++) {
        px(ctx, hx, hy - e, body);
        px(ctx, hx + headW - 1, hy - e, body);
      }
    }
    if (params.horns) {
      px(ctx, hx - 1, hy - 1, '#d0d0d0'); px(ctx, hx + headW, hy - 1, '#d0d0d0');
      px(ctx, hx - 1, hy - 2, '#e0e0e0'); px(ctx, hx + headW, hy - 2, '#e0e0e0');
    }
    if (params.antlers) {
      const ac = '#b08050', al = '#c09868';
      px(ctx, hx - 1, hy - 1, ac); px(ctx, hx + headW, hy - 1, ac);
      px(ctx, hx - 1, hy - 2, ac); px(ctx, hx + headW, hy - 2, ac);
      px(ctx, hx - 2, hy - 2, al); px(ctx, hx + headW + 1, hy - 2, al);
      px(ctx, hx - 2, hy - 3, al); px(ctx, hx + headW + 1, hy - 3, al);
    }

    const legY = by + h;
    px(ctx, bx + 1, legY - legShift, body);
    px(ctx, bx + 1, legY + 1 - legShift, outline);
    px(ctx, bx + w - 2, legY + legShift, body);
    px(ctx, bx + w - 2, legY + 1 + legShift, outline);

    if (params.tail) {
      if (params.bushyTail) {
        px(ctx, cx, hy, accent);
        px(ctx, cx - 1, hy, lighten(accent, 0.05));
      } else if (params.tailStripes) {
        px(ctx, cx, hy, body);
        px(ctx, cx, hy - 1, '#333333');
      } else {
        px(ctx, cx, hy + 1, shadow);
      }
    }

  } else {
    // LEFT / RIGHT
    const flip = dir === LEFT;
    const f = flip ? (x) => 15 - x : (x) => x;
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);

    // Back legs
    px(ctx, f(bx), by + h, shadow);
    px(ctx, f(bx), by + h + 1 - legShift, outline);
    px(ctx, f(bx + 1), by + h, shadow);
    // Front legs
    px(ctx, f(bx + w - 2), by + h, body);
    px(ctx, f(bx + w - 2), by + h + 1 + legShift, outline);
    px(ctx, f(bx + w - 1), by + h, body);

    // Body
    for (let r = 1; r < h - 1; r++) for (let c = 0; c < w; c++) px(ctx, f(bx + c), by + r, body);
    for (let i = 1; i < w - 1; i++) {
      px(ctx, f(bx + i), by, body);
      px(ctx, f(bx + i), by + h - 1, shadow);
    }
    for (let i = 1; i < w - 1; i++) px(ctx, f(bx + i), by + 1, highlight);
    for (let i = 1; i < w - 1; i++) px(ctx, f(bx + i), by + h - 2, accent);
    if (params.spots) {
      px(ctx, f(bx + 2), by + 2, accent);
      px(ctx, f(bx + w - 3), by + 1, accent);
    }

    // Head
    const headH = Math.max(3, h - 1);
    const headW = 3;
    const headX = bx + w;
    const headY = by - 1;
    for (let hy = 0; hy < headH; hy++) for (let hxo = 0; hxo < headW; hxo++) px(ctx, f(headX + hxo), headY + hy, body);
    px(ctx, f(headX), headY, body);
    px(ctx, f(headX + headW - 1), headY, body);

    // Eye
    px(ctx, f(headX + headW - 1), headY + 1, eye);
    // Nose
    if (params.noseColor) px(ctx, f(headX + headW - 1), headY + headH - 1, params.noseColor);
    if (params.cheeks) px(ctx, f(headX), headY + 2, params.cheeks);
    if (params.muzzle) {
      px(ctx, f(headX + 1), headY + headH - 1, params.muzzle);
      px(ctx, f(headX + 2), headY + headH - 1, params.muzzle);
    }

    // Ear
    if (params.earH) {
      const earX = headX + 1;
      for (let e = 0; e < params.earH; e++) px(ctx, f(earX), headY - 1 - e, body);
      if (params.earInner && params.earH >= 2) px(ctx, f(earX), headY - 1, params.earInner);
    }
    if (params.horns) {
      px(ctx, f(headX + 1), headY - 1, '#d0d0d0');
      px(ctx, f(headX + 1), headY - 2, '#e0e0e0');
    }
    if (params.antlers) {
      const ac = '#b08050', al = '#c09868';
      px(ctx, f(headX + 1), headY - 1, ac);
      px(ctx, f(headX + 1), headY - 2, ac);
      px(ctx, f(headX), headY - 2, al);
      px(ctx, f(headX + 2), headY - 3, al);
    }
    if (params.tusks) px(ctx, f(headX + headW - 1), headY + headH, '#f0f0e0');
    if (params.mask) {
      px(ctx, f(headX + headW - 1), headY, '#111111');
      px(ctx, f(headX + headW - 1), headY + 2, '#111111');
    }
    if (params.beard) px(ctx, f(headX + 1), headY + headH, accent);
    if (params.bristles) {
      px(ctx, f(bx + 2), by, darken(body, 0.1));
      px(ctx, f(bx + 4), by, darken(body, 0.1));
    }

    // Tail
    if (params.tail) {
      const tailX = bx - 1;
      const tailY = by + 1;
      if (params.bushyTail) {
        px(ctx, f(tailX), tailY, accent);
        px(ctx, f(tailX - 1), tailY, lighten(accent, 0.08));
        px(ctx, f(tailX - 1), tailY - 1, accent);
      } else if (params.tailStripes) {
        px(ctx, f(tailX), tailY, body);
        px(ctx, f(tailX - 1), tailY, '#333333');
        px(ctx, f(tailX), tailY + 1, '#333333');
      } else {
        px(ctx, f(tailX), tailY, shadow);
        px(ctx, f(tailX), tailY + 1, shadow);
      }
    }
  }
}
