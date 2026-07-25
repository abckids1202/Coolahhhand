import type { RefObject } from "react";

interface LandmarkDebugOverlayProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

export const LandmarkDebugOverlay = ({
  canvasRef,
}: LandmarkDebugOverlayProps) => (
  <canvas
    ref={canvasRef}
    className="landmark-overlay"
    aria-label="Hand landmark alignment overlay"
  />
);
