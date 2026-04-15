import { useSimulationStore } from '../state/simulationStore'

function buildPolyline(values: number[], width: number, height: number) {
  if (values.length === 0) {
    return ''
  }

  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const span = Math.max(1e-6, maximum - minimum)

  return values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * width
      const y = height - ((value - minimum) / span) * height
      return `${x},${y}`
    })
    .join(' ')
}

function GridLines({
  width,
  height,
  x,
  y,
}: {
  width: number
  height: number
  x: number
  y: number
}) {
  const horizontal = [0, 0.25, 0.5, 0.75, 1]
  const vertical = [0, 0.25, 0.5, 0.75, 1]

  return (
    <g transform={`translate(${x} ${y})`}>
      {horizontal.map((value) => (
        <line
          className="chart__grid"
          key={`h-${value}`}
          x1={0}
          x2={width}
          y1={height * value}
          y2={height * value}
        />
      ))}
      {vertical.map((value) => (
        <line
          className="chart__grid"
          key={`v-${value}`}
          x1={width * value}
          x2={width * value}
          y1={0}
          y2={height}
        />
      ))}
      <line className="chart__axis" x1={0} x2={width} y1={height} y2={height} />
      <line className="chart__axis" x1={0} x2={0} y1={0} y2={height} />
    </g>
  )
}

export function TimelinePanel() {
  const showWorldline = useSimulationStore((state) => state.showWorldline)
  const trajectory = useSimulationStore((state) => state.trajectory)

  if (!showWorldline || trajectory.length < 3) {
    return null
  }

  const recent = trajectory.slice(-120)
  const proper = recent.map((point) => point.properTimeSeconds)
  const distant = recent.map((point) => point.distantTimeSeconds)
  const radius = recent.map((point) => point.radiusRs)
  const mapPoints = recent
    .map((point) => {
      const x = 116 + point.x * 8
      const y = 116 + point.z * 8
      return `${x},${y}`
    })
    .join(' ')

  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Worldline and trajectory</h2>
        <span>
          The worldline view tracks how the observer’s clock accumulates along
          its path. The trajectory map shows where the observer moved in the
          equatorial plane around the black hole.
        </span>
      </div>

      <div className="chart-grid">
        <article className="chart-card">
          <div className="chart-head">
            <strong>Clock accumulation</strong>
            <span>Observer proper time against remote coordinate time</span>
          </div>
          <svg className="chart" viewBox="0 0 280 150">
            <GridLines height={100} width={244} x={24} y={28} />
            <text x="28" y="18">proper time vs distant time</text>
            <text x="14" y="82" transform="rotate(-90 14 82)">
              time (s)
            </text>
            <text textAnchor="end" x="264" y="144">history</text>
            <polyline
              className="chart__line chart__line--primary"
              points={buildPolyline(proper, 244, 100)}
              transform="translate(24 28)"
            />
            <polyline
              className="chart__line chart__line--secondary"
              points={buildPolyline(distant, 244, 100)}
              transform="translate(24 28)"
            />
          </svg>
          <div className="chart-legend">
            <span><i className="chart-swatch" style={{ background: '#79d3ff' }} /> proper time</span>
            <span><i className="chart-swatch" style={{ background: '#ffbe73' }} /> distant observer time</span>
          </div>
          <div className="axis-note">
            <strong>Axes</strong>
            <span>x-axis: recent simulation history</span>
            <span>y-axis: accumulated elapsed time in seconds</span>
          </div>
        </article>

        <article className="chart-card">
          <div className="chart-head">
            <strong>Radius history</strong>
            <span>How close the observer remained to the black hole over recent steps</span>
          </div>
          <svg className="chart" viewBox="0 0 280 150">
            <GridLines height={100} width={244} x={24} y={28} />
            <text x="28" y="18">radial position</text>
            <text x="14" y="82" transform="rotate(-90 14 82)">
              radius (Rs)
            </text>
            <text textAnchor="end" x="264" y="144">history</text>
            <polyline
              className="chart__line chart__line--warm"
              points={buildPolyline(radius, 244, 100)}
              transform="translate(24 28)"
            />
          </svg>
          <div className="chart-legend">
            <span><i className="chart-swatch" style={{ background: '#ff8c59' }} /> orbital radius</span>
          </div>
          <div className="axis-note">
            <strong>Axes</strong>
            <span>x-axis: recent simulation history</span>
            <span>y-axis: radius in Schwarzschild radii</span>
          </div>
        </article>
      </div>

      <article className="chart-card">
        <div className="chart-head">
          <strong>Equatorial trajectory map</strong>
          <span>x-axis and y-axis: position in Rs projected onto the orbital plane</span>
        </div>
        <svg className="orbit-map" viewBox="0 0 232 232">
          <defs>
            <radialGradient id="bhGlow" r="1">
              <stop offset="0%" stopColor="rgba(255,163,75,0.24)" />
              <stop offset="100%" stopColor="rgba(255,163,75,0)" />
            </radialGradient>
          </defs>
          <rect fill="rgba(10,12,20,0.92)" height="232" rx="22" width="232" />
          <g transform="translate(116 116)">
            <circle cx="0" cy="0" fill="url(#bhGlow)" r="74" />
            <line className="chart__grid" x1="-96" x2="96" y1="0" y2="0" />
            <line className="chart__grid" x1="0" x2="0" y1="-96" y2="96" />
            <circle cx="0" cy="0" fill="#06070d" r="24" stroke="#c68a4a" />
            <circle cx="0" cy="0" fill="none" r="36" stroke="#7b542a" strokeDasharray="4 4" />
            <circle cx="0" cy="0" fill="none" r="60" stroke="rgba(121,211,255,0.12)" strokeDasharray="6 6" />
          </g>
          <polyline className="chart__line chart__line--secondary" points={mapPoints} />
          <text x="190" y="118">+x (Rs)</text>
          <text x="120" y="22">+z (Rs)</text>
          <text x="12" y="118">-x</text>
          <text x="110" y="218">-z</text>
        </svg>
        <div className="axis-note">
          <strong>Axes</strong>
          <span>x-axis: projected horizontal position in the orbital plane</span>
          <span>z-axis: projected forward/back position in the orbital plane</span>
        </div>
      </article>

      <div className="axis-note">
        <strong>What this means</strong>
        <span>
          In relativity, a worldline is the history of an object through
          spacetime. Here the plots are a compact educational proxy: they show
          how your path through the simulated orbital plane changes the rate at
          which your proper time diverges from the remote coordinate clock.
        </span>
      </div>
    </section>
  )
}
