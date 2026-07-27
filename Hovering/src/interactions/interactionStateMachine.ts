import type { GestureType, StableTrackedHand, TwoHandEffectAnchor } from "../tracking/tracking.types";
import type { InteractionFrame, InteractionState } from "./interaction.types";

const primaryGestureFor = (hands: StableTrackedHand[]): GestureType =>
  hands[0]?.stableGesture ?? "none";

export const resolveInteractionFrame = (
  hands: StableTrackedHand[],
  anchor: TwoHandEffectAnchor | null,
  previousState: InteractionState,
): InteractionFrame => {
  const visibleHands = hands.filter((hand) => hand.trackingConfidence > 0.25);
  const primaryGesture = primaryGestureFor(visibleHands);
  let state: InteractionState = "idle";

  if (anchor && anchor.overallConfidence > 0.25) {
    if (anchor.closingSpeed > 0.18) state = "orb-compressing";
    else if (anchor.openingSpeed > 0.18) state = "orb-expanding";
    else state = previousState === "orb-forming" ? "orb-forming" : "two-hand-ready";
  } else if (visibleHands.length === 1) {
    if (primaryGesture === "open-palm") state = "one-hand-open";
    else if (primaryGesture === "fist") state = "one-hand-fist";
    else if (primaryGesture === "pinch") state = "one-hand-pinch";
    else state = "one-hand-hover";
  }

  return {
    state,
    hands: visibleHands,
    twoHandAnchor: anchor,
    primaryGesture,
    chargeLevel: anchor ? Math.min(anchor.closingSpeed / 1.4, 1) : 0,
    releaseReady: false,
    lastEvent: null,
  };
};
