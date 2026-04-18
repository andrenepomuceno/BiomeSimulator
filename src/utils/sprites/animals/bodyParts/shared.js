import { px, rect, darken, lighten, thickLine } from '../../helpers.js';

export const _id = (x) => x;

export function _drawIrisPupilHighlight(ctx, f, x, y, w, h, irisColor, pupil, highlight) {
  rect(ctx, f(x), y, w, h, irisColor);
  if (pupil) {
    px(ctx, f(x + pupil.dx), y + pupil.dy, pupil.color);
  }
  if (highlight) {
    px(ctx, f(x + highlight.dx), y + highlight.dy, highlight.color);
  }
}

export function _featherZoneColor(t, accent) {
  if (t < 0.28) return lighten(accent, 0.10);
  if (t < 0.65) return accent;
  return darken(accent, 0.11);
}

export function _drawJointedLegCore(ctx, f, hipX, hipY, kneeX, kneeY, footX, footY, upperColor, lowerColor, options = {}) {
  const {
    upperThickness = 1,
    lowerThickness = 0,
    claw = null,
    toes = null,
  } = options;

  thickLine(ctx, f(hipX), hipY, f(kneeX), kneeY, upperThickness, upperColor);
  thickLine(ctx, f(kneeX), kneeY, f(footX), footY, lowerThickness, lowerColor);

  if (claw) {
    px(ctx, f(claw.x), claw.y, claw.color);
  }

  if (toes) {
    for (const toe of toes) {
      thickLine(
        ctx,
        f(toe.x0),
        toe.y0,
        f(toe.x1),
        toe.y1,
        toe.thickness ?? 0,
        toe.color || lowerColor,
      );
    }
  }
}
