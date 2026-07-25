import { clamp, distance3 } from "../utils/math";
import type { NormalizedLandmark } from "./tracking.types";

const PALM_INDICES = [0, 5, 9, 13, 17] as const;
const PALM_WEIGHTS = [0.15, 0.2, 0.3, 0.2, 0.15] as const;
const TIPS = [4, 8, 12, 16, 20] as const;
const PIPS = [3, 6, 10, 14, 18] as const;

export const calculatePalmCenter = (
  landmarks: NormalizedLandmark[],
): NormalizedLandmark => {
  const center = { x: 0, y: 0, z: 0 };
  PALM_INDICES.forEach((index, position) => {
    const point = landmarks[index];
    const weight = PALM_WEIGHTS[position];
    center.x += point.x * weight;
    center.y += point.y * weight;
    center.z += point.z * weight;
  });
  return center;
};

export const calculateHandScale = (landmarks: NormalizedLandmark[]) => {
  const palmWidth = distance3(landmarks[5], landmarks[17]);
  const palmLength = distance3(landmarks[0], landmarks[9]);
  return Math.max((palmWidth + palmLength) / 2, 0.0001);
};

export const calculateOpenness = (
  landmarks: NormalizedLandmark[],
  palmCenter = calculatePalmCenter(landmarks),
) => {
  const handScale = calculateHandScale(landmarks);
  const averageTipDistance =
    TIPS.reduce(
      (sum, index) => sum + distance3(landmarks[index], palmCenter) / handScale,
      0,
    ) / TIPS.length;
  const extendedCount = TIPS.reduce((count, tipIndex, position) => {
    const pipIndex = PIPS[position];
    return (
      count +
      Number(
        distance3(landmarks[tipIndex], landmarks[0]) >
          distance3(landmarks[pipIndex], landmarks[0]) * 1.06,
      )
    );
  }, 0);
  const distanceScore = clamp((averageTipDistance - 0.7) / 1.25, 0, 1);
  return clamp(distanceScore * 0.55 + (extendedCount / 5) * 0.45, 0, 1);
};

export const calculatePinchStrength = (landmarks: NormalizedLandmark[]) => {
  const normalizedDistance =
    distance3(landmarks[4], landmarks[8]) / calculateHandScale(landmarks);
  return 1 - clamp((normalizedDistance - 0.18) / 0.65, 0, 1);
};

export const calculateRotation = (landmarks: NormalizedLandmark[]) =>
  Math.atan2(
    landmarks[17].y - landmarks[5].y,
    landmarks[17].x - landmarks[5].x,
  );
