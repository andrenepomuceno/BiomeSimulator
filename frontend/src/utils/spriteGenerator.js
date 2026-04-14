/**
 * Procedural pixel-art sprite generator for fauna.
 *
 * Draws each species at 16×16 design resolution, upscaled 4× to 64×64
 * (FRAME_SIZE). Uses simple shapes: rectangles, ellipses, and single-pixel
 * details to produce a retro pixel-art aesthetic.
 *
 * Body templates:
 *   quadruped  — rabbit, squirrel, fox, wolf, raccoon, goat, deer, boar, bear
 *   bird       — crow, hawk
 *   insect     — beetle, mosquito, caterpillar, cricket
 *   reptile    — lizard, crocodile
 *   snake      — snake
 *
 * Directions: DOWN=0, LEFT=1, RIGHT=2, UP=3
 * Walk frames: 0 (left leg forward), 1 (neutral), 2 (right leg forward)
 */

// ── Design grid ─────────────────────────────────────────────────────
const DESIGN = 16;  // 16×16 design resolution
const SCALE = 4;    // upscale factor → 64×64 final

// Direction constants (must match engine Direction enum)
const DOWN = 0;
const LEFT = 1;
const RIGHT = 2;
const UP = 3;

// ── Pixel helper ────────────────────────────────────────────────────
function px(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
}

function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * SCALE, y * SCALE, w * SCALE, h * SCALE);
}

// ── Species parameter registry ──────────────────────────────────────
const SPECIES_PARAMS = {
  RABBIT:      { template: 'quadruped', body: '#c8a882', accent: '#f0e0d0', eye: '#220000', w: 5, h: 4, earH: 3, tail: true, small: true },
  SQUIRREL:    { template: 'quadruped', body: '#c07030', accent: '#e0a050', eye: '#110000', w: 5, h: 4, earH: 1, tail: true, bushyTail: true, small: true },
  FOX:         { template: 'quadruped', body: '#e07020', accent: '#f0e0c0', eye: '#110000', w: 6, h: 4, earH: 2, tail: true, bushyTail: true },
  WOLF:        { template: 'quadruped', body: '#808890', accent: '#c0c8d0', eye: '#ffdd00', w: 7, h: 5, earH: 2, tail: true },
  RACCOON:     { template: 'quadruped', body: '#707070', accent: '#b0b0b0', eye: '#110000', w: 6, h: 4, earH: 1, tail: true, mask: true },
  GOAT:        { template: 'quadruped', body: '#d0c8b8', accent: '#f0ece0', eye: '#220000', w: 6, h: 5, earH: 1, horns: true },
  DEER:        { template: 'quadruped', body: '#b08040', accent: '#e0c080', eye: '#110000', w: 7, h: 5, earH: 1, antlers: true },
  BOAR:        { template: 'quadruped', body: '#705838', accent: '#907050', eye: '#110000', w: 7, h: 5, earH: 1, tusks: true },
  BEAR:        { template: 'quadruped', body: '#705030', accent: '#906848', eye: '#110000', w: 8, h: 6, earH: 1, large: true },
  CROW:        { template: 'bird', body: '#222222', accent: '#444444', eye: '#ffffff', beak: '#e09020', w: 5, h: 4, wingSpan: 3 },
  HAWK:        { template: 'bird', body: '#8b5e3c', accent: '#d4a76a', eye: '#ffdd00', beak: '#555555', w: 6, h: 4, wingSpan: 4 },
  BEETLE:      { template: 'insect', body: '#2a6e2a', accent: '#44aa44', eye: '#ffffff', w: 4, h: 3, shell: true },
  MOSQUITO:    { template: 'insect', body: '#404040', accent: '#777777', eye: '#ff2222', w: 3, h: 3, wings: true, proboscis: true },
  CATERPILLAR: { template: 'insect', body: '#55aa30', accent: '#77cc50', eye: '#110000', w: 6, h: 2, segments: 4 },
  CRICKET:     { template: 'insect', body: '#5a3a1a', accent: '#8a6a3a', eye: '#ffffff', w: 5, h: 3, legs: true, antennae: true },
  LIZARD:      { template: 'reptile', body: '#50a050', accent: '#70c070', eye: '#ffdd00', w: 7, h: 3, tailLen: 3 },
  CROCODILE:   { template: 'reptile', body: '#4a6a3a', accent: '#6a8a5a', eye: '#ffdd00', w: 9, h: 3, tailLen: 4, snout: true },
  SNAKE:       { template: 'snake', body: '#508030', accent: '#70a050', eye: '#ff2222', pattern: '#406020' },
};

