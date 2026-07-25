import { CameraSelector } from "../camera/CameraSelector";
import { useUIStore } from "../../stores/useUIStore";

interface SettingsPanelProps {
  devices: MediaDeviceInfo[];
  selectedDeviceId: string | null;
  onSelectCamera: (deviceId: string) => void;
  onStopCamera: () => void;
}

export const SettingsPanel = ({
  devices,
  selectedDeviceId,
  onSelectCamera,
  onStopCamera,
}: SettingsPanelProps) => {
  const {
    settingsOpen,
    setSettingsOpen,
    cameraVisible,
    setCameraVisible,
    trackingRate,
    setTrackingRate,
  } = useUIStore();

  if (!settingsOpen) return null;

  return (
    <aside className="settings-panel" aria-label="Interface settings">
      <div className="settings-panel__header">
        <div>
          <p className="hud-label">INTERFACE CONTROL</p>
          <h2>SESSION SETTINGS</h2>
        </div>
        <button
          type="button"
          onClick={() => setSettingsOpen(false)}
          aria-label="Close settings"
        >
          ×
        </button>
      </div>
      <CameraSelector
        devices={devices}
        selectedDeviceId={selectedDeviceId}
        onSelect={onSelectCamera}
      />
      <label className="toggle-control">
        <span>
          <strong>CAMERA LAYER</strong>
          <small>Keep tracking active while hiding video</small>
        </span>
        <input
          type="checkbox"
          checked={cameraVisible}
          onChange={(event) => setCameraVisible(event.target.checked)}
        />
      </label>
      <label className="range-control">
        <span>
          <strong>TRACKING RATE</strong>
          <small>{trackingRate} DETECTIONS / SEC</small>
        </span>
        <input
          type="range"
          min="12"
          max="30"
          step="1"
          value={trackingRate}
          onChange={(event) => setTrackingRate(Number(event.target.value))}
        />
      </label>
      <div className="settings-panel__privacy">
        <span aria-hidden="true">◇</span>
        Video and landmarks remain in this browser tab and are discarded when the
        camera stops.
      </div>
      <button className="button button--danger" type="button" onClick={onStopCamera}>
        STOP CAMERA
      </button>
    </aside>
  );
};
