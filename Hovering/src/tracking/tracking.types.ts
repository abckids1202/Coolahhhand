export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface WorldPoint {
  x: number;
  y: number;
  z: number;
}

export type GestureType = "none" | "open-palm" | "fist" | "pinch" | "point" | "unknown";

export interface StableTrackedHand {
  id: string;
  anatomicalSide: "Left" | "Right" | "Unknown";
  screenSide: "Left" | "Right";
  landmarks: NormalizedLandmark[];
  palmNormalized: NormalizedLandmark;
  palmScreen: ScreenPoint;
  palmWorld: WorldPoint;
  pinchPointWorld: WorldPoint;
  velocityWorld: WorldPoint;
  speed: number;
  openness: number;
  pinchStrength: number;
  estimatedDepth: number;
  palmFacingScore: number;
  rawGesture: GestureType;
  stableGesture: GestureType;
  gestureConfidence: number;
  trackingConfidence: number;
  firstSeenAt: number;
  lastSeenAt: number;
}

export interface TwoHandEffectAnchor {
  leftHandId: string;
  rightHandId: string;
  leftPalm: WorldPoint;
  rightPalm: WorldPoint;
  midpoint: WorldPoint;
  smoothedMidpoint: WorldPoint;
  direction: WorldPoint;
  distance: number;
  smoothedDistance: number;
  normalizedDistance: number;
  angle: number;
  distanceVelocity: number;
  closingSpeed: number;
  openingSpeed: number;
  radius: number;
  targetRadius: number;
  facingConfidence: number;
  stabilityConfidence: number;
  overallConfidence: number;
  wristDistance?: number;
  expansionMetric?: number;
  normalizedExpansion?: number;
  expansionCurve?: number;
  targetVisualRadius?: number;
  visualRadius?: number;
  stretchX?: number;
  stretchY?: number;
  stretchZ?: number;
  axisAngle?: number;
  turbulence?: number;
}

export interface TrackedHand extends StableTrackedHand {
  handedness: "Left" | "Right" | "Unknown";
  palmCenter: NormalizedLandmark;
  screenPalmCenter: ScreenPoint;
  worldPalmCenter: WorldPoint;
  velocity: ScreenPoint;
  rotation: number;
  gesture: GestureType;
}

export interface VideoLayout {
  videoWidth: number;
  videoHeight: number;
  containerWidth: number;
  containerHeight: number;
  scale: number;
  renderedWidth: number;
  renderedHeight: number;
  offsetX: number;
  offsetY: number;
}

export type ModelStatus = "idle" | "loading" | "ready" | "error";

