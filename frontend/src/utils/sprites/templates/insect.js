/**
 * Insect drawing template (including caterpillar sub-template).
 * Used by: beetle, mosquito, caterpillar, cricket.
 */
import { px, rect, darken, lighten, DOWN, UP, LEFT } from '../helpers.js';

export function drawInsect(ctx, params, dir, frame) {
  const { body, accent, eye, w, h } = params;
  const shadow = darken(body, 0.15);
  const outline = darken(body, 0.3);
  const cx = 8;
  const cy = 8;
  const legOff = frame === 0 ? -1 : frame === 2 ? 1 : 0;

  if (params.segments) {
    drawCaterpillar(ctx, params, dir, frame);
    return;
  }

  if (dir === DOWN || dir === UP) {
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);

    if (params.shell) {
      rect(ctx, bx + 1, by, w - 2, 1, accent);
      rect(ctx, bx, by + 1, w, h - 2, accent);
      rect(ctx, bx + 1, by + h - 1, w - 2, 1, darken(accent, 0.1));
      for (let r = 0; r < h; r++) px(ctx, cx, by + r, params.shellLine || body);
      if (params.sheen) px(ctx, bx + 1, by + 1, params.sheen);
    } else {
      rect(ctx, bx + 1, by, w - 2, 1, body);
      rect(ctx, bx, by + 1, w, h - 2, body);
      rect(ctx, bx + 1, by + h - 1, w - 2, 1, shadow);
    }

    const headW = Math.min(w, Math.max(2, w - 1));
    const hx = cx - Math.floor(headW / 2);
    const hy = dir === DOWN ? by - 1 : by + h;
    rect(ctx, hx, hy, headW, 1, body);
    if (dir === DOWN) {
      px(ctx, hx, hy, eye);
      px(ctx, hx + headW - 1, hy, eye);
      if (params.proboscis) px(ctx, cx, hy + 1, '#cc0000');
    }

    if (params.antennae || params.proboscis) {
      const ay = dir === DOWN ? hy - 1 : hy + 1;
      px(ctx, hx, ay, outline);
      px(ctx, hx + headW - 1, ay, outline);
    }

    for (let i = 0; i < 3; i++) {
      const legY = by + Math.round(i * (h - 1) / 2);
      const off = (i === 1) ? -legOff : legOff;
      px(ctx, bx - 1, legY + off, outline);
      px(ctx, bx + w, legY - off, outline);
      if (params.jumpLegs && i === 2) {
        px(ctx, bx - 2, legY + off + 1, outline);
        px(ctx, bx + w + 1, legY - off + 1, outline);
      }
    }

    if (params.wings) {
      const wy = by - 1 + (frame === 1 ? 0 : -1);
      const wingCol = 'rgba(180,190,220,0.45)';
      rect(ctx, bx - 2, wy, 2, 1, wingCol);
      rect(ctx, bx + w, wy, 2, 1, wingCol);
      rect(ctx, bx - 1, wy + 1, 1, 1, wingCol);
      rect(ctx, bx + w, wy + 1, 1, 1, wingCol);
    }
  } else {
    const flip = dir === LEFT;
    const f = flip ? (x) => 15 - x : (x) => x;
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);

    if (params.shell) {
      for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
        px(ctx, f(bx + c), by + r, r === 0 ? accent : (r === h - 1 ? darken(accent, 0.1) : accent));
      }
      if (params.sheen) px(ctx, f(bx + 1), by + 1, params.sheen);
    } else {
      for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
        px(ctx, f(bx + c), by + r, r === 0 ? body : (r === h - 1 ? shadow : body));
      }
    }

    const headX = bx + w;
    for (let r = 0; r < Math.min(h, 2); r++) px(ctx, f(headX), by + r, body);
    px(ctx, f(headX), by, eye);
    if (params.proboscis) px(ctx, f(headX + 1), by + 1, '#cc0000');

    for (let i = 0; i < 3; i++) {
      const lx = bx + Math.round(i * (w - 1) / 2);
      const off = (i === 1) ? -legOff : legOff;
      px(ctx, f(lx), by + h + off, outline);
      if (params.jumpLegs && i === 2) px(ctx, f(lx), by + h + 1 + off, outline);
    }

    if (params.wings) {
      const wingCol = 'rgba(180,190,220,0.45)';
      const wy = by - 1 + (frame === 1 ? 0 : -1);
      for (let i = 1; i < w - 1; i++) px(ctx, f(bx + i), wy, wingCol);
    }
    if (params.antennae) px(ctx, f(headX + 1), by - 1, outline);
  }
}

function drawCaterpillar(ctx, params, dir, frame) {
  const { body, accent, eye, segments, spotColor } = params;
  const shadow = darken(body, 0.12);
  const highlight = lighten(body, 0.1);
  const cx = 8;
  const cy = 9;
  const wavePhase = frame * 0.7;

  if (dir === DOWN || dir === UP) {
    const headAtTop = dir === DOWN;
    for (let s = 0; s < segments; s++) {
      const sy = headAtTop ? cy - segments + s * 2 : cy + segments - 2 - s * 2;
      const color = s % 2 === 0 ? body : accent;
      rect(ctx, cx - 1, sy, 3, 2, color);
      px(ctx, cx - 1, sy, highlight);
      px(ctx, cx + 1, sy + 1, shadow);
      px(ctx, cx - 2, sy + 1, shadow);
      px(ctx, cx + 2, sy + 1, shadow);
      if (spotColor && s % 2 === 0) px(ctx, cx, sy, spotColor);
    }
    const hy = headAtTop ? cy - segments - 1 : cy + segments;
    rect(ctx, cx - 1, hy, 3, 1, body);
    if (headAtTop) {
      px(ctx, cx - 1, hy, eye);
      px(ctx, cx + 1, hy, eye);
      px(ctx, cx - 1, hy - 1, shadow);
      px(ctx, cx + 1, hy - 1, shadow);
    }
  } else {
    const flip = dir === LEFT;
    const f = flip ? (x) => 15 - x : (x) => x;
    for (let s = 0; s < segments; s++) {
      const sx = cx - segments + s * 2 + 1;
      const wave = Math.round(Math.sin((s + wavePhase) * 1.1) * 0.7);
      const sy = cy - 1 + wave;
      const color = s % 2 === 0 ? body : accent;
      px(ctx, f(sx), sy, color);
      px(ctx, f(sx + 1), sy, color);
      px(ctx, f(sx), sy + 1, shadow);
      px(ctx, f(sx + 1), sy + 1, shadow);
      px(ctx, f(sx), sy + 2, shadow);
      if (spotColor && s % 2 === 0) px(ctx, f(sx + 1), sy, spotColor);
    }
    const hx = cx + segments;
    px(ctx, f(hx), cy - 1, body);
    px(ctx, f(hx), cy, body);
    px(ctx, f(hx), cy - 1, eye);
    px(ctx, f(hx + 1), cy - 2, shadow);
  }
}
