import { useEffect, useRef, type RefObject } from "react";
import type { HandLandmarker } from "@mediapipe/tasks-vision";
import { useTrackingStore } from "../../stores/useTrackingStore";
import { useUIStore } from "../../stores/useUIStore";
import { calculateCoverLayout, normalizedLandmarkToScreen, screenToNdc } from "../../utils/coordinateTransforms";
import {
  calculateHandScale,
  calculateOpenness,
  calculatePalmCenter,
  calculatePinchStrength,
  calculateRotation,
} from "../../tracking/handMetrics";
import { classifyGesture, GestureStabilizer } from "../../tracking/gestureClassifier";
import { AdaptiveLandmarkSmoother } from "../../tracking/landmarkSmoothing";
import { createHandLandmarker } from "../../tracking/createHandLandmarker";
import { HandIdentityTracker, type HandDetectionInput } from "../../interactions/handIdentityTracker";
import { createTwoHandAnchor } from "../../interactions/twoHandMetrics";
import { resolveInteractionFrame } from "../../interactions/interactionStateMachine";
import type { InteractionState } from "../../interactions/interaction.types";
import type {
  NormalizedLandmark,
  TrackedHand,
  TwoHandEffectAnchor,
  VideoLayout,
  WorldPoint,
} from "../../tracking/tracking.types";
import { LandmarkDebugOverlay } from "./LandmarkDebugOverlay";

const HAND_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

interface HandTrackingControllerProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  active: boolean;
}

const drawHand = (
  context: CanvasRenderingContext2D,
  hand: TrackedHand,
  layout: VideoLayout,
  debug: boolean,
) => {
  const points = hand.landmarks.map((landmark) => normalizedLandmarkToScreen(landmark, layout));
  context.save();
  context.lineCap = "round";
  context.strokeStyle = "rgba(145, 255, 214, .42)";
  context.lineWidth = 1;
  HAND_CONNECTIONS.forEach(([a, b]) => {
    context.beginPath();
    context.moveTo(points[a].x, points[a].y);
    context.lineTo(points[b].x, points[b].y);
    context.stroke();
  });

  points.forEach((point, index) => {
    const fingertip = [4, 8, 12, 16, 20].includes(index);
    context.fillStyle = fingertip ? "#d9fff0" : "rgba(126, 255, 209, .72)";
    context.beginPath();
    context.arc(point.x, point.y, fingertip ? 2.8 : 1.65, 0, Math.PI * 2);
    context.fill();
  });

  const palm = hand.screenPalmCenter;
  const radius = 32 + hand.openness * 22;
  context.strokeStyle = "rgba(126, 255, 209, .9)";
  context.lineWidth = 1.25;
  context.setLineDash([8, 7]);
  context.beginPath();
  context.arc(palm.x, palm.y, radius, 0, Math.PI * 2);
  context.stroke();
  context.setLineDash([]);
  context.beginPath();
  context.moveTo(palm.x - 8, palm.y);
  context.lineTo(palm.x + 8, palm.y);
  context.moveTo(palm.x, palm.y - 8);
  context.lineTo(palm.x, palm.y + 8);
  context.stroke();

  if (debug) {
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs) - 14;
    const minY = Math.min(...ys) - 14;
    const width = Math.max(...xs) - minX + 14;
    const height = Math.max(...ys) - minY + 14;
    context.strokeStyle = "rgba(196, 255, 235, .28)";
    context.strokeRect(minX, minY, width, height);
    context.font = "10px ui-monospace, monospace";
    context.fillStyle = "#c6ffe9";
    context.fillText(`${hand.id} ${hand.screenSide.toUpperCase()} / ${hand.gesture.toUpperCase()}`, minX, minY - 8);
    context.fillStyle = "rgba(198, 255, 233, .7)";
    context.fillText(`P ${hand.pinchStrength.toFixed(2)}  O ${hand.openness.toFixed(2)}`, minX, minY + height + 14);
  }
  context.restore();
};

const worldToScreen = (point: WorldPoint, width: number, height: number) => ({
  x: ((point.x + 1) * 0.5) * width,
  y: ((1 - point.y) * 0.5) * height,
});

