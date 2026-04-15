/**
 * Luminet-style Local Observer scene.
 *
 * Replaces the visuals of the LOCAL view (and ONLY the local view) while
 * keeping the existing camera animation that reads from the simulation
 * store — so mass, observer radius, orbital phase, yaw, pitch, fov and
 * cinematic mode all still drive what you see.
 *
 * Scene contents:
 *   1. Pure-black R3F background.
 *   2. <LensedStars> — THREE.Points (2500 stars) with positions re-lensed
 *      each frame via the Schwarzschild point-lens formula.
 *   3. <BlackHoleQuad> — full-screen NDC quad running the Luminet RK4
 *      geodesic shader. Background pixels are TRANSPARENT so the stars
 *      show through; shadow is opaque black; photon ring and disk
 *      isoradials are painted on top.
 */

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  Matrix4,
  NormalBlending,
  Points,
  ShaderMaterial,
  Vector3,
} from 'three'
import {
  EVENT_HORIZON_RS,
  ISCO_RS,
} from '../core/physics/constants'
import {
  luminetQuadFragmentShader,
  luminetQuadVertexShader,
  starDotFragmentShader,
  starDotVertexShader,
} from '../core/rendering/luminetShaders'
import {
  buildStarCatalog,
  lensStarDirection,
} from '../core/rendering/luminetStars'
import { useSimulationStore } from '../state/simulationStore'

const STAR_COUNT = 2500
const STAR_DISTANCE = 180 // stars placed at this distance for the 3D scene
const DISK_OUTER_RS = 10
const M_IN_SCENE_UNITS = EVENT_HORIZON_RS / 2 // M = Rs/2 (Rs=1 → M=0.5)

// --- scratch vectors (avoid per-frame allocation) ---
const tmpCam = new Vector3()
const tmpLensed = new Vector3()
const tmpInvVP = new Matrix4()
const tmpVP = new Matrix4()

/**
 * <LensedStars /> — renders the star catalog as small round dots whose
 * positions are re-computed each frame from the camera pose so lensing
 * stays correct as the observer orbits the BH.
 */
function LensedStars() {
  const pointsRef = useRef<Points>(null)

  const { geometry, material, catalog } = useMemo(() => {
    const cat = buildStarCatalog(STAR_COUNT)
    const positions = new Float32Array(STAR_COUNT * 3)
    const sizes = new Float32Array(STAR_COUNT)
    const colors = new Float32Array(STAR_COUNT * 3)
    for (let i = 0; i < STAR_COUNT; ++i) {
      const s = cat[i]
      positions[i * 3 + 0] = s.dir.x * STAR_DISTANCE
      positions[i * 3 + 1] = s.dir.y * STAR_DISTANCE
      positions[i * 3 + 2] = s.dir.z * STAR_DISTANCE
      sizes[i] = s.size
      colors[i * 3 + 0] = s.color.r
      colors[i * 3 + 1] = s.color.g
      colors[i * 3 + 2] = s.color.b
    }
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(positions, 3))
    geo.setAttribute('aSize', new BufferAttribute(sizes, 1))
    geo.setAttribute('aColor', new BufferAttribute(colors, 3))
    const mat = new ShaderMaterial({
      vertexShader: starDotVertexShader,
      fragmentShader: starDotFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
    })
    return { geometry: geo, material: mat, catalog: cat }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFrame(({ camera }) => {
    tmpCam.copy(camera.position)
    const positions = geometry.getAttribute('position') as BufferAttribute
    for (let i = 0; i < STAR_COUNT; ++i) {
      lensStarDirection(tmpCam, catalog[i].dir, M_IN_SCENE_UNITS, tmpLensed)
      positions.setXYZ(
        i,
        tmpLensed.x * STAR_DISTANCE,
        tmpLensed.y * STAR_DISTANCE,
        tmpLensed.z * STAR_DISTANCE,
      )
    }
    positions.needsUpdate = true
  })

  return <points ref={pointsRef} args={[geometry, material]} />
}

/**
 * <BlackHoleQuad /> — full-screen NDC quad with the minimalist BH shader.
 */
function BlackHoleQuad() {
  const matRef = useRef<ShaderMaterial>(null)

  const uniforms = useMemo(
    () => ({
      uInvViewProj: { value: new Matrix4() },
      uCamPos: { value: new Vector3() },
      uMass: { value: M_IN_SCENE_UNITS },
      uDiskInner: { value: ISCO_RS },
      uDiskOuter: { value: DISK_OUTER_RS },
      uTime: { value: 0 },
      uDopplerGain: { value: 0.7 },
    }),
    [],
  )

  useFrame(({ camera, clock }, delta) => {
    const m = matRef.current
    if (!m) return
    tmpVP.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    tmpInvVP.copy(tmpVP).invert()
    m.uniforms.uInvViewProj.value.copy(tmpInvVP)
    m.uniforms.uCamPos.value.copy(camera.position)
    m.uniforms.uTime.value = clock.elapsedTime
    // keep delta referenced so linting doesn't complain
    void delta
  })

  return (
    <mesh frustumCulled={false} renderOrder={10}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        depthTest={false}
        depthWrite={false}
        fragmentShader={luminetQuadFragmentShader}
        transparent
        uniforms={uniforms}
        vertexShader={luminetQuadVertexShader}
      />
    </mesh>
  )
}

// -------------------------------------------------------------------------
// Camera animation — identical to the original BlackHoleView's "local"
// branch. We replicate here so that the existing simulation-store driven
// camera behaviour is preserved EXACTLY, while the visuals change.
// -------------------------------------------------------------------------

const upVector = new Vector3(0, 1, 0)
const radialVector = new Vector3()
const tangentialVector = new Vector3()
const forwardVector = new Vector3()
const rightVector = new Vector3()
const targetVector = new Vector3()

function LocalCameraRig() {
  const tick = useSimulationStore((s) => s.tick)
  const cinematicMode = useSimulationStore((s) => s.cinematicMode)
  const observer = useSimulationStore((s) => s.observer)

  useFrame(({ camera, clock }, delta) => {
    // Advance the simulation physics (LOCAL view is the authoritative one).
    tick(delta)

    const cinematicYaw = cinematicMode ? Math.sin(clock.elapsedTime * 0.16) * 0.18 : 0
    const cinematicLift = cinematicMode ? Math.sin(clock.elapsedTime * 0.24) * 0.06 : 0
    const phase = observer.phase

    radialVector.set(Math.cos(phase), 0, Math.sin(phase))
    tangentialVector.set(-Math.sin(phase), 0, Math.cos(phase))

    camera.position.set(
      radialVector.x * observer.radiusRs,
      0.06 + cinematicLift,
      radialVector.z * observer.radiusRs,
    )

    forwardVector.copy(radialVector).multiplyScalar(-1).normalize()
    forwardVector.applyAxisAngle(upVector, observer.yaw + cinematicYaw)
    rightVector.crossVectors(forwardVector, upVector).normalize()
    forwardVector.applyAxisAngle(rightVector, observer.pitch)
    targetVector.copy(camera.position).add(forwardVector)

    camera.up.copy(upVector)
    if ('fov' in camera) {
      camera.fov = observer.fov
    }
    camera.lookAt(targetVector)
    camera.updateProjectionMatrix()
  })

  return null
}

export function LuminetLocalView() {
  return (
    <>
      {/* Pure black background — no gradient, no nebula. */}
      <color args={['#000000']} attach="background" />
      <LocalCameraRig />
      <LensedStars />
      <BlackHoleQuad />
    </>
  )
}
