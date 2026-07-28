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
  const interfaceModeRef = useRef({ active: false, progress: 0 });
  const fingertipOrbRef = useRef({ x: 0, y: 0, dirX: 0, dirY: -1, progress: 0, holdMs: 0 });
  const snapshot = useTrackingStore();
  const latest = useRef<TrackingSnapshot>(snapshot);
  latest.current = snapshot;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let previousTime = 0;
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
      const singleHand = data.interactionState === "one-hand" && data.hands.length === 1;
      const deploymentCommand = singleHand && data.gesture === "pinch";
      if (deploymentCommand) interfaceModeRef.current.active = true;
      if (!singleHand || data.gesture === "fist") interfaceModeRef.current.active = false;
      const delta = previousTime === 0 ? 0.016 : Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;
      const deploymentTarget = interfaceModeRef.current.active ? 1 : 0;
      interfaceModeRef.current.progress += (deploymentTarget - interfaceModeRef.current.progress) * Math.min(1, delta * 5.2);
      const interfaceProgress = interfaceModeRef.current.progress;
      const interfaceVisible = interfaceProgress > 0.015;
      const pointingHand = data.interactionState === "one-hand"
        && data.hands.length === 1
        && data.hands[0].gesture === "point"
        && data.hands[0].trackingConfidence >= 0.42;
      const twoHandPointing = data.hands.length === 2
        && data.hands.every((trackedHand) => trackedHand.gesture === "point" && trackedHand.trackingConfidence >= 0.42);
      const twoHandOpen = data.hands.length === 2
        && data.hands.every((trackedHand) => trackedHand.gesture === "open-palm" && trackedHand.openness >= 0.64 && trackedHand.trackingConfidence >= 0.42);
      const fingertipTarget = pointingHand ? 1 : 0;
      fingertipOrbRef.current.progress += (fingertipTarget - fingertipOrbRef.current.progress) * Math.min(1, delta * 6);
      fingertipOrbRef.current.holdMs = pointingHand
        ? Math.min(1400, fingertipOrbRef.current.holdMs + delta * 1000)
        : Math.max(0, fingertipOrbRef.current.holdMs - delta * 1000 * 2.5);
      const fingertipVisible = fingertipOrbRef.current.progress > 0.015;
      const oneHand = data.interactionState === "one-hand"
        && data.hands.length === 1
        && data.hands[0].openness >= 0.54
        && data.hands[0].pinchStrength < 0.7
        && data.hands[0].trackingConfidence >= 0.5;
      if (!ORB_STATES.has(data.interactionState) && !oneHand && !interfaceVisible && !fingertipVisible && !twoHandPointing && !twoHandOpen) {
        raf = requestAnimationFrame(draw);
        return;
      }

      const anchor = data.twoHandAnchor;
      const hand = (oneHand || singleHand) ? data.hands[0] : null;
      const handOrbPoint = oneHand && hand
        ? { x: hand.worldPalmCenter.x, y: hand.worldPalmCenter.y + 0.24, z: hand.worldPalmCenter.z }
        : null;
      const point = data.releaseAnchor ?? anchor?.smoothedMidpoint ?? handOrbPoint ?? hand?.worldPalmCenter ?? { x: 0, y: 0, z: 0 };
      const x = (point.x + 1) * 0.5 * rect.width;
      const y = (1 - point.y) * 0.5 * rect.height;
      if (twoHandPointing || twoHandOpen) {
        const first = data.hands[0];
        const second = data.hands[1];
        const midpoint = {
          x: (first.worldPalmCenter.x + second.worldPalmCenter.x) * 0.5,
          y: (first.worldPalmCenter.y + second.worldPalmCenter.y) * 0.5,
        };
        const centerX = (midpoint.x + 1) * 0.5 * rect.width;
        const centerY = (1 - midpoint.y) * 0.5 * rect.height;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        if (twoHandPointing) {
          const ringBase = Math.max(28, Math.min(rect.width, rect.height) * 0.055);
          const rotation = time * 0.0032;
          const glow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, ringBase * 5.2);
          glow.addColorStop(0, "rgba(193, 241, 255, .28)");
          glow.addColorStop(.32, "rgba(52, 168, 255, .16)");
          glow.addColorStop(1, "rgba(0, 24, 90, 0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(centerX, centerY, ringBase * 5.2, 0, Math.PI * 2);
          ctx.fill();
          for (let ring = 0; ring < 11; ring++) {
            const radius = ringBase * (0.72 + ring * 0.27);
            const tilt = 0.3 + (ring % 5) * 0.1;
            const angle = rotation * (ring % 2 ? -1 : 1) + ring * 0.16;
            ctx.strokeStyle = `rgba(${ring % 3 === 0 ? 100 : 40}, ${ring % 2 ? 190 : 235}, 255, ${0.52 - ring * 0.028})`;
            ctx.lineWidth = ring % 3 === 0 ? 1.35 : 0.7;
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, radius, radius * tilt, angle, 0, Math.PI * 2);
            ctx.stroke();
            if (ring % 2 === 0) {
              const markerAngle = angle + time * 0.005 + ring;
              ctx.fillStyle = "rgba(211, 250, 255, .82)";
              ctx.beginPath();
              ctx.arc(centerX + Math.cos(markerAngle) * radius, centerY + Math.sin(markerAngle) * radius * tilt, 1.6, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          [first, second].forEach((trackedHand) => {
            const palmX = (trackedHand.worldPalmCenter.x + 1) * 0.5 * rect.width;
            const palmY = (1 - trackedHand.worldPalmCenter.y) * 0.5 * rect.height;
            ctx.strokeStyle = "rgba(106, 215, 255, .34)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(palmX, palmY);
            ctx.stroke();
          });
          ctx.fillStyle = "rgba(225, 252, 255, .95)";
          ctx.beginPath();
          ctx.arc(centerX, centerY, ringBase * 0.23, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const rotation = time * 0.0012;
          [first, second].forEach((trackedHand, handIndex) => {
            const palmX = (trackedHand.worldPalmCenter.x + 1) * 0.5 * rect.width;
            const palmY = (1 - trackedHand.worldPalmCenter.y) * 0.5 * rect.height;
            const base = Math.max(25, Math.min(rect.width, rect.height) * 0.042);
            const aura = ctx.createRadialGradient(palmX, palmY, 0, palmX, palmY, base * 4.3);
            aura.addColorStop(0, "rgba(255, 246, 190, .36)");
            aura.addColorStop(.3, "rgba(255, 163, 58, .2)");
            aura.addColorStop(1, "rgba(125, 24, 0, 0)");
            ctx.fillStyle = aura;
            ctx.beginPath();
            ctx.arc(palmX, palmY, base * 4.3, 0, Math.PI * 2);
            ctx.fill();
            for (let ring = 0; ring < 5; ring++) {
              const radius = base * (0.72 + ring * 0.32);
              ctx.strokeStyle = `rgba(255, ${205 - ring * 18}, ${94 - ring * 8}, ${0.62 - ring * 0.08})`;
              ctx.lineWidth = ring === 0 ? 1.5 : 0.85;
              ctx.setLineDash(ring % 2 ? [4, 6] : []);
              ctx.beginPath();
              ctx.arc(palmX, palmY, radius, rotation * (handIndex ? -1 : 1) + ring * 0.3, Math.PI * 2 + rotation * (handIndex ? -1 : 1) + ring * 0.3);
              ctx.stroke();
            }
            ctx.setLineDash([]);
            for (let ray = 0; ray < 12; ray++) {
              const angle = ray * Math.PI / 6 + rotation * (handIndex ? -1 : 1);
              const inner = base * 0.9;
              const outer = base * (1.55 + (ray % 3) * 0.18);
              ctx.strokeStyle = "rgba(255, 220, 120, .42)";
              ctx.lineWidth = ray % 3 === 0 ? 1.2 : 0.6;
              ctx.beginPath();
              ctx.moveTo(palmX + Math.cos(angle) * inner, palmY + Math.sin(angle) * inner);
              ctx.lineTo(palmX + Math.cos(angle) * outer, palmY + Math.sin(angle) * outer);
              ctx.stroke();
            }
            ctx.fillStyle = "rgba(255, 244, 191, .9)";
            ctx.beginPath();
            ctx.arc(palmX, palmY, base * 0.24, 0, Math.PI * 2);
            ctx.fill();
          });
        }
        ctx.restore();
        raf = requestAnimationFrame(draw);
        return;
      }
      if (pointingHand) {
        const indexDip = data.hands[0].landmarks[7];
        const indexTip = data.hands[0].landmarks[8];
        if (indexDip && indexTip) {
          const rawDirX = -(indexTip.x - indexDip.x);
          const rawDirY = -(indexTip.y - indexDip.y);
          const length = Math.hypot(rawDirX, rawDirY) || 1;
          const dirX = rawDirX / length;
          const dirY = rawDirY / length;
          const tipWorldX = data.hands[0].worldPalmCenter.x - (indexTip.x - data.hands[0].palmNormalized.x) * 2;
          const tipWorldY = data.hands[0].worldPalmCenter.y - (indexTip.y - data.hands[0].palmNormalized.y) * 2;
          const targetX = (tipWorldX + dirX * 0.2) * 0.5 * rect.width + rect.width * 0.5;
          const targetY = (1 - (tipWorldY + dirY * 0.2)) * 0.5 * rect.height;
          const smoothing = 1 - Math.exp(-14 * delta);
          fingertipOrbRef.current.x += (targetX - fingertipOrbRef.current.x) * smoothing;
          fingertipOrbRef.current.y += (targetY - fingertipOrbRef.current.y) * smoothing;
          fingertipOrbRef.current.dirX += (dirX - fingertipOrbRef.current.dirX) * (1 - Math.exp(-10 * delta));
          fingertipOrbRef.current.dirY += (dirY - fingertipOrbRef.current.dirY) * (1 - Math.exp(-10 * delta));
        }
      }
      if (fingertipVisible && !interfaceVisible && !ORB_STATES.has(data.interactionState)) {
        const amount = ease(fingertipOrbRef.current.progress);
        const charge = clamp(fingertipOrbRef.current.holdMs / 1400, 0, 1);
        const orbX = fingertipOrbRef.current.x;
        const orbY = fingertipOrbRef.current.y;
        const radius = Math.min(rect.width, rect.height) * (0.03 + charge * 0.018) * amount;
        const spin = time * 0.0018;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const halo = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, radius * 4.5);
        halo.addColorStop(0, `rgba(243, 219, 255, ${0.55 * amount})`);
        halo.addColorStop(0.3, `rgba(164, 76, 255, ${0.45 * amount})`);
        halo.addColorStop(0.72, `rgba(65, 65, 226, ${0.16 * amount})`);
        halo.addColorStop(1, "rgba(26, 0, 70, 0)");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(orbX, orbY, radius * 4.5, 0, Math.PI * 2);
        ctx.fill();
        for (let ring = 0; ring < 3; ring++) {
          ctx.strokeStyle = `rgba(${ring === 1 ? 206 : 145}, ${ring === 0 ? 122 : 72}, 255, ${(0.52 - ring * 0.1) * amount})`;
          ctx.lineWidth = ring === 0 ? 1.1 : 0.7;
          ctx.beginPath();
          ctx.ellipse(orbX, orbY, radius * (1.22 + ring * 0.2), radius * (0.58 + ring * 0.12), spin * (ring % 2 ? -1 : 1), 0, Math.PI * 2);
          ctx.stroke();
        }
        for (let particle = 0; particle < 34; particle++) {
          const angle = particle * 2.399 + spin * (particle % 2 ? -1 : 1);
          const orbit = radius * (1.45 + ((particle * 7) % 13) / 8) * (1 - amount * 0.25);
          const px = orbX + Math.cos(angle) * orbit;
          const py = orbY + Math.sin(angle) * orbit;
          ctx.fillStyle = `rgba(195, 140, 255, ${(0.2 + (particle % 4) * 0.08) * amount})`;
          ctx.beginPath();
          ctx.arc(px, py, 0.8 + (particle % 3) * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }
        const linkStartX = orbX - fingertipOrbRef.current.dirX * radius * 1.8;
        const linkStartY = orbY - fingertipOrbRef.current.dirY * radius * 1.8;
        ctx.strokeStyle = `rgba(183, 112, 255, ${0.28 * amount})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(linkStartX, linkStartY);
        ctx.quadraticCurveTo(
          orbX - fingertipOrbRef.current.dirX * radius * 1.25 + fingertipOrbRef.current.dirY * radius * 0.65,
          orbY - fingertipOrbRef.current.dirY * radius * 1.25 - fingertipOrbRef.current.dirX * radius * 0.65,
          orbX,
          orbY,
        );
        ctx.stroke();
        const core = ctx.createRadialGradient(orbX - radius * 0.28, orbY - radius * 0.3, 0, orbX, orbY, radius);
        core.addColorStop(0, `rgba(18, 5, 31, ${0.98 * amount})`);
        core.addColorStop(0.55, `rgba(84, 27, 137, ${0.94 * amount})`);
        core.addColorStop(0.85, `rgba(170, 73, 255, ${0.65 * amount})`);
        core.addColorStop(1, "rgba(39, 0, 92, 0)");
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(orbX, orbY, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        raf = requestAnimationFrame(draw);
        return;
      }
      if (interfaceVisible && singleHand && hand) {
        const amount = ease(interfaceProgress);
        const center = Math.max(32, Math.min(rect.width, rect.height) * 0.052);
        const orbit = center * (2.7 + amount * 2.5);
        const rotation = time * 0.00034;
        const modules = ["TRACKING", "EFFECTS", "NETWORK", "METRICS", "VISUALS", "SYSTEM"];
        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        const field = ctx.createRadialGradient(x, y, center * 0.2, x, y, orbit * 2.2);
        field.addColorStop(0, `rgba(178, 249, 255, ${0.22 * amount})`);
        field.addColorStop(0.45, `rgba(35, 184, 255, ${0.1 * amount})`);
        field.addColorStop(1, "rgba(0, 40, 88, 0)");
        ctx.fillStyle = field;
        ctx.beginPath();
        ctx.arc(x, y, orbit * 2.2, 0, Math.PI * 2);
        ctx.fill();

        for (let ring = 0; ring < 4; ring++) {
          const radius = center * (0.7 + ring * 0.36 + amount * (ring + 1) * 0.42);
          ctx.strokeStyle = `rgba(${ring === 0 ? 235 : 74}, ${ring === 0 ? 255 : 211}, 255, ${(0.62 - ring * 0.1) * amount})`;
          ctx.lineWidth = ring === 0 ? 1.7 : 0.9;
          ctx.setLineDash(ring === 2 ? [7, 9] : ring === 3 ? [2, 10] : []);
          ctx.beginPath();
          ctx.arc(x, y, radius, rotation * (ring % 2 ? -1 : 1), Math.PI * 2 + rotation * (ring % 2 ? -1 : 1));
          ctx.stroke();
        }
        ctx.setLineDash([]);

        modules.forEach((label, index) => {
          const angle = -Math.PI / 2 + index * (Math.PI * 2 / modules.length) + rotation * 0.7;
          const travel = amount * orbit;
          const nodeX = x + Math.cos(angle) * travel;
          const nodeY = y + Math.sin(angle) * travel * 0.7;
          ctx.strokeStyle = `rgba(104, 224, 255, ${0.42 * amount})`;
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(nodeX, nodeY);
          ctx.stroke();
          ctx.fillStyle = `rgba(110, 237, 255, ${0.9 * amount})`;
          ctx.beginPath();
          ctx.arc(nodeX, nodeY, 5 + amount * 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = `rgba(220, 252, 255, ${0.76 * amount})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(nodeX, nodeY, 12 + amount * 7, 0, Math.PI * 2);
          ctx.stroke();
          ctx.font = "9px SFMono-Regular, Consolas, monospace";
          ctx.fillStyle = `rgba(206, 248, 255, ${0.86 * amount})`;
          ctx.textAlign = "center";
          ctx.fillText(label, nodeX, nodeY + 27 + amount * 8);
          const packet = (time * 0.0012 + index * 0.17) % 1;
          const packetX = x + (nodeX - x) * packet;
          const packetY = y + (nodeY - y) * packet;
          ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * amount})`;
          ctx.beginPath();
          ctx.arc(packetX, packetY, 2, 0, Math.PI * 2);
          ctx.fill();
        });

        const core = ctx.createRadialGradient(x - center * 0.25, y - center * 0.3, 0, x, y, center);
        core.addColorStop(0, `rgba(255, 255, 255, ${0.96 * amount})`);
        core.addColorStop(0.35, `rgba(133, 239, 255, ${0.9 * amount})`);
        core.addColorStop(0.8, `rgba(25, 115, 224, ${0.55 * amount})`);
        core.addColorStop(1, "rgba(0, 38, 120, 0)");
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(x, y, center * (1 - amount * 0.25), 0, Math.PI * 2);
        ctx.fill();
        ctx.font = "8px SFMono-Regular, Consolas, monospace";
        ctx.fillStyle = `rgba(205, 249, 255, ${0.72 * amount})`;
        ctx.textAlign = "center";
        ctx.fillText(interfaceProgress > 0.86 ? "SPATIAL NEXUS" : "DEPLOYING", x, y - orbit - 24);
        ctx.restore();
        raf = requestAnimationFrame(draw);
        return;
      }
      if (interfaceVisible && !singleHand) {
        raf = requestAnimationFrame(draw);
        return;
      }
      if (oneHand && hand) {
        const handEnergy = clamp(hand.openness * hand.trackingConfidence, 0.45, 1);
        const spin = time * 0.0068;
        const pulse = 1 + Math.sin(time * 0.009) * 0.08;
        const base = Math.max(30, Math.min(rect.width, rect.height) * (0.06 + handEnergy * 0.026)) * pulse;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, base * 4.8);
        glow.addColorStop(0, `rgba(255, 238, 224, ${0.92 * handEnergy})`);
        glow.addColorStop(0.2, `rgba(255, 96, 62, ${0.68 * handEnergy})`);
        glow.addColorStop(0.56, `rgba(213, 24, 24, ${0.3 * handEnergy})`);
        glow.addColorStop(1, "rgba(85, 0, 0, 0)");
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, base * 4.8, 0, Math.PI * 2);
        ctx.fill();

        for (let ring = 0; ring < 6; ring++) {
          const ringRadius = base * (0.72 + ring * 0.3);
          ctx.strokeStyle = `rgba(255, ${ring % 2 ? 90 : 178}, ${ring % 2 ? 62 : 36}, ${(0.46 - ring * 0.045) * handEnergy})`;
          ctx.lineWidth = ring === 0 ? 1.8 : 0.9;
          ctx.beginPath();
          ctx.ellipse(x, y, ringRadius * (1.12 + ring * 0.05), ringRadius * (0.42 + ring * 0.035), spin * (ring % 2 ? -1 : 1), 0, Math.PI * 2);
          ctx.stroke();
        }

        for (let ray = 0; ray < 18; ray++) {
          const angle = spin * (ray % 2 ? -1.15 : 1) + ray * (Math.PI * 2 / 18);
          const inner = base * (0.9 + (ray % 3) * 0.16);
          const outer = inner + base * (1.15 + (ray % 5) * 0.2);
          const wave = Math.sin(time * 0.01 + ray) * base * 0.13;
          ctx.strokeStyle = `rgba(255, ${108 + (ray % 3) * 28}, ${44 + (ray % 4) * 10}, ${(0.18 + (ray % 4) * 0.035) * handEnergy})`;
          ctx.lineWidth = ray % 5 === 0 ? 1.5 : 0.7;
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner * 0.5);
          ctx.lineTo(x + Math.cos(angle + 0.08) * outer, y + Math.sin(angle + 0.08) * outer * 0.5 + wave);
          ctx.stroke();
        }

        for (let spark = 0; spark < 28; spark++) {
          const angle = spin * (spark % 2 ? -1.25 : 1.08) + spark * 2.399;
          const orbit = base * (1.25 + (spark % 9) * 0.19) + Math.sin(time * 0.008 + spark) * base * 0.3;
          const sx = x + Math.cos(angle) * orbit;
          const sy = y + Math.sin(angle) * orbit * (0.48 + (spark % 4) * 0.04);
          const size = 1.2 + (spark % 4) * 0.65;
          ctx.fillStyle = `rgba(255, ${142 + (spark % 3) * 25}, ${66 + (spark % 4) * 9}, ${(0.35 + (spark % 5) * 0.08) * handEnergy})`;
          ctx.beginPath();
          ctx.arc(sx, sy, size, 0, Math.PI * 2);
          ctx.fill();
        }

        const coreRadius = base * 0.82;
        const core = ctx.createRadialGradient(x - coreRadius * 0.3, y - coreRadius * 0.38, 0, x, y, coreRadius * 1.1);
        core.addColorStop(0, "#fff8f3");
        core.addColorStop(0.22, `rgba(255, 187, 156, ${0.98 * handEnergy})`);
        core.addColorStop(0.56, `rgba(255, 68, 42, ${0.9 * handEnergy})`);
        core.addColorStop(0.84, `rgba(172, 8, 14, ${0.64 * handEnergy})`);
        core.addColorStop(1, "rgba(75, 0, 0, 0)");
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(x, y, coreRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 212, 187, ${0.62 * handEnergy})`;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(x, y, coreRadius * 1.05, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        raf = requestAnimationFrame(draw);
        return;
      }
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

