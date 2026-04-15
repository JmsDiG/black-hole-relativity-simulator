export const EVENT_HORIZON_RS = 1
export const PHOTON_SPHERE_RS = 1.5
export const ISCO_RS = 3
export const MIN_RADIUS_RS = 1.03
export const MAX_RADIUS_RS = 24
export const MAX_SPEED = 0.96
export const EPSILON = 1e-6

export const SOLAR_SCHWARZSCHILD_RADIUS_KM = 2.95325008
export const SOLAR_SCHWARZSCHILD_LIGHT_CROSSING_SECONDS = 9.8509819e-6

export const DEFAULT_MASS_SOLAR = 8
// Default simulation speed reduced from 18000 → 100. Combined with the
// reduced default tangential velocity below this gives one camera orbit
// in roughly 12–15 seconds of real time at the default observer radius
// (≈ 8 Rs). The UI slider range is unchanged — only the starting value
// moves, so users can still crank speed back up via the Control Panel.
export const DEFAULT_SIMULATION_SPEED = 100

export const DEFAULT_OBSERVER = {
  radiusRs: 8,
  radialVelocity: 0,
  // Reduced from 0.24 → 0.04 c to slow the visible orbital motion of
  // the Local Observer camera. Same UI slider, just a calmer initial
  // value.
  tangentialVelocity: 0.04,
  phase: 0.4,
  yaw: 0,
  pitch: -0.04,
  fov: 72,
} as const

export const TRAIL_LIMIT = 320
export const RECORDING_SAMPLE_STEP_SECONDS = 0.18
