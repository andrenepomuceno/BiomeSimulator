import { px, rect, darken, thickLine } from '../../helpers.js';
import { _id, _drawJointedLegCore } from './shared.js';

export function drawInsectLeg(ctx, x, y, rightSide, femurColor, tibiaColor, tarsusColor, extension = 6) {
  const dir = rightSide ? 1 : -1;
  rect(ctx, x + dir * 0, y, 4, 2, femurColor);
  rect(ctx, x + dir * extension, y + 1, 3, 2, tibiaColor);
  px(ctx, x + dir * (extension + 3), y + 2, tarsusColor);
}

export function drawInsectLegSide(ctx, f, x, y, off, femurColor, tibiaColor, jumpLeg = false) {
  rect(ctx, f(x), y + off, 2, 2, femurColor);
  rect(ctx, f(x - 1), y + 2 + off, 2, 2, tibiaColor);
  px(ctx, f(x - 2), y + 4 + off, tibiaColor);
  if (jumpLeg) {
    rect(ctx, f(x), y + 2 + off, 3, 2, femurColor);
    rect(ctx, f(x - 2), y + 4 + off, 3, 2, tibiaColor);
  }
}

export function drawQuadrupedLeg(ctx, x, y, upperColor, jointColor, pawColor = null, heavyPaw = false) {
  rect(ctx, x, y, 4, 4, upperColor);
  rect(ctx, x, y + 4, 4, 3, jointColor);
  if (pawColor !== null) {
    rect(ctx, x + 1, y + 6, 2, 2, pawColor);
    if (heavyPaw) rect(ctx, x, y + 7, 4, 1, pawColor);
  }
}

export function drawQuadrupedLegSide(ctx, f, x, y, upperColor, jointColor, pawColor, lowerShift = 0) {
  rect(ctx, f(x), y, 3, 4, upperColor);
  rect(ctx, f(x), y + 4 + lowerShift, 3, 3, jointColor);
  px(ctx, f(x + 1), y + 6 + lowerShift, pawColor);
}

export function drawHoofLeg(ctx, x, y, legLength, legColor, shadowColor, hoofColor) {
  const upper = Math.max(2, Math.floor(legLength * 0.45));
  const lower = Math.max(2, legLength - upper - 1);
  _drawJointedLegCore(
    ctx, _id,
    x + 1, y,
    x + 1, y + upper,
    x + 1, y + upper + lower,
    legColor, shadowColor,
    { upperThickness: 1, lowerThickness: 1, claw: { x: x, y: y + upper + lower, color: hoofColor } },
  );
  rect(ctx, x, y + upper + lower, 4, 1, hoofColor);
}

export function drawReptileLegTop(ctx, hipX, hipY, dirX, swing, upperColor, lowerColor, clawColor) {
  const kneeX = hipX + dirX * 4;
  const kneeY = hipY + 2 + swing;
  const footX = hipX + dirX * 7;
  const footY = hipY + 4 + swing;
  _drawJointedLegCore(ctx, _id, hipX, hipY + swing, kneeX, kneeY, footX, footY, upperColor, lowerColor, {
    upperThickness: 1,
    lowerThickness: 0,
    claw: { x: footX, y: footY + 1, color: clawColor },
  });
}

export function drawReptileLegSide(ctx, f, hipX, hipY, swing, upperColor, lowerColor, clawColor, kneeDx = -2, footDx = -4) {
  const kneeX = hipX + kneeDx;
  const kneeY = hipY + 3 + swing;
  const footX = hipX + footDx;
  const footY = hipY + 5 + swing;
  const clawX = footX + (footDx >= 0 ? 1 : -1);
  _drawJointedLegCore(ctx, f, hipX, hipY + swing, kneeX, kneeY, footX, footY, upperColor, lowerColor, {
    upperThickness: 1,
    lowerThickness: 0,
    claw: { x: clawX, y: footY + 1, color: clawColor },
  });
}

export function drawReptileStubLeg(ctx, x0, y0, x1, y1, color) {
  _drawJointedLegCore(ctx, _id, x0, y0, x1, y1, x1, y1, color, color, {
    upperThickness: 1,
    lowerThickness: 0,
  });
}

