/**
 * Special state drawing functions: sleeping, dead, egg, pupa — 32×32 design grid.
 */
import { px, rect } from '../helpers.js';

export function drawSleeping(ctx) {
  // Body lump
  rect(ctx, 10, 16, 12, 6, '#9090aa');
  rect(ctx, 12, 14, 8, 2, '#9090aa');
  rect(ctx, 12, 22, 8, 2, '#7878aa');
  // Highlight on top
  rect(ctx, 12, 16, 8, 2, '#a0a0bb');
  // Shadow on bottom
  rect(ctx, 10, 20, 12, 2, '#7878aa');
  // Nose/face
  rect(ctx, 8, 16, 4, 4, '#9090aa');
  rect(ctx, 8, 16, 2, 2, '#a0a0bb');
  rect(ctx, 8, 18, 2, 2, '#444466');
  // Tail
  rect(ctx, 22, 18, 2, 2, '#8888aa');
  rect(ctx, 24, 16, 2, 2, '#8888aa');
  // Zzz
  rect(ctx, 20, 10, 2, 2, '#88bbff');
  rect(ctx, 22, 6, 4, 4, '#88bbff');
  rect(ctx, 22, 6, 2, 2, '#aaddff');
  rect(ctx, 26, 2, 6, 4, '#88bbff');
  rect(ctx, 26, 2, 2, 2, '#aaddff');
  rect(ctx, 28, 2, 2, 2, '#aaddff');
}

export function drawDead(ctx) {
  // Body on side
  rect(ctx, 8, 18, 14, 6, '#888888');
  rect(ctx, 10, 16, 6, 2, '#999999');
  rect(ctx, 8, 24, 14, 2, '#777777');
  // Eye highlight
  rect(ctx, 10, 18, 2, 2, '#999999');
  // X eyes
  rect(ctx, 10, 16, 2, 2, '#dd3333');
  rect(ctx, 14, 16, 2, 2, '#dd3333');
  rect(ctx, 16, 18, 2, 2, '#dd6666');
  // Legs sticking up
  rect(ctx, 8, 24, 2, 2, '#888888');
  rect(ctx, 10, 26, 2, 2, '#888888');
  rect(ctx, 18, 24, 2, 2, '#888888');
  rect(ctx, 20, 26, 2, 2, '#888888');
  // Ghost wisps
  rect(ctx, 14, 10, 2, 2, 'rgba(200,200,255,0.4)');
  rect(ctx, 16, 8, 2, 2, 'rgba(200,200,255,0.3)');
  rect(ctx, 12, 8, 2, 2, 'rgba(200,200,255,0.3)');
}

export function drawEgg(ctx) {
  // Top cap
  rect(ctx, 14, 8, 4, 2, '#f5f0e5');
  rect(ctx, 12, 10, 8, 4, '#f5f0e5');
  // Main body
  rect(ctx, 10, 14, 12, 6, '#f5f0e5');
  rect(ctx, 12, 20, 8, 4, '#f5f0e5');
  // Bottom
  rect(ctx, 14, 24, 4, 2, '#e8e0d0');
  // Highlight
  rect(ctx, 14, 10, 4, 2, '#fffff0');
  rect(ctx, 12, 14, 2, 2, '#fffff0');
  // Shadow on bottom half
  rect(ctx, 12, 20, 8, 2, '#e0d8c8');
  rect(ctx, 14, 22, 4, 2, '#d8d0c0');
  // Speckles
  rect(ctx, 14, 14, 2, 2, '#c8b890');
  rect(ctx, 18, 16, 2, 2, '#c8b890');
  rect(ctx, 12, 18, 2, 2, '#c8b890');
  rect(ctx, 16, 20, 2, 2, '#d0c0a0');
}

export function drawPupa(ctx) {
  // Top cap
  rect(ctx, 14, 6, 4, 2, '#706030');
  rect(ctx, 12, 8, 8, 4, '#8a6a3a');
  // Main body
  rect(ctx, 10, 12, 12, 8, '#8a6a3a');
  rect(ctx, 12, 20, 8, 4, '#8a6a3a');
  // Bottom
  rect(ctx, 14, 24, 4, 2, '#706030');
  // Highlight
  rect(ctx, 12, 12, 2, 2, '#a08050');
  rect(ctx, 14, 10, 2, 2, '#a08050');
  // Segment bands
  rect(ctx, 10, 14, 12, 2, '#705528');
  rect(ctx, 10, 18, 12, 2, '#705528');
  // Color shimmer
  rect(ctx, 14, 12, 2, 2, '#b0a068');
  rect(ctx, 18, 16, 2, 2, '#90b070');
  rect(ctx, 12, 18, 2, 2, '#7090b0');
  // Hook on top
  rect(ctx, 14, 4, 2, 2, '#c0b090');
  rect(ctx, 16, 4, 2, 2, '#c0b090');
  rect(ctx, 14, 2, 2, 2, '#d0c0a0');
  rect(ctx, 16, 2, 2, 2, '#d0c0a0');
}
