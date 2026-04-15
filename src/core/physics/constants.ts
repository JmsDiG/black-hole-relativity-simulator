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
export const DEFAULT_SIMULATION_SPEED = 18000

export const DEFAULT_OBSERVER = {
  radiusRs: 8,
  radialVelocity: 0,
  tangentialVelocity: 0.24,
  phase: 0.4,
  yaw: 0,
  pitch: -0.04,
  fov: 72,
} as const

export const TRAIL_LIMIT = 320
export const RECORDING_SAMPLE_STEP_SECONDS = 0.18
