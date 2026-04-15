import { create } from 'zustand'
import {
  DEFAULT_MASS_SOLAR,
  DEFAULT_OBSERVER,
  DEFAULT_SIMULATION_SPEED,
  RECORDING_SAMPLE_STEP_SECONDS,
  TRAIL_LIMIT,
} from '../core/physics/constants'
import { getEducationalHints } from '../core/physics/education'
import { advanceObserverState, getObserverCartesian } from '../core/physics/orbital'
import {
  computeSignalShiftToInfinity,
  computeTimeMetrics,
  getTimeUnitSeconds,
} from '../core/physics/relativity'
import type {
  ObserverState,
  OrbitalMode,
  RecordingSample,
  RelativityModel,
  SignalPulse,
  SimulationMode,
  TrailPoint,
} from '../core/physics/types'
import { SCENARIO_PRESETS } from '../presets/scenarios'
import { OBSERVED_BLACK_HOLES } from '../ui/observedBlackHoles'
import { parseShareStateFromUrl } from '../utils/urlState'

interface SimulationState {
  mode: SimulationMode
  relativityModel: RelativityModel
  orbitalMode: OrbitalMode
  educationalApproximation: boolean
  activePresetId: string
  massSolar: number
  simulationSpeed: number
  observer: ObserverState
  paused: boolean
  cinematicMode: boolean
  showHints: boolean
  showGlossary: boolean
  showTrail: boolean
  showWorldline: boolean
  showCone: boolean
  properTimeSeconds: number
  distantTimeSeconds: number
  trajectory: TrailPoint[]
  signalPulses: SignalPulse[]
  recording: boolean
  recordingSamples: RecordingSample[]
  recordingAccumulatorSeconds: number
  setMode: (mode: SimulationMode) => void
  setRelativityModel: (model: RelativityModel) => void
  setOrbitalMode: (mode: OrbitalMode) => void
  setEducationalApproximation: (value: boolean) => void
  setMassSolar: (value: number) => void
  observedModelId: string
  selectObservedModel: (value: string) => void
  setSimulationSpeed: (value: number) => void
  updateObserver: (patch: Partial<ObserverState>) => void
  setPaused: (value: boolean) => void
  setCinematicMode: (value: boolean) => void
  setShowHints: (value: boolean) => void
  setShowGlossary: (value: boolean) => void
  setShowTrail: (value: boolean) => void
  setShowWorldline: (value: boolean) => void
  setShowCone: (value: boolean) => void
  resetSimulation: () => void
  applyPreset: (presetId: string) => void
  tick: (deltaSeconds: number) => void
  emitSignalPulse: () => void
  setRecording: (value: boolean) => void
  clearRecording: () => void
}

const parsedShare = parseShareStateFromUrl()

function buildInitialObserver(): ObserverState {
  return {
    ...DEFAULT_OBSERVER,
    ...parsedShare.observer,
  }
}

function buildTrailPoint(
  observer: ObserverState,
  properTimeSeconds: number,
  distantTimeSeconds: number,
) {
  const position = getObserverCartesian(observer.radiusRs, observer.phase)

  return {
    ...position,
    radiusRs: observer.radiusRs,
    properTimeSeconds,
    distantTimeSeconds,
  }
}

function buildInitialState() {
  const observer = buildInitialObserver()

  return {
    mode: parsedShare.mode ?? 'free',
    relativityModel: parsedShare.model ?? 'schwarzschild',
    orbitalMode: parsedShare.orbitalMode ?? 'manual',
    educationalApproximation: parsedShare.educationalApproximation ?? false,
    observedModelId: parsedShare.catalogId ?? 'custom',
    activePresetId: parsedShare.activePresetId ?? 'custom',
    massSolar: parsedShare.massSolar ?? DEFAULT_MASS_SOLAR,
    simulationSpeed: parsedShare.simulationSpeed ?? DEFAULT_SIMULATION_SPEED,
    observer,
    paused: false,
    cinematicMode: false,
    showHints: true,
    showGlossary: true,
    showTrail: true,
    showWorldline: true,
    showCone: false,
    properTimeSeconds: 0,
    distantTimeSeconds: 0,
    trajectory: [buildTrailPoint(observer, 0, 0)],
    signalPulses: [],
    recording: false,
    recordingSamples: [],
    recordingAccumulatorSeconds: 0,
  }
}

const initialState = buildInitialState()