const drawTwoHandAnchor = (
  context: CanvasRenderingContext2D,
  anchor: TwoHandEffectAnchor | null,
  width: number,
  height: number,
  interactionState: InteractionState,
) => {
  if (!anchor) return;
  const left = worldToScreen(anchor.leftPalm, width, height);
  const right = worldToScreen(anchor.rightPalm, width, height);
  const midpoint = worldToScreen(anchor.smoothedMidpoint, width, height);

  context.save();
  context.lineCap = "round";
  context.lineWidth = 1.5;
  context.strokeStyle = "rgba(76, 195, 255, .72)";
  context.beginPath();
  context.moveTo(left.x, left.y);
  context.lineTo(right.x, right.y);
  context.stroke();

  [[left, "L", "#8fffe1"], [right, "R", "#ffdf8f"]].forEach(([point, label, color]) => {
    const p = point as { x: number; y: number };
    context.fillStyle = color as string;
    context.beginPath();
    context.arc(p.x, p.y, 7, 0, Math.PI * 2);
    context.fill();
    context.font = "11px ui-monospace, monospace";
    context.fillText(label as string, p.x + 10, p.y - 8);
  });

  context.strokeStyle = "rgba(118, 238, 255, .78)";
  context.setLineDash([5, 8]);
  context.beginPath();
  context.arc(midpoint.x, midpoint.y, anchor.radius, 0, Math.PI * 2);
  context.stroke();
  context.setLineDash([]);
  context.beginPath();
  context.moveTo(midpoint.x - 12, midpoint.y);
  context.lineTo(midpoint.x + 12, midpoint.y);
  context.moveTo(midpoint.x, midpoint.y - 12);
  context.lineTo(midpoint.x, midpoint.y + 12);
  context.stroke();

  context.fillStyle = "rgba(220, 252, 255, .86)";
  context.font = "11px ui-monospace, monospace";
  context.fillText(
    `${interactionState} d=${anchor.smoothedDistance.toFixed(2)} r=${anchor.radius.toFixed(0)} close=${anchor.closingSpeed.toFixed(2)} open=${anchor.openingSpeed.toFixed(2)}`,
    midpoint.x + 16,
    midpoint.y + 18,
  );
  context.restore();
};

