import { effectConfig } from "../effects/effectConfig";
import { distance3 } from "../utils/math";
import type { StableTrackedHand } from "../tracking/tracking.types";

export type HandDetectionInput = Omit<
  StableTrackedHand,
  "id" | "firstSeenAt" | "lastSeenAt" | "velocityWorld" | "speed"
>;

interface TrackRecord extends StableTrackedHand {
  missedSince: number | null;
}

export class HandIdentityTracker {
  private tracks = new Map<string, TrackRecord>();
  private nextId = 1;
  private now = 0;

  update(detections: HandDetectionInput[], now: number): StableTrackedHand[] {
    this.now = now;
    const matchedTrackIds = new Set<string>();
    const output: StableTrackedHand[] = [];

    detections.forEach((detection) => {
      const match = this.findBestMatch(detection, matchedTrackIds);
      const previous = match ? this.tracks.get(match) : null;
      const id = previous?.id ?? `hand-${this.nextId++}`;
      const deltaSeconds = Math.max((now - (previous?.lastSeenAt ?? now)) / 1000, 1 / 120);
      const velocityWorld = previous
        ? {
            x: (detection.palmWorld.x - previous.palmWorld.x) / deltaSeconds,
            y: (detection.palmWorld.y - previous.palmWorld.y) / deltaSeconds,
            z: (detection.palmWorld.z - previous.palmWorld.z) / deltaSeconds,
          }
        : { x: 0, y: 0, z: 0 };
      const stable: TrackRecord = {
        ...detection,
        id,
        velocityWorld,
        speed: Math.hypot(velocityWorld.x, velocityWorld.y, velocityWorld.z),
        firstSeenAt: previous?.firstSeenAt ?? now,
        lastSeenAt: now,
        missedSince: null,
      };
      this.tracks.set(id, stable);
      matchedTrackIds.add(id);
      output.push(stable);
    });

    this.tracks.forEach((track, id) => {
      if (matchedTrackIds.has(id)) return;
      const missedSince = track.missedSince ?? now;
      if (now - missedSince <= effectConfig.handIdentity.lossGraceMs) {
        const retained: TrackRecord = {
          ...track,
          missedSince,
          trackingConfidence: track.trackingConfidence * 0.68,
          gestureConfidence: track.gestureConfidence * 0.68,
        };
        this.tracks.set(id, retained);
        output.push(retained);
        return;
      }
      this.tracks.delete(id);
    });

    return output.sort((a, b) => a.palmScreen.x - b.palmScreen.x);
  }

  reset() {
    this.tracks.clear();
    this.nextId = 1;
    this.now = 0;
  }

  private findBestMatch(detection: HandDetectionInput, used: Set<string>) {
    let bestId: string | null = null;
    let bestScore = Number.POSITIVE_INFINITY;

    this.tracks.forEach((track, id) => {
      if (used.has(id)) return;
      const elapsed = this.now - track.lastSeenAt;
      if (elapsed > effectConfig.handIdentity.lossGraceMs) return;
      const distance = distance3(detection.palmNormalized, track.palmNormalized);
      if (distance > effectConfig.handIdentity.maxMatchDistance) return;
      const handednessScore = detection.anatomicalSide === track.anatomicalSide
        ? -effectConfig.handIdentity.handednessBonus
        : effectConfig.handIdentity.handednessBonus;
      const screenSideScore = detection.screenSide === track.screenSide
        ? -effectConfig.handIdentity.screenSideBonus
        : effectConfig.handIdentity.screenSideBonus;
      const score = distance + handednessScore + screenSideScore;
      if (score < bestScore) {
        bestScore = score;
        bestId = id;
      }
    });

    return bestId;
  }
}
