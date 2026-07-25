interface CameraSelectorProps {
  devices: MediaDeviceInfo[];
  selectedDeviceId: string | null;
  onSelect: (deviceId: string) => void;
}

export const CameraSelector = ({
  devices,
  selectedDeviceId,
  onSelect,
}: CameraSelectorProps) => (
  <label className="field-control">
    <span>VIDEO INPUT</span>
    <select
      value={selectedDeviceId ?? ""}
      onChange={(event) => onSelect(event.target.value)}
      disabled={devices.length === 0}
    >
      {devices.length === 0 ? (
        <option value="">No camera available</option>
      ) : (
        devices.map((device, index) => (
          <option value={device.deviceId} key={device.deviceId}>
            {device.label || `Camera ${index + 1}`}
          </option>
        ))
      )}
    </select>
  </label>
);