export const HandTrackingController = ({ videoRef, active }: HandTrackingControllerProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const smoothersRef = useRef(new Map<string, AdaptiveLandmarkSmoother>());
  const stabilizersRef = useRef(new Map<string, GestureStabilizer>());
  const identityTrackerRef = useRef(new HandIdentityTracker());
  const twoHandAnchorRef = useRef<TwoHandEffectAnchor | null>(null);
  const interactionStateRef = useRef<InteractionState>("idle");
  const previousDetectionAtRef = useRef(0);
  const updateTracking = useTrackingStore((state) => state.update);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let frameId = 0;
    let detector: HandLandmarker | null = null;
    const overlayCanvas = canvasRef.current;
    const identityTracker = identityTrackerRef.current;
    let previousDetectionAt = 0;
    let previousUiUpdateAt = 0;
    let fpsWindowStart = performance.now();
    let frameCount = 0;
    let trackingFps = 0;

    updateTracking({ modelStatus: "loading", errorMessage: null });

    const run = async () => {
      try {
        detector = await createHandLandmarker();
        if (cancelled) {
          detector.close();
          return;
        }
        updateTracking({ modelStatus: "ready" });
      } catch {
        updateTracking({
          modelStatus: "error",
          errorMessage: "The hand-tracking model failed to load. Retry or continue in pointer mode.",
        });
        return;
      }

      const tick = () => {
        if (cancelled || !detector) return;
        frameId = requestAnimationFrame(tick);
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2 || !video.videoWidth) return;

        const trackingRate = useUIStore.getState().trackingRate;
        const now = performance.now();
        if (now - previousDetectionAt < 1000 / trackingRate) return;
        const deltaTime = Math.max((now - (previousDetectionAtRef.current || now)) / 1000, 1 / 120);
        previousDetectionAt = now;
        previousDetectionAtRef.current = now;

        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const pixelWidth = Math.round(rect.width * dpr);
        const pixelHeight = Math.round(rect.height * dpr);
        if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
          canvas.width = pixelWidth;
          canvas.height = pixelHeight;
        }
        const context = canvas.getContext("2d");
        if (!context) return;
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.clearRect(0, 0, rect.width, rect.height);

        const startedAt = performance.now();
        let result;
        try {
          result = detector.detectForVideo(video, now);
        } catch {
          return;
        }
        const inferenceMs = performance.now() - startedAt;
        const layout = calculateCoverLayout(video.videoWidth, video.videoHeight, rect.width, rect.height);

        const detections: HandDetectionInput[] = result.landmarks.map((rawLandmarks, handIndex) => {
          const category = result.handedness[handIndex]?.[0];
          const anatomicalSide = category?.categoryName === "Left" || category?.categoryName === "Right"
            ? category.categoryName
            : "Unknown";
          const rawKey = `${anatomicalSide}-${handIndex}`;
          if (!smoothersRef.current.has(rawKey)) {
            smoothersRef.current.set(rawKey, new AdaptiveLandmarkSmoother());
            stabilizersRef.current.set(rawKey, new GestureStabilizer());
          }
          const landmarks = smoothersRef.current.get(rawKey)!.update(rawLandmarks as NormalizedLandmark[]);
          const palmCenter = calculatePalmCenter(landmarks);
          const screenPalmCenter = normalizedLandmarkToScreen(palmCenter, layout);
          const ndc = screenToNdc(screenPalmCenter, rect.width, rect.height);
          const openness = calculateOpenness(landmarks, palmCenter);
          const pinchStrength = calculatePinchStrength(landmarks);
          const rawGesture = classifyGesture(openness, pinchStrength);
          const stableGesture = stabilizersRef.current.get(rawKey)!.update(rawGesture);
          const handScale = calculateHandScale(landmarks);
          const pinchScreen = normalizedLandmarkToScreen({
            x: (landmarks[4].x + landmarks[8].x) * 0.5,
            y: (landmarks[4].y + landmarks[8].y) * 0.5,
          }, layout);
          const pinchNdc = screenToNdc(pinchScreen, rect.width, rect.height);

          return {
            anatomicalSide,
            screenSide: screenPalmCenter.x < rect.width * 0.5 ? "Left" : "Right",
            landmarks,
            palmNormalized: palmCenter,
            palmScreen: screenPalmCenter,
            palmWorld: { x: ndc.x, y: ndc.y, z: -Math.min(handScale * 4, 1) },
            pinchPointWorld: { x: pinchNdc.x, y: pinchNdc.y, z: -Math.min(handScale * 4, 1) },
            openness,
            pinchStrength,
            estimatedDepth: Math.min(handScale * 4, 1),
            palmFacingScore: 0.55,
            rawGesture: rawGesture.gesture,
            stableGesture: stableGesture.gesture,
            gestureConfidence: stableGesture.confidence,
            trackingConfidence: category?.score ?? 0,
          };
        });

        const stableHands = identityTracker.update(detections, now);
        const hands: TrackedHand[] = stableHands.map((hand) => ({
          ...hand,
          handedness: hand.anatomicalSide,
          palmCenter: hand.palmNormalized,
          screenPalmCenter: hand.palmScreen,
          worldPalmCenter: hand.palmWorld,
          velocity: {
            x: hand.velocityWorld.x * (rect.width / 2),
            y: -hand.velocityWorld.y * (rect.height / 2),
          },
          rotation: calculateRotation(hand.landmarks),
          gesture: hand.stableGesture,
        }));
        const twoHandAnchor = createTwoHandAnchor(hands, twoHandAnchorRef.current, deltaTime);
        twoHandAnchorRef.current = twoHandAnchor;
        const interaction = resolveInteractionFrame(hands, twoHandAnchor, interactionStateRef.current);
        interactionStateRef.current = interaction.state;

        hands.forEach((hand) => drawHand(context, hand, layout, useUIStore.getState().debug));
        if (useUIStore.getState().debug) {
          drawTwoHandAnchor(context, twoHandAnchor, rect.width, rect.height, interaction.state);
        }
        frameCount += 1;
        if (now - fpsWindowStart >= 1000) {
          trackingFps = (frameCount * 1000) / (now - fpsWindowStart);
          frameCount = 0;
          fpsWindowStart = now;
        }
        if (now - previousUiUpdateAt > 100) {
          const primary = hands[0];
          updateTracking({
            hands,
            gesture: primary?.gesture ?? "none",
            confidence: primary?.gestureConfidence ?? 0,
            trackingFps,
            inferenceMs,
            twoHandAnchor,
            interactionState: interaction.state,
          });
          previousUiUpdateAt = now;
        }
      };
      frameId = requestAnimationFrame(tick);
    };

    void run();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      detector?.close();
      identityTracker.reset();
      twoHandAnchorRef.current = null;
      interactionStateRef.current = "idle";
      const canvas = overlayCanvas;
      canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
      updateTracking({
        hands: [],
        gesture: "none",
        confidence: 0,
        modelStatus: "idle",
        twoHandAnchor: null,
        interactionState: "idle",
      });
    };
  }, [active, updateTracking, videoRef]);

  return <LandmarkDebugOverlay canvasRef={canvasRef} />;
};


