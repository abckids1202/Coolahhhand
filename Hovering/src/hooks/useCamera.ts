import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus =
  | "idle"
  | "requesting"
  | "ready"
  | "denied"
  | "unavailable"
  | "error";

export interface CameraState {
  stream: MediaStream | null;
  devices: MediaDeviceInfo[];
  selectedDeviceId: string | null;
  status: CameraStatus;
  errorMessage: string | null;
}

const INITIAL_STATE: CameraState = {
  stream: null,
  devices: [],
  selectedDeviceId: null,
  status: "idle",
  errorMessage: null,
};

const cameraErrorMessage = (error: unknown) => {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Camera access was denied. Enable permission in your browser or continue with pointer mode.";
    }
    if (error.name === "NotFoundError") {
      return "No camera was found. Connect a camera or continue with pointer mode.";
    }
    if (error.name === "NotReadableError") {
      return "The camera may be in use by another application. Close it there and retry.";
    }
  }
  return "The camera could not be started. You can retry or continue with pointer mode.";
};

export const useCamera = () => {
  const [state, setState] = useState<CameraState>(INITIAL_STATE);
  const streamRef = useRef<MediaStream | null>(null);
  const selectedDeviceRef = useRef<string | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setState((current) => ({
      ...current,
      stream: null,
      status: "idle",
      errorMessage: null,
    }));
  }, []);

  const startCamera = useCallback(async (deviceId?: string | null) => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setState((current) => ({
        ...current,
        status: "unavailable",
        errorMessage:
          "Camera access requires a secure, supported browser context. Pointer mode remains available.",
      }));
      return false;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    setState((current) => ({
      ...current,
      stream: null,
      status: "requesting",
      errorMessage: null,
    }));

    const nextDeviceId = deviceId ?? selectedDeviceRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          deviceId: nextDeviceId ? { exact: nextDeviceId } : undefined,
          facingMode: nextDeviceId ? undefined : "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 60 },
        },
      });
      streamRef.current = stream;
      const devices = (await navigator.mediaDevices.enumerateDevices()).filter(
        (device) => device.kind === "videoinput",
      );
      const activeDeviceId =
        stream.getVideoTracks()[0]?.getSettings().deviceId ?? nextDeviceId ?? null;
      selectedDeviceRef.current = activeDeviceId;
      setState({
        stream,
        devices,
        selectedDeviceId: activeDeviceId,
        status: "ready",
        errorMessage: null,
      });
      return true;
    } catch (error) {
      const denied =
        error instanceof DOMException && error.name === "NotAllowedError";
      const unavailable =
        error instanceof DOMException && error.name === "NotFoundError";
      setState((current) => ({
        ...current,
        stream: null,
        status: denied ? "denied" : unavailable ? "unavailable" : "error",
        errorMessage: cameraErrorMessage(error),
      }));
      return false;
    }
  }, []);

  const selectCamera = useCallback(
    (deviceId: string) => {
      selectedDeviceRef.current = deviceId;
      void startCamera(deviceId);
    },
    [startCamera],
  );

  useEffect(() => {
    const mediaDevices = navigator.mediaDevices;
    const handleDeviceChange = async () => {
      if (!mediaDevices?.enumerateDevices) return;
      const devices = (await mediaDevices.enumerateDevices()).filter(
        (device) => device.kind === "videoinput",
      );
      setState((current) => ({ ...current, devices }));
      if (
        streamRef.current &&
        selectedDeviceRef.current &&
        !devices.some((device) => device.deviceId === selectedDeviceRef.current)
      ) {
        void startCamera(null);
      }
    };
    mediaDevices?.addEventListener("devicechange", handleDeviceChange);
    return () => {
      mediaDevices?.removeEventListener("devicechange", handleDeviceChange);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [startCamera]);

  return {
    ...state,
    startCamera,
    stopCamera,
    selectCamera,
  };
};
