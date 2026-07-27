export type InteractionEvent =
  | { type: "TRACKING_LOST" }
  | { type: "OPEN_PALM_ENTERED"; handId: string; position: { x: number; y: number; z: number }; intensity: number }
  | { type: "FIST_ENTERED"; handId: string; position: { x: number; y: number; z: number }; intensity: number }
  | { type: "PINCH_ENTERED"; handId: string; position: { x: number; y: number; z: number } }
  | { type: "ORB_FORM_STARTED"; position: { x: number; y: number; z: number }; radius: number }
  | { type: "ORB_RELEASED"; position: { x: number; y: number; z: number }; intensity: number };
