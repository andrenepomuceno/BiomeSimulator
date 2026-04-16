/**
 * Flower template — sunflower (tall stem + flower head).
 * Stages 2-5 at 64×64 design grid, 3 animation frames for sway.
 */
import { px, rect, ellipse, darken, lighten, rimLight, ao, speckle, anisotropicSpeckle, fillPolygon } from '../../helpers.js';

export function drawFlower(ctx, params, stage, frame) {
  const { stem, leaf, leafDark, petal, petalDark, center, fruit } = params;
  const cx = 28;
  const baseY = 56;

  const swayOff = frame === 0 ? 0 : (frame === 1 ? 2 : -2);

  // Directional petal texture — diagonal streaks simulate petal veins
  function petalTex(x, y, w, h) {
    anisotropicSpeckle(ctx, x, y, w, h,
      [petalDark || darken(petal, 0.15), darken(petal, 0.10), lighten(petal, 0.06)], 0.22, Math.PI / 4, 2.0);
  }

  if (stage === 2) {
    // Stem
    rect(ctx, cx + 2 + swayOff, baseY - 16, 4, 16, stem);
    px(ctx, cx + 2 + swayOff, baseY - 14, lighten(stem, 0.10));
    rect(ctx, cx - 2 + swayOff, baseY - 12, 6, 4, leaf);
    rect(ctx, cx + 4 + swayOff, baseY - 14, 6, 4, leaf);
    
    // Tight bud — 4 sepals (green) with petal tips (color) showing through
    const budCx = cx + 4 + swayOff;
    const budCy = baseY - 21;
    
    // Draw 4 sepals pointing outward
    rect(ctx, budCx - 2, budCy - 6, 4, 4, leaf);           // top sepal
    rect(ctx, budCx - 2, budCy + 2, 4, 4, leaf);           // bottom sepal
    rect(ctx, budCx - 6, budCy - 2, 4, 4, leaf);           // left sepal
    rect(ctx, budCx + 2, budCy - 2, 4, 4, leaf);           // right sepal
    
    // Sepal highlights
    px(ctx, budCx - 1, budCy - 5, lighten(leaf, 0.15));
    px(ctx, budCx - 1, budCy + 3, lighten(leaf, 0.12));
    px(ctx, budCx - 5, budCy - 1, lighten(leaf, 0.12));
    px(ctx, budCx + 3, budCy - 1, lighten(leaf, 0.12));
    
    // Petal tips showing through centre (hint of color inside)
    rect(ctx, budCx - 1, budCy - 2, 2, 4, petal);
    px(ctx, budCx, budCy - 1, lighten(petal, 0.12));
    
    rect(ctx, cx - 2, baseY, 12, 4, darken(stem, 0.3));
  } else if (stage === 3) {
    rect(ctx, cx + 2 + swayOff, baseY - 28, 4, 28, stem);
    // Stem highlight (cylindrical look)
    for (let r = 4; r < 24; r++) px(ctx, cx + 2 + swayOff, baseY - 28 + r, lighten(stem, 0.10));
    rect(ctx, cx - 4 + swayOff, baseY - 20, 8, 4, leaf);
    rect(ctx, cx + 4 + swayOff, baseY - 16, 8, 4, leaf);
    rect(ctx, cx - 2 + swayOff, baseY - 24, 6, 4, leafDark);
    
    // Opening bud — 6 petals just beginning to unfold
    const centerX3 = cx + 4 + swayOff;
    const centerY3 = baseY - 33;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const px1 = centerX3 + Math.round(Math.cos(angle) * 5);
      const py1 = centerY3 + Math.round(Math.sin(angle) * 5);
      const px2 = centerX3 + Math.round(Math.cos(angle) * 11);
      const py2 = centerY3 + Math.round(Math.sin(angle) * 11) - 2; // unfold upward
      
      rect(ctx, px1 - 1, py1 - 1, 2, 2, petal);
      px(ctx, px2, py2, lighten(petal, 0.12));
      px(ctx, px2 - 1, py2 - 1, petal);
    }
    
    // Center disc barely showing
    ellipse(ctx, centerX3, centerY3, 5, 4, center);
    px(ctx, centerX3 - 1, centerY3 - 2, lighten(center, 0.12));
    
    petalTex(cx - 2 + swayOff, baseY - 40, 12, 14);
    rect(ctx, cx - 4, baseY, 16, 4, darken(stem, 0.3));
  } else if (stage === 4) {
    rect(ctx, cx + 2 + swayOff, baseY - 32, 4, 32, stem);
    // Stem highlight (cylindrical)
    for (let r = 4; r < 28; r++) px(ctx, cx + 2 + swayOff, baseY - 32 + r, lighten(stem, 0.10));
    rect(ctx, cx - 4 + swayOff, baseY - 24, 8, 4, leaf);
    rect(ctx, cx + 4 + swayOff, baseY - 20, 8, 4, leaf);
    
    // Full flower head — 8 individual petals radiating from center
    const centerX = cx + 4 + swayOff;
    const centerY = baseY - 36;
    const petalRadius = 9;
    const petalLen = 7;
    
    // Draw 8 petals at cardinal + diagonal angles
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;  // 0, π/4, π/2, 3π/4, π, 5π/4, 3π/2, 7π/4
      const px1 = centerX + Math.round(Math.cos(angle) * petalRadius);
      const py1 = centerY + Math.round(Math.sin(angle) * petalRadius);
      const px2 = centerX + Math.round(Math.cos(angle) * (petalRadius + petalLen));
      const py2 = centerY + Math.round(Math.sin(angle) * (petalRadius + petalLen));
      
      // Petal base (wider)
      const baseW = i % 2 === 0 ? 3 : 2;  // Cardinal petals slightly wider
      rect(ctx, px1 - 1, py1 - 1, baseW, 3, petal);
      
      // Petal tip (pointed)
      px(ctx, px2, py2, petalDark || darken(petal, 0.15));
      px(ctx, px2 - 1, py2, darken(petal, 0.10));
      px(ctx, px2 + 1, py2, darken(petal, 0.10));
      
      // Petal highlight (top-lit)
      if (i < 4) {  // top half petals get more light
        px(ctx, Math.round(px1 + (px2 - px1) * 0.5), Math.round(py1 + (py2 - py1) * 0.5), lighten(petal, 0.15));
      }
    }
    
    // Center disc (ellipse for roundness)
    ellipse(ctx, centerX, centerY, 7, 6, center);
    ellipse(ctx, centerX - 1, centerY - 2, 4, 3, lighten(center, 0.12)); // highlight lobe
    // Center seed texture
    anisotropicSpeckle(ctx, centerX - 8, centerY - 7, 14, 12,
      [darken(center, 0.18), darken(center, 0.24)], 0.38, 0, 1.0);
    
    rect(ctx, cx - 4, baseY, 16, 4, darken(stem, 0.3));
  } else if (stage === 5) {
    rect(ctx, cx + 2 + swayOff, baseY - 32, 4, 32, stem);
    // Stem highlight
    for (let r = 4; r < 28; r++) px(ctx, cx + 2 + swayOff, baseY - 32 + r, lighten(stem, 0.10));
    rect(ctx, cx - 4 + swayOff, baseY - 24, 8, 4, leaf);
    rect(ctx, cx + 4 + swayOff, baseY - 20, 8, 4, leaf);
    
    // Drooping flower — 8 petals hanging down, fading as they fall
    const centerX5 = cx + 4 + swayOff;
    const centerY5 = baseY - 34;
    
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      // Start petals from center, drop them down as they age
      const px1 = centerX5 + Math.round(Math.cos(angle) * 6);
      const py1 = centerY5 + Math.round(Math.sin(angle) * 6);
      const dropLen = 10 + (i % 2) * 2;
      const px2 = centerX5 + Math.round(Math.cos(angle) * 5);
      const py2 = centerY5 + Math.round(Math.sin(angle) * 5) + dropLen;  // hang down
      
      // Petal color fades with drop (some gone, some still visible)
      const petalAlpha = i < 4 ? petal : darken(petal, 0.15);
      rect(ctx, px1 - 1, py1, 2, 2, petalAlpha);
      px(ctx, px2, py2, petalAlpha);
      px(ctx, px2 - 1, py2, darken(petalAlpha, 0.10));
    }
    
    // Mature seed head (large, domed)
    ellipse(ctx, centerX5, centerY5, 8, 7, darken(center, 0.10));
    ellipse(ctx, centerX5 - 1, centerY5 - 2, 5, 4, center); // dome highlight
    // Dense seed texture
    anisotropicSpeckle(ctx, centerX5 - 9, centerY5 - 6, 16, 14,
      [darken(center, 0.22), darken(center, 0.28)], 0.42, 0, 1.0);
    // Ripe seeds visible
    rect(ctx, centerX5 + 1, centerY5 - 3, 5, 5, fruit || lighten(center, 0.20));
    rect(ctx, centerX5 + 5, centerY5 - 1, 4, 4, fruit || lighten(center, 0.20));
    px(ctx, centerX5 + 2, centerY5 - 2, lighten(fruit || lighten(center, 0.20), 0.15));
    rect(ctx, cx - 4, baseY, 16, 4, darken(stem, 0.3));
  }
}
