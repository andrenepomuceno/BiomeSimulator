/**
 * Special state drawing functions: sleeping, dead, egg, pupa.
 */
import { px, rect } from '../helpers.js';

export function drawSleeping(ctx) {
  rect(ctx, 5, 8, 6, 3, '#9090aa');
  rect(ctx, 6, 7, 4, 1, '#9090aa');
  rect(ctx, 6, 11, 4, 1, '#7878aa');
  rect(ctx, 6, 8, 4, 1, '#a0a0bb');
  rect(ctx, 5, 10, 6, 1, '#7878aa');
  rect(ctx, 4, 8, 2, 2, '#9090aa');
  px(ctx, 4, 8, '#a0a0bb');
  px(ctx, 4, 9, '#444466');
  px(ctx, 11, 9, '#8888aa');
  px(ctx, 12, 8, '#8888aa');
  px(ctx, 10, 5, '#88bbff');
  rect(ctx, 11, 3, 2, 2, '#88bbff');
  px(ctx, 11, 3, '#aaddff');
  rect(ctx, 13, 1, 3, 2, '#88bbff');
  px(ctx, 13, 1, '#aaddff');
  px(ctx, 14, 1, '#aaddff');
}

export function drawDead(ctx) {
  rect(ctx, 4, 9, 7, 3, '#888888');
  rect(ctx, 5, 8, 3, 1, '#999999');
  rect(ctx, 4, 12, 7, 1, '#777777');
  px(ctx, 5, 9, '#999999');
  px(ctx, 5, 8, '#dd3333');
  px(ctx, 7, 8, '#dd3333');
  px(ctx, 8, 9, '#dd6666');
  px(ctx, 4, 12, '#888888');
  px(ctx, 5, 13, '#888888');
  px(ctx, 9, 12, '#888888');
  px(ctx, 10, 13, '#888888');
  px(ctx, 7, 5, 'rgba(200,200,255,0.4)');
  px(ctx, 8, 4, 'rgba(200,200,255,0.3)');
  px(ctx, 6, 4, 'rgba(200,200,255,0.3)');
}

export function drawEgg(ctx) {
  rect(ctx, 7, 4, 2, 1, '#f5f0e5');
  rect(ctx, 6, 5, 4, 2, '#f5f0e5');
  rect(ctx, 5, 7, 6, 3, '#f5f0e5');
  rect(ctx, 6, 10, 4, 2, '#f5f0e5');
  rect(ctx, 7, 12, 2, 1, '#e8e0d0');
  px(ctx, 7, 5, '#fffff0');
  px(ctx, 8, 5, '#fffff0');
  px(ctx, 6, 7, '#fffff0');
  rect(ctx, 6, 10, 4, 1, '#e0d8c8');
  rect(ctx, 7, 11, 2, 1, '#d8d0c0');
  px(ctx, 7, 7, '#c8b890');
  px(ctx, 9, 8, '#c8b890');
  px(ctx, 6, 9, '#c8b890');
  px(ctx, 8, 10, '#d0c0a0');
}

export function drawPupa(ctx) {
  rect(ctx, 7, 3, 2, 1, '#706030');
  rect(ctx, 6, 4, 4, 2, '#8a6a3a');
  rect(ctx, 5, 6, 6, 4, '#8a6a3a');
  rect(ctx, 6, 10, 4, 2, '#8a6a3a');
  rect(ctx, 7, 12, 2, 1, '#706030');
  px(ctx, 6, 6, '#a08050');
  px(ctx, 7, 5, '#a08050');
  rect(ctx, 5, 7, 6, 1, '#705528');
  rect(ctx, 5, 9, 6, 1, '#705528');
  px(ctx, 7, 6, '#b0a068');
  px(ctx, 9, 8, '#90b070');
  px(ctx, 6, 9, '#7090b0');
  px(ctx, 7, 2, '#c0b090');
  px(ctx, 8, 2, '#c0b090');
  px(ctx, 7, 1, '#d0c0a0');
  px(ctx, 8, 1, '#d0c0a0');
}
