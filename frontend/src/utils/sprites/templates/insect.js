/**
 * Insect drawing template (including caterpillar) — 32×32 design grid.
 * Used by: beetle, mosquito, caterpillar, cricket.
 */
import { px, rect, darken, lighten, DOWN, UP, LEFT } from '../helpers.js';

export function drawInsect(ctx, params, dir, frame) {
  const { body, accent, eye, w, h } = params;
  const shadow = darken(body, 0.15);
  const outline = darken(body, 0.3);
  const cx = 16;
  const cy = 16;
  const legOff = frame === 0 ? -2 : frame === 2 ? 2 : 0;

  if (params.segments) {
    drawCaterpillar(ctx, params, dir, frame);
    return;
  }

  if (dir === DOWN || dir === UP) {
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);

    if (params.shell) {
      rect(ctx, bx + 2, by, w - 4, 2, accent);
      rect(ctx, bx, by + 2, w, h - 4, accent);
      rect(ctx, bx + 2, by + h - 2, w - 4, 2, darken(accent, 0.1));
      for (let r = 0; r < h; r++) { px(ctx, cx, by + r, params.shellLine || body); px(ctx, cx + 1, by + r, params.shellLine || body); }
      if (params.sheen) rect(ctx, bx + 2, by + 2, 2, 2, params.sheen);
    } else {
      rect(ctx, bx + 2, by, w - 4, 2, body);
      rect(ctx, bx, by + 2, w, h - 4, body);
      rect(ctx, bx + 2, by + h - 2, w - 4, 2, shadow);
    }

    const headW = Math.min(w, Math.max(4, w - 2));
    const hx = cx - Math.floor(headW / 2);
    const hy = dir === DOWN ? by - 2 : by + h;
    rect(ctx, hx, hy, headW, 2, body);
    if (dir === DOWN) {
      rect(ctx, hx, hy, 2, 2, eye);
      rect(ctx, hx + headW - 2, hy, 2, 2, eye);
      if (params.proboscis) rect(ctx, cx - 1, hy + 2, 2, 2, '#cc0000');
    }

    if (params.antennae || params.proboscis) {
      const ay = dir === DOWN ? hy - 2 : hy + 2;
      rect(ctx, hx, ay, 2, 2, outline);
      rect(ctx, hx + headW - 2, ay, 2, 2, outline);
    }

    for (let i = 0; i < 3; i++) {
      const legY = by + Math.round(i * (h - 2) / 2);
      const off = (i === 1) ? -legOff : legOff;
      rect(ctx, bx - 2, legY + off, 2, 2, outline);
      rect(ctx, bx + w, legY - off, 2, 2, outline);
      if (params.jumpLegs && i === 2) {
        rect(ctx, bx - 4, legY + off + 2, 2, 2, outline);
        rect(ctx, bx + w + 2, legY - off + 2, 2, 2, outline);
      }
    }

    if (params.wings) {
      const wy = by - 2 + (frame === 1 ? 0 : -2);
      const wingCol = 'rgba(180,190,220,0.45)';
      rect(ctx, bx - 4, wy, 4, 2, wingCol);
      rect(ctx, bx + w, wy, 4, 2, wingCol);
      rect(ctx, bx - 2, wy + 2, 2, 2, wingCol);
      rect(ctx, bx + w, wy + 2, 2, 2, wingCol);
    }
  } else {
    const flip = dir === LEFT;
    const f = flip ? (x) => 31 - x : (x) => x;
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);

    if (params.shell) {
      for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
        px(ctx, f(bx + c), by + r, r < 2 ? accent : (r >= h - 2 ? darken(accent, 0.1) : accent));
      }
      if (params.sheen) rect(ctx, f(bx + 2), by + 2, 2, 2, params.sheen);
    } else {
      for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
        px(ctx, f(bx + c), by + r, r < 2 ? body : (r >= h - 2 ? shadow : body));
      }
    }

    const headX = bx + w;
    for (let r = 0; r < Math.min(h, 4); r++) { px(ctx, f(headX), by + r, body); px(ctx, f(headX + 1), by + r, body); }
    rect(ctx, f(headX), by, 2, 2, eye);
    if (params.proboscis) rect(ctx, f(headX + 2), by + 2, 2, 2, '#cc0000');

    for (let i = 0; i < 3; i++) {
      const lx = bx + Math.round(i * (w - 2) / 2);
      const off = (i === 1) ? -legOff : legOff;
      rect(ctx, f(lx), by + h + off, 2, 2, outline);
      if (params.jumpLegs && i === 2) rect(ctx, f(lx), by + h + 2 + off, 2, 2, outline);
    }

    if (params.wings) {
      const wingCol = 'rgba(180,190,220,0.45)';
      const wy = by - 2 + (frame === 1 ? 0 : -2);
      for (let i = 2; i < w - 2; i++) { px(ctx, f(bx + i), wy, wingCol); px(ctx, f(bx + i), wy + 1, wingCol); }
    }
    if (params.antennae) rect(ctx, f(headX + 2), by - 2, 2, 2, outline);
  }
}

function drawCaterpillar(ctx, params, dir, frame) {
  const { body, accent, eye, segments, spotColor } = params;
  const shadow = darken(body, 0.12);
  const highlight = lighten(body, 0.1);
  const cx = 16;
  const cy = 18;
  const wavePhase = frame * 0.7;

  if (dir === DOWN || dir === UP) {
    const headAtTop = dir === DOWN;
    for (let s = 0; s < segments; s++) {
      const sy = headAtTop ? cy - segments + s * 2 : cy + segments - 2 - s * 2;
      const color = s % 2 === 0 ? body : accent;
      rect(ctx, cx - 3, sy, 6, 2, color);
      rect(ctx, cx - 3, sy, 2, 1, highlight);
      rect(ctx, cx + 2, sy + 1, 2, 1, shadow);
      // Tiny legs
      rect(ctx, cx - 4, sy + 1, 1, 1, shadow);
      rect(ctx, cx + 4, sy + 1, 1, 1, shadow);
      if (spotColor && s % 2 === 0) rect(ctx, cx - 1, sy, 2, 1, spotColor);
    }
    const hy = headAtTop ? cy - segments - 2 : cy + segments;
    rect(ctx, cx - 3, hy, 6, 2, body);
    if (headAtTop) {
      rect(ctx, cx - 3, hy, 2, 2, eye);
      rect(ctx, cx + 2, hy, 2, 2, eye);
      rect(ctx, cx - 3, hy - 2, 2, 2, shadow);
      rect(ctx, cx + 2, hy - 2, 2, 2, shadow);
    }
  } else {
    const flip = dir === LEFT;
    const f = flip ? (x) => 31 - x : (x) => x;
    for (let s = 0; s < segments; s++) {
      const sx = cx - segments + s * 2 + 2;
      const wave = Math.round(Math.sin((s + wavePhase) * 1.1) * 1.4);
      const sy = cy - 2 + wave;
      const color = s % 2 === 0 ? body : accent;
      rect(ctx, f(sx), sy, 2, 2, color);
      rect(ctx, f(sx), sy + 2, 2, 2, shadow);
      // Legs
      px(ctx, f(sx), sy + 4, shadow);
      if (spotColor && s % 2 === 0) rect(ctx, f(sx + 1), sy, 1, 1, spotColor);
    }
    const hx = cx + segments;
    rect(ctx, f(hx), cy - 2, 2, 4, body);
    rect(ctx, f(hx), cy - 2, 2, 2, eye);
    rect(ctx, f(hx + 2), cy - 4, 2, 2, shadow);
  }
}
