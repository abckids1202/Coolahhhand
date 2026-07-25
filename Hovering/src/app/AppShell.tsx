import { useCallback, useEffect, useRef, useState } from "react";
import { CameraFeed } from "../components/camera/CameraFeed";
import { CameraPermissionPanel } from "../components/camera/CameraPermissionPanel";
import { HUD } from "../components/hud/HUD";
import { SettingsPanel } from "../components/hud/SettingsPanel";
import { CalibrationGuide } from "../components/tracking/CalibrationGuide";
import { HandTrackingController } from "../components/tracking/HandTrackingController";
import { PointerFallback } from "../components/tracking/PointerFallback";
import { useCamera } from "../hooks/useCamera";
import { useTrackingStore } from "../stores/useTrackingStore";
import { useUIStore } from "../stores/useUIStore";

type ExperienceMode = "landing" | "camera" | "pointer";

export const AppShell = () => {
  const [mode, setMode] = useState<ExperienceMode>("landing");
  const [videoReady, setVideoReady] = useState(false);
  const [calibrated, setCalibrated] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const camera = useCamera();
  const modelStatus = useTrackingStore((state) => state.modelStatus);
  const trackingError = useTrackingStore((state) => state.errorMessage);
  const handCount = useTrackingStore((state) => state.hands.length);
  const resetTracking = useTrackingStore((state) => state.reset);
  const { cameraVisible, setSettingsOpen } = useUIStore();

  const startCamera = async () => {
    setMode("camera");
    setVideoReady(false);
    setCalibrated(false);
    await camera.startCamera();
  };

  const enterPointerMode = () => {
    camera.stopCamera();
    setMode("pointer");
    setCalibrated(true);
    setSettingsOpen(false);
  };

  const resetSession = () => {
    camera.stopCamera();
    resetTracking();
    setMode("landing");
    setVideoReady(false);
    setCalibrated(false);
    setSettingsOpen(false);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen();
    }
  };

  const completeCalibration = useCallback(() => setCalibrated(true), []);

  useEffect(() => {
    if (camera.status === "idle" && mode === "camera") {
      setMode("landing");
    }
  }, [camera.status, mode]);

  const cameraFailed =
    mode === "camera" &&
    ["denied", "unavailable", "error"].includes(camera.status);

  return (
    <div className={`app-shell app-shell--${mode}`}>
      <div className="ambient-field" aria-hidden="true">
        <span className="ambient-field__grid" />
        <span className="ambient-field__scan" />
        <span className="ambient-field__node ambient-field__node--a" />
        <span className="ambient-field__node ambient-field__node--b" />
        <span className="ambient-field__node ambient-field__node--c" />
        <span className="ambient-field__line ambient-field__line--a" />
        <span className="ambient-field__line ambient-field__line--b" />
      </div>

      {mode === "landing" ? (
        <CameraPermissionPanel
          status={camera.status}
          errorMessage={camera.errorMessage}
          onStart={() => void startCamera()}
          onPointerMode={enterPointerMode}
        />
      ) : (
        <>
          <CameraFeed
            stream={camera.stream}
            videoRef={videoRef}
            visible={cameraVisible}
            onReady={() => setVideoReady(true)}
          />
          <div className="video-treatment" aria-hidden="true" />
          {mode === "camera" && (
            <HandTrackingController
              videoRef={videoRef}
              active={camera.status === "ready" && videoReady}
            />
          )}
          {mode === "pointer" && <PointerFallback />}

          <HUD
            cameraStatus={camera.status}
            pointerMode={mode === "pointer"}
            onReset={resetSession}
            onFullscreen={toggleFullscreen}
          />

          {mode === "camera" && modelStatus === "loading" && (
            <section className="model-loader" aria-live="polite">
              <span className="model-loader__glyph" aria-hidden="true" />
              <p className="eyebrow">LOCAL VISION PIPELINE</p>
              <h2>Loading hand model</h2>
              <div><span /></div>
            </section>
          )}

          {mode === "camera" && modelStatus === "ready" && !calibrated && (
            <CalibrationGuide onComplete={completeCalibration} />
          )}

          {mode === "camera" &&
            modelStatus === "ready" &&
            calibrated &&
            handCount === 0 && (
              <p className="no-hand-hint">PLACE ONE HAND WITHIN THE CAMERA FRAME</p>
            )}

          {(cameraFailed || trackingError) && (
            <section className="recovery-panel" role="alert">
              <p className="eyebrow">INPUT PATH INTERRUPTED</p>
              <h2>Camera mode is unavailable.</h2>
              <p>{camera.errorMessage ?? trackingError}</p>
              <div>
                <button
                  className="button button--primary"
                  type="button"
                  onClick={() => void startCamera()}
                >
                  RETRY CAMERA <span aria-hidden="true">↗</span>
                </button>
                <button
                  className="button button--quiet"
                  type="button"
                  onClick={enterPointerMode}
                >
                  USE POINTER MODE
                </button>
              </div>
            </section>
          )}

          <SettingsPanel
            devices={camera.devices}
            selectedDeviceId={camera.selectedDeviceId}
            onSelectCamera={camera.selectCamera}
            onStopCamera={resetSession}
          />
        </>
      )}
    </div>
  );
};
