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

export type GestureType = "none" | "open-palm" | "fist" | "pinch";

export interface TrackedHand {
  id: string;
  handedness: "Left" | "Right" | "Unknown";
  landmarks: NormalizedLandmark[];
  palmCenter: NormalizedLandmark;
  screenPalmCenter: ScreenPoint;
  worldPalmCenter: WorldPoint;
  velocity: ScreenPoint;
  speed: number;
  openness: number;
  pinchStrength: number;
  estimatedDepth: number;
  rotation: number;
  gesture: GestureType;
  gestureConfidence: number;
  trackingConfidence: number;
  lastSeenAt: number;
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