// ── Template: Quadruped ─────────────────────────────────────────────
function drawQuadruped(ctx, params, dir, frame) {
  const { body, accent, eye, w, h } = params;
  const cx = 8; // center of 16×16 grid
  const cy = 8;

  // Leg animation offsets: frame 0 = left forward, 1 = neutral, 2 = right forward
  const legShift = frame === 0 ? -1 : frame === 2 ? 1 : 0;

  if (dir === DOWN) {
    // Body
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);
    rect(ctx, bx, by, w, h, body);
    // Belly accent
    rect(ctx, bx + 1, by + h - 1, w - 2, 1, accent);
    // Head
    const headW = Math.max(3, w - 2);
    const hx = cx - Math.floor(headW / 2);
    rect(ctx, hx, by - 2, headW, 2, body);
    // Eyes
    px(ctx, hx + 1, by - 1, eye);
    px(ctx, hx + headW - 2, by - 1, eye);
    // Ears
    if (params.earH) {
      px(ctx, hx, by - 2 - params.earH, body);
      px(ctx, hx + headW - 1, by - 2 - params.earH, body);
      if (params.earH >= 2) {
        px(ctx, hx, by - 2 - params.earH + 1, body);
        px(ctx, hx + headW - 1, by - 2 - params.earH + 1, body);
      }
    }
    // Horns
    if (params.horns) {
      px(ctx, hx - 1, by - 3, '#d0d0d0');
      px(ctx, hx + headW, by - 3, '#d0d0d0');
    }
    // Antlers
    if (params.antlers) {
      px(ctx, hx - 1, by - 3, '#c09050');
      px(ctx, hx + headW, by - 3, '#c09050');
      px(ctx, hx - 2, by - 4, '#c09050');
      px(ctx, hx + headW + 1, by - 4, '#c09050');
    }
    // Tusks
    if (params.tusks) {
      px(ctx, hx, by, '#f0f0e0');
      px(ctx, hx + headW - 1, by, '#f0f0e0');
    }
    // Mask
    if (params.mask) {
      px(ctx, hx + 1, by - 2, '#222222');
      px(ctx, hx + headW - 2, by - 2, '#222222');
    }
    // Front legs
    const legY = by + h;
    px(ctx, bx + 1, legY + legShift, body);
    px(ctx, bx + w - 2, legY - legShift, body);
    // Back legs (slightly wider)
    px(ctx, bx, legY - legShift, body);
    px(ctx, bx + w - 1, legY + legShift, body);
    // Tail
    if (params.tail) {
      if (params.bushyTail) {
        px(ctx, cx, by + h, accent);
        px(ctx, cx, by + h + 1, accent);
      }
    }
  } else if (dir === UP) {
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);
    rect(ctx, bx, by, w, h, body);
    // Back view — accent stripe
    rect(ctx, bx + 1, by, w - 2, 1, accent);
    // Head (solid, no eyes)
    const headW = Math.max(3, w - 2);
    const hx = cx - Math.floor(headW / 2);
    rect(ctx, hx, by - 2, headW, 2, body);
    // Ears
    if (params.earH) {
      px(ctx, hx, by - 2 - params.earH, body);
      px(ctx, hx + headW - 1, by - 2 - params.earH, body);
    }
    if (params.horns) {
      px(ctx, hx - 1, by - 3, '#d0d0d0');
      px(ctx, hx + headW, by - 3, '#d0d0d0');
    }
    if (params.antlers) {
      px(ctx, hx - 1, by - 3, '#c09050');
      px(ctx, hx + headW, by - 3, '#c09050');
      px(ctx, hx - 2, by - 4, '#c09050');
      px(ctx, hx + headW + 1, by - 4, '#c09050');
    }
    // Legs
    const legY = by + h;
    px(ctx, bx + 1, legY + legShift, body);
    px(ctx, bx + w - 2, legY - legShift, body);
    px(ctx, bx, legY - legShift, body);
    px(ctx, bx + w - 1, legY + legShift, body);
    // Tail (visible from back at top)
    if (params.tail) {
      px(ctx, cx, by - 1, params.bushyTail ? accent : body);
    }
  } else {
    // LEFT or RIGHT (draw as RIGHT, flip for LEFT)
    const flip = dir === LEFT;
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);

    // Body
    rect(ctx, flip ? 16 - bx - w : bx, by, w, h, body);
    // Belly
    const bellyX = flip ? 16 - bx - w : bx;
    rect(ctx, bellyX, by + h - 1, w, 1, accent);

    // Head (extends right/left)
    const headW = 3;
    const headH = Math.max(3, h - 1);
    const headX = flip ? (16 - bx - w - headW) : (bx + w);
    const headY = by;
    rect(ctx, headX, headY, headW, headH, body);
    // Eye
    const eyeX = flip ? headX + 1 : headX + headW - 2;
    const eyeY = headY + 1;
    px(ctx, eyeX, eyeY, eye);
    // Nose
    const noseX = flip ? headX : headX + headW - 1;
    px(ctx, noseX, headY + headH - 1, accent);
    // Ear
    if (params.earH) {
      const earX = flip ? headX + headW - 1 : headX;
      for (let e = 0; e < params.earH; e++) {
        px(ctx, earX, headY - 1 - e, body);
      }
    }
    if (params.horns) {
      const hornX = flip ? headX + headW - 1 : headX;
      px(ctx, hornX, headY - 2, '#d0d0d0');
    }
    if (params.antlers) {
      const aX = flip ? headX + headW - 1 : headX;
      px(ctx, aX, headY - 2, '#c09050');
      px(ctx, aX, headY - 3, '#c09050');
      const branchX = flip ? aX + 1 : aX - 1;
      px(ctx, branchX, headY - 3, '#c09050');
    }
    if (params.tusks) {
      const tX = flip ? headX : headX + headW - 1;
      px(ctx, tX, headY + headH, '#f0f0e0');
    }
    if (params.mask) {
      px(ctx, eyeX, eyeY - 1, '#222222');
    }
    // Legs (side view — 2 pairs)
    const bodyX = flip ? 16 - bx - w : bx;
    const legY = by + h;
    // Front pair
    const fl = flip ? bodyX + w - 2 : bodyX + 1;
    px(ctx, fl, legY, body);
    px(ctx, fl + legShift, legY + 1, body);
    // Back pair
    const bl = flip ? bodyX + 1 : bodyX + w - 2;
    px(ctx, bl, legY, body);
    px(ctx, bl - legShift, legY + 1, body);
    // Tail
    if (params.tail) {
      const tailX = flip ? bodyX + w : bodyX - 1;
      const tailY = by + 1;
      px(ctx, tailX, tailY, params.bushyTail ? accent : body);
      if (params.bushyTail) {
        px(ctx, tailX + (flip ? 1 : -1), tailY, accent);
      }
    }
  }
}

