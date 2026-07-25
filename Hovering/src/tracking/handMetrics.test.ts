import { describe, expect, it } from "vitest";
import {
  calculateHandScale,
  calculatePalmCenter,
  calculatePinchStrength,
} from "./handMetrics";
import type { NormalizedLandmark } from "./tracking.types";

const landmarks = Array.from({ length: 21 }, (_, index) => ({
  x: index / 20,
  y: index / 40,
  z: 0,
})) satisfies NormalizedLandmark[];

describe("hand metrics", () => {
  it("uses stable weighted landmarks for palm center", () => {
    const center = calculatePalmCenter(landmarks);
    const expectedX =
      landmarks[0].x * 0.15 +
      landmarks[5].x * 0.2 +
      landmarks[9].x * 0.3 +
      landmarks[13].x * 0.2 +
      landmarks[17].x * 0.15;
    expect(center.x).toBeCloseTo(expectedX);
    expect(center.y).toBeCloseTo(expectedX / 2);
  });

  it("normalizes hand scale from palm width and length", () => {
    const scale = calculateHandScale(landmarks);
    expect(scale).toBeGreaterThan(0);
    expect(Number.isFinite(scale)).toBe(true);
  });

  it("reports a strong pinch when thumb and index tips meet", () => {
    const pinched = landmarks.map((point) => ({ ...point }));
    pinched[4] = { ...pinched[8] };
    expect(calculatePinchStrength(pinched)).toBe(1);
  });
});
