import { useCurrentHints } from '../state/simulationStore'

export function HintsPanel() {
  const hints = useCurrentHints()

  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Study guidance</h2>
        <span>Context-sensitive explanations of what the current configuration means</span>
      </div>
      <div className="hint-list">
        {hints.map((hint) => (
          <article className="hint-card" key={hint}>
            {hint}
          </article>
        ))}
      </div>
    </section>
  )
}
