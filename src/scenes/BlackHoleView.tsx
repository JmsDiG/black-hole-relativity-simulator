import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import {
  AdditiveBlending,
  BackSide,
  Color,
  DoubleSide,
  Group,
  ShaderMaterial,
  Vector3,
} from 'three'
import {
  EVENT_HORIZON_RS,
  PHOTON_SPHERE_RS,
} from '../core/physics/constants'
import { computeTimeMetrics } from '../core/physics/relativity'
import {
  diskFragmentShader,
  diskVertexShader,
  starfieldFragmentShader,
  starfieldVertexShader,
} from '../core/rendering/shaders'
import { useSimulationStore } from '../state/simulationStore'

const upVector = new Vector3(0, 1, 0)
const radialVector = new Vector3()
const tangentialVector = new Vector3()
const forwardVector = new Vector3()
const rightVector = new Vector3()
const targetVector = new Vector3()
const velocityVector = new Vector3()

interface BlackHoleViewProps {
  view: 'local' | 'distant'
}

function useResolvedObserver(view: 'local' | 'distant') {
  const observer = useSimulationStore((state) => state.observer)

  if (view === 'local') {
    return observer
  }

  return {
    ...observer,
    radiusRs: Math.max(12, observer.radiusRs + 8),
    radialVelocity: 0,
    tangentialVelocity: 0,
    pitch: -0.1,
    yaw: 0,
    fov: 54,
  }
}

function resolveVelocityVector(
  phase: number,
  radialVelocity: number,
  tangentialVelocity: number,
) {
  radialVector.set(Math.cos(phase), 0, Math.sin(phase))
  tangentialVector.set(-Math.sin(phase), 0, Math.cos(phase))

  return velocityVector
    .copy(radialVector)
    .multiplyScalar(radialVelocity)
    .addScaledVector(tangentialVector, tangentialVelocity)
}

function StarfieldShell({
  view,
  cinematicMode,
}: {
  view: 'local' | 'distant'
  cinematicMode: boolean
}) {
  const observer = useResolvedObserver(view)
  const relativityModel = useSimulationStore((state) => state.relativityModel)
  const educationalApproximation = useSimulationStore(
    (state) => state.educationalApproximation,
  )
  const meshRef = useRef<Group>(null)
  const materialRef = useRef<ShaderMaterial>(null)
  const metrics = computeTimeMetrics(observer)
  const velocity = resolveVelocityVector(
    observer.phase,
    observer.radialVelocity,
    observer.tangentialVelocity,
  )

  useFrame(({ camera, clock }) => {
    if (meshRef.current) {
      meshRef.current.position.copy(camera.position)
    }

    if (materialRef.current) {
      materialRef.current.uniforms.uBlackHolePosition.value.set(0, 0, 0)
      materialRef.current.uniforms.uVelocity.value.copy(velocity)
      materialRef.current.uniforms.uGravitationalBlueshift.value =
        metrics.gravitationalBlueshift
      materialRef.current.uniforms.uLensStrength.value =
        observer.radiusRs < 2.5 ? 0.32 : 0.2
      materialRef.current.uniforms.uPhotonSphere.value = PHOTON_SPHERE_RS
      materialRef.current.uniforms.uModelMode.value =
        relativityModel === 'rotating-approx' ? 1 : 0
      materialRef.current.uniforms.uApproxMode.value = educationalApproximation ? 1 : 0
      materialRef.current.uniforms.uTime.value =
        clock.elapsedTime * (cinematicMode ? 1.35 : 1)
    }
  })

  return (
    <group ref={meshRef}>
      <mesh>
        <sphereGeometry args={[90, 64, 64]} />
        <shaderMaterial
          ref={materialRef}
          depthWrite={false}
          fragmentShader={starfieldFragmentShader}
          side={BackSide}
          uniforms={{
            uApproxMode: { value: 0 },
            uBlackHolePosition: { value: new Vector3(0, 0, 0) },
            uGravitationalBlueshift: { value: 1 },
            uLensStrength: { value: 0.2 },
            uModelMode: { value: 0 },
            uPhotonSphere: { value: PHOTON_SPHERE_RS },
            uTime: { value: 0 },
            uVelocity: { value: new Vector3() },
          }}
          vertexShader={starfieldVertexShader}
        />
      </mesh>
    </group>
  )
}

