import { clamp } from "../utils/math";
import type { GestureType } from "./tracking.types";

export interface GestureReading {
  gesture: GestureType;
  confidence: number;
}

export const classifyGesture = (
  openness: number,
  pinchStrength: number,
  pointingScore = 0,
): GestureReading => {
  if (pinchStrength >= 0.72 && openness > 0.3) {
    return {
      gesture: "pinch",
      confidence: clamp((pinchStrength - 0.62) / 0.38, 0, 1),
    };
  }
  if (pointingScore >= 0.72) {
    return {
      gesture: "point",
      confidence: clamp((pointingScore - 0.58) / 0.42, 0, 1),
    };
  }
  if (openness >= 0.68) {
    return {
      gesture: "open-palm",
      confidence: clamp((openness - 0.55) / 0.45, 0, 1),
    };
  }
  if (openness <= 0.32 && pinchStrength < 0.82) {
    return {
      gesture: "fist",
      confidence: clamp((0.45 - openness) / 0.45, 0, 1),
    };
  }
  return { gesture: "none", confidence: 1 - Math.abs(openness - 0.5) };
};

export class GestureStabilizer {
  private active: GestureType = "none";
  private candidate: GestureType = "none";
  private candidateFrames = 0;

  update(reading: GestureReading): GestureReading {
    if (reading.gesture === this.active) {
      this.candidateFrames = 0;
      return reading;
    }
    if (reading.gesture === this.candidate) {
      this.candidateFrames += 1;
    } else {
      this.candidate = reading.gesture;
      this.candidateFrames = 1;
    }
    const requiredFrames = reading.gesture === "none" ? 2 : 4;
    if (this.candidateFrames >= requiredFrames) {
      this.active = this.candidate;
      this.candidateFrames = 0;
    }
    return {
      gesture: this.active,
      confidence:
        this.active === reading.gesture ? reading.confidence : reading.confidence * 0.55,
    };
  }
}
