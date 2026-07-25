import { clamp, lerp } from "../utils/math";
import type { NormalizedLandmark } from "./tracking.types";

export class AdaptiveLandmarkSmoother {
  private previous: NormalizedLandmark[] | null = null;

  update(next: NormalizedLandmark[]): NormalizedLandmark[] {
    if (!this.previous || this.previous.length !== next.length) {
      this.previous = next.map((point) => ({ ...point }));
      return this.previous;
    }
    this.previous = next.map((point, index) => {
      const previous = this.previous![index];
      const speed = Math.hypot(point.x - previous.x, point.y - previous.y);
      const alpha = lerp(0.08, 0.35, clamp(speed / 0.08, 0, 1));
      return {
        x: lerp(previous.x, point.x, alpha),
        y: lerp(previous.y, point.y, alpha),
        z: lerp(previous.z, point.z, Math.min(alpha, 0.18)),
        visibility: point.visibility,
      };
    });
    return this.previous;
  }

  reset() {
    this.previous = null;
  }
}