// ── Template: Bird ──────────────────────────────────────────────────
function drawBird(ctx, params, dir, frame) {
  const { body, accent, eye, beak, w, h, wingSpan } = params;
  const cx = 8;
  const cy = 8;
  // Wing flap animation
  const wingUp = frame === 0 ? -1 : frame === 2 ? 1 : 0;

  if (dir === DOWN || dir === UP) {
    // Round body
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);
    rect(ctx, bx, by, w, h, body);
    // Head
    rect(ctx, cx - 1, by - 2, 3, 2, body);
    if (dir === DOWN) {
      // Eyes
      px(ctx, cx - 1, by - 1, eye);
      px(ctx, cx + 1, by - 1, eye);
      // Beak
      px(ctx, cx, by, beak);
    }
    // Wings
    const wingY = by + 1 + wingUp;
    rect(ctx, bx - wingSpan, wingY, wingSpan, 1, accent);
    rect(ctx, bx + w, wingY, wingSpan, 1, accent);
    // Tail feathers
    if (dir === UP) {
      px(ctx, cx - 1, by + h, accent);
      px(ctx, cx, by + h, accent);
      px(ctx, cx + 1, by + h, accent);
    }
    // Feet
    px(ctx, cx - 1, by + h, body);
    px(ctx, cx + 1, by + h, body);
  } else {
    const flip = dir === LEFT;
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);
    // Body
    rect(ctx, flip ? 16 - bx - w : bx, by, w, h, body);
    // Head
    const headX = flip ? 16 - bx - w - 2 : bx + w;
    rect(ctx, headX, by - 1, 2, 3, body);
    // Eye
    const ex = flip ? headX + 1 : headX;
    px(ctx, ex, by, eye);
    // Beak
    const beakX = flip ? headX - 1 : headX + 2;
    px(ctx, beakX, by + 1, beak);
    // Wing (side)
    const bodyX = flip ? 16 - bx - w : bx;
    const wingY = by - wingUp;
    rect(ctx, bodyX + 1, wingY - 1, w - 2, 1, accent);
    // Tail
    const tailX = flip ? bodyX + w : bodyX - 1;
    px(ctx, tailX, by + h - 1, accent);
    if (wingSpan > 3) px(ctx, tailX + (flip ? 1 : -1), by + h - 1, accent);
    // Feet
    const footX = flip ? bodyX + w - 1 : bodyX;
    px(ctx, footX, by + h, body);
    px(ctx, footX + 1, by + h, body);
  }
}

