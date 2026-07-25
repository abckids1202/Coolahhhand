import { BRAND } from "../../config/brand";

interface CameraPermissionPanelProps {
  status: string;
  errorMessage: string | null;
  onStart: () => void;
  onPointerMode: () => void;
}

export const CameraPermissionPanel = ({
  status,
  errorMessage,
  onStart,
  onPointerMode,
}: CameraPermissionPanelProps) => (
  <main className="landing">
    <div className="landing__index" aria-hidden="true">
      01 — INIT
    </div>
    <div className="landing__content">
      <p className="eyebrow">EXPERIMENTAL INTERFACE / LOCAL VISION</p>
      <h1>
        <span>{BRAND.name.split(" ")[0]}</span>
        <span className="landing__title-accent">{BRAND.name.split(" ")[1]}</span>
      </h1>
      <p className="landing__subtitle">{BRAND.subtitle}</p>
      <p className="landing__intro">
        Use your hand as an input device. Open your palm, make a fist, and pinch
        to navigate a spatial field through your camera.
      </p>
      {errorMessage && (
        <div className="inline-alert" role="alert">
          <span>!</span>
          <p>{errorMessage}</p>
        </div>
      )}
      <div className="landing__actions">
        <button
          className="button button--primary"
          type="button"
          onClick={onStart}
          disabled={status === "requesting"}
        >
          <span>{status === "requesting" ? "REQUESTING ACCESS" : "ENTER FIELD"}</span>
          <span aria-hidden="true">↗</span>
        </button>
        <button className="button button--quiet" type="button" onClick={onPointerMode}>
          CONTINUE WITH POINTER
        </button>
      </div>
      <div className="privacy-note">
        <span className="privacy-note__mark" aria-hidden="true" />
        <p>
          <strong>PRIVATE BY DESIGN.</strong> Camera frames are processed on this
          device. Nothing is recorded, uploaded, or used for identity recognition.
        </p>
      </div>
    </div>
    <div className="landing__steps" aria-label="Setup sequence">
      <span className="is-active">01 / ACCESS</span>
      <span>02 / CALIBRATE</span>
      <span>03 / INTERACT</span>
    </div>
  </main>
);
