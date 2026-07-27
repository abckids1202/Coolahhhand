import { create } from "zustand";
import type {
  GestureType,
  ModelStatus,
  TrackedHand,
  TwoHandEffectAnchor,
} from "../tracking/tracking.types";
import type { InteractionState } from "../interactions/interaction.types";

export interface TrackingSnapshot {
  hands: TrackedHand[];
  gesture: GestureType;
  confidence: number;
  trackingFps: number;
  inferenceMs: number;
  modelStatus: ModelStatus;
  errorMessage: string | null;
  twoHandAnchor: TwoHandEffectAnchor | null;
  interactionState: InteractionState;
  charge: number;
  maximumCharge: number;
  formationProgress: number;
  releaseProgress: number;
  readiness: { hasTwoHands: boolean; validTrackingConfidence: boolean; validDistance: boolean; validStability: boolean; validFacing: boolean; overallScore: number };
  candidateDuration: number;
  readyDuration: number;
  releaseAnchor: { x: number; y: number; z: number } | null;
  orbEvent: string | null;
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
  twoHandAnchor: null,
  interactionState: "idle",
  charge: 0, maximumCharge: 0, formationProgress: 0, releaseProgress: 0,
  readiness: { hasTwoHands: false, validTrackingConfidence: false, validDistance: false, validStability: false, validFacing: false, overallScore: 0 },
  candidateDuration: 0, readyDuration: 0, releaseAnchor: null, orbEvent: null,
};

export const useTrackingStore = create<TrackingState>((set) => ({
  ...initial,
  update: (snapshot) => set(snapshot),
  reset: () => set(initial),
}));


