# NEXUS FIELD

NEXUS FIELD is a privacy-first, browser-based hand tracking interface. This
release implements the first four phases of the supplied project plan:
application foundation, webcam lifecycle, local MediaPipe hand tracking, and
pixel-accurate mirrored coordinate mapping.

The interface deliberately stops before particle physics. The brief requires
visible tracking alignment to be verified before simulation forces are added.

## Current feature set

- User-initiated camera permission flow
- Mirrored, full-viewport camera feed
- Camera enumeration, switching, retry, stop, and disconnection handling
- MediaPipe Tasks Vision Hand Landmarker running locally in video mode
- Up to two detected hands with handedness and confidence
- Weighted palm-center calculation
- Adaptive landmark smoothing
- Hand scale, openness, pinch strength, rotation, depth, velocity, and speed
- Stabilized open-palm, fist, and pinch classification
- Correct `object-fit: cover` crop and mirrored coordinate mapping
- Canvas landmark skeleton, fingertips, palm reticle, and debug bounding box
- Local model/camera status and performance telemetry
- Guided calibration sequence
- Pointer fallback that works without camera permission
- Fullscreen, settings, camera visibility, tracking-rate, and debug controls
- Camera/model recovery states and application error boundary
- Responsive layout, keyboard focus styles, and reduced-motion handling
- Deterministic unit tests and Playwright smoke coverage

## Technology

- Vite
- React 19
- TypeScript in strict mode
- MediaPipe Tasks Vision
- Zustand
- Vitest and React Testing Library
- Playwright

Three.js, React Three Fiber, Drei, and postprocessing are installed as
foundation dependencies for the next visualization phase, but no particle
simulation is included in this alignment-first release.

## Architecture

High-frequency detector results remain inside the animation/tracking loop and
are drawn directly to a canvas. UI-facing snapshots are throttled before being
published to Zustand, which prevents React from rerendering for every tracking
frame.

The coordinate path is:

1. MediaPipe normalized landmark
2. Mirrored video pixel
3. CSS `object-fit: cover` crop
4. Viewport screen coordinate
5. Normalized device coordinate
6. A stable world-space-compatible point

Camera ownership is isolated in `useCamera`; it always stops old media tracks
before starting a replacement and stops tracks on unmount.

## Run locally

Requirements:

- Node.js 20.19+ or 22.12+
- A modern Chromium-based browser
- `localhost` or HTTPS for camera access

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Select **Enter Field** to request camera
access, or **Continue with Pointer** to explore without a camera.

## Commands

```bash
npm run dev
npm run build
npm run preview
npm run test
npm run test:e2e
npm run lint
```

## Camera and privacy

Camera frames are processed in the current browser tab. They are not uploaded
or recorded, and no biometric identity recognition is performed. Hand
landmarks are temporary in-memory values. Stopping the camera or closing the
page stops the media tracks.

The model and WebAssembly runtime are downloaded from the official MediaPipe
distribution when hand mode starts. After loading, frame processing happens on
the device.

## Controls

### Hand mode

- Open palm: classified and shown in telemetry
- Fist: classified and shown in telemetry
- Thumb-index pinch: classified and shown in telemetry

### Pointer fallback

- Move pointer: move the interaction reticle
- Primary button: attraction input
- Secondary button: repulsion input
- Shift + primary drag: grab input

These pointer inputs are prepared for the particle simulation phase. In this
release they provide an input/alignment reticle and visible mode feedback.

## Project structure

```text
src/
├── app/                  Application shell and root composition
├── components/
│   ├── camera/           Video and permission UI
│   ├── common/           Error boundary
│   ├── hud/              Telemetry and settings
│   └── tracking/         Detector loop and canvas overlay
├── config/               Brand and model endpoints
├── hooks/                Camera and render performance hooks
├── stores/               Low-frequency UI snapshots
├── styles/               Global design system
├── tracking/             Metrics, smoothing, gestures, detector setup
├── tests/                Test environment setup
└── utils/                Math and coordinate transforms
```

## Troubleshooting

### Camera permission was denied

Enable camera permission in the browser site settings and select **Retry
camera**, or choose pointer mode.

### Camera is already in use

Close other conferencing or camera applications, then retry.

### The model does not load

Confirm the device has an internet connection for the initial MediaPipe model
download. The interface automatically retries with CPU inference if GPU setup
fails.

### Landmarks do not align

Confirm browser zoom is at 100%, then resize once to force a layout refresh.
Enable Debug to inspect screen and world coordinates. The mapping code accounts
for mirrored video and both horizontal and vertical `cover` cropping.

## Phase status

- [x] Phase 1 — Project foundation
- [x] Phase 2 — Camera system
- [x] Phase 3 — Hand tracking
- [x] Phase 4 — Correct mirrored coordinate mapping
- [ ] Phase 5 — Gesture metric tuning with recorded fixtures
- [ ] Phase 6 — Extended gesture state machine
- [ ] Phase 7 — Three.js particle scene
- [ ] Phase 8+ — Hand forces, network lines, semantic nodes, and visual effects

The next safe milestone is to verify palm alignment on several aspect ratios
and devices, capture representative landmark fixtures, then begin the Three.js
particle phase.
