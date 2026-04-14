/**
 * Tree template — round-canopy trees (apple, mango, oak, olive).
 * Stages 2-5 at 32×32 design grid, 3 animation frames for sway.
 */
import { rect, darken, lighten } from '../../helpers.js';

export function drawTree(ctx, params, stage, frame) {
  const { trunk, trunkDark, leaf, leafDark, fruit, fruitAccent } = params;
  const lh = params.leafHighlight || lighten(leaf, 0.25);
  // Shape params with defaults for backward compat
  const cw = params.canopyW || 16;   // full canopy width at stage 4-5
  const ch = params.canopyH || 11;   // full canopy height at stage 4-5
  const th = params.trunkH || 16;    // trunk height at stage 4-5
  const cx = 14;
  const baseY = 30;

  const swayOff = frame === 0 ? 0 : (frame === 1 ? 1 : -1);

  // Derived sizes per stage (fractions of full params)
  const hw = (cw / 2) | 0; // half canopy width

  if (stage === 2) {
    const sh = (th * 0.6) | 0;
    const sw = (cw * 0.35) | 0;
    const sch = (ch * 0.45) | 0;
    rect(ctx, cx + 1, baseY - sh, 2, sh, trunk);
    rect(ctx, cx, baseY - sh, 1, (sh * 0.4) | 0, trunkDark);
    // Small canopy
    rect(ctx, cx - (sw / 2 | 0) + swayOff, baseY - sh - sch + 1, sw, sch, leaf);
    rect(ctx, cx - (sw / 2 | 0) + 1 + swayOff, baseY - sh - sch, sw - 2, (sch * 0.4) | 0, lighten(leaf, 0.15));
    rect(ctx, cx - (sw / 2 | 0) + 1 + swayOff, baseY - sh + 1, sw - 2, 2, leafDark);
    rect(ctx, cx - 1, baseY, 6, 2, darken(trunk, 0.3));
  } else if (stage === 3) {
    const sh = (th * 0.85) | 0;
    const sw = (cw * 0.7) | 0;
    const sch = (ch * 0.7) | 0;
    const shw = (sw / 2) | 0;
    rect(ctx, cx + 1, baseY - sh, 3, sh, trunk);
    rect(ctx, cx, baseY - (sh * 0.7) | 0, 1, (sh * 0.55) | 0, trunkDark);
    rect(ctx, cx - shw + swayOff, baseY - sh - (sch * 0.5) | 0, sw, (sch * 0.55) | 0, leaf);
    rect(ctx, cx - shw + 1 + swayOff, baseY - sh - (sch * 0.8) | 0, sw - 2, (sch * 0.3) | 0, leaf);
    rect(ctx, cx - shw + 2 + swayOff, baseY - sh - sch, sw - 4, (sch * 0.3) | 0, leaf);
    rect(ctx, cx - shw + 1 + swayOff, baseY - sh + 2, sw - 2, 2, leafDark);
    rect(ctx, cx - shw + 2 + swayOff, baseY - sh - sch, sw - 4, 2, lighten(leaf, 0.2));
    // Highlight patches
    rect(ctx, cx - shw + 2 + swayOff, baseY - sh - (sch * 0.6) | 0, 3, 3, lh);
    rect(ctx, cx + swayOff, baseY - sh - sch + 1, 3, 2, lh);
    rect(ctx, cx - 2, baseY, 8, 2, darken(trunk, 0.3));
  } else if (stage === 4) {
    rect(ctx, cx, baseY - th, 4, th, trunk);
    rect(ctx, cx - 1, baseY - (th * 0.6) | 0, 2, (th * 0.5) | 0, trunkDark);
    // Full canopy
    rect(ctx, cx - hw + swayOff, baseY - th - (ch * 0.35) | 0, cw, (ch * 0.7) | 0, leaf);
    rect(ctx, cx - hw + 1 + swayOff, baseY - th - (ch * 0.7) | 0, cw - 2, (ch * 0.45) | 0, leaf);
    rect(ctx, cx - hw + 3 + swayOff, baseY - th - ch, cw - 6, (ch * 0.3) | 0, leaf);
    rect(ctx, cx - hw + 1 + swayOff, baseY - th + 2, cw - 2, 2, leafDark);
    rect(ctx, cx - hw + 3 + swayOff, baseY - th - ch, cw - 6, 2, lighten(leaf, 0.2));
    // Highlight patches — add visible bright spots
    rect(ctx, cx - hw + 3 + swayOff, baseY - th - (ch * 0.6) | 0, 4, 3, lh);
    rect(ctx, cx + 1 + swayOff, baseY - th - (ch * 0.8) | 0, 4, 3, lh);
    rect(ctx, cx + hw - 6 + swayOff, baseY - th - (ch * 0.4) | 0, 3, 3, lh);
    rect(ctx, cx - 3, baseY, 10, 2, darken(trunk, 0.3));
  } else if (stage === 5) {
    rect(ctx, cx, baseY - th, 4, th, trunk);
    rect(ctx, cx - 1, baseY - (th * 0.6) | 0, 2, (th * 0.5) | 0, trunkDark);
    rect(ctx, cx - hw + swayOff, baseY - th - (ch * 0.35) | 0, cw, (ch * 0.7) | 0, leaf);
    rect(ctx, cx - hw + 1 + swayOff, baseY - th - (ch * 0.7) | 0, cw - 2, (ch * 0.45) | 0, leaf);
    rect(ctx, cx - hw + 3 + swayOff, baseY - th - ch, cw - 6, (ch * 0.3) | 0, leaf);
    rect(ctx, cx - hw + 1 + swayOff, baseY - th + 2, cw - 2, 2, leafDark);
    // Highlight patches
    rect(ctx, cx - hw + 3 + swayOff, baseY - th - (ch * 0.6) | 0, 4, 3, lh);
    rect(ctx, cx + 1 + swayOff, baseY - th - (ch * 0.8) | 0, 4, 3, lh);
    // Fruit — larger, positioned within canopy
    const fy = baseY - th - (ch * 0.3) | 0;
    rect(ctx, cx - hw + 2 + swayOff, fy, 4, 4, fruit);
    rect(ctx, cx + hw - 5 + swayOff, fy - 3, 4, 4, fruit);
    rect(ctx, cx + swayOff, fy + 2, 4, 4, fruit);
    rect(ctx, cx - hw + 3 + swayOff, fy - 5, 3, 3, fruitAccent || fruit);
    rect(ctx, cx + hw - 4 + swayOff, fy + 1, 3, 3, fruitAccent || fruit);
    rect(ctx, cx - 3, baseY, 10, 2, darken(trunk, 0.3));
  }
}
