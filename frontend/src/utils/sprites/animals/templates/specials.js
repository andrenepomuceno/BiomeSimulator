/**
 * Special state drawing functions: sleeping, dead, egg, pupa â€” 32Ã—32 design grid.
 * All sprites fill ~18-22 design pixels to match normal species sizes.
 */
import { px, rect } from '../../helpers.js';

export function drawSleeping(ctx) {
  // Body lump â€” larger, centered
  rect(ctx, 6, 14, 18, 8, '#9090aa');
  rect(ctx, 8, 12, 14, 2, '#9090aa');
  rect(ctx, 8, 22, 14, 2, '#7878aa');
  // Highlight on top
  rect(ctx, 8, 14, 14, 2, '#a0a0bb');
  // Shadow on bottom
  rect(ctx, 6, 20, 18, 2, '#7878aa');
  // Nose/face
  rect(ctx, 4, 14, 4, 6, '#9090aa');
  rect(ctx, 4, 14, 2, 2, '#a0a0bb');
  rect(ctx, 4, 18, 2, 2, '#444466');
  // Ear
  rect(ctx, 6, 12, 4, 2, '#a0a0bb');
  // Tail
  rect(ctx, 24, 16, 2, 4, '#8888aa');
  rect(ctx, 26, 14, 2, 4, '#8888aa');
  // Zzz
  rect(ctx, 20, 8, 2, 2, '#88bbff');
  rect(ctx, 22, 4, 4, 4, '#88bbff');
  rect(ctx, 22, 4, 2, 2, '#aaddff');
  rect(ctx, 27, 1, 5, 3, '#88bbff');
  rect(ctx, 27, 1, 2, 2, '#aaddff');
}

export function drawDead(ctx) {
  // Body on side â€” wider and taller
  rect(ctx, 5, 14, 20, 10, '#888888');
  rect(ctx, 7, 12, 10, 2, '#999999');
  rect(ctx, 5, 24, 20, 2, '#777777');
  // Face highlight
  rect(ctx, 7, 14, 4, 2, '#999999');
  // X eyes
  rect(ctx, 7, 12, 2, 2, '#dd3333');
  rect(ctx, 11, 12, 2, 2, '#dd3333');
  rect(ctx, 9, 14, 2, 2, '#993333');
  rect(ctx, 13, 14, 2, 2, '#dd6666');
  // Legs sticking up
  rect(ctx, 5, 24, 2, 2, '#888888');
  rect(ctx, 7, 26, 2, 2, '#888888');
  rect(ctx, 21, 24, 2, 2, '#888888');
  rect(ctx, 23, 26, 2, 2, '#888888');
  // Belly stripe
  rect(ctx, 5, 20, 20, 2, '#777777');
  // Ghost wisps
  rect(ctx, 14, 6, 2, 4, 'rgba(200,200,255,0.4)');
  rect(ctx, 16, 4, 2, 4, 'rgba(200,200,255,0.3)');
  rect(ctx, 12, 4, 2, 4, 'rgba(200,200,255,0.3)');
}

export function drawEgg(ctx) {
  // Larger egg shape
  rect(ctx, 13, 6, 6, 2, '#f5f0e5');
  rect(ctx, 11, 8, 10, 4, '#f5f0e5');
  rect(ctx, 9, 12, 14, 8, '#f5f0e5');
  rect(ctx, 11, 20, 10, 4, '#f5f0e5');
  rect(ctx, 13, 24, 6, 2, '#e8e0d0');
  // Highlight
  rect(ctx, 13, 8, 6, 2, '#fffff0');
  rect(ctx, 11, 12, 2, 4, '#fffff0');
  // Shadow on bottom half
  rect(ctx, 11, 20, 10, 2, '#e0d8c8');
  rect(ctx, 13, 22, 6, 2, '#d8d0c0');
  // Speckles
  rect(ctx, 13, 12, 2, 2, '#c8b890');
  rect(ctx, 19, 14, 2, 2, '#c8b890');
  rect(ctx, 11, 16, 2, 2, '#c8b890');
  rect(ctx, 17, 18, 2, 2, '#d0c0a0');
  rect(ctx, 13, 20, 2, 2, '#c8b890');
}

export function drawPupa(ctx) {
  // Wider pupa shape
  rect(ctx, 13, 4, 6, 2, '#706030');
  rect(ctx, 11, 6, 10, 4, '#8a6a3a');
  rect(ctx, 9, 10, 14, 10, '#8a6a3a');
  rect(ctx, 11, 20, 10, 4, '#8a6a3a');
  rect(ctx, 13, 24, 6, 2, '#706030');
  // Highlight
  rect(ctx, 11, 10, 2, 4, '#a08050');
  rect(ctx, 13, 8, 2, 2, '#a08050');
  // Segment bands
  rect(ctx, 9, 12, 14, 2, '#705528');
  rect(ctx, 9, 16, 14, 2, '#705528');
  // Color shimmer
  rect(ctx, 13, 10, 2, 2, '#b0a068');
  rect(ctx, 19, 14, 2, 2, '#90b070');
  rect(ctx, 11, 16, 2, 2, '#7090b0');
  // Hook on top
  rect(ctx, 13, 2, 2, 2, '#c0b090');
  rect(ctx, 15, 2, 2, 2, '#c0b090');
  rect(ctx, 14, 0, 2, 2, '#d0c0a0');
  rect(ctx, 16, 0, 2, 2, '#d0c0a0');
}
