import { describe, expect, it } from "vitest";
import {
  calculateCoverLayout,
  normalizedLandmarkToScreen,
  screenToNdc,
} from "./coordinateTransforms";

describe("coordinate transforms", () => {
  it("calculates horizontal crop for object-fit cover", () => {
    const layout = calculateCoverLayout(1920, 1080, 1000, 1000);
    expect(layout.scale).toBeCloseTo(1000 / 1080);
    expect(layout.renderedHeight).toBeCloseTo(1000);
    expect(layout.renderedWidth).toBeGreaterThan(1000);
    expect(layout.offsetX).toBeLessThan(0);
    expect(layout.offsetY).toBeCloseTo(0);
  });

  it("mirrors normalized x coordinates before applying crop", () => {
    const layout = calculateCoverLayout(1000, 1000, 1000, 1000);
    const point = normalizedLandmarkToScreen({ x: 0.2, y: 0.4 }, layout);
    expect(point).toEqual({ x: 800, y: 400 });
  });

  it("converts screen center to NDC origin", () => {
    expect(screenToNdc({ x: 500, y: 250 }, 1000, 500)).toEqual({
      x: 0,
      y: 0,
    });
  });
});
