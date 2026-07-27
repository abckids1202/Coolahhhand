import { describe, expect, it } from "vitest";
import { createTwoHandAnchor } from "./twoHandMetrics";
import type { StableTrackedHand } from "../tracking/tracking.types";

const hand = (id: string, x: number): StableTrackedHand => ({
  id,
  anatomicalSide: x < 0 ? "Left" : "Right",
  screenSide: x < 0 ? "Left" : "Right",
  landmarks: Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 })),
  palmNormalized: { x: (x + 1) / 2, y: 0.5, z: 0 },
  palmScreen: { x: (x + 1) * 500, y: 500 },
  palmWorld: { x, y: 0, z: -0.5 },
  pinchPointWorld: { x, y: 0.1, z: -0.5 },
  velocityWorld: { x: 0, y: 0, z: 0 },
  speed: 0,
  openness: 0.8,
  pinchStrength: 0.1,
  estimatedDepth: 0.5,
  palmFacingScore: 0.55,
  rawGesture: "open-palm",
  stableGesture: "open-palm",
  gestureConfidence: 0.9,
  trackingConfidence: 0.9,
  firstSeenAt: 0,
  lastSeenAt: 0,
});

describe("createTwoHandAnchor", () => {
  it("calculates midpoint, distance, direction, and radius", () => {
    const anchor = createTwoHandAnchor([hand("left", -0.5), hand("right", 0.5)], null, 1 / 60);

    expect(anchor?.smoothedMidpoint.x).toBeCloseTo(0);
    expect(anchor?.smoothedDistance).toBeCloseTo(1);
    expect(anchor?.direction.x).toBeCloseTo(1);
    expect(anchor?.radius).toBeGreaterThan(40);
  });

  it("derives nonlinear expansion, visual radius, and axis deformation", () => {
    const left = hand("left", -0.8);
    const right = hand("right", 0.8);
    left.landmarks[0] = { x: 0, y: 0.5, z: 0 };
    right.landmarks[0] = { x: 1, y: 0.5, z: 0 };
    const anchor = createTwoHandAnchor([left, right], null, 1 / 60);
    expect(anchor?.expansionMetric).toBeGreaterThan(1);
    expect(anchor?.targetVisualRadius).toBeGreaterThan(0.18);
    expect(anchor?.stretchX).toBeGreaterThan(1);
    expect(anchor?.stretchY).toBeLessThan(1);
    expect(anchor?.axisAngle).toBeCloseTo(0);
  });

  it("reports closing speed when hands move inward", () => {
    const previous = createTwoHandAnchor([hand("left", -0.7), hand("right", 0.7)], null, 1 / 60);
    const current = createTwoHandAnchor([hand("left", -0.45), hand("right", 0.45)], previous, 1 / 30);

    expect(current?.closingSpeed).toBeGreaterThan(0);
    expect(current?.openingSpeed).toBe(0);
  });
});

