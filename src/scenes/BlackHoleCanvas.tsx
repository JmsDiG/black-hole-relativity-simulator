import { Canvas } from '@react-three/fiber'
import { BlackHoleView } from './BlackHoleView'
import { LuminetLocalView } from './LuminetLocalView'

interface BlackHoleCanvasProps {
  view: 'local' | 'distant'
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void
}

/**
 * The local view uses the new Luminet-style renderer (see LuminetLocalView).
 * The distant view keeps the original BlackHoleView — untouched from main,
 * so every other panel / window in the app behaves exactly as before.
 */
export function BlackHoleCanvas({
  view,
  onCanvasReady,
}: BlackHoleCanvasProps) {
  return (
    <Canvas
      camera={{ fov: 72, near: 0.01, far: 240 }}
      dpr={[1, 2]}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      onCreated={({ gl }) => {
        if (onCanvasReady) {
          onCanvasReady(gl.domElement)
        }
      }}
    >
      {view === 'local' ? <LuminetLocalView /> : <BlackHoleView view={view} />}
    </Canvas>
  )
}
