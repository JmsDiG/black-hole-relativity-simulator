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
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Group,
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
  nebulaFragmentShader,
  nebulaVertexShader,
  starDotFragmentShader,
  starDotVertexShader,
} from '../core/rendering/luminetShaders'
import {
  buildStarCatalog,
  lensStarDirection,
} from '../core/rendering/luminetStars'
import { useSimulationStore } from '../state/simulationStore'
import { OBSERVED_BLACK_HOLES } from '../ui/observedBlackHoles'

const STAR_COUNT = 2500
const STAR_DISTANCE = 180 // stars placed at this distance for the 3D scene
const M_IN_SCENE_UNITS = EVENT_HORIZON_RS / 2 // M = Rs/2 (Rs=1 → M=0.5)

// Defaults used when no observed-BH preset is selected ("custom" mode).
const DEFAULT_DISK_OUTER_RS = 10
const DEFAULT_DISK_BRIGHTNESS = 1.0
const DEFAULT_INCLINATION_DEG = 88 // near edge-on, like Luminet 1979

interface LuminetVisualParams {
  inclinationDeg: number
  diskOuterRs: number
  diskBrightness: number
}

function useLuminetVisualParams(): LuminetVisualParams {
  const observedModelId = useSimulationStore((s) => s.observedModelId)
  const model = OBSERVED_BLACK_HOLES.find((m) => m.id === observedModelId)
  return {
    inclinationDeg: model?.inclinationDeg ?? DEFAULT_INCLINATION_DEG,
    diskOuterRs: model?.diskOuterRs ?? DEFAULT_DISK_OUTER_RS,
    diskBrightness: model?.diskBrightness ?? DEFAULT_DISK_BRIGHTNESS,
  }
}

// --- scratch vectors (avoid per-frame allocation) ---
const tmpCam = new Vector3()
const tmpLensed = new Vector3()
const tmpInvVP = new Matrix4()
const tmpVP = new Matrix4()

/**
 * <NebulaShell /> — large back-side sphere with a procedural noise shader
 * that paints very faint colour clouds on the sky. Renders behind the
 * star points and the BH quad. Pinned to the camera so it never moves.
 */
function NebulaShell() {
  const groupRef = useRef<Group>(null)
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: nebulaVertexShader,
        fragmentShader: nebulaFragmentShader,
        side: BackSide,
        depthWrite: false,
        depthTest: false,
      }),
    [],
  )

  useFrame(({ camera }) => {
    if (groupRef.current) {
      groupRef.current.position.copy(camera.position)
    }
  })

  return (
    <group ref={groupRef} renderOrder={-10}>
      <mesh material={material}>
        <sphereGeometry args={[STAR_DISTANCE * 1.4, 32, 24]} />
      </mesh>
    </group>
  )
}

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
function BlackHoleQuad({ visual }: { visual: LuminetVisualParams }) {
  const matRef = useRef<ShaderMaterial>(null)

  const uniforms = useMemo(
    () => ({
      uInvViewProj: { value: new Matrix4() },
      uCamPos: { value: new Vector3() },
      uMass: { value: M_IN_SCENE_UNITS },
      uDiskInner: { value: ISCO_RS },
      uDiskOuter: { value: visual.diskOuterRs },
      uTime: { value: 0 },
      uDopplerGain: { value: 0.85 },
      uDiskBrightness: { value: visual.diskBrightness },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // live-update visual params so preset switches re-render immediately
    m.uniforms.uDiskOuter.value = visual.diskOuterRs
    m.uniforms.uDiskBrightness.value = visual.diskBrightness
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

function LocalCameraRig({ visual }: { visual: LuminetVisualParams }) {
  const tick = useSimulationStore((s) => s.tick)
  const cinematicMode = useSimulationStore((s) => s.cinematicMode)
  const observer = useSimulationStore((s) => s.observer)

  useFrame(({ camera, clock }, delta) => {
    // Advance the simulation physics (LOCAL view is the authoritative one).
    tick(delta)

    const cinematicYaw = cinematicMode ? Math.sin(clock.elapsedTime * 0.16) * 0.18 : 0
    const cinematicLift = cinematicMode ? Math.sin(clock.elapsedTime * 0.24) * 0.06 : 0
    const phase = observer.phase

    // Inclination from selected real-BH preset:
    //   90° = edge-on (in disk plane), 0° = face-on (above pole).
    // For "custom" / no preset we use DEFAULT_INCLINATION_DEG (≈ edge-on).
    const incRad = (visual.inclinationDeg * Math.PI) / 180
    const horizDist = observer.radiusRs * Math.sin(incRad)
    const liftY = observer.radiusRs * Math.cos(incRad)

    radialVector.set(Math.cos(phase), 0, Math.sin(phase))
    tangentialVector.set(-Math.sin(phase), 0, Math.cos(phase))

    camera.position.set(
      radialVector.x * horizDist,
      liftY + cinematicLift,
      radialVector.z * horizDist,
    )

    // Look back toward the BH at the origin (with yaw/pitch slider offsets).
    forwardVector.copy(camera.position).multiplyScalar(-1).normalize()
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
  const visual = useLuminetVisualParams()
  return (
    <>
      {/* Base background is black; the NebulaShell lifts it subtly. */}
      <color args={['#000000']} attach="background" />
      <LocalCameraRig visual={visual} />
      <NebulaShell />
      <LensedStars />
      <BlackHoleQuad visual={visual} />
    </>
  )
}
