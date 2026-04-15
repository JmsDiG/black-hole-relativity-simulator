import { useState } from 'react'
import { ControlPanel } from './components/ControlPanel'
import { FormulaPanel } from './components/FormulaPanel'
import { GlossaryPanel } from './components/GlossaryPanel'
import { HintsPanel } from './components/HintsPanel'
import { ObservedModelPanel } from './components/ObservedModelPanel'
import { ScenarioPanel } from './components/ScenarioPanel'
import { SignalPanel } from './components/SignalPanel'
import { TimePanel } from './components/TimePanel'
import { TimelinePanel } from './components/TimelinePanel'
import { BlackHoleCanvas } from './scenes/BlackHoleCanvas'
import { useSimulationStore } from './state/simulationStore'
import { OBSERVED_BLACK_HOLES } from './ui/observedBlackHoles'
import { serializeShareState } from './utils/urlState'

function buildShareQuery() {
  const state = useSimulationStore.getState()

  return serializeShareState({
    activePresetId: state.activePresetId,
    catalogId: state.observedModelId,
    educationalApproximation: state.educationalApproximation,
    massSolar: state.massSolar,
    mode: state.mode,
    model: state.relativityModel,
    observer: state.observer,
    orbitalMode: state.orbitalMode,
    simulationSpeed: state.simulationSpeed,
  })
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function App() {
  const mode = useSimulationStore((state) => state.mode)
  const observer = useSimulationStore((state) => state.observer)
  const observedModelId = useSimulationStore((state) => state.observedModelId)
  const massSolar = useSimulationStore((state) => state.massSolar)
  const relativityModel = useSimulationStore((state) => state.relativityModel)
  const properTimeSeconds = useSimulationStore((state) => state.properTimeSeconds)
  const distantTimeSeconds = useSimulationStore((state) => state.distantTimeSeconds)
  const showGlossary = useSimulationStore((state) => state.showGlossary)
  const showHints = useSimulationStore((state) => state.showHints)
  const recording = useSimulationStore((state) => state.recording)
  const recordingSamples = useSimulationStore((state) => state.recordingSamples)
  const setRecording = useSimulationStore((state) => state.setRecording)
  const clearRecording = useSimulationStore((state) => state.clearRecording)
  const resetSimulation = useSimulationStore((state) => state.resetSimulation)
  const setPaused = useSimulationStore((state) => state.setPaused)
  const activeObservedModel = OBSERVED_BLACK_HOLES.find(
    (model) => model.id === observedModelId,
  )
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null)
  const [copyLabel, setCopyLabel] = useState('Copy URL')

  const handleCopyUrl = async () => {
    const query = buildShareQuery()
    const url = new URL(window.location.href)
    url.search = query
    window.history.replaceState({}, '', url)

    try {
      await navigator.clipboard.writeText(url.toString())
      setCopyLabel('URL copied')
      window.setTimeout(() => setCopyLabel('Copy URL'), 1200)
    } catch {
      setCopyLabel('Copy from the address bar')
    }
  }

  const handleScreenshot = () => {
    if (!canvasElement) {
      return
    }

    const dataUrl = canvasElement.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = 'bh-simulation-screenshot.png'
    link.click()
  }

  const handleExportRecording = () => {
    const payload = {
      distantTimeSeconds,
      massSolar,
      observer,
      properTimeSeconds,
      recordingSamples,
      relativityModel,
    }

    downloadTextFile(
      'bh-simulation-recording.json',
      JSON.stringify(payload, null, 2),
      'application/json',
    )
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero__main">
          <div className="hero__lead">
            <div className="hero__copy">
              <span className="eyebrow">BH Simulation</span>
              <p className="hero__intro">First-person relativity near a compact object</p>
              <h1>
                <span>Black Hole</span>
                <span className="hero__headline-accent">Relativity Simulator</span>
              </h1>
              <p className="hero__lede">
                Explore strong lensing, accretion-disk distortion, relativistic
                spectral shift and the split between proper time and distant
                observer time in a browser-native scientific exhibit.
              </p>
              <p className="hero__note">
                Built for visual intuition, explicit approximations and
                shareable observer scenarios.
              </p>
              <div className="hero__subline">
                <span>Educational relativity exhibit</span>
                <span>First-person observer frame</span>
                <span>Hybrid scientific visualization</span>
              </div>
            </div>

            <div className="hero-visual">
              <div className="hero-visual__frame">
                <svg className="hero-visual__art" viewBox="0 0 540 220">
                  <defs>
                    <radialGradient id="heroCore" r="1">
                      <stop offset="0%" stopColor="rgba(255, 167, 88, 0.28)" />
                      <stop offset="100%" stopColor="rgba(255, 167, 88, 0)" />
                    </radialGradient>
                    <linearGradient id="diskBand" x1="0%" x2="100%">
                      <stop offset="0%" stopColor="#ff8d54" />
                      <stop offset="50%" stopColor="#ffd07d" />
                      <stop offset="100%" stopColor="#7fd5ff" />
                    </linearGradient>
                    <linearGradient id="heroSweep" x1="0%" x2="100%">
                      <stop offset="0%" stopColor="rgba(98, 203, 255, 0)" />
                      <stop offset="50%" stopColor="rgba(98, 203, 255, 0.34)" />
                      <stop offset="100%" stopColor="rgba(98, 203, 255, 0)" />
                    </linearGradient>
                  </defs>
                  <circle cx="72" cy="40" fill="rgba(133, 211, 255, 0.6)" r="1.8" />
                  <circle cx="148" cy="176" fill="rgba(255, 210, 137, 0.56)" r="1.5" />
                  <circle cx="422" cy="52" fill="rgba(157, 217, 255, 0.58)" r="1.7" />
                  <circle cx="474" cy="154" fill="rgba(255, 201, 118, 0.5)" r="1.4" />
                  <circle cx="510" cy="76" fill="rgba(198, 229, 255, 0.48)" r="1.2" />
                  <path
                    d="M54 110 H486"
                    fill="none"
                    opacity="0.18"
                    stroke="url(#heroSweep)"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M130 110 C176 78 224 72 270 74"
                    fill="none"
                    opacity="0.24"
                    stroke="#7dcfff"
                    strokeDasharray="5 9"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M410 110 C364 142 316 148 270 146"
                    fill="none"
                    opacity="0.22"
                    stroke="#ffbc7b"
                    strokeDasharray="5 9"
                    strokeWidth="1.2"
                  />
                  <circle cx="270" cy="110" fill="url(#heroCore)" r="92" />
                  <ellipse
                    cx="270"
                    cy="110"
                    fill="none"
                    rx="172"
                    ry="34"
                    stroke="url(#diskBand)"
                    strokeWidth="8"
                  />
                  <ellipse
                    cx="270"
                    cy="110"
                    fill="none"
                    opacity="0.38"
                    rx="130"
                    ry="24"
                    stroke="#ffcb82"
                    strokeWidth="18"
                  />
                  <circle cx="270" cy="110" fill="#030409" r="38" />
                  <circle
                    cx="270"
                    cy="110"
                    fill="none"
                    opacity="0.26"
                    r="58"
                    stroke="#ffbf73"
                    strokeDasharray="5 7"
                  />
                  <ellipse
                    cx="270"
                    cy="110"
                    fill="none"
                    opacity="0.18"
                    rx="208"
                    ry="70"
                    stroke="rgba(255,255,255,0.16)"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M86 78 C152 42 212 44 248 88"
                    fill="none"
                    opacity="0.48"
                    stroke="#7cd7ff"
                    strokeWidth="3"
                  />
                  <path
                    d="M454 142 C388 178 330 174 292 132"
                    fill="none"
                    opacity="0.44"
                    stroke="#ffb56a"
                    strokeWidth="3"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
        <div className="hero__side">
          <div className="hero__actions">
            <button
              className="action-button"
              onClick={() => setPaused(false)}
              title="Resume the physics update loop."
              type="button"
            >
              Resume
            </button>
            <button
              className="action-button"
              onClick={() => setPaused(true)}
              title="Pause the simulation and inspect a single configuration."
              type="button"
            >
              Pause
            </button>
            <button
              className="action-button"
              onClick={() => resetSimulation()}
              title="Reset the observer state, timers and trajectory."
              type="button"
            >
              Reset
            </button>
            <button
              className="action-button"
              onClick={() => handleScreenshot()}
              title="Export the current viewport as a PNG screenshot."
              type="button"
            >
              Screenshot
            </button>
            <button
              className="action-button"
              onClick={() => handleCopyUrl()}
              title="Copy the current configuration as a shareable URL. Example: an M87* photon-sphere setup."
              type="button"
            >
              {copyLabel}
            </button>
            <button
              className={recording ? 'action-button action-button--active' : 'action-button'}
              onClick={() => setRecording(!recording)}
              title="Start or stop JSON sampling of the observer trajectory and timer state."
              type="button"
            >
              {recording ? 'Stop JSON record' : 'Record JSON'}
            </button>
            <button
              className="action-button"
              onClick={() => handleExportRecording()}
              title="Download the recorded parameter history as JSON."
              type="button"
            >
              Export JSON
            </button>
            <button
              className="action-button"
              onClick={() => clearRecording()}
              title="Clear the current recording buffer."
              type="button"
            >
              Clear record
            </button>
          </div>

          <div className="hero__panel">
            <article className="hero-note">
              <span>Loaded astrophysical model</span>
              <strong>{activeObservedModel ? activeObservedModel.name : 'Custom mass model'}</strong>
              <p>
                {activeObservedModel
                  ? activeObservedModel.category
                  : 'Mass and observer state are currently configured manually.'}
              </p>
            </article>
            <article className="hero-note hero-note--accent">
              <span>Scientific honesty</span>
              <strong>Hybrid visualization, explicit approximations</strong>
              <p>
                Clock rates use analytic relations; ray bending and disk
                appearance remain interactive approximations rather than full
                geodesic ray tracing.
              </p>
            </article>
          </div>
        </div>
      </header>

      <main className="workspace">
        <section className="viewport-column">
          <div className="workspace-label">
            <span>Simulation viewport</span>
            <strong>Sticky live stage</strong>
          </div>
          <div className="stage-shell">
            <section className={mode === 'compare' ? 'stage stage--split' : 'stage'}>
              <div className={mode === 'compare' ? 'canvas-frame canvas-frame--split' : 'canvas-frame'}>
                <div className="canvas-slot">
                  <div className="canvas-label">Local observer</div>
                  <BlackHoleCanvas onCanvasReady={setCanvasElement} view="local" />
                </div>
                {mode === 'compare' ? (
                  <div className="canvas-slot canvas-slot--secondary">
                    <div className="canvas-label">Distant observer</div>
                    <BlackHoleCanvas view="distant" />
                  </div>
                ) : null}
              </div>
            </section>
            <div className="stage-footnote">
              <strong>Live viewport</strong>
              <span>
                The visual stage remains visible while you adjust parameters so
                you can immediately evaluate lensing, disk distortion and clock
                behaviour.
              </span>
            </div>
          </div>
        </section>

        <aside className="control-column">
          <div className="workspace-label">
            <span>Control deck</span>
            <strong>Parameters, plots and formulas</strong>
          </div>
          <ObservedModelPanel />
          <ControlPanel />
          <ScenarioPanel />
          <TimePanel />
          <FormulaPanel />
          <TimelinePanel />
          <SignalPanel />
          {showHints ? <HintsPanel /> : null}
          {showGlossary ? <GlossaryPanel /> : null}
        </aside>
      </main>
    </div>
  )
}
