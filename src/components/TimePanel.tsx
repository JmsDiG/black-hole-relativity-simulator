import { BlockMath } from 'react-katex'
import {
  computeTimeMetrics,
  getSchwarzschildRadiusKm,
  getTimeUnitSeconds,
} from '../core/physics/relativity'
import { useSimulationStore } from '../state/simulationStore'
import { formatDistanceRs, formatFactor, formatSeconds } from '../utils/format'

export function TimePanel() {
  const observer = useSimulationStore((state) => state.observer)
  const mode = useSimulationStore((state) => state.mode)
  const relativityModel = useSimulationStore((state) => state.relativityModel)
  const educationalApproximation = useSimulationStore(
    (state) => state.educationalApproximation,
  )
  const massSolar = useSimulationStore((state) => state.massSolar)
  const properTimeSeconds = useSimulationStore((state) => state.properTimeSeconds)
  const distantTimeSeconds = useSimulationStore((state) => state.distantTimeSeconds)
  const metrics = computeTimeMetrics(observer)
  const timeGap = distantTimeSeconds - properTimeSeconds

  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Scientific dashboard</h2>
        <span>Clock comparison, physical scales and calculation status</span>
      </div>

      <div className="metric-grid">
        <article className="metric-card">
          <span>Observer proper time</span>
          <strong>{formatSeconds(properTimeSeconds)}</strong>
        </article>
        <article className="metric-card">
          <span>Distant observer time</span>
          <strong>{formatSeconds(distantTimeSeconds)}</strong>
        </article>
        <article className="metric-card">
          <span>Slowdown factor</span>
          <strong>{formatFactor(metrics.slowdownFactor)}</strong>
        </article>
        <article className="metric-card">
          <span>Accumulated time difference</span>
          <strong>{formatSeconds(timeGap)}</strong>
        </article>
      </div>

      <div className="stats-strip stats-strip--dense">
        <div>
          <span>Gravitational factor</span>
          <strong>{formatFactor(metrics.gravitationalFactor)}</strong>
        </div>
        <div>
          <span>Kinematic factor</span>
          <strong>{formatFactor(metrics.kinematicFactor)}</strong>
        </div>
        <div>
          <span>Radius</span>
          <strong>{formatDistanceRs(observer.radiusRs)}</strong>
        </div>
        <div>
          <span>Schwarzschild radius</span>
          <strong>{getSchwarzschildRadiusKm(massSolar).toFixed(2)} km</strong>
        </div>
      </div>

      <div className="formula-inline">
        <BlockMath math="\frac{d\tau}{dt_\infty} \approx \frac{\sqrt{1-R_s/r}}{\gamma}" />
      </div>

      <div className="explanation-list">
        <div>
          <span>Calculation mode</span>
          <strong>
            {relativityModel === 'schwarzschild'
              ? 'Schwarzschild hybrid'
              : 'Rotating approximation'}
          </strong>
        </div>
        <div>
          <span>Interface mode</span>
          <strong>{mode}</strong>
        </div>
        <div>
          <span>One unit of Rs/c</span>
          <strong>{formatSeconds(getTimeUnitSeconds(massSolar))}</strong>
        </div>
        <div>
          <span>Visual honesty flag</span>
          <strong>
            {educationalApproximation ? 'Educational approximation enabled' : 'Hybrid visual model enabled'}
          </strong>
        </div>
      </div>
    </section>
  )
}
