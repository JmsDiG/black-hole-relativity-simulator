import {
  DEFAULT_MASS_SOLAR,
  DEFAULT_OBSERVER,
  DEFAULT_SIMULATION_SPEED,
} from '../core/physics/constants'
import type {
  ObserverState,
  OrbitalMode,
  RelativityModel,
  SimulationMode,
} from '../core/physics/types'

export interface ShareStateSnapshot {
  catalogId: string
  mode: SimulationMode
  model: RelativityModel
  orbitalMode: OrbitalMode
  massSolar: number
  simulationSpeed: number
  educationalApproximation: boolean
  activePresetId: string
  observer: ObserverState
}

function readNumber(value: string | null, fallback: number) {
  if (value === null) {
    return fallback
  }

  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

export function parseShareStateFromUrl(): Partial<ShareStateSnapshot> {
  if (typeof window === 'undefined') {
    return {}
  }

  const params = new URLSearchParams(window.location.search)

  return {
    mode: (params.get('mode') as SimulationMode | null) ?? undefined,
    catalogId: params.get('catalog') ?? undefined,
    model: (params.get('model') as RelativityModel | null) ?? undefined,
    orbitalMode: (params.get('orbit') as OrbitalMode | null) ?? undefined,
    activePresetId: params.get('preset') ?? undefined,
    educationalApproximation: params.get('approx') === '1',
    massSolar: readNumber(params.get('mass'), DEFAULT_MASS_SOLAR),
    simulationSpeed: readNumber(params.get('speed'), DEFAULT_SIMULATION_SPEED),
    observer: {
      radiusRs: readNumber(params.get('r'), DEFAULT_OBSERVER.radiusRs),
      radialVelocity: readNumber(params.get('vr'), DEFAULT_OBSERVER.radialVelocity),
      tangentialVelocity: readNumber(
        params.get('vt'),
        DEFAULT_OBSERVER.tangentialVelocity,
      ),
      phase: readNumber(params.get('phase'), DEFAULT_OBSERVER.phase),
      yaw: readNumber(params.get('yaw'), DEFAULT_OBSERVER.yaw),
      pitch: readNumber(params.get('pitch'), DEFAULT_OBSERVER.pitch),
      fov: readNumber(params.get('fov'), DEFAULT_OBSERVER.fov),
    },
  }
}

export function serializeShareState(snapshot: ShareStateSnapshot) {
  const params = new URLSearchParams()

  params.set('mode', snapshot.mode)
  params.set('catalog', snapshot.catalogId)
  params.set('model', snapshot.model)
  params.set('orbit', snapshot.orbitalMode)
  params.set('preset', snapshot.activePresetId)
  params.set('approx', snapshot.educationalApproximation ? '1' : '0')
  params.set('mass', snapshot.massSolar.toFixed(2))
  params.set('speed', snapshot.simulationSpeed.toFixed(0))
  params.set('r', snapshot.observer.radiusRs.toFixed(3))
  params.set('vr', snapshot.observer.radialVelocity.toFixed(3))
  params.set('vt', snapshot.observer.tangentialVelocity.toFixed(3))
  params.set('phase', snapshot.observer.phase.toFixed(3))
  params.set('yaw', snapshot.observer.yaw.toFixed(3))
  params.set('pitch', snapshot.observer.pitch.toFixed(3))
  params.set('fov', snapshot.observer.fov.toFixed(1))

  return params.toString()
}