// ── Template: Insect ────────────────────────────────────────────────
function drawInsect(ctx, params, dir, frame) {
  const { body, accent, eye, w, h } = params;
  const cx = 8;
  const cy = 8;
  const legWiggle = frame === 0 ? -1 : frame === 2 ? 1 : 0;

  if (params.segments) {
    // Caterpillar — special case: segmented body
    drawCaterpillar(ctx, params, dir, frame);
    return;
  }

  if (dir === DOWN || dir === UP) {
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);
    // Shell / body
    if (params.shell) {
      rect(ctx, bx, by, w, h, accent);
      rect(ctx, cx, by, 1, h, body); // center line
    } else {
      rect(ctx, bx, by, w, h, body);
    }
    // Head
    const headW = Math.max(2, w - 1);
    const hx = cx - Math.floor(headW / 2);
    if (dir === DOWN) {
      rect(ctx, hx, by - 1, headW, 1, body);
      px(ctx, hx, by - 1, eye);
      px(ctx, hx + headW - 1, by - 1, eye);
      if (params.proboscis) px(ctx, cx, by, '#cc0000');
    } else {
      rect(ctx, hx, by - 1, headW, 1, body);
    }
    // Antennae
    if (params.antennae || params.proboscis) {
      const topY = dir === DOWN ? by - 2 : by - 2;
      px(ctx, hx, topY, body);
      px(ctx, hx + headW - 1, topY, body);
    }
    // Legs (3 pairs)
    for (let i = 0; i < 3; i++) {
      const ly = by + i + legWiggle * (i === 1 ? 0 : 1);
      px(ctx, bx - 1, ly, body);
      px(ctx, bx + w, ly, body);
    }
    // Wings (mosquito)
    if (params.wings) {
      const wy = by - 1 + (frame === 1 ? 0 : -1);
      rect(ctx, bx - 2, wy, 2, 1, 'rgba(200,200,255,0.5)');
      rect(ctx, bx + w, wy, 2, 1, 'rgba(200,200,255,0.5)');
    }
  } else {
    const flip = dir === LEFT;
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);
    const bodyX = flip ? 16 - bx - w : bx;
    rect(ctx, bodyX, by, w, h, params.shell ? accent : body);
    // Head
    const headX = flip ? bodyX - 1 : bodyX + w;
    rect(ctx, headX, by, 1, h, body);
    const ex = headX;
    px(ctx, ex, by, eye);
    if (params.proboscis) {
      const pX = flip ? headX - 1 : headX + 1;
      px(ctx, pX, by + 1, '#cc0000');
    }
    // Legs
    for (let i = 0; i < 3; i++) {
      const lx = bodyX + i + (i === 1 ? legWiggle : 0);
      px(ctx, lx, by + h, body);
    }
    if (params.wings) {
      const wy = by - 1 + (frame === 1 ? 0 : -1);
      rect(ctx, bodyX + 1, wy, w - 2, 1, 'rgba(200,200,255,0.5)');
    }
  }
}

