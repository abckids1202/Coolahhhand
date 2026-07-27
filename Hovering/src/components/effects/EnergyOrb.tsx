import { useEffect, useRef } from "react";
import { useTrackingStore, type TrackingSnapshot } from "../../stores/useTrackingStore";

const ORB_STATES = new Set([
  "orb-forming",
  "orb-stable",
  "orb-compressing",
  "orb-expanding",
  "orb-charging",
  "orb-released",
  "orb-fading",
]);

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const ease = (value: number) => 1 - Math.pow(1 - clamp(value), 3);

type OrbParticle = {
  phase: number;
  radius: number;
  band: number;
  speed: number;
  size: number;
};

type SparkOrb = {
  phase: number;
  orbit: number;
  speed: number;
  size: number;
  lift: number;
  wobble: number;
};

export const EnergyOrb = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const snapshot = useTrackingStore();
  const latest = useRef<TrackingSnapshot>(snapshot);
  latest.current = snapshot;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const particles: OrbParticle[] = Array.from({ length: 360 }, (_, i) => ({
      phase: i * 0.618,
      radius: (i % 29) / 29,
      band: i % 6,
      speed: 0.3 + (i % 13) * 0.04,
      size: i % 17 === 0 ? 2.2 : 1.15,
    }));
    const satellites: SparkOrb[] = Array.from({ length: 22 }, (_, i) => ({
      phase: i * 1.731,
      orbit: 0.85 + (i % 7) * 0.18,
      speed: 0.38 + (i % 5) * 0.11,
      size: 2.4 + (i % 4) * 0.75,
      lift: (i % 2 ? 1 : -1) * (0.16 + (i % 5) * 0.035),
      wobble: 0.65 + (i % 6) * 0.1,
    }));

    const drawFilament = (
      cx: number,
      cy: number,
      radius: number,
      stretchX: number,
      stretchY: number,
      rotation: number,
      alpha: number,
      time: number,
      offset: number,
    ) => {
      ctx.beginPath();
      for (let step = 0; step <= 72; step++) {
        const t = (step / 72) * Math.PI * 2;
        const wave = Math.sin(t * 3 + time * 0.003 + offset) * radius * 0.08;
        const localX = Math.cos(t) * (radius + wave) * stretchX;
        const localY = Math.sin(t * 2 + offset) * radius * 0.28 * stretchY;
        const px = cx + Math.cos(rotation) * localX - Math.sin(rotation) * localY;
        const py = cy + Math.sin(rotation) * localX + Math.cos(rotation) * localY;
        if (step === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = `rgba(179, 245, 255, ${alpha})`;
      ctx.lineWidth = 0.75;
      ctx.stroke();
    };

    const draw = (time: number) => {
      const data = latest.current;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const width = Math.round(rect.width * dpr);
      const height = Math.round(rect.height * dpr);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      if (!ORB_STATES.has(data.interactionState)) {
        raf = requestAnimationFrame(draw);
        return;
      }

      const anchor = data.twoHandAnchor;
      const point = data.releaseAnchor ?? anchor?.smoothedMidpoint ?? { x: 0, y: 0, z: 0 };
      const x = (point.x + 1) * 0.5 * rect.width;
      const y = (1 - point.y) * 0.5 * rect.height;
      const formation = data.interactionState === "orb-forming" ? ease(data.formationProgress) : 1;
      const release = data.interactionState === "orb-released" ? data.releaseProgress : 0;
      const fade = data.interactionState === "orb-fading" ? 0.5 : 1;
      const expansion = anchor?.expansionCurve ?? anchor?.normalizedDistance ?? 0.2;
      const radiusWorld = anchor?.visualRadius ?? anchor?.targetVisualRadius ?? 0.3;
      const base = Math.max(16, radiusWorld * Math.min(rect.width, rect.height) * 0.16) * (0.3 + 0.7 * formation);
      const charge = data.charge;
      const intensity = (0.62 + charge * 2) * formation * (1 - release * 0.4) * fade;
      const depthTilt = clamp(Math.abs(anchor?.direction.z ?? 0) * 2.8 + (anchor?.stretchZ ?? 1) - 1, 0, 1);
      const tilt = 0.52 + depthTilt * 0.24;
      const stretchX = (anchor?.stretchX ?? 1) * (1 + charge * 0.12);
      const stretchY = (anchor?.stretchY ?? 1) * tilt;
      const angle = (anchor?.axisAngle ?? anchor?.angle ?? 0) + Math.sin(time * 0.0012) * 0.06 * (0.2 + charge);
      const turbulence = anchor?.turbulence ?? 0.05;
      const lineDensity = 1 + expansion * 0.7 + charge * 0.9;

      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      if (release > 0) {
        const shock = base + ease(release) * Math.max(rect.width, rect.height) * 0.34;
        ctx.strokeStyle = `rgba(110, 225, 255, ${Math.pow(1 - release, 1.5) * 0.8})`;
        ctx.lineWidth = 2 + 5 * (1 - release);
        ctx.beginPath();
        ctx.ellipse(x, y, shock * stretchX, shock * stretchY, angle, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = `rgba(235, 255, 255, ${Math.pow(1 - release, 2) * 0.6})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(x, y, shock * 0.82 * stretchX, shock * 0.82 * stretchY, angle + Math.PI * 0.5, 0, Math.PI * 2);
        ctx.stroke();
      }

      const glow = ctx.createRadialGradient(x, y, 0, x, y, base * 3.6);
      glow.addColorStop(0, `rgba(239, 255, 255, ${0.95 * intensity})`);
      glow.addColorStop(0.2, `rgba(85, 221, 255, ${0.7 * intensity})`);
      glow.addColorStop(0.56, `rgba(56, 108, 255, ${0.22 * intensity})`);
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, base * 3.6, 0, Math.PI * 2);
      ctx.fill();

      for (let shell = 0; shell < 7; shell++) {
        const rr = base * (0.46 + shell * 0.19) * (1 + expansion * 0.42 + charge * 0.22 + release * 1.8);
        ctx.strokeStyle = `rgba(${shell % 2 ? 88 : 196}, ${shell % 2 ? 190 : 252}, 255, ${(0.42 - shell * 0.04) * intensity * (1 - release)})`;
        ctx.lineWidth = shell === 0 ? 1.7 : 0.85;
        ctx.beginPath();
        ctx.ellipse(x, y, rr * stretchX, rr * stretchY, angle + time * 0.00022 * (shell % 2 ? -1 : 1), 0, Math.PI * 2);
        ctx.stroke();
      }

      for (let i = 0; i < 5; i++) {
        const ring = base * (1.05 + i * 0.25 + expansion * 0.65 + release * 1.5);
        ctx.strokeStyle = `rgba(122, 226, 255, ${(0.28 - i * 0.035) * intensity * (1 - release)})`;
        ctx.lineWidth = i === 0 ? 1.2 : 0.85;
        ctx.beginPath();
        ctx.ellipse(x, y, ring * stretchX, ring * stretchY * (0.52 + i * 0.05), angle + time * 0.00034 * (i % 2 ? 1 : -1), 0, Math.PI * 2);
        ctx.stroke();
      }

      for (let i = 0; i < Math.round(12 * lineDensity); i++) {
        drawFilament(x, y, base * (0.7 + i * 0.055), stretchX, stretchY, angle + i * 0.31, 0.07 * intensity * (1 - release), time, i * 0.9);
      }

      particles.forEach((q) => {
        const a = q.phase + time * 0.001 * q.speed * (1 + charge * 4) * (q.band % 2 ? -1 : 1);
        const breathe = Math.sin(time * 0.004 + q.phase) * turbulence * base * 3;
        const orbit = base * (1.1 + q.radius * (1.85 + expansion) + q.band * 0.16) * (1 + release * q.radius * 5) + breathe;
        const px = x + Math.cos(a) * orbit * stretchX;
        const py = y + Math.sin(a) * orbit * stretchY;
        ctx.fillStyle = `rgba(155, 235, 255, ${(0.24 + q.radius * 0.46) * intensity * (1 - release)})`;
        ctx.fillRect(px - q.size * 0.5, py - q.size * 0.5, q.size, q.size);
      });

      satellites.forEach((sat, i) => {
        const stream = clamp(expansion * 0.85 + charge * 0.65 + release * 0.75 - i * 0.015, 0, 1);
        if (stream <= 0.05) return;
        const a = sat.phase + time * 0.0011 * sat.speed * (i % 2 ? -1 : 1);
        const eject = ease((Math.sin(time * 0.0016 + sat.phase) + 1) * 0.5) * base * (0.95 + stream * 1.8);
        const orbit = base * sat.orbit + eject + release * base * 3.5;
        const px = x + Math.cos(a) * orbit * stretchX;
        const py = y + (Math.sin(a) * orbit + Math.sin(time * 0.002 + sat.phase) * base * sat.wobble + sat.lift * base) * stretchY;
        const r = sat.size * (0.55 + stream * 1.2);
        const orb = ctx.createRadialGradient(px - r * 0.25, py - r * 0.25, 0, px, py, r * 3.2);
        orb.addColorStop(0, `rgba(255, 255, 255, ${0.92 * intensity * stream})`);
        orb.addColorStop(0.38, `rgba(98, 232, 255, ${0.56 * intensity * stream})`);
        orb.addColorStop(1, "rgba(56, 108, 255, 0)");
        ctx.fillStyle = orb;
        ctx.beginPath();
        ctx.arc(px, py, r * 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(199, 249, 255, ${0.26 * intensity * stream})`;
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a + Math.PI) * base * 0.8, y + Math.sin(a + Math.PI) * base * 0.25);
        ctx.lineTo(px, py);
        ctx.stroke();
      });

      const coreRadius = base * (0.82 - release * 0.2);
      const core = ctx.createRadialGradient(x - coreRadius * 0.32, y - coreRadius * 0.38, 0, x, y, coreRadius * 1.12);
      core.addColorStop(0, "#ffffff");
      core.addColorStop(0.2, `rgba(209, 253, 255, ${0.98 * intensity})`);
      core.addColorStop(0.52, `rgba(69, 198, 255, ${0.86 * intensity})`);
      core.addColorStop(0.82, `rgba(33, 107, 236, ${0.46 * intensity})`);
      core.addColorStop(1, "rgba(18, 49, 167, 0)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(x, y, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      const coreRim = ctx.createRadialGradient(x, y, coreRadius * 0.42, x, y, coreRadius * 1.12);
      coreRim.addColorStop(0, "rgba(255, 255, 255, 0)");
      coreRim.addColorStop(0.7, `rgba(91, 219, 255, ${0.18 * intensity})`);
      coreRim.addColorStop(1, `rgba(218, 252, 255, ${0.38 * intensity})`);
      ctx.fillStyle = coreRim;
      ctx.beginPath();
      ctx.arc(x, y, coreRadius * 1.08, 0, Math.PI * 2);
      ctx.fill();

      const coreHighlight = ctx.createRadialGradient(x - coreRadius * 0.32, y - coreRadius * 0.34, 0, x - coreRadius * 0.28, y - coreRadius * 0.3, coreRadius * 0.34);
      coreHighlight.addColorStop(0, `rgba(255, 255, 255, ${0.82 * intensity})`);
      coreHighlight.addColorStop(0.55, `rgba(224, 255, 255, ${0.26 * intensity})`);
      coreHighlight.addColorStop(1, "rgba(224, 255, 255, 0)");
      ctx.fillStyle = coreHighlight;
      ctx.beginPath();
      ctx.arc(x - coreRadius * 0.28, y - coreRadius * 0.3, coreRadius * 0.36, 0, Math.PI * 2);
      ctx.fill();

      if (data.interactionState === "orb-released" && release < 0.22) {
        ctx.fillStyle = `rgba(255, 255, 255, ${(1 - release / 0.22) * 0.7})`;
        ctx.beginPath();
        ctx.arc(x, y, base * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} className="energy-orb" aria-label="Two-hand energy orb" />;
};

