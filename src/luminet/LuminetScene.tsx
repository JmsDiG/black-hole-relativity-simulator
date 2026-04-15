import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { ShaderMaterial, Vector2 } from 'three'
import { luminetFragmentShader, luminetVertexShader } from './luminetShaders'

export interface LuminetParams {
  mass: number
  inclinationDeg: number
  cameraDistance: number
  fovDeg: number
  diskInner: number
  diskOuter: number
  exposure: number
  starDensity: number
  diskAnimSpeed: number
  showSecondary: boolean
  paused: boolean
}

interface LuminetSceneProps {
  params: LuminetParams
}

/**
 * Full-screen quad that runs the Luminet ray-tracing shader.
 * No 3D geometry is needed — the entire image is computed per-pixel from the
 * observer parameters.
 */
export function LuminetScene({ params }: LuminetSceneProps) {
  const matRef = useRef<ShaderMaterial>(null)
  const { size } = useThree()

  const uniforms = useMemo(
    () => ({
      uResolution: { value: new Vector2(size.width, size.height) },
      uTime: { value: 0 },
      uMass: { value: params.mass },
      uInclination: { value: (params.inclinationDeg * Math.PI) / 180 },
      uCameraDistance: { value: params.cameraDistance },
      uFovY: { value: (params.fovDeg * Math.PI) / 180 },
      uDiskInner: { value: params.diskInner },
      uDiskOuter: { value: params.diskOuter },
      uExposure: { value: params.exposure },
      uStarDensity: { value: params.starDensity },
      uDiskAnimSpeed: { value: params.diskAnimSpeed },
      uShowSecondary: { value: params.showSecondary ? 1 : 0 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useFrame((state, delta) => {
    const m = matRef.current
    if (!m) return
    const u = m.uniforms
    if (!params.paused) {
      u.uTime.value += delta
    }
    u.uResolution.value.set(state.size.width, state.size.height)
    u.uMass.value = params.mass
    u.uInclination.value = (params.inclinationDeg * Math.PI) / 180
    u.uCameraDistance.value = params.cameraDistance
    u.uFovY.value = (params.fovDeg * Math.PI) / 180
    u.uDiskInner.value = params.diskInner
    u.uDiskOuter.value = params.diskOuter
    u.uExposure.value = params.exposure
    u.uStarDensity.value = params.starDensity
    u.uDiskAnimSpeed.value = params.diskAnimSpeed
    u.uShowSecondary.value = params.showSecondary ? 1 : 0
  })

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        depthTest={false}
        depthWrite={false}
        fragmentShader={luminetFragmentShader}
        uniforms={uniforms}
        vertexShader={luminetVertexShader}
      />
    </mesh>
  )
}