function AccretionDisk({ view }: { view: 'local' | 'distant' }) {
  const observer = useResolvedObserver(view)
  const relativityModel = useSimulationStore((state) => state.relativityModel)
  const materialRef = useRef<ShaderMaterial>(null)
  const metrics = computeTimeMetrics(observer)
  const velocity = resolveVelocityVector(
    observer.phase,
    observer.radialVelocity,
    observer.tangentialVelocity,
  )

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.elapsedTime
      materialRef.current.uniforms.uVelocity.value.copy(velocity)
      materialRef.current.uniforms.uGravitationalBlueshift.value =
        metrics.gravitationalBlueshift
      materialRef.current.uniforms.uModelMode.value =
        relativityModel === 'rotating-approx' ? 1 : 0
    }
  })

  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh>
        <ringGeometry args={[1.18, 5.4, 240]} />
        <shaderMaterial
          ref={materialRef}
          blending={AdditiveBlending}
          depthWrite={false}
          fragmentShader={diskFragmentShader}
          side={DoubleSide}
          transparent
          uniforms={{
            uGravitationalBlueshift: { value: 1 },
            uModelMode: { value: 0 },
            uTime: { value: 0 },
            uVelocity: { value: new Vector3() },
          }}
          vertexShader={diskVertexShader}
        />
      </mesh>
      <mesh>
        <ringGeometry args={[1.12, 6, 240]} />
        <meshBasicMaterial
          color={new Color('#ff8f2d')}
          opacity={0.12}
          side={DoubleSide}
          transparent
        />
      </mesh>
    </group>
  )
}

function TrajectoryLine() {
  const points = useSimulationStore((state) => state.trajectory)
  const showTrail = useSimulationStore((state) => state.showTrail)

  if (!showTrail || points.length < 2) {
    return null
  }

  const positions = new Float32Array(
    points.flatMap((point) => [point.x, point.y, point.z]),
  )

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          args={[positions, 3]}
          attach="attributes-position"
          count={positions.length / 3}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#66d0ff" opacity={0.66} transparent />
    </line>
  )
}

function CaptureCone({ view }: { view: 'local' | 'distant' }) {
  const showCone = useSimulationStore((state) => state.showCone)
  const observer = useResolvedObserver(view)

  if (!showCone || view !== 'distant') {
    return null
  }

  const distance = observer.radiusRs
  const shadowAngle = Math.atan(PHOTON_SPHERE_RS / Math.max(2, distance))
  const radius = Math.tan(shadowAngle) * 4.5

  return (
    <mesh
      position={[Math.cos(observer.phase) * (distance - 2.2), 0, Math.sin(observer.phase) * (distance - 2.2)]}
      rotation={[0, -observer.phase + Math.PI / 2, 0]}
    >
      <coneGeometry args={[radius, 4.5, 42, 1, true]} />
      <meshBasicMaterial color="#ffd49e" opacity={0.08} transparent />
    </mesh>
  )
}

export function BlackHoleView({ view }: BlackHoleViewProps) {
  const tick = useSimulationStore((state) => state.tick)
  const showCone = useSimulationStore((state) => state.showCone)
  const cinematicMode = useSimulationStore((state) => state.cinematicMode)
  const observer = useResolvedObserver(view)

  useFrame(({ camera, clock }, delta) => {
    if (view === 'local') {
      tick(delta)
    }

    const cinematicYaw = cinematicMode ? Math.sin(clock.elapsedTime * 0.16) * 0.18 : 0
    const cinematicLift = cinematicMode ? Math.sin(clock.elapsedTime * 0.24) * 0.06 : 0
    const phase = observer.phase + (view === 'distant' ? 0.3 : 0)

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

  return (
    <>
      <color attach="background" args={['#03020a']} />
      <ambientLight intensity={0.9} />
      <StarfieldShell cinematicMode={cinematicMode} view={view} />
      <AccretionDisk view={view} />
      <mesh>
        <sphereGeometry args={[EVENT_HORIZON_RS, 64, 64]} />
        <meshBasicMaterial color="#020204" />
      </mesh>
      <mesh>
        <sphereGeometry args={[PHOTON_SPHERE_RS, 48, 48]} />
        <meshBasicMaterial color="#f6b05f" opacity={0.11} transparent />
      </mesh>
      <mesh>
        <sphereGeometry args={[PHOTON_SPHERE_RS * 1.05, 48, 48]} />
        <meshBasicMaterial color="#ffcb86" opacity={0.04} transparent />
      </mesh>
      <TrajectoryLine />
      {showCone ? <CaptureCone view={view} /> : null}
    </>
  )
}
