import type { GestureType, StableTrackedHand, TwoHandEffectAnchor } from "../tracking/tracking.types";

export type InteractionState =
  | "idle"
  | "one-hand-hover"
  | "one-hand-open"
  | "one-hand-fist"
  | "one-hand-pinch"
  | "two-hand-ready"
  | "orb-forming"
  | "orb-stable"
  | "orb-compressing"
  | "orb-expanding"
  | "orb-charging"
  | "orb-released"
  | "cooldown";

export interface InteractionFrame {
  state: InteractionState;
  hands: StableTrackedHand[];
  twoHandAnchor: TwoHandEffectAnchor | null;
  primaryGesture: GestureType;
  chargeLevel: number;
  releaseReady: boolean;
  lastEvent: string | null;
}
