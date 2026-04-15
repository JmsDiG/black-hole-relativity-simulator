import { computeCircularOrbitBeta, computeTimeMetrics } from '../core/physics/relativity'
import { useSimulationStore } from '../state/simulationStore'
import { formatDistanceRs, formatFactor } from '../utils/format'
import { InfoTip } from './InfoTip'
import { RangeField } from './RangeField'

function LabelWithTip({
  label,
  title,
  body,
}: {
  label: string
  title: string
  body: string
}) {
  return (
    <span className="label-with-tip">
      <span>{label}</span>
      <InfoTip title={title}>{body}</InfoTip>
    </span>
  )
}

export function ControlPanel() {
  const mode = useSimulationStore((state) => state.mode)
  const relativityModel = useSimulationStore((state) => state.relativityModel)
  const orbitalMode = useSimulationStore((state) => state.orbitalMode)
  const educationalApproximation = useSimulationStore(
    (state) => state.educationalApproximation,
  )
  const massSolar = useSimulationStore((state) => state.massSolar)
  const simulationSpeed = useSimulationStore((state) => state.simulationSpeed)
  const observer = useSimulationStore((state) => state.observer)
  const paused = useSimulationStore((state) => state.paused)
  const cinematicMode = useSimulationStore((state) => state.cinematicMode)
  const showHints = useSimulationStore((state) => state.showHints)
  const showGlossary = useSimulationStore((state) => state.showGlossary)
  const showTrail = useSimulationStore((state) => state.showTrail)
  const showWorldline = useSimulationStore((state) => state.showWorldline)
  const showCone = useSimulationStore((state) => state.showCone)
  const setMode = useSimulationStore((state) => state.setMode)
  const setRelativityModel = useSimulationStore((state) => state.setRelativityModel)
  const setOrbitalMode = useSimulationStore((state) => state.setOrbitalMode)
  const setEducationalApproximation = useSimulationStore(
    (state) => state.setEducationalApproximation,
  )
  const setMassSolar = useSimulationStore((state) => state.setMassSolar)
  const setSimulationSpeed = useSimulationStore((state) => state.setSimulationSpeed)
  const updateObserver = useSimulationStore((state) => state.updateObserver)
  const setCinematicMode = useSimulationStore((state) => state.setCinematicMode)
  const setShowHints = useSimulationStore((state) => state.setShowHints)
  const setShowGlossary = useSimulationStore((state) => state.setShowGlossary)
  const setShowTrail = useSimulationStore((state) => state.setShowTrail)
  const setShowWorldline = useSimulationStore((state) => state.setShowWorldline)
  const setShowCone = useSimulationStore((state) => state.setShowCone)
  const setPaused = useSimulationStore((state) => state.setPaused)
  const metrics = computeTimeMetrics(observer)
  const circularOrbitBeta = computeCircularOrbitBeta(observer.radiusRs)

  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Control deck</h2>
        <span>Observer state, calculation mode, overlays and playback controls</span>
      </div>

      <div className="segmented">
        {[
          ['free', 'Free exploration'],
          ['scenario', 'Scenarios'],
          ['compare', 'Compare observers'],
          ['study', 'Study mode'],
        ].map(([value, label]) => (
          <button
            className={
              mode === value ? 'segmented__button segmented__button--active' : 'segmented__button'
            }
            key={value}
            onClick={() => setMode(value as typeof mode)}
            type="button"
            title={`Switch to ${label}.`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="inline-fields">
        <label>
          <span className="label-with-tip">
            <span>Metric model</span>
            <InfoTip title="Metric model">
              Choose the underlying spacetime interpretation. Example: use Schwarzschild for a non-rotating black hole, or Rotating approximation for qualitative frame-dragging-like asymmetry.
            </InfoTip>
          </span>
          <select
            onChange={(event) =>
              setRelativityModel(event.target.value as typeof relativityModel)
            }
            value={relativityModel}
          >
            <option value="schwarzschild">Schwarzschild</option>
            <option value="rotating-approx">Rotating approximation</option>
          </select>
        </label>
        <label>
          <span className="label-with-tip">
            <span>Trajectory mode</span>
            <InfoTip title="Trajectory mode">
              Manual keeps your chosen velocities. Circular lock automatically sets the tangential speed near a circular-orbit estimate. Example: use circular lock around 5 Rs to study orbital time dilation.
            </InfoTip>
          </span>
          <select
            onChange={(event) => setOrbitalMode(event.target.value as typeof orbitalMode)}
            value={orbitalMode}
          >
            <option value="manual">Manual</option>
            <option value="circular-lock">Circular lock</option>
          </select>
        </label>
      </div>

      <RangeField
        formatValue={formatDistanceRs}
        label={
          <LabelWithTip
            body="Distance from the black-hole center in Schwarzschild radii. Example: 12 Rs is weak-field, 3 Rs is close to the ISCO, 1.6 Rs approaches the photon sphere."
            label="Radius"
            title="Radius"
          />
        }
        max={18}
        min={1.03}
        onChange={(value) => updateObserver({ radiusRs: value })}
        step={0.01}
        value={observer.radiusRs}
      />
      <RangeField
        label={
          <LabelWithTip
            body="Local outward or inward speed in units of c. Example: -0.20 means infall, +0.20 means climbing outward."
            label="Radial velocity"
            title="Radial velocity"
          />
        }
        max={0.8}
        min={-0.8}
        onChange={(value) => updateObserver({ radialVelocity: value })}
        step={0.01}
        value={observer.radialVelocity}
      />
      <RangeField
        label={
          <LabelWithTip
            body="Local tangential speed around the black hole in units of c. Example: 0.55 gives a fast fly-by with strong Doppler asymmetry."
            label="Tangential velocity"
            title="Tangential velocity"
          />
        }
        max={0.88}
        min={0}
        onChange={(value) => updateObserver({ tangentialVelocity: value })}
        step={0.01}
        value={observer.tangentialVelocity}
      />
      <RangeField
        label={
          <LabelWithTip
            body="Azimuthal position around the hole. Example: changing orbital phase lets you inspect different parts of the accretion disk without changing the radius."
            label="Orbital phase"
            title="Orbital phase"
          />
        }
        max={Math.PI}
        min={-Math.PI}
        onChange={(value) => updateObserver({ phase: value })}
        step={0.01}
        value={observer.phase}
      />
      <RangeField
        label={
          <LabelWithTip
            body="Horizontal look offset relative to the inward direction. Example: positive yaw lets you look ahead along your orbit instead of directly at the hole."
            label="Yaw"
            title="Yaw"
          />
        }
        max={1.3}
        min={-1.3}
        onChange={(value) => updateObserver({ yaw: value })}
        step={0.01}
        value={observer.yaw}
      />
      <RangeField
        label={
          <LabelWithTip
            body="Vertical look offset. Example: use a negative pitch to view the accretion disk plane more directly."
            label="Pitch"
            title="Pitch"
          />
        }
        max={0.8}
        min={-0.8}
        onChange={(value) => updateObserver({ pitch: value })}
        step={0.01}
        value={observer.pitch}
      />
      <RangeField
        label={
          <LabelWithTip
            body="Camera field of view. Example: a wide FOV near the photon sphere exaggerates the apparent distortion of the background sky."
            label="Field of view"
            title="Field of view"
          />
        }
        max={100}
        min={45}
        onChange={(value) => updateObserver({ fov: value })}
        step={1}
        value={observer.fov}
      />
      <RangeField
        label={
          <LabelWithTip
            body="Black-hole mass in solar masses. Example: Cygnus X-1 is about 21.2 M☉, while M87* is about 6.5 × 10^9 M☉."
            label="Mass"
            title="Mass"
          />
        }
        max={80}
        min={1}
        onChange={setMassSolar}
        step={0.5}
        value={massSolar}
      />
      <RangeField
        label={
          <LabelWithTip
            body="Simulation rate in units of coordinate-time advance per real second. Example: lower values help when inspecting the horizon approach frame by frame."
            label="Simulation speed"
            title="Simulation speed"
          />
        }
        max={30000}
        min={1000}
        onChange={setSimulationSpeed}
        step={250}
        value={simulationSpeed}
      />

      <div className="stats-strip">
        <div>
          <span>Circular-orbit β estimate</span>
          <strong>{formatFactor(circularOrbitBeta)}</strong>
        </div>
        <div>
          <span>Current Lorentz γ</span>
          <strong>{formatFactor(metrics.gamma)}</strong>
        </div>
      </div>

      <div className="toggle-grid">
        <label>
          <input
            checked={educationalApproximation}
            onChange={(event) => setEducationalApproximation(event.target.checked)}
            type="checkbox"
          />
          <span>Educational approximation</span>
        </label>
        <label>
          <input checked={!paused} onChange={(event) => setPaused(!event.target.checked)} type="checkbox" />
          <span>Physics running</span>
        </label>
        <label>
          <input checked={cinematicMode} onChange={(event) => setCinematicMode(event.target.checked)} type="checkbox" />
          <span>Cinematic mode</span>
        </label>
        <label>
          <input checked={showHints} onChange={(event) => setShowHints(event.target.checked)} type="checkbox" />
          <span>Study hints</span>
        </label>
        <label>
          <input checked={showGlossary} onChange={(event) => setShowGlossary(event.target.checked)} type="checkbox" />
          <span>Glossary cards</span>
        </label>
        <label>
          <input checked={showTrail} onChange={(event) => setShowTrail(event.target.checked)} type="checkbox" />
          <span>Trajectory trail</span>
        </label>
        <label>
          <input checked={showWorldline} onChange={(event) => setShowWorldline(event.target.checked)} type="checkbox" />
          <span>Worldline plot</span>
        </label>
        <label>
          <input checked={showCone} onChange={(event) => setShowCone(event.target.checked)} type="checkbox" />
          <span>Capture cone</span>
        </label>
      </div>
    </section>
  )
}
