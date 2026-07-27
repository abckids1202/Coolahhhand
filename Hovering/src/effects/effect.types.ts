import type { VisualEffectEvent } from "./effectEvents";

export interface EffectInstance {
  id: string;
  type: VisualEffectEvent["type"];
  startTime: number;
  duration: number;
  progress: number;
  intensity: number;
  position: { x: number; y: number; z: number };
  completed: boolean;
}

export type EffectQuality = "low" | "medium" | "high";
