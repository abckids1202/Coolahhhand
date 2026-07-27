import { effectConfig } from "../effects/effectConfig";
import { clamp, distance3, lerp } from "../utils/math";
import type { StableTrackedHand, TwoHandEffectAnchor, WorldPoint } from "../tracking/tracking.types";

const dampScalar = (current: number, target: number, lambda: number, deltaTime: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * deltaTime));

const inverseLerp = (min: number, max: number, value: number) =>
  clamp((value - min) / Math.max(max - min, 0.0001), 0, 1);

const subtract = (a: WorldPoint, b: WorldPoint): WorldPoint => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});

const normalize = (value: WorldPoint): WorldPoint => {
  const length = Math.max(Math.hypot(value.x, value.y, value.z), 0.0001);
  return { x: value.x / length, y: value.y / length, z: value.z / length };
};

const midpoint = (a: WorldPoint, b: WorldPoint): WorldPoint => ({
  x: (a.x + b.x) * 0.5,
  y: (a.y + b.y) * 0.5,
  z: (a.z + b.z) * 0.5,
});

const dampPoint = (current: WorldPoint, target: WorldPoint, lambda: number, deltaTime: number): WorldPoint => ({
  x: dampScalar(current.x, target.x, lambda, deltaTime),
  y: dampScalar(current.y, target.y, lambda, deltaTime),
  z: dampScalar(current.z, target.z, lambda, deltaTime),
});

export const createTwoHandAnchor = (
  hands: StableTrackedHand[],
  previous: TwoHandEffectAnchor | null,
  deltaTime: number,
): TwoHandEffectAnchor | null => {
  const visible = hands.filter((hand) => hand.trackingConfidence > 0.2);
  if (visible.length < 2) return null;

  const sorted = [...visible].sort((a, b) => a.palmScreen.x - b.palmScreen.x);
  const left = sorted[0];
  const right = sorted[sorted.length - 1];
  const rawMidpoint = midpoint(left.palmWorld, right.palmWorld);
  const rawDistance = distance3(left.palmWorld, right.palmWorld);
  const config = effectConfig.twoHandAnchor;
  const smoothedMidpoint = previous?.leftHandId === left.id && previous?.rightHandId === right.id
    ? dampPoint(previous.smoothedMidpoint, rawMidpoint, config.midpointDamping, deltaTime)
    : rawMidpoint;
  const smoothedDistance = previous?.leftHandId === left.id && previous?.rightHandId === right.id
    ? dampScalar(previous.smoothedDistance, rawDistance, config.distanceDamping, deltaTime)
    : rawDistance;
  const rawVelocity = previous ? (rawDistance - previous.distance) / Math.max(deltaTime, 0.001) : 0;
  const distanceVelocity = previous
    ? dampScalar(previous.distanceVelocity, rawVelocity, config.velocityDamping, deltaTime)
    : 0;
  const velocityWithDeadZone = Math.abs(distanceVelocity) < config.movementDeadZone ? 0 : distanceVelocity;
  const normalizedDistance = inverseLerp(config.minHandDistance, config.maxHandDistance, smoothedDistance);
  const targetRadius = lerp(config.minRadius, config.maxRadius, normalizedDistance);
  const radius = previous
    ? dampScalar(previous.radius, targetRadius, config.radiusDamping, deltaTime)
    : targetRadius;
  const direction = normalize(subtract(right.palmWorld, left.palmWorld));
  const stabilityConfidence = clamp(1 - Math.abs(velocityWithDeadZone) / 1.8, 0, 1);
  const facingConfidence = Math.max(left.palmFacingScore, right.palmFacingScore, 0.55);
  const trackingConfidence = Math.min(left.trackingConfidence, right.trackingConfidence);

  return {
    leftHandId: left.id,
    rightHandId: right.id,
    leftPalm: left.palmWorld,
    rightPalm: right.palmWorld,
    midpoint: rawMidpoint,
    smoothedMidpoint,
    direction,
    distance: rawDistance,
    smoothedDistance,
    normalizedDistance,
    angle: Math.atan2(right.palmWorld.y - left.palmWorld.y, right.palmWorld.x - left.palmWorld.x),
    distanceVelocity: velocityWithDeadZone,
    closingSpeed: Math.max(0, -velocityWithDeadZone),
    openingSpeed: Math.max(0, velocityWithDeadZone),
    radius,
    targetRadius,
    facingConfidence,
    stabilityConfidence,
    overallConfidence: clamp(trackingConfidence * stabilityConfidence * facingConfidence, 0, 1),
  };
};
