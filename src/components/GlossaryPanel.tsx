import { GLOSSARY_TERMS } from '../ui/terms'

export function GlossaryPanel() {
  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Glossary</h2>
        <span>Official scientific terms used throughout the simulation</span>
      </div>
      <div className="glossary-grid">
        {GLOSSARY_TERMS.map((entry) => (
          <article className="glossary-card" key={entry.term}>
            <strong>{entry.term}</strong>
            <p>{entry.body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
