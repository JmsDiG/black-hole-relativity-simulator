import { EVENT_HORIZON_RS, ISCO_RS, PHOTON_SPHERE_RS } from '../core/physics/constants'
import type { ObserverState, TimeMetrics } from '../core/physics/types'

interface HeroAccentProps {
  metrics: TimeMetrics
  metricModelLabel: string
  observedModelLabel: string
  observer: ObserverState
}

export function HeroAccent({
  metrics,
  metricModelLabel,
  observedModelLabel,
  observer,
}: HeroAccentProps) {
  const center = 92
  const radiusScale = 15
  const observerX = center + Math.cos(observer.phase) * observer.radiusRs * radiusScale
  const observerY = center + Math.sin(observer.phase) * observer.radiusRs * radiusScale
  const normalizedRadius = Math.min(1, observer.radiusRs / 12)
  const ribbonValues = [
    {
      label: 'lensing',
      value: Math.min(1, 1.7 / observer.radiusRs),
      tone: 'var(--tone-gold)',
    },
    {
      label: 'doppler',
      value: Math.min(1, metrics.beta / 0.9),
      tone: 'var(--tone-cyan)',
    },
    {
      label: 'time dilation',
      value: Math.min(1, (metrics.slowdownFactor - 1) / 4),
      tone: 'var(--tone-coral)',
    },
  ]

  return (
    <article className="hero-accent">
      <div className="hero-accent__head">
        <div>
          <span>Live scientific accent</span>
          <strong>{observedModelLabel}</strong>
        </div>
        <div className="hero-accent__badge">{metricModelLabel}</div>
      </div>

      <div className="hero-accent__body">
        <div className="hero-orbit">
          <svg className="hero-orbit__svg" viewBox="0 0 184 184">
            <defs>
              <radialGradient id="heroBlackGlow" r="1">
                <stop offset="0%" stopColor="rgba(255, 163, 79, 0.24)" />
                <stop offset="100%" stopColor="rgba(255, 163, 79, 0)" />
              </radialGradient>
            </defs>
            <circle cx={center} cy={center} fill="url(#heroBlackGlow)" r="64" />
            <circle className="hero-orbit__grid" cx={center} cy={center} fill="none" r={PHOTON_SPHERE_RS * radiusScale} />
            <circle className="hero-orbit__grid" cx={center} cy={center} fill="none" r={ISCO_RS * radiusScale} />
            <circle className="hero-orbit__grid hero-orbit__grid--soft" cx={center} cy={center} fill="none" r={8 * radiusScale} />
            <circle className="hero-orbit__hole" cx={center} cy={center} r={EVENT_HORIZON_RS * radiusScale} />
            <path
              className="hero-orbit__arc"
              d={`M ${center - 52} ${center - 36} Q ${center} ${center - 74} ${center + 52} ${center - 36}`}
            />
            <circle className="hero-orbit__observer" cx={observerX} cy={observerY} r={6.2} />
            <line
              className="hero-orbit__vector"
              x1={observerX}
              x2={center + (observerX - center) * (1 - normalizedRadius * 0.28)}
              y1={observerY}
              y2={center + (observerY - center) * (1 - normalizedRadius * 0.28)}
            />
          </svg>
          <div className="hero-orbit__legend">
            <span><i className="chart-swatch" style={{ background: 'var(--tone-gold)' }} /> photon sphere</span>
            <span><i className="chart-swatch" style={{ background: 'var(--tone-cyan)' }} /> observer</span>
          </div>
        </div>

        <div className="hero-ribbon">
          {ribbonValues.map((item) => (
            <div className="hero-ribbon__row" key={item.label}>
              <div className="hero-ribbon__meta">
                <span>{item.label}</span>
                <strong>{Math.round(item.value * 100)}%</strong>
              </div>
              <div className="hero-ribbon__track">
                <div
                  className="hero-ribbon__fill"
                  style={{
                    background: item.tone,
                    width: `${Math.max(9, item.value * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}

          <div className="hero-ribbon__stats">
            <div>
              <span>observer speed</span>
              <strong>{metrics.beta.toFixed(3)} c</strong>
            </div>
            <div>
              <span>clock ratio</span>
              <strong>{metrics.properTimeRate.toFixed(3)}</strong>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
