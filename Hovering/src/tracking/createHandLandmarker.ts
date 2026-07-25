import {
  FilesetResolver,
  HandLandmarker,
} from "@mediapipe/tasks-vision";
import { MODEL_URL, WASM_URL } from "../config/brand";

export const createHandLandmarker = async () => {
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);
  try {
    return await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: 0.6,
      minHandPresenceConfidence: 0.6,
      minTrackingConfidence: 0.55,
    });
  } catch {
    return HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: 0.6,
      minHandPresenceConfidence: 0.6,
      minTrackingConfidence: 0.55,
    });
  }
};
