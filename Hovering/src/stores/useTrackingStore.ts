import { create } from "zustand";
import type {
  GestureType,
  ModelStatus,
  TrackedHand,
} from "../tracking/tracking.types";

export interface TrackingSnapshot {
  hands: TrackedHand[];
  gesture: GestureType;
  confidence: number;
  trackingFps: number;
  inferenceMs: number;
  modelStatus: ModelStatus;
  errorMessage: string | null;
}

interface TrackingState extends TrackingSnapshot {
  update: (snapshot: Partial<TrackingSnapshot>) => void;
  reset: () => void;
}

const initial: TrackingSnapshot = {
  hands: [],
  gesture: "none",
  confidence: 0,
  trackingFps: 0,
  inferenceMs: 0,
  modelStatus: "idle",
  errorMessage: null,
};

export const useTrackingStore = create<TrackingState>((set) => ({
  ...initial,
  update: (snapshot) => set(snapshot),
  reset: () => set(initial),
}));
