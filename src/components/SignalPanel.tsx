import { useSimulationStore } from '../state/simulationStore'
import { formatFactor, formatSeconds } from '../utils/format'

export function SignalPanel() {
  const signalPulses = useSimulationStore((state) => state.signalPulses)
  const emitSignalPulse = useSimulationStore((state) => state.emitSignalPulse)

  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Light-signal probe</h2>
        <span>Educational estimate of how a locally emitted pulse is received at infinity</span>
      </div>
      <button
        className="action-button"
        onClick={() => emitSignalPulse()}
        type="button"
        title="Emit a pulse and estimate how a distant observer would receive it."
      >
        Emit light pulse
      </button>
      <div className="signal-list">
        {signalPulses.length === 0 ? (
          <p className="muted-copy">
            No pulses yet. Emit one to inspect the estimated delay and frequency shift toward infinity.
          </p>
        ) : null}
        {signalPulses.map((signal) => (
          <article className="signal-card" key={signal.id}>
            <strong>{formatSeconds(signal.emittedProperTimeSeconds)}</strong>
            <span>
              Estimated arrival delay: {formatSeconds(signal.estimatedArrivalDelaySeconds)}
            </span>
            <span>Frequency shift toward infinity: {formatFactor(signal.shiftToInfinity)}</span>
          </article>
        ))}
      </div>
    </section>
  )
}
