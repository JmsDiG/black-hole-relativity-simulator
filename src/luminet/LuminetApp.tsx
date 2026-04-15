import { Canvas } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { LuminetScene, type LuminetParams } from './LuminetScene'

const DEFAULTS: LuminetParams = {
  mass: 1,
  inclinationDeg: 80,        // edge-on, as in Luminet 1979
  cameraDistance: 30,        // observer at 30 M
  fovDeg: 22,
  diskInner: 6,              // ISCO
  diskOuter: 22,
  exposure: 1.6,
  starDensity: 1,
  diskAnimSpeed: 0.4,
  showSecondary: true,
  paused: false,
}

function readUrlOverrides(base: LuminetParams): LuminetParams {
  const p = new URLSearchParams(window.location.search)
  const num = (key: string, fallback: number) => {
    const v = p.get(key)
    if (v == null) return fallback
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
  }
  const bool = (key: string, fallback: boolean) => {
    const v = p.get(key)
    if (v == null) return fallback
    return v === '1' || v === 'true'
  }
  return {
    mass: num('M', base.mass),
    inclinationDeg: num('inc', base.inclinationDeg),
    cameraDistance: num('dist', base.cameraDistance),
    fovDeg: num('fov', base.fovDeg),
    diskInner: num('rin', base.diskInner),
    diskOuter: num('rout', base.diskOuter),
    exposure: num('exp', base.exposure),
    starDensity: num('stars', base.starDensity),
    diskAnimSpeed: num('anim', base.diskAnimSpeed),
    showSecondary: bool('ghost', base.showSecondary),
    paused: bool('pause', base.paused),
  }
}

export function LuminetApp() {
  const [params, setParams] = useState<LuminetParams>(() =>
    readUrlOverrides(DEFAULTS),
  )
  const [hudOpen, setHudOpen] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // keyboard shortcuts: H = toggle HUD, P = pause, S = save PNG
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') setHudOpen((v) => !v)
      if (e.key === 'p' || e.key === 'P')
        setParams((s) => ({ ...s, paused: !s.paused }))
      if (e.key === 's' || e.key === 'S') downloadPng()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const downloadPng = () => {
    const c = canvasRef.current
    if (!c) return
    const url = c.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `luminet-bh-${Date.now()}.png`
    a.click()
  }

  const update = <K extends keyof LuminetParams>(k: K, v: LuminetParams[K]) =>
    setParams((s) => ({ ...s, [k]: v }))

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000' }}>
      <Canvas
        camera={{ position: [0, 0, 1] }}
        dpr={[1, 2]}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        onCreated={({ gl }) => {
          canvasRef.current = gl.domElement
        }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <LuminetScene params={params} />
      </Canvas>

      {hudOpen && (
        <div style={hudStyle}>
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>
            Luminet 1979 — Schwarzschild BH
          </div>
          <Slider
            label="Mass M"
            value={params.mass}
            min={0.2}
            max={4}
            step={0.05}
            onChange={(v) => update('mass', v)}
          />
          <Slider
            label="Inclination °"
            value={params.inclinationDeg}
            min={0}
            max={89}
            step={1}
            onChange={(v) => update('inclinationDeg', v)}
          />
          <Slider
            label="Distance (M)"
            value={params.cameraDistance}
            min={10}
            max={200}
            step={1}
            onChange={(v) => update('cameraDistance', v)}
          />
          <Slider
            label="FOV °"
            value={params.fovDeg}
            min={5}
            max={60}
            step={1}
            onChange={(v) => update('fovDeg', v)}
          />
          <Slider
            label="Disk inner (M)"
            value={params.diskInner}
            min={3}
            max={20}
            step={0.5}
            onChange={(v) => update('diskInner', v)}
          />
          <Slider
            label="Disk outer (M)"
            value={params.diskOuter}
            min={6}
            max={60}
            step={0.5}
            onChange={(v) => update('diskOuter', v)}
          />
          <Slider
            label="Exposure"
            value={params.exposure}
            min={0.2}
            max={5}
            step={0.05}
            onChange={(v) => update('exposure', v)}
          />
          <Slider
            label="Star density"
            value={params.starDensity}
            min={0}
            max={3}
            step={0.05}
            onChange={(v) => update('starDensity', v)}
          />
          <Slider
            label="Disk anim"
            value={params.diskAnimSpeed}
            min={0}
            max={3}
            step={0.05}
            onChange={(v) => update('diskAnimSpeed', v)}
          />
          <label style={rowStyle}>
            <input
              type="checkbox"
              checked={params.showSecondary}
              onChange={(e) => update('showSecondary', e.target.checked)}
            />
            <span>Render ghost (secondary) image</span>
          </label>
          <label style={rowStyle}>
            <input
              type="checkbox"
              checked={params.paused}
              onChange={(e) => update('paused', e.target.checked)}
            />
            <span>Pause animation (P)</span>
          </label>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button onClick={downloadPng} style={btnStyle} type="button">
              Save PNG (S)
            </button>
            <button
              onClick={() => setParams(DEFAULTS)}
              style={btnStyle}
              type="button"
            >
              Reset
            </button>
            <button
              onClick={() => setHudOpen(false)}
              style={btnStyle}
              type="button"
            >
              Hide (H)
            </button>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, opacity: 0.65 }}>
            Schwarzschild geodesics, RK4 integration. Critical impact
            parameter b<sub>crit</sub> = 3√3·M ≈ 5.196 M.
          </div>
        </div>
      )}
      {!hudOpen && (
        <button
          onClick={() => setHudOpen(true)}
          style={{ ...btnStyle, position: 'fixed', top: 12, right: 12 }}
          type="button"
        >
          Show controls (H)
        </button>
      )}
    </div>
  )
}

const hudStyle: React.CSSProperties = {
  position: 'fixed',
  top: 12,
  right: 12,
  width: 280,
  padding: 14,
  background: 'rgba(8, 10, 18, 0.78)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 10,
  color: '#e6ecf5',
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  fontSize: 12,
  backdropFilter: 'blur(6px)',
  zIndex: 10,
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  margin: '4px 0',
  fontSize: 12,
}

const btnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  color: '#e6ecf5',
  border: '1px solid rgba(255,255,255,0.18)',
  borderRadius: 6,
  padding: '5px 9px',
  fontSize: 11,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div style={{ margin: '6px 0' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          opacity: 0.85,
        }}
      >
        <span>{label}</span>
        <span>{value.toFixed(2)}</span>
      </div>
      <input
        max={max}
        min={min}
        onChange={(e) => onChange(Number(e.target.value))}
        step={step}
        style={{ width: '100%' }}
        type="range"
        value={value}
      />
    </div>
  )
}
