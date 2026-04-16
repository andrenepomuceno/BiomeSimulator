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
    
    // Helper to draw small petal made of circles
    function drawSmallCirclePetal(angle, startRadius, length) {
      const cos_a = Math.cos(angle);
      const sin_a = Math.sin(angle);
      
      const numCircles = 4;
      for (let j = 0; j < numCircles; j++) {
        const t = j / (numCircles - 1);
        const distAlongPetal = t * length;
        const circleRadius = Math.max(0.5, 1.8 * (1 - t * 0.7));
        
        const circleX = centerX3 + Math.round(cos_a * (startRadius + distAlongPetal));
        const circleY = centerY3 + Math.round(sin_a * (startRadius + distAlongPetal)) - 1;  // unfold upward
        
        let circleColor = petal;
        if (j === numCircles - 1) {
          circleColor = lighten(petal, 0.12);
        }
        
        ellipse(ctx, circleX, circleY, Math.round(circleRadius), Math.round(circleRadius), circleColor);
      }
    }
    
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      drawSmallCirclePetal(angle, 4, 8);
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
    const petalRadius = 8;
    const petalLen = 10;
    
    // Helper to draw a petal made of overlapping circles
    function drawCirclePetal(angle, startRadius, length) {
      const cos_a = Math.cos(angle);
      const sin_a = Math.sin(angle);
      const perpX = -sin_a;
      const perpY = cos_a;
      
      // Draw petal as series of circles along the direction, tapering in size
      const numCircles = 6;
      for (let j = 0; j < numCircles; j++) {
        const t = j / (numCircles - 1);  // 0 to 1
        const distAlongPetal = t * length;
        const circleRadius = Math.max(1, 2.5 * (1 - t * 0.8));  // Taper from ~2.5 to ~0.5
        
        const circleX = centerX + Math.round(cos_a * (startRadius + distAlongPetal));
        const circleY = centerY + Math.round(sin_a * (startRadius + distAlongPetal));
        
        // Color variation along petal
        let circleColor = petal;
        if (j === numCircles - 1) {
          circleColor = petalDark || darken(petal, 0.15);  // Darker tip
        } else if (j >= numCircles - 2) {
          circleColor = darken(petal, 0.08);  // Slightly darker toward tip
        }
        
        ellipse(ctx, circleX, circleY, Math.round(circleRadius), Math.round(circleRadius), circleColor);
        
        // Highlight on top-lit petals (left half of flower facing top-left)
        if (j < numCircles - 1 && j > 0) {
          const highlightX = circleX + Math.round(perpX);
          const highlightY = circleY + Math.round(perpY);
          px(ctx, highlightX, highlightY, lighten(petal, 0.10));
        }
      }
    }
    
    // Draw 8 petals at cardinal + diagonal angles
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      drawCirclePetal(angle, petalRadius, petalLen);
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
    
    // Helper to draw drooping petal made of circles
    function drawDroopingCirclePetal(angle, dropLen) {
      const cos_a = Math.cos(angle);
      const sin_a = Math.sin(angle);
      
      const petalAlpha = angle < Math.PI / 2 ? petal : darken(petal, 0.15);
      
      const numCircles = 5;
      for (let j = 0; j < numCircles; j++) {
        const t = j / (numCircles - 1);
        const distAlongDrop = t * dropLen;
        const circleRadius = Math.max(0.5, 2.0 * (1 - t * 0.8));
        
        const circleX = centerX5 + Math.round(cos_a * 4);
        const circleY = centerY5 + Math.round(sin_a * 4) + Math.round(distAlongDrop);
        
        let circleColor = petalAlpha;
        if (j >= numCircles - 2) {
          circleColor = darken(petalAlpha, 0.12);
        }
        
        ellipse(ctx, circleX, circleY, Math.round(circleRadius), Math.round(circleRadius), circleColor);
      }
    }
    
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const dropLen = 10 + (i % 2) * 2;
      drawDroopingCirclePetal(angle, dropLen);
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
