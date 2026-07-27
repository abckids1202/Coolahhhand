export const effectConfig = {
  handIdentity: {
    maxMatchDistance: 0.28,
    handednessBonus: 0.08,
    screenSideBonus: 0.04,
    lossGraceMs: 260,
  },
  twoHandAnchor: {
    midpointDamping: 14,
    distanceDamping: 10,
    velocityDamping: 10,
    radiusDamping: 8,
    minHandDistance: 0.35,
    maxHandDistance: 1.75,
    minRadius: 42,
    maxRadius: 170,
    movementDeadZone: 0.05,
  },
  interaction: {
    twoHandReadyMs: 250,
    confidenceExitGraceMs: 180,
    releaseCooldownMs: 800,
  },
} as const;