export const useSimulationStore = create<SimulationState>((set, get) => ({
  ...initialState,
  setMode: (mode) => set({ mode }),
  setRelativityModel: (relativityModel) => set({ relativityModel }),
  setOrbitalMode: (orbitalMode) =>
    set({
      orbitalMode,
      activePresetId: 'custom',
    }),
  setEducationalApproximation: (educationalApproximation) =>
    set({
      educationalApproximation,
      activePresetId: 'custom',
    }),
  setMassSolar: (massSolar) =>
    set({ massSolar, activePresetId: 'custom', observedModelId: 'custom' }),
  selectObservedModel: (observedModelId) => {
    const model = OBSERVED_BLACK_HOLES.find((entry) => entry.id === observedModelId)

    if (!model) {
      return
    }

    set({
      massSolar: model.massSolar,
      observedModelId: model.id,
    })
  },
  setSimulationSpeed: (simulationSpeed) =>
    set({ simulationSpeed, activePresetId: 'custom' }),
  updateObserver: (patch) =>
    set((state) => ({
      observer: {
        ...state.observer,
        ...patch,
      },
      activePresetId: 'custom',
    })),
  setPaused: (paused) => set({ paused }),
  setCinematicMode: (cinematicMode) => set({ cinematicMode }),
  setShowHints: (showHints) => set({ showHints }),
  setShowGlossary: (showGlossary) => set({ showGlossary }),
  setShowTrail: (showTrail) => set({ showTrail }),
  setShowWorldline: (showWorldline) => set({ showWorldline }),
  setShowCone: (showCone) => set({ showCone }),
  resetSimulation: () => {
    const observer = { ...DEFAULT_OBSERVER }

    set({
      ...initialState,
      observer,
      trajectory: [buildTrailPoint(observer, 0, 0)],
      observedModelId: 'custom',
    })
  },
  applyPreset: (presetId) => {
    const preset = SCENARIO_PRESETS.find((entry) => entry.id === presetId)

    if (!preset) {
      return
    }

    const observer = {
      ...get().observer,
      ...preset.observer,
    }

    set({
      mode: preset.mode,
      observer,
      activePresetId: preset.id,
      observedModelId: get().observedModelId,
      massSolar: preset.massSolar ?? get().massSolar,
      relativityModel: preset.model ?? get().relativityModel,
      orbitalMode: preset.orbitalMode ?? 'manual',
      educationalApproximation:
        preset.educationalApproximation ?? get().educationalApproximation,
      simulationSpeed: preset.simulationSpeed ?? get().simulationSpeed,
      properTimeSeconds: 0,
      distantTimeSeconds: 0,
      trajectory: [buildTrailPoint(observer, 0, 0)],
      signalPulses: [],
      recordingSamples: [],
      recordingAccumulatorSeconds: 0,
      paused: false,
      showHints: true,
    })
  },
  tick: (deltaSeconds) => {
    const state = get()

    if (state.paused) {
      return
    }

    const coordinateDeltaRsSeconds = deltaSeconds * state.simulationSpeed
    const observer = advanceObserverState(
      state.observer,
      coordinateDeltaRsSeconds,
      state.orbitalMode,
    )
    const metrics = computeTimeMetrics(observer)
    const timeUnitSeconds = getTimeUnitSeconds(state.massSolar)
    const distantDeltaSeconds = coordinateDeltaRsSeconds * timeUnitSeconds
    const properDeltaSeconds = distantDeltaSeconds * metrics.properTimeRate
    const properTimeSeconds = state.properTimeSeconds + properDeltaSeconds
    const distantTimeSeconds = state.distantTimeSeconds + distantDeltaSeconds
    const trajectory = [...state.trajectory, buildTrailPoint(observer, properTimeSeconds, distantTimeSeconds)].slice(
      -TRAIL_LIMIT,
    )

    let recordingSamples = state.recordingSamples
    let recordingAccumulatorSeconds =
      state.recordingAccumulatorSeconds + deltaSeconds

    if (state.recording && recordingAccumulatorSeconds >= RECORDING_SAMPLE_STEP_SECONDS) {
      const nextSample: RecordingSample = {
        radiusRs: observer.radiusRs,
        radialVelocity: observer.radialVelocity,
        tangentialVelocity: observer.tangentialVelocity,
        phase: observer.phase,
        properTimeSeconds,
        distantTimeSeconds,
      }

      recordingSamples = [...state.recordingSamples, nextSample]
      recordingAccumulatorSeconds = 0
    }

    set({
      observer,
      properTimeSeconds,
      distantTimeSeconds,
      trajectory,
      recordingSamples,
      recordingAccumulatorSeconds,
    })
  },
  emitSignalPulse: () => {
    const state = get()
    const timeUnitSeconds = getTimeUnitSeconds(state.massSolar)
    const signal: SignalPulse = {
      id: `${Date.now()}-${state.signalPulses.length}`,
      emittedProperTimeSeconds: state.properTimeSeconds,
      emittedDistantTimeSeconds: state.distantTimeSeconds,
      estimatedArrivalDelaySeconds: state.observer.radiusRs * timeUnitSeconds * 1.3,
      shiftToInfinity: computeSignalShiftToInfinity(state.observer),
      radiusRs: state.observer.radiusRs,
    }

    set({
      signalPulses: [signal, ...state.signalPulses].slice(0, 8),
    })
  },
  setRecording: (recording) =>
    set({
      recording,
      recordingAccumulatorSeconds: 0,
    }),
  clearRecording: () =>
    set({
      recording: false,
      recordingSamples: [],
      recordingAccumulatorSeconds: 0,
    }),
}))

export function useCurrentHints() {
  const observer = useSimulationStore((state) => state.observer)
  const mode = useSimulationStore((state) => state.mode)
  const relativityModel = useSimulationStore((state) => state.relativityModel)
  const educationalApproximation = useSimulationStore(
    (state) => state.educationalApproximation,
  )

  return getEducationalHints(
    observer,
    mode,
    relativityModel,
    educationalApproximation,
  )
}
