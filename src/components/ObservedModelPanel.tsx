import { OBSERVED_BLACK_HOLES } from '../ui/observedBlackHoles'
import { useSimulationStore } from '../state/simulationStore'

export function ObservedModelPanel() {
  const observedModelId = useSimulationStore((state) => state.observedModelId)
  const selectObservedModel = useSimulationStore((state) => state.selectObservedModel)

  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Observed black hole models</h2>
        <span>Mass presets grounded in well-known scientific papers</span>
      </div>

      <div className="model-grid">
        {OBSERVED_BLACK_HOLES.map((model) => (
          <article
            className={
              model.id === observedModelId ? 'model-card model-card--active' : 'model-card'
            }
            key={model.id}
          >
            <div className="model-card__header">
              <div>
                <strong>{model.name}</strong>
                <span>{model.category}</span>
              </div>
              <button
                className="action-button"
                onClick={() => selectObservedModel(model.id)}
                type="button"
              >
                Load
              </button>
            </div>
            <p>{model.summary}</p>
            <div className="model-card__meta">
              <span>{model.massSolar.toExponential(3)} M☉</span>
              <a href={model.sourceUrl} rel="noreferrer" target="_blank">
                Source paper
              </a>
            </div>
            <small>{model.citation}</small>
          </article>
        ))}
      </div>
    </section>
  )
}
