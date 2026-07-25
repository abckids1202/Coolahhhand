import { create } from "zustand";

interface UIState {
  debug: boolean;
  settingsOpen: boolean;
  cameraVisible: boolean;
  reducedMotion: boolean;
  trackingRate: number;
  setDebug: (debug: boolean) => void;
  setSettingsOpen: (settingsOpen: boolean) => void;
  setCameraVisible: (cameraVisible: boolean) => void;
  setTrackingRate: (trackingRate: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  debug: false,
  settingsOpen: false,
  cameraVisible: true,
  reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  trackingRate: 24,
  setDebug: (debug) => set({ debug }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setCameraVisible: (cameraVisible) => set({ cameraVisible }),
  setTrackingRate: (trackingRate) => set({ trackingRate }),
}));
