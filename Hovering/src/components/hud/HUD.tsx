import { BRAND } from "../../config/brand";
import { useRenderFps } from "../../hooks/useRenderFps";
import type { CameraStatus } from "../../hooks/useCamera";
import { useTrackingStore } from "../../stores/useTrackingStore";
import { useUIStore } from "../../stores/useUIStore";

interface HUDProps {
  cameraStatus: CameraStatus;
  pointerMode: boolean;
  onReset: () => void;
  onFullscreen: () => void;
}

const statusLabel = (status: CameraStatus, pointerMode: boolean) => {
  if (pointerMode) return "POINTER";
  if (status === "ready") return "ONLINE";
  if (status === "requesting") return "CONNECTING";
  return status.toUpperCase();
};

export const HUD = ({ cameraStatus, pointerMode, onReset, onFullscreen }: HUDProps) => {
  const fps = useRenderFps();
  const tracking = useTrackingStore();
  const { debug, setDebug, settingsOpen, setSettingsOpen } = useUIStore();
  const gesture = pointerMode ? "POINTER INPUT" : tracking.gesture.replace("-", " ").toUpperCase();
  const anchor = tracking.twoHandAnchor;

  return (
    <div className="hud">
      <header className="hud__topbar">
        <div className="brand-lockup">
          <span className="brand-lockup__symbol" aria-hidden="true"><i /></span>
          <div>
            <strong>{BRAND.name}</strong>
            <span>{BRAND.version}</span>
          </div>
        </div>
        <div className="system-state">
          <span className={cameraStatus === "ready" ? "status-dot is-live" : "status-dot"} />
          SYSTEM / {statusLabel(cameraStatus, pointerMode)}
        </div>
        <div className="hud__actions">
          <button type="button" onClick={onReset} aria-label="Reset session">RESET</button>
          <button type="button" onClick={() => setDebug(!debug)} aria-pressed={debug}>DEBUG {debug ? "ON" : "OFF"}</button>
          <button type="button" onClick={() => setSettingsOpen(!settingsOpen)} aria-expanded={settingsOpen}>SETTINGS</button>
          <button type="button" onClick={onFullscreen} aria-label="Toggle fullscreen">FULLSCREEN</button>
        </div>
      </header>

      <aside className="hud__telemetry">
        <p className="hud-label">LIVE TELEMETRY</p>
        <dl>
          <div><dt>INPUT</dt><dd>{pointerMode ? "MOUSE / TOUCH" : "MEDIAPIPE"}</dd></div>
          <div><dt>MODEL</dt><dd>{pointerMode ? "BYPASSED" : tracking.modelStatus.toUpperCase()}</dd></div>
          <div><dt>HANDS</dt><dd>{pointerMode ? "--" : String(tracking.hands.length).padStart(2, "0")}</dd></div>
          <div><dt>STATE</dt><dd>{tracking.interactionState.toUpperCase()}</dd></div>
          <div><dt>TRACK / RENDER</dt><dd>{Math.round(tracking.trackingFps)} / {fps} FPS</dd></div>
          {debug && (
            <>
              <div><dt>INFERENCE</dt><dd>{tracking.inferenceMs.toFixed(1)} MS</dd></div>
              <div><dt>HAND IDS</dt><dd>{tracking.hands.map((hand) => hand.id).join(" / ") || "--"}</dd></div>
              <div><dt>CONFIDENCE</dt><dd>{Math.round(tracking.confidence * 100)}%</dd></div>
              <div><dt>DEPTH</dt><dd>{tracking.hands[0]?.estimatedDepth.toFixed(3) ?? "--"}</dd></div>
              <div>
                <dt>WORLD XY</dt>
                <dd>{tracking.hands[0] ? `${tracking.hands[0].worldPalmCenter.x.toFixed(2)} / ${tracking.hands[0].worldPalmCenter.y.toFixed(2)}` : "--"}</dd>
              </div>
              <div><dt>MIDPOINT</dt><dd>{anchor ? `${anchor.smoothedMidpoint.x.toFixed(2)} / ${anchor.smoothedMidpoint.y.toFixed(2)}` : "--"}</dd></div>
              <div><dt>DISTANCE</dt><dd>{anchor ? anchor.smoothedDistance.toFixed(3) : "--"}</dd></div>
              <div><dt>RADIUS</dt><dd>{anchor ? anchor.radius.toFixed(0) : "--"}</dd></div>
              <div><dt>OPEN / CLOSE</dt><dd>{anchor ? `${anchor.openingSpeed.toFixed(2)} / ${anchor.closingSpeed.toFixed(2)}` : "--"}</dd></div>
              <div><dt>READY TIMER</dt><dd>{tracking.interactionState === "two-hand-ready" ? `${Math.round(tracking.readyDuration)} / 220 MS` : "--"}</dd></div>
              <div><dt>DIST VALID</dt><dd>{tracking.readiness.validDistance ? "YES" : "NO"}</dd></div>
              <div><dt>STABILITY</dt><dd>{tracking.readiness.overallScore.toFixed(2)}</dd></div>
              <div><dt>CHARGE</dt><dd>{Math.round(tracking.charge * 100)}%</dd></div>
              <div><dt>ORB</dt><dd>{["orb-forming","orb-stable","orb-compressing","orb-expanding","orb-charging","orb-released","orb-fading"].includes(tracking.interactionState) ? "MOUNTED" : "--"}</dd></div>
            </>
          )}
        </dl>
      </aside>

      <section className="gesture-readout" aria-live="polite">
        <p>CURRENT INPUT</p>
        <strong>{gesture || "NONE"}</strong>
        {!pointerMode && <span>{Math.round(tracking.confidence * 100).toString().padStart(2, "0")}% CONFIDENCE</span>}
      </section>

      <footer className="hud__footer">
        <span>LOCAL PROCESSING</span>
        <span className="hud__footer-line" />
        <span>NO RECORDING</span>
        <span>{new Date().toLocaleTimeString([], { hour12: false })}</span>
      </footer>
    </div>
  );
};