function drawCaterpillar(ctx, params, dir, frame) {
  const { body, accent, eye, segments } = params;
  const cx = 8;
  const cy = 9;
  const waveShift = frame === 0 ? 0 : frame === 2 ? 2 : 1;

  if (dir === DOWN || dir === UP) {
    for (let s = 0; s < segments; s++) {
      const sy = cy - segments + s * 2;
      const sx = cx - 1 + (s % 2 === waveShift % 2 ? 0 : 0);
      rect(ctx, sx, sy, 3, 2, s % 2 === 0 ? body : accent);
    }
    // Head
    const hy = dir === DOWN ? cy - segments - 1 : cy + (segments - 1) * 2 + 1;
    rect(ctx, cx - 1, hy, 3, 1, body);
    if (dir === DOWN) {
      px(ctx, cx - 1, hy, eye);
      px(ctx, cx + 1, hy, eye);
    }
  } else {
    const flip = dir === LEFT;
    for (let s = 0; s < segments; s++) {
      const sx = flip ? cx + segments - 1 - s * 2 : cx - segments + s * 2;
      const sy = cy - 1 + Math.round(Math.sin((s + waveShift) * 1.2) * 0.8);
      rect(ctx, sx, sy, 2, 2, s % 2 === 0 ? body : accent);
    }
    // Head
    const hx = flip ? cx - segments : cx + segments;
    rect(ctx, hx, cy - 1, 1, 2, body);
    px(ctx, hx, cy - 1, eye);
  }
}

