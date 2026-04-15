export type SimulationMode = 'free' | 'scenario' | 'compare' | 'study'

export type RelativityModel = 'schwarzschild' | 'rotating-approx'

export type OrbitalMode = 'manual' | 'circular-lock'

export interface ObserverState {
  radiusRs: number
  radialVelocity: number
  tangentialVelocity: number
  phase: number
  yaw: number
  pitch: number
  fov: number
}

export interface TimeMetrics {
  beta: number
  gamma: number
  gravitationalFactor: number
  gravitationalBlueshift: number
  kinematicFactor: number
  properTimeRate: number
  slowdownFactor: number
  circularOrbitBeta: number
}

export interface TrailPoint {
  x: number
  y: number
  z: number
  radiusRs: number
  properTimeSeconds: number
  distantTimeSeconds: number
}

export interface SignalPulse {
  id: string
  emittedProperTimeSeconds: number
  emittedDistantTimeSeconds: number
  estimatedArrivalDelaySeconds: number
  shiftToInfinity: number
  radiusRs: number
}

export interface RecordingSample {
  radiusRs: number
  radialVelocity: number
  tangentialVelocity: number
  phase: number
  properTimeSeconds: number
  distantTimeSeconds: number
}

export interface ScenarioPreset {
  id: string
  label: string
  description: string
  mode: SimulationMode
  observer: Partial<ObserverState>
  massSolar?: number
  model?: RelativityModel
  orbitalMode?: OrbitalMode
  educationalApproximation?: boolean
  simulationSpeed?: number
}