export function drawLizardLegTop(ctx, hipX, hipY, dirX, swing, upperColor, lowerColor) {
  const kneeX = hipX + dirX * 3;
  const kneeY = hipY + 3 + swing;
  const footX = hipX + dirX * 6;
  const footY = hipY + 5 + swing;
  const toeX = hipX + dirX * 4;
  _drawJointedLegCore(ctx, _id, hipX, hipY + swing, kneeX, kneeY, footX, footY, upperColor, lowerColor, {
    upperThickness: 1,
    lowerThickness: 0,
    toes: [{ x0: toeX, y0: footY, x1: toeX + dirX, y1: footY + 2, thickness: 0 }],
  });
}

export function drawLizardLegSide(ctx, f, hipX, hipY, swing, upperColor, lowerColor, dirX) {
  const kneeX = hipX + dirX * 3;
  const kneeY = hipY + 2 + swing;
  const footX = hipX + dirX * 5;
  const footY = hipY + 4 + swing;
  _drawJointedLegCore(ctx, f, hipX, hipY, kneeX, kneeY, footX, footY, upperColor, lowerColor, {
    upperThickness: 1,
    lowerThickness: 0,
    toes: [
      { x0: footX, y0: footY, x1: footX + dirX * 2, y1: footY + 1, thickness: 0 },
      { x0: footX, y0: footY, x1: footX, y1: footY + 2, thickness: 0 },
      { x0: footX, y0: footY, x1: footX - dirX * 2, y1: footY + 2, thickness: 0 },
    ],
  });
}

export function drawBirdFoot(ctx, f, x, y, footColor) {
  const dark = darken(footColor, 0.22);
  px(ctx, f(x), y, footColor);
  px(ctx, f(x), y + 1, footColor);
  px(ctx, f(x), y + 2, footColor);
  px(ctx, f(x - 1), y + 3, footColor);
  px(ctx, f(x), y + 3, footColor);
  px(ctx, f(x + 1), y + 3, footColor);
  px(ctx, f(x - 2), y + 4, dark);
  px(ctx, f(x + 2), y + 4, dark);
  px(ctx, f(x - 1), y + 2, dark);
}

export function drawCricketJumpLegTop(ctx, bx, w, by, h, color, outline) {
  const legDark = darken(color, 0.12);
  thickLine(ctx, bx - 1, by + h - 6, bx - 10, by + h - 2, 1, color);
  thickLine(ctx, bx - 10, by + h - 2, bx - 15, by + h + 3, 0, legDark);
  px(ctx, bx - 16, by + h + 4, outline);
  thickLine(ctx, bx + w, by + h - 6, bx + w + 9, by + h - 2, 1, color);
  thickLine(ctx, bx + w + 9, by + h - 2, bx + w + 14, by + h + 3, 0, legDark);
  px(ctx, bx + w + 15, by + h + 4, outline);
}

export function drawCricketJumpLegSide(ctx, f, bx, w, by, h, color, outline) {
  const legDark = darken(color, 0.12);
  thickLine(ctx, f(bx + w - 2), by + h - 2, f(bx + w + 4), by + 2, 1, color);
  thickLine(ctx, f(bx + w + 4), by + 2, f(bx + w + 6), by + h + 1, 0, legDark);
  px(ctx, f(bx + w + 6), by + h + 2, outline);
  px(ctx, f(bx + w + 7), by + h + 1, legDark);
}

export function drawCerciTop(ctx, cx, by, h, color) {
  const tip = darken(color, 0.08);
  thickLine(ctx, cx - 1, by + h, cx - 3, by + h + 4, 0, color);
  px(ctx, cx - 4, by + h + 5, tip);
  thickLine(ctx, cx + 2, by + h, cx + 4, by + h + 4, 0, color);
  px(ctx, cx + 5, by + h + 5, tip);
}

export function drawCerciSide(ctx, f, bx, by, h, color) {
  thickLine(ctx, f(bx - 1), by + h - 6, f(bx - 5), by + h - 2, 0, color);
  px(ctx, f(bx - 6), by + h - 1, darken(color, 0.08));
}
