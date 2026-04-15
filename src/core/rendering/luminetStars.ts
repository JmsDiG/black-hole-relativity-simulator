/**
 * Static star catalog for the Luminet-style Local Observer render.
 *
 * Stars are fixed on the celestial sphere (seeded random directions).
 * For each frame we recompute their APPARENT direction from the observer
 * using the Schwarzschild point-lens equation (source at infinity):
 *
 *   β = θ − θ_E² / θ        (β: true offset from BH, θ: apparent)
 *   θ_E² = 4 M / D_observer  (Einstein angle squared, source at infinity)
 *
 * We render the primary image only (θ = (β + √(β² + 4 θ_E²)) / 2).
 *
 * Stars are drawn as THREE.Points with a round sprite texture. No bloom,
 * no colour halos. Size encodes brightness (1–4 px). Colour is white with
 * a very mild blue tint for the brightest ~5%.
 */

import { Color, Vector3 } from 'three'

export interface StarCatalogEntry {
  /** Unit direction from observer to star on the celestial sphere. */
  dir: Vector3
  /** Apparent magnitude proxy in [0,1] — 0 = faint, 1 = bright. */
  brightness: number
  /** Pixel size (1..4). */
  size: number
  /** Color (r,g,b in 0..1). White for most, slight blue for brightest. */
  color: Color
}

/**
 * Mulberry32 — small, seed-stable PRNG. We want the catalog to be the
 * same every run.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Uniform random unit vector (equal-area sphere sampling). */
function randomUnitVector(rand: () => number, out: Vector3): Vector3 {
  const z = 2 * rand() - 1
  const phi = 2 * Math.PI * rand()
  const r = Math.sqrt(Math.max(0, 1 - z * z))
  out.set(r * Math.cos(phi), z, r * Math.sin(phi))
  return out
}

export function buildStarCatalog(count = 2500, seed = 0x5eed1979): StarCatalogEntry[] {
  const rand = mulberry32(seed)
  const stars: StarCatalogEntry[] = new Array(count)

  for (let i = 0; i < count; ++i) {
    const dir = randomUnitVector(rand, new Vector3())

    // Power-law magnitude distribution — most stars dim, few bright.
    // brightness in [0, 1], heavily weighted to 0.
    const u = rand()
    const brightness = Math.pow(u, 6)

    // Pixel size 1..4 depending on brightness (discrete-ish curve).
    const size =
      brightness < 0.08 ? 1 : brightness < 0.4 ? 1.6 : brightness < 0.8 ? 2.6 : 3.6

    // Mostly pure white. Faintest ~5% get a faint blue tint.
    const color = new Color(1, 1, 1)
    if (brightness > 0.82) {
      // slight blue tint for the brightest ones
      color.setRGB(0.88, 0.93, 1.0)
    }

    stars[i] = { dir, brightness, size, color }
  }

  return stars
}

/**
 * Apply Schwarzschild lensing (source at infinity, primary image) to a
 * single star direction and return the new apparent direction.
 *
 * Inputs:
 *   cameraPos : observer position in world units (same units used for M)
 *   starDir   : true direction of the star on the celestial sphere (unit)
 *   M         : BH mass in the SAME length units as cameraPos
 *   out       : Vector3 receiver
 * Returns: unit vector, apparent direction on the sky.
 *
 * Special case: if the star is closer than ~3·θ_E from the anti-BH
 * direction (very strong lensing / shadow region), we pull it outward
 * to θ_E (Einstein ring) — avoids NaN and keeps visuals stable.
 */
const tmpN = new Vector3()
const tmpT = new Vector3()

export function lensStarDirection(
  cameraPos: Vector3,
  starDir: Vector3,
  M: number,
  out: Vector3,
): Vector3 {
  const D = cameraPos.length()
  if (D < 1e-6 || M <= 0) {
    return out.copy(starDir)
  }

  // BH direction on observer's sky:
  tmpN.copy(cameraPos).multiplyScalar(-1 / D)

  // β — true angular offset from BH direction.
  const cosBeta = Math.max(-1, Math.min(1, starDir.dot(tmpN)))
  const beta = Math.acos(cosBeta)

  // Einstein angle squared (source at infinity): θ_E² = 4 M / D
  const thetaE2 = (4 * M) / D

  // Primary image angle.
  const theta = 0.5 * (beta + Math.sqrt(beta * beta + 4 * thetaE2))

  // Transverse direction in sky (from BH toward star, tangent to unit sphere).
  tmpT.copy(starDir).addScaledVector(tmpN, -cosBeta) // s - (s·n) n
  const tLen = tmpT.length()
  if (tLen < 1e-8) {
    // star is exactly in/opposite the BH direction — pick arbitrary tangent
    tmpT.set(1, 0, 0).addScaledVector(tmpN, -tmpN.x)
    const fallbackLen = tmpT.length()
    if (fallbackLen < 1e-8) tmpT.set(0, 1, 0)
    else tmpT.multiplyScalar(1 / fallbackLen)
  } else {
    tmpT.multiplyScalar(1 / tLen)
  }

  // new_dir = cos(θ) n + sin(θ) t
  out
    .copy(tmpN)
    .multiplyScalar(Math.cos(theta))
    .addScaledVector(tmpT, Math.sin(theta))

  return out
}
