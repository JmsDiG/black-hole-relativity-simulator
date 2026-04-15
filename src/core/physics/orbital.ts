import { MAX_RADIUS_RS, MIN_RADIUS_RS } from './constants'
import {
  clamp,
  computeCircularOrbitBeta,
  computeTimeMetrics,
  wrapAngle,
} from './relativity'
import type { ObserverState, OrbitalMode } from './types'

export function getObserverCartesian(radiusRs: number, phase: number) {
  return {
    x: Math.cos(phase) * radiusRs,
    y: 0,
    z: Math.sin(phase) * radiusRs,
  }
}

export function advanceObserverState(
  observer: ObserverState,
  coordinateDeltaRsSeconds: number,
  orbitalMode: OrbitalMode,
) {
  const next = { ...observer }

  if (orbitalMode === 'circular-lock') {
    next.radialVelocity = 0
    next.tangentialVelocity = computeCircularOrbitBeta(observer.radiusRs)
  }

  const metrics = computeTimeMetrics(next)

  // Approximation:
  // The user can prescribe local radial and tangential speeds freely, so the
  // trajectory is not solved as a geodesic. We only map those local speeds into
  // coordinate motion with the right qualitative relativistic trend.
  const radialCoordinateRate =
    next.radialVelocity * metrics.gravitationalFactor * metrics.properTimeRate
  const angularCoordinateRate =
    (next.tangentialVelocity * metrics.properTimeRate) /
    Math.max(1.05, next.radiusRs)

  next.radiusRs = clamp(
    next.radiusRs + radialCoordinateRate * coordinateDeltaRsSeconds,
    MIN_RADIUS_RS,
    MAX_RADIUS_RS,
  )
  next.phase = wrapAngle(next.phase + angularCoordinateRate * coordinateDeltaRsSeconds)
  next.yaw = wrapAngle(next.yaw)
  next.pitch = clamp(next.pitch, -1.2, 1.2)
  next.fov = clamp(next.fov, 40, 110)

  return next
}
