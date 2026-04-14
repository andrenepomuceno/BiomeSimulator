/**
 * Tree template — round-canopy trees (apple, mango, oak, olive).
 * Stages 2-5 at 64×64 design grid, 3 animation frames for sway.
 */
import { px, rect, darken, lighten, noise } from '../../helpers.js';

export function drawTree(ctx, params, stage, frame) {
  const { trunk, trunkDark, leaf, leafDark, fruit, fruitAccent } = params;
  const lh = params.leafHighlight || lighten(leaf, 0.25);
  const cw = params.canopyW || 32;
  const ch = params.canopyH || 22;
  const th = params.trunkH || 32;
  const cx = 28;
  const baseY = 60;

  const swayOff = frame === 0 ? 0 : (frame === 1 ? 2 : -2);
  const hw = (cw / 2) | 0;

  function canopyTex(x, y, w, h) {
    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++)
        if (noise(x + dx, y + dy) > 0.74) px(ctx, x + dx, y + dy, leafDark);
  }

  function barkTex(x, y, w, h) {
    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++)
        if (noise(x + dx, y + dy) > 0.76) px(ctx, x + dx, y + dy, trunkDark);
  }

  if (stage === 2) {
    const sh = (th * 0.6) | 0;
    const sw = (cw * 0.35) | 0;
    const sch = (ch * 0.45) | 0;
    rect(ctx, cx + 2, baseY - sh, 4, sh, trunk);
    rect(ctx, cx, baseY - sh, 2, (sh * 0.4) | 0, trunkDark);
    barkTex(cx, baseY - sh, 6, sh);
    rect(ctx, cx - (sw / 2 | 0) + swayOff, baseY - sh - sch + 2, sw, sch, leaf);
    rect(ctx, cx - (sw / 2 | 0) + 2 + swayOff, baseY - sh - sch, sw - 4, (sch * 0.4) | 0, lighten(leaf, 0.15));
    rect(ctx, cx - (sw / 2 | 0) + 2 + swayOff, baseY - sh + 2, sw - 4, 4, leafDark);
    canopyTex(cx - (sw / 2 | 0) + swayOff, baseY - sh - sch, sw, sch);
    rect(ctx, cx - 2, baseY, 12, 4, darken(trunk, 0.3));
  } else if (stage === 3) {
    const sh = (th * 0.85) | 0;
    const sw = (cw * 0.7) | 0;
    const sch = (ch * 0.7) | 0;
    const shw = (sw / 2) | 0;
    rect(ctx, cx + 2, baseY - sh, 6, sh, trunk);
    rect(ctx, cx, baseY - (sh * 0.7) | 0, 2, (sh * 0.55) | 0, trunkDark);
    barkTex(cx, baseY - sh, 8, sh);
    rect(ctx, cx - shw + swayOff, baseY - sh - (sch * 0.5) | 0, sw, (sch * 0.55) | 0, leaf);
    rect(ctx, cx - shw + 2 + swayOff, baseY - sh - (sch * 0.8) | 0, sw - 4, (sch * 0.3) | 0, leaf);
    rect(ctx, cx - shw + 4 + swayOff, baseY - sh - sch, sw - 8, (sch * 0.3) | 0, leaf);
    rect(ctx, cx - shw + 2 + swayOff, baseY - sh + 4, sw - 4, 4, leafDark);
    rect(ctx, cx - shw + 4 + swayOff, baseY - sh - sch, sw - 8, 4, lighten(leaf, 0.2));
    canopyTex(cx - shw + swayOff, baseY - sh - sch, sw, sch);
    rect(ctx, cx - shw + 4 + swayOff, baseY - sh - (sch * 0.6) | 0, 6, 6, lh);
    rect(ctx, cx + swayOff, baseY - sh - sch + 2, 6, 4, lh);
    rect(ctx, cx - 4, baseY, 16, 4, darken(trunk, 0.3));
  } else if (stage === 4) {
    rect(ctx, cx, baseY - th, 8, th, trunk);
    rect(ctx, cx - 2, baseY - (th * 0.6) | 0, 4, (th * 0.5) | 0, trunkDark);
    barkTex(cx, baseY - th, 8, th);
    rect(ctx, cx - hw + swayOff, baseY - th - (ch * 0.35) | 0, cw, (ch * 0.7) | 0, leaf);
    rect(ctx, cx - hw + 2 + swayOff, baseY - th - (ch * 0.7) | 0, cw - 4, (ch * 0.45) | 0, leaf);
    rect(ctx, cx - hw + 6 + swayOff, baseY - th - ch, cw - 12, (ch * 0.3) | 0, leaf);
    rect(ctx, cx - hw + 2 + swayOff, baseY - th + 4, cw - 4, 4, leafDark);
    rect(ctx, cx - hw + 6 + swayOff, baseY - th - ch, cw - 12, 4, lighten(leaf, 0.2));
    canopyTex(cx - hw + swayOff, baseY - th - ch, cw, ch);
    rect(ctx, cx - hw + 6 + swayOff, baseY - th - (ch * 0.6) | 0, 8, 6, lh);
    rect(ctx, cx + 2 + swayOff, baseY - th - (ch * 0.8) | 0, 8, 6, lh);
    rect(ctx, cx + hw - 12 + swayOff, baseY - th - (ch * 0.4) | 0, 6, 6, lh);
    rect(ctx, cx - 6, baseY, 20, 4, darken(trunk, 0.3));
  } else if (stage === 5) {
    rect(ctx, cx, baseY - th, 8, th, trunk);
    rect(ctx, cx - 2, baseY - (th * 0.6) | 0, 4, (th * 0.5) | 0, trunkDark);
    barkTex(cx, baseY - th, 8, th);
    rect(ctx, cx - hw + swayOff, baseY - th - (ch * 0.35) | 0, cw, (ch * 0.7) | 0, leaf);
    rect(ctx, cx - hw + 2 + swayOff, baseY - th - (ch * 0.7) | 0, cw - 4, (ch * 0.45) | 0, leaf);
    rect(ctx, cx - hw + 6 + swayOff, baseY - th - ch, cw - 12, (ch * 0.3) | 0, leaf);
    rect(ctx, cx - hw + 2 + swayOff, baseY - th + 4, cw - 4, 4, leafDark);
    canopyTex(cx - hw + swayOff, baseY - th - ch, cw, ch);
    rect(ctx, cx - hw + 6 + swayOff, baseY - th - (ch * 0.6) | 0, 8, 6, lh);
    rect(ctx, cx + 2 + swayOff, baseY - th - (ch * 0.8) | 0, 8, 6, lh);
    // Fruit
    const fy = baseY - th - (ch * 0.3) | 0;
    rect(ctx, cx - hw + 4 + swayOff, fy, 8, 8, fruit);
    rect(ctx, cx + hw - 10 + swayOff, fy - 6, 8, 8, fruit);
    rect(ctx, cx + swayOff, fy + 4, 8, 8, fruit);
    rect(ctx, cx - hw + 6 + swayOff, fy - 10, 6, 6, fruitAccent || fruit);
    rect(ctx, cx + hw - 8 + swayOff, fy + 2, 6, 6, fruitAccent || fruit);
    // Fruit highlights
    px(ctx, cx - hw + 5 + swayOff, fy + 1, lighten(fruit, 0.2));
    px(ctx, cx + hw - 9 + swayOff, fy - 5, lighten(fruit, 0.2));
    rect(ctx, cx - 6, baseY, 20, 4, darken(trunk, 0.3));
  }
}
