import { ISCO_RS, PHOTON_SPHERE_RS } from './constants'
import { computeTimeMetrics } from './relativity'
import type { ObserverState, RelativityModel, SimulationMode } from './types'

export function getEducationalHints(
  observer: ObserverState,
  mode: SimulationMode,
  model: RelativityModel,
  educationalApproximation: boolean,
) {
  const metrics = computeTimeMetrics(observer)
  const hints: string[] = []

  if (observer.radiusRs <= PHOTON_SPHERE_RS + 0.25) {
    hints.push(
      'You are close to the photon sphere. Small changes in viewing angle now produce large shifts in the star field because nearby impact parameters are almost captured.',
    )
  } else if (observer.radiusRs <= ISCO_RS + 0.5) {
    hints.push(
      'You are entering the innermost region of stable orbits. Even without full geodesic tracing, strong lensing and rapid clock-rate divergence now dominate the experience.',
    )
  } else {
    hints.push(
      'At large radii the simulation approaches Newtonian intuition: lensing weakens and gravitational time dilation becomes progressively smaller.',
    )
  }

  if (metrics.beta > 0.45) {
    hints.push(
      'The kinematic contribution is now large: the forward direction shifts toward blue while the rearward field drifts toward red even before gravity boosts the effect.',
    )
  } else {
    hints.push(
      'In this regime the velocity is moderate, so the clock difference is driven more by gravitational potential than by special-relativistic kinematics.',
    )
  }

  if (mode === 'compare') {
    hints.push(
      'In observer comparison mode, the distant frame does not directly access your proper time. It compares a remote coordinate time with the locally accumulated clock along your worldline.',
    )
  }

  if (model === 'rotating-approx') {
    hints.push(
      'The rotating approximation is not a full Kerr solution. It only adds qualitative asymmetries in lensing and disk brightness to illustrate frame-dragging-like trends.',
    )
  }

  if (educationalApproximation) {
    hints.push(
      'Educational approximation mode deliberately smooths the visual side. Time factors still follow the formulas, but the rays and accretion disk are rendered with interactive parametric approximations.',
    )
  }

  return hints
}
