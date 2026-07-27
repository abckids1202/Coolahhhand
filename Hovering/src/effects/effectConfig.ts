export const effectConfig = {
  handIdentity: { maxMatchDistance: 0.28, handednessBonus: 0.08, screenSideBonus: 0.04, lossGraceMs: 260 },
  twoHandAnchor: {
    midpointDamping: 14, distanceDamping: 10, velocityDamping: 10, radiusDamping: 8,
    minHandDistance: 0.35, maxHandDistance: 1.75, minRadius: 42, maxRadius: 170, movementDeadZone: 0.05,
    minimumExpansionMetric: 0.72, maximumExpansionMetric: 2.15, palmDistanceWeight: 0.55,
    wristDistanceWeight: 0.35, velocityWeight: 0.10, expansionCurveExponent: 0.75, expansionGain: 2.2,
    minimumOrbRadius: 0.18, maximumOrbRadius: 2.8, maximumStretchX: 2.5, minimumStretchY: 0.68, maximumStretchZ: 1.5,
  },
  interaction: {
    enabled: true, candidateDurationMs: 180, twoHandReadyMs: 220, readyDurationMs: 220, formationDurationMs: 850,
    releaseDurationMs: 900, cooldownDurationMs: 800, minimumTrackingConfidence: 0.5, minimumStabilityConfidence: 0.45,
    minimumFacingConfidence: 0.3, allowRelaxedFacing: true, minimumHandDistance: 0.35, maximumHandDistance: 1.75,
    minimumOrbRadius: 0.25, maximumOrbRadius: 1.15, midpointDamping: 14, distanceDamping: 10, radiusDamping: 8,
    movementDeadZone: 0.08, maximumClosingSpeed: 2.5, maximumOpeningSpeed: 2.5, chargeStartDistance: 1.0,
    minimumChargeDistance: 0.45, chargeRiseSpeed: 5, chargeDecaySpeed: 1.5, chargingThreshold: 0.6,
    minimumReleaseCharge: 0.65, releaseSpeedThreshold: 1.2, minimumChargingDurationMs: 300,
    trackingLossGraceMs: 150, trackingFadeDurationMs: 300, shockwaveEndRadius: 4,
  },
} as const;
