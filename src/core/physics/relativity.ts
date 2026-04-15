import {
  EPSILON,
  MAX_SPEED,
  MIN_RADIUS_RS,
  SOLAR_SCHWARZSCHILD_LIGHT_CROSSING_SECONDS,
  SOLAR_SCHWARZSCHILD_RADIUS_KM,
} from './constants'
import type { ObserverState, TimeMetrics } from './types'

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function wrapAngle(angle: number) {
  const tau = Math.PI * 2
  let wrapped = angle % tau

  if (wrapped < -Math.PI) {
    wrapped += tau
  }

  if (wrapped > Math.PI) {
    wrapped -= tau
  }

  return wrapped
}

export function clampBeta(beta: number) {
  return clamp(beta, -MAX_SPEED, MAX_SPEED)
}

export function combineVelocityMagnitude(
  radialVelocity: number,
  tangentialVelocity: number,
) {
  return clamp(
    Math.hypot(clampBeta(radialVelocity), clampBeta(tangentialVelocity)),
    0,
    MAX_SPEED,
  )
}

export function gammaFromBeta(beta: number) {
  return 1 / Math.sqrt(Math.max(EPSILON, 1 - beta * beta))
}

export function gravitationalFactor(radiusRs: number) {
  const safeRadius = Math.max(radiusRs, MIN_RADIUS_RS)
  return Math.sqrt(Math.max(EPSILON, 1 - 1 / safeRadius))
}

export function computeCircularOrbitBeta(radiusRs: number) {
  const safeRadius = Math.max(radiusRs, 1.12)
  const beta = Math.sqrt(1 / (2 * Math.max(0.32, safeRadius - 1)))
  return clamp(beta, 0, 0.88)
}

export function computeTimeMetrics(observer: ObserverState): TimeMetrics {
  const beta = combineVelocityMagnitude(
    observer.radialVelocity,
    observer.tangentialVelocity,
  )
  const gamma = gammaFromBeta(beta)
  const grav = gravitationalFactor(observer.radiusRs)
  const properTimeRate = grav / gamma

  return {
    beta,
    gamma,
    gravitationalFactor: grav,
    gravitationalBlueshift: 1 / grav,
    kinematicFactor: 1 / gamma,
    properTimeRate,
    slowdownFactor: 1 / properTimeRate,
    circularOrbitBeta: computeCircularOrbitBeta(observer.radiusRs),
  }
}

export function computeIncomingLightShift(
  observer: ObserverState,
  lookCosine: number,
) {
  const metrics = computeTimeMetrics(observer)
  const doppler = metrics.gamma * (1 + metrics.beta * clamp(lookCosine, -1, 1))

  return clamp(metrics.gravitationalBlueshift * doppler, 0.35, 3)
}

export function computeSignalShiftToInfinity(observer: ObserverState) {
  const metrics = computeTimeMetrics(observer)
  const outwardMotionPenalty = 1 + clamp(observer.radialVelocity, -0.7, 0.7)

  return clamp(
    metrics.gravitationalFactor / (metrics.gamma * outwardMotionPenalty),
    0.12,
    1.8,
  )
}

export function getTimeUnitSeconds(massSolar: number) {
  return SOLAR_SCHWARZSCHILD_LIGHT_CROSSING_SECONDS * massSolar
}

export function getSchwarzschildRadiusKm(massSolar: number) {
  return SOLAR_SCHWARZSCHILD_RADIUS_KM * massSolar
}
