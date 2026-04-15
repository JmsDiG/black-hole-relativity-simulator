import { SCENARIO_PRESETS } from '../presets/scenarios'
import { useSimulationStore } from '../state/simulationStore'

export function ScenarioPanel() {
  const activePresetId = useSimulationStore((state) => state.activePresetId)
  const applyPreset = useSimulationStore((state) => state.applyPreset)

  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Scenario presets</h2>
        <span>Reusable setups for weak-field, orbital and near-horizon exploration</span>
      </div>
      <div className="preset-grid">
        {SCENARIO_PRESETS.map((preset) => (
          <button
            className={preset.id === activePresetId ? 'preset-card preset-card--active' : 'preset-card'}
            key={preset.id}
            onClick={() => applyPreset(preset.id)}
            type="button"
          >
            <strong>{preset.label}</strong>
            <span>{preset.description}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
