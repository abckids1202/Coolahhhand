import type {
  NormalizedLandmark,
  ScreenPoint,
  VideoLayout,
} from "../tracking/tracking.types";

export const calculateCoverLayout = (
  videoWidth: number,
  videoHeight: number,
  containerWidth: number,
  containerHeight: number,
): VideoLayout => {
  const safeVideoWidth = Math.max(videoWidth, 1);
  const safeVideoHeight = Math.max(videoHeight, 1);
  const scale = Math.max(
    containerWidth / safeVideoWidth,
    containerHeight / safeVideoHeight,
  );
  const renderedWidth = safeVideoWidth * scale;
  const renderedHeight = safeVideoHeight * scale;

  return {
    videoWidth: safeVideoWidth,
    videoHeight: safeVideoHeight,
    containerWidth,
    containerHeight,
    scale,
    renderedWidth,
    renderedHeight,
    offsetX: (containerWidth - renderedWidth) / 2,
    offsetY: (containerHeight - renderedHeight) / 2,
  };
};

export const normalizedLandmarkToScreen = (
  landmark: Pick<NormalizedLandmark, "x" | "y">,
  layout: VideoLayout,
  mirrored = true,
): ScreenPoint => {
  const normalizedX = mirrored ? 1 - landmark.x : landmark.x;
  return {
    x:
      normalizedX * layout.videoWidth * layout.scale +
      layout.offsetX,
    y: landmark.y * layout.videoHeight * layout.scale + layout.offsetY,
  };
};

export const screenToNdc = (
  point: ScreenPoint,
  width: number,
  height: number,
): ScreenPoint => ({
  x: (point.x / Math.max(width, 1)) * 2 - 1,
  y: -(point.y / Math.max(height, 1)) * 2 + 1,
});