// ── Template: Reptile ───────────────────────────────────────────────
function drawReptile(ctx, params, dir, frame) {
  const { body, accent, eye, w, h, tailLen } = params;
  const cx = 8;
  const cy = 8;
  const legShift = frame === 0 ? -1 : frame === 2 ? 1 : 0;

  if (dir === DOWN || dir === UP) {
    const bx = cx - Math.floor(w / 2);
    const halfW = Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);
    // Body
    rect(ctx, bx, by, w, h, body);
    rect(ctx, bx + 1, by, w - 2, h, accent);
    // Head
    const headW = Math.max(3, Math.min(5, w - 2));
    const hx = cx - Math.floor(headW / 2);
    const headY = dir === DOWN ? by - 2 : by + h;
    rect(ctx, hx, headY, headW, 2, body);
    if (dir === DOWN) {
      px(ctx, hx + 1, headY + 1, eye);
      px(ctx, hx + headW - 2, headY + 1, eye);
      if (params.snout) {
        rect(ctx, hx, headY - 1, headW, 1, body);
      }
    }
    // Tail
    const tailY = dir === DOWN ? by + h : by - tailLen;
    for (let t = 0; t < tailLen; t++) {
      const tw = Math.max(1, halfW - t);
      rect(ctx, cx - Math.floor(tw / 2), tailY + (dir === DOWN ? t : tailLen - 1 - t), tw, 1, body);
    }
    // Legs
    const legY1 = by + (dir === DOWN ? 0 : h - 1);
    const legY2 = by + (dir === DOWN ? h - 1 : 0);
    px(ctx, bx - 1, legY1 + legShift, body);
    px(ctx, bx + w, legY1 - legShift, body);
    px(ctx, bx - 1, legY2 - legShift, body);
    px(ctx, bx + w, legY2 + legShift, body);
  } else {
    const flip = dir === LEFT;
    const bx = cx - Math.floor(w / 2);
    const by = cy - Math.floor(h / 2);
    const bodyX = flip ? 16 - bx - w : bx;
    // Body
    rect(ctx, bodyX, by, w, h, body);
    rect(ctx, bodyX, by + 1, w, h - 2, accent);
    // Head
    const headX = flip ? bodyX - 3 : bodyX + w;
    const headW = params.snout ? 3 : 2;
    rect(ctx, headX, by, headW, h, body);
    const ex = flip ? headX + headW - 1 : headX;
    px(ctx, ex, by, eye);
    // Tail
    const tailX = flip ? bodyX + w : bodyX - tailLen;
    for (let t = 0; t < tailLen; t++) {
      const tx = flip ? tailX + t : tailX + tailLen - 1 - t;
      const th = Math.max(1, h - t);
      rect(ctx, tx, cy - Math.floor(th / 2), 1, th, body);
    }
    // Legs
    px(ctx, bodyX + 1, by + h + legShift, body);
    px(ctx, bodyX + w - 2, by + h - legShift, body);
  }
}

// ── Template: Snake ─────────────────────────────────────────────────
function drawSnake(ctx, params, dir, frame) {
  const { body, accent, eye, pattern } = params;
  const cx = 8;
  const cy = 8;
  const phase = frame * 0.8;

  if (dir === DOWN || dir === UP) {
    // Vertical serpentine
    for (let i = 0; i < 10; i++) {
      const y = dir === DOWN ? cy - 5 + i : cy + 5 - i;
      const x = cx + Math.round(Math.sin(i * 0.7 + phase) * 1.5);
      const color = i % 3 === 0 ? pattern : (i % 3 === 1 ? body : accent);
      rect(ctx, x, y, 2, 1, color);
    }
    // Head
    const hy = dir === DOWN ? cy - 6 : cy + 5;
    rect(ctx, cx - 1, hy, 3, 2, body);
    if (dir === DOWN) {
      px(ctx, cx - 1, hy + 1, eye);
      px(ctx, cx + 1, hy + 1, eye);
      // Tongue
      px(ctx, cx, hy + 2, '#ff0000');
    }
  } else {
    const flip = dir === LEFT;
    // Horizontal serpentine
    for (let i = 0; i < 10; i++) {
      const x = flip ? cx + 5 - i : cx - 5 + i;
      const y = cy + Math.round(Math.sin(i * 0.7 + phase) * 1.5);
      const color = i % 3 === 0 ? pattern : (i % 3 === 1 ? body : accent);
      rect(ctx, x, y, 1, 2, color);
    }
    // Head
    const hx = flip ? cx - 6 : cx + 5;
    rect(ctx, hx, cy - 1, 2, 3, body);
    px(ctx, hx + (flip ? 0 : 1), cy - 1, eye);
    px(ctx, hx + (flip ? 0 : 1), cy + 1, eye);
    // Tongue
    const tx = flip ? hx - 1 : hx + 2;
    px(ctx, tx, cy, '#ff0000');
  }
}

