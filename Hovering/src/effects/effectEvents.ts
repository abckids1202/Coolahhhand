export type VisualEffectEvent =
  | { type: "PALM_APPEARED"; handId: string; position: { x: number; y: number; z: number } }
  | { type: "PALM_DISAPPEARED"; handId: string }
  | { type: "ORB_FORM"; position: { x: number; y: number; z: number }; radius: number }
  | { type: "ORB_CHARGE"; position: { x: number; y: number; z: number }; intensity: number }
  | { type: "ORB_RELEASE"; position: { x: number; y: number; z: number }; intensity: number }
  | { type: "PALM_PULSE"; handId: string; position: { x: number; y: number; z: number }; intensity: number };
