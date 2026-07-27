import { describe, expect, it } from "vitest";
import { HandIdentityTracker, type HandDetectionInput } from "./handIdentityTracker";

const makeHand = (x: number, side: "Left" | "Right", screenSide: "Left" | "Right"): HandDetectionInput => ({
  anatomicalSide: side,
  screenSide,
  landmarks: Array.from({ length: 21 }, () => ({ x, y: 0.5, z: 0 })),
  palmNormalized: { x, y: 0.5, z: 0 },
  palmScreen: { x: x * 1000, y: 500 },
  palmWorld: { x: x * 2 - 1, y: 0, z: -0.5 },
  pinchPointWorld: { x: x * 2 - 1, y: 0.1, z: -0.5 },
  openness: 0.8,
  pinchStrength: 0.1,
  estimatedDepth: 0.5,
  palmFacingScore: 0.55,
  rawGesture: "open-palm",
  stableGesture: "open-palm",
  gestureConfidence: 0.9,
  trackingConfidence: 0.9,
});

describe("HandIdentityTracker", () => {
  it("keeps hand IDs stable when MediaPipe order swaps", () => {
    const tracker = new HandIdentityTracker();
    const first = tracker.update([makeHand(0.25, "Left", "Left"), makeHand(0.75, "Right", "Right")], 1000);
    const second = tracker.update([makeHand(0.76, "Right", "Right"), makeHand(0.24, "Left", "Left")], 1040);

    expect(second.find((hand) => hand.screenSide === "Left")?.id).toBe(first[0].id);
    expect(second.find((hand) => hand.screenSide === "Right")?.id).toBe(first[1].id);
  });

  it("retains a briefly missing hand during the grace period", () => {
    const tracker = new HandIdentityTracker();
    const first = tracker.update([makeHand(0.25, "Left", "Left"), makeHand(0.75, "Right", "Right")], 1000);
    const retained = tracker.update([makeHand(0.25, "Left", "Left")], 1120);

    expect(retained).toHaveLength(2);
    expect(retained.some((hand) => hand.id === first[1].id)).toBe(true);
  });
});
