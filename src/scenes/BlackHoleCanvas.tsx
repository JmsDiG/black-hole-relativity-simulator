import { Canvas } from '@react-three/fiber'
import { BlackHoleView } from './BlackHoleView'

interface BlackHoleCanvasProps {
  view: 'local' | 'distant'
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void
}

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
      <BlackHoleView view={view} />
    </Canvas>
  )
}
