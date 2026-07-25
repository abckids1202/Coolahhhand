import { describe, expect, it } from "vitest";
import { classifyGesture, GestureStabilizer } from "./gestureClassifier";

describe("gesture classifier", () => {
  it("distinguishes the three core gestures", () => {
    expect(classifyGesture(0.9, 0.1).gesture).toBe("open-palm");
    expect(classifyGesture(0.12, 0.3).gesture).toBe("fist");
    expect(classifyGesture(0.55, 0.9).gesture).toBe("pinch");
  });

  it("requires stable readings before switching gestures", () => {
    const stabilizer = new GestureStabilizer();
    const reading = { gesture: "open-palm" as const, confidence: 0.9 };
    expect(stabilizer.update(reading).gesture).toBe("none");
    expect(stabilizer.update(reading).gesture).toBe("none");
    expect(stabilizer.update(reading).gesture).toBe("none");
    expect(stabilizer.update(reading).gesture).toBe("open-palm");
  });
});