// ── Special states ──────────────────────────────────────────────────
function drawSleeping(ctx) {
  // Generic sleeping body (grey lump)
  rect(ctx, 5, 8, 6, 4, '#8888aa');
  rect(ctx, 6, 7, 4, 1, '#8888aa');
  // Closed eyes line
  rect(ctx, 6, 9, 1, 1, '#333355');
  rect(ctx, 9, 9, 1, 1, '#333355');
  // Zzz
  px(ctx, 11, 5, '#aaccff');
  px(ctx, 12, 4, '#aaccff');
  px(ctx, 11, 4, '#aaccff');
  px(ctx, 12, 3, '#aaccff');
  px(ctx, 11, 3, '#aaccff');
  px(ctx, 13, 2, '#aaccff');
  px(ctx, 12, 2, '#aaccff');
}

function drawDead(ctx) {
  // Grey body on side
  rect(ctx, 4, 9, 8, 3, '#777777');
  rect(ctx, 5, 8, 3, 1, '#777777');
  // X eyes
  px(ctx, 5, 8, '#cc2222');
  px(ctx, 7, 8, '#cc2222');
  // Legs up
  px(ctx, 5, 12, '#777777');
  px(ctx, 9, 12, '#777777');
  px(ctx, 6, 13, '#777777');
  px(ctx, 10, 13, '#777777');
}

function drawEgg(ctx) {
  // Oval egg
  rect(ctx, 6, 5, 4, 7, '#f0ece0');
  rect(ctx, 5, 6, 6, 5, '#f0ece0');
  rect(ctx, 7, 4, 2, 1, '#f0ece0');
  rect(ctx, 7, 12, 2, 1, '#f0ece0');
  // Spots
  px(ctx, 7, 7, '#c0b890');
  px(ctx, 9, 9, '#c0b890');
  px(ctx, 6, 10, '#c0b890');
}

function drawPupa(ctx) {
  // Cocoon shape
  rect(ctx, 6, 4, 4, 9, '#8a6a3a');
  rect(ctx, 5, 5, 6, 7, '#8a6a3a');
  rect(ctx, 7, 3, 2, 1, '#8a6a3a');
  rect(ctx, 7, 13, 2, 1, '#8a6a3a');
  // Wrapping lines
  rect(ctx, 5, 6, 6, 1, '#705528');
  rect(ctx, 5, 9, 6, 1, '#705528');
  // Attachment point
  px(ctx, 7, 3, '#554422');
  px(ctx, 8, 3, '#554422');
  px(ctx, 7, 2, '#554422');
}

// ── Main entry point ────────────────────────────────────────────────

/**
 * Draw a single sprite frame onto the given context at (0,0).
 * The context should already be sized to FRAME_SIZE × FRAME_SIZE.
 *
 * @param {CanvasRenderingContext2D} ctx - cleared 64×64 context
 * @param {string} species - species key or special state key
 * @param {number} direction - 0=DOWN, 1=LEFT, 2=RIGHT, 3=UP
 * @param {number} frame - walk frame 0, 1, or 2
 */
export function drawSpeciesFrame(ctx, species, direction, frame) {
  ctx.clearRect(0, 0, DESIGN * SCALE, DESIGN * SCALE);
  ctx.imageSmoothingEnabled = false;

  // Special states (direction-agnostic, single frame)
  switch (species) {
    case 'SLEEPING': drawSleeping(ctx); return;
    case 'DEAD':     drawDead(ctx); return;
    case 'EGG':      drawEgg(ctx); return;
    case 'PUPA':     drawPupa(ctx); return;
  }

  const params = SPECIES_PARAMS[species];
  if (!params) return;

  switch (params.template) {
    case 'quadruped': drawQuadruped(ctx, params, direction, frame); break;
    case 'bird':      drawBird(ctx, params, direction, frame); break;
    case 'insect':    drawInsect(ctx, params, direction, frame); break;
    case 'reptile':   drawReptile(ctx, params, direction, frame); break;
    case 'snake':     drawSnake(ctx, params, direction, frame); break;
  }
}

/** Direction names for building texture keys. */
export const DIR_NAMES = ['DOWN', 'LEFT', 'RIGHT', 'UP'];
