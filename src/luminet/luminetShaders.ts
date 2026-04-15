/**
 * Luminet (1979) style relativistic black hole renderer.
 *
 * Per-pixel ray tracing of a photon in a Schwarzschild geometry:
 *   - Photon orbit equation:  (du/dphi)^2 = 1/b^2 - u^2 + 2 M u^3,    u = 1/r
 *   - Critical impact parameter (photon sphere): b_crit = 3 sqrt(3) M
 *   - Photon orbit lives in the plane defined by the observer position and
 *     the initial ray direction; we integrate u(phi) by RK4.
 *   - Each pixel checks for crossings of the equatorial accretion-disk
 *     plane (y = 0) — the FIRST crossing gives the primary (Luminet "top")
 *     image, the SECOND gives the ghost / secondary image that bends back
 *     under the shadow.
 *   - On the disk we apply Page–Thorne style emissivity F(r) ~ r^-3 *
 *     (1 - sqrt(6M/r)) and the relativistic g-factor for Doppler boost +
 *     gravitational redshift. Surface brightness ∝ g^4 (Liouville).
 *   - Stars are sampled procedurally (hash-based) in the asymptotic photon
 *     direction so the lensing of the background is automatic and exact.
 *
 * The shader is intentionally one self-contained pass so the renderer is
 * easy to inspect and tune; everything lives in this file.
 */

export const luminetVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

export const luminetFragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform vec2  uResolution;
  uniform float uTime;
  uniform float uMass;            // black-hole mass M (geometrized units)
  uniform float uInclination;     // observer polar angle from disk normal (rad)
  uniform float uCameraDistance;  // observer distance r_obs (in M)
  uniform float uFovY;            // vertical field of view (rad)
  uniform float uDiskInner;       // inner disk radius (M), default 6 (ISCO)
  uniform float uDiskOuter;       // outer disk radius (M)
  uniform float uExposure;        // overall brightness multiplier
  uniform float uStarDensity;     // background star density multiplier
  uniform float uDiskAnimSpeed;   // disk swirl animation
  uniform float uShowSecondary;   // 1.0 = render ghost image, 0.0 = primary only

  const float PI    = 3.14159265359;
  const float TAU   = 6.28318530718;
  const float SQRT3 = 1.73205080757;

  // -------------------------------------------------------------------------
  // Hashing (high-quality scalar hashes used everywhere — stars, IMF roll,
  // glow noise — so the procedural sky is reproducible across frames).
  // -------------------------------------------------------------------------
  float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
  }
  float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
  }

  // -------------------------------------------------------------------------
  // Approximate stellar-class color from a 0..1 random number.
  // Weights roughly follow IMF: lots of M dwarfs (red), few O/B (blue).
  //   M (~76%), K (~12%), G (~7%), F (~3%), A (~0.6%), B (~0.13%), O (~3e-5)
  // We bias bright stars to be more frequently OBA so they pop visually.
  // -------------------------------------------------------------------------
  vec3 stellarColor(float t, float brightnessBoost) {
    // shift bright stars toward hot end
    float shifted = clamp(t - brightnessBoost * 0.55, 0.0, 1.0);
    if (shifted < 0.76)      return vec3(1.00, 0.62, 0.42); // M red dwarf
    if (shifted < 0.88)      return vec3(1.00, 0.78, 0.55); // K orange
    if (shifted < 0.95)      return vec3(1.00, 0.93, 0.78); // G yellow (Sun)
    if (shifted < 0.985)     return vec3(0.97, 0.97, 0.95); // F white
    if (shifted < 0.996)     return vec3(0.85, 0.90, 1.00); // A blue-white
    if (shifted < 0.9995)    return vec3(0.70, 0.80, 1.00); // B blue
    return vec3(0.55, 0.72, 1.00);                           // O hot blue
  }

  // -------------------------------------------------------------------------
  // Convert 3D direction to (u,v) on a sphere — standard equirect projection.
  // -------------------------------------------------------------------------
  vec2 dirToUV(vec3 d) {
    return vec2(atan(d.z, d.x) / TAU + 0.5,
                asin(clamp(d.y, -1.0, 1.0)) / PI + 0.5);
  }

  // -------------------------------------------------------------------------
  // Procedural star field sampled in the (already lensed) ray direction.
  // Multiple density layers + IMF-weighted color + bloom on bright ones.
  // -------------------------------------------------------------------------
  vec3 sampleStars(vec3 dir) {
    vec2 uv = dirToUV(dir);

    vec3 acc = vec3(0.0);

    // --- dense faint layer ---
    {
      vec2 grid = uv * vec2(900.0, 480.0);
      vec2 cell = floor(grid);
      vec2 local = fract(grid) - 0.5;
      float seed = hash21(cell);
      float typ  = hash21(cell + 7.31);
      // power-law magnitude — most stars dim, few bright
      float bright = pow(seed, 9.0);
      float radial = exp(-dot(local, local) * 80.0);
      vec3 col = stellarColor(typ, bright);
      acc += col * bright * radial * 1.1 * uStarDensity;
    }

    // --- medium layer ---
    {
      vec2 grid = uv * vec2(360.0, 200.0);
      vec2 cell = floor(grid);
      vec2 local = fract(grid) - 0.5;
      float seed = hash21(cell + 13.7);
      float typ  = hash21(cell + 91.2);
      float bright = pow(seed, 7.0);
      float radial = exp(-dot(local, local) * 38.0);
      vec3 col = stellarColor(typ, bright);
      acc += col * bright * radial * 1.5 * uStarDensity;
    }

    // --- bright "named" stars with bloom halo ---
    {
      vec2 grid = uv * vec2(120.0, 70.0);
      vec2 cell = floor(grid);
      vec2 local = fract(grid) - 0.5;
      float seed = hash21(cell + 211.4);
      float pick = step(0.985, seed);          // few cells get a bright star
      if (pick > 0.5) {
        float typ = hash21(cell + 47.7);
        // bright star magnitude (top of distribution)
        float bright = 0.6 + 0.4 * hash21(cell + 333.0);
        vec2  jitter = (hash22(cell + 71.0) - 0.5) * 0.6;
        float r = length(local - jitter);
        // sharp core + soft halo (bloom)
        float core = exp(-r * 90.0);
        float halo = exp(-r * 9.0) * 0.18;
        vec3 col = stellarColor(typ, 0.6);
        acc += col * bright * (core + halo) * uStarDensity;
      }
    }

    // --- subtle "milky way" gradient + nebular dust ---
    float band = exp(-pow((uv.y - 0.5) * 4.5, 2.0));
    float dust = 0.5 + 0.5 * sin(uv.x * 18.0) * cos(uv.y * 11.0 + uv.x * 5.0);
    vec3 nebula = mix(vec3(0.012, 0.018, 0.04),
                     vec3(0.04,  0.025, 0.06),
                     dust);
    acc += nebula * (0.4 + 0.6 * band);

    return acc;
  }

  // -------------------------------------------------------------------------
  // Disk surface emissivity at radius r (in M).
  //   Page–Thorne thin-disk approximation reduced to the radial profile:
  //   F(r) ∝ (1/r^3) * (1 - sqrt(r_isco / r))    for r > r_isco
  // We then add a thermal color ramp (hot blue-white inside, cool orange
  // outside) + procedural turbulence so the disk doesn't look perfectly
  // smooth.
  // -------------------------------------------------------------------------
  vec3 diskColor(float r, float phi) {
    float rIn = uDiskInner;
    float rOut = uDiskOuter;
    if (r < rIn || r > rOut) return vec3(0.0);

    float t = clamp((r - rIn) / (rOut - rIn), 0.0, 1.0);

    // thermal palette: hot inner -> cool outer
    vec3 hot   = vec3(1.10, 1.00, 0.95);
    vec3 mid   = vec3(1.00, 0.78, 0.46);
    vec3 cool  = vec3(0.85, 0.32, 0.10);
    vec3 base  = mix(hot, mid, smoothstep(0.0, 0.35, t));
    base       = mix(base, cool, smoothstep(0.35, 1.0, t));

    // emissivity F(r)
    float emis = (1.0 - sqrt(rIn / r)) / (r * r * r);
    emis = max(emis, 0.0);

    // turbulence / spiral lanes (animated)
    float spiral = 0.5 + 0.5 * sin(phi * 7.0 - log(r) * 8.0
                                  + uTime * uDiskAnimSpeed);
    float fine   = 0.5 + 0.5 * sin(phi * 31.0 + log(r) * 21.0
                                  + uTime * uDiskAnimSpeed * 0.6);
    float lanes  = mix(0.55, 1.10, spiral) * mix(0.85, 1.10, fine);

    return base * emis * lanes * 90.0;  // overall scale tuned to look right
  }

  // -------------------------------------------------------------------------
  // RHS for the photon orbit equation in Schwarzschild (M=1 internal):
  //   (du/dphi)^2 = 1/b^2 - u^2 + 2 u^3
  // We integrate the FIRST-order pair (u, u') with RK4. Using u' avoids
  // the sign ambiguity at the turning point that 1-equation form has.
  //   du/dphi  = u'
  //   du'/dphi = -u + 3 u^2
  // Note: M is absorbed by working in units of M (impact param b, radius r
  // both expressed in M).
  // -------------------------------------------------------------------------
  vec2 orbitRHS(vec2 y) {
    float u  = y.x;
    float up = y.y;
    return vec2(up, -u + 3.0 * u * u);
  }

  vec2 rk4Step(vec2 y, float h) {
    vec2 k1 = orbitRHS(y);
    vec2 k2 = orbitRHS(y + 0.5 * h * k1);
    vec2 k3 = orbitRHS(y + 0.5 * h * k2);
    vec2 k4 = orbitRHS(y + h * k3);
    return y + (h / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4);
  }

  // -------------------------------------------------------------------------
  // Main pixel routine.
  // -------------------------------------------------------------------------
  void main() {
    // --- camera ray ---
    vec2 ndc = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
    float halfH = tan(uFovY * 0.5);
    vec3 rayCam = normalize(vec3(ndc.x * 2.0 * halfH, ndc.y * 2.0 * halfH, -1.0));

    // Camera frame: looking from +X axis toward origin, tilted by inclination.
    // We place observer at distance D in a direction that makes "disk normal"
    // tilted by uInclination from the camera up.
    //   Camera position: (D sin(i), D cos(i), 0)
    //   Look at origin, world up = (0, 0, 1) gives a clean roll-free view.
    float i = uInclination;
    vec3 camPos = vec3(uCameraDistance * sin(i),
                       uCameraDistance * cos(i),
                       0.0);
    vec3 fwd  = normalize(-camPos);
    vec3 worldUp = vec3(0.0, 0.0, 1.0);
    vec3 right = normalize(cross(fwd, worldUp));
    vec3 up    = cross(right, fwd);
    vec3 rayDir = normalize(rayCam.x * right + rayCam.y * up - rayCam.z * fwd);

    // Express geometry in units of M.
    float M = max(uMass, 1e-4);
    vec3 C = camPos / M;                   // observer position in M-units
    vec3 d = rayDir;                       // unit ray direction
    float r0 = length(C);

    // Impact parameter (in M-units).
    vec3 Lvec = cross(C, d);               // |C × d| since d normalised
    float b = length(Lvec);
    float bCrit = 3.0 * SQRT3;             // critical impact parameter (M=1)

    // Orbit-plane basis.
    vec3 nOrbit = (b > 1e-5) ? Lvec / b : vec3(0.0, 1.0, 0.0);
    // e1 along observer direction, e2 perpendicular within orbit plane,
    // chosen so that increasing phi follows the photon's forward motion.
    vec3 e1 = C / r0;
    vec3 e2 = normalize(cross(nOrbit, e1));
    // Sanity: ensure e2 points along the ray's transverse motion
    if (dot(e2, d) < 0.0) { e2 = -e2; nOrbit = -nOrbit; }

    // The photon starts at phi=0 (observer side). Disk plane is y=0. Find
    // the two phi values at which the orbit plane crosses y=0:
    //   orbit point  P(phi) = r * (cos(phi) e1 + sin(phi) e2)
    //   y(phi) = 0  =>  cos(phi) e1.y + sin(phi) e2.y = 0
    //   => tan(phi) = -e1.y / e2.y
    float phiDisk;
    if (abs(e2.y) < 1e-6) {
      phiDisk = 1e9;                       // orbit plane parallel to disk
    } else {
      phiDisk = atan(-e1.y, e2.y);         // first solution in (-pi/2, pi/2)
      if (phiDisk < 0.0) phiDisk += PI;    // bring into (0, pi)
    }
    float phiDisk2 = phiDisk + PI;          // second crossing (ghost image)

    // ---------------------------------------------------------------------
    // RK4 integration of (u, u').
    //   u(0)  = 1/r0
    //   u'(0) = -dot(d, e1) * (1/r0) ... actually simpler:
    //   du/dphi at phi=0 corresponds to dr/dphi via du = -dr/r^2.
    //   In the orbit plane, r' = dr/dphi can be derived, but easiest:
    //   The conserved relation b^2 = r^4 / (r'^2 + r^2 (1 - 2/r))^? ...
    //   We use the geodesic constants: with affine parameter, photon has
    //     (dr/dphi)^2 = r^4/b^2 - r^2 (1 - 2/r)
    //   so  du/dphi = -(1/r^2) dr/dphi  =>  (du/dphi)^2 = 1/b^2 - u^2 + 2u^3
    //   Sign at start: photon is moving INWARD if dot(d, e1) < 0
    //   (i.e. ray heading toward BH). Then dr/dphi < 0, so du/dphi > 0.
    // ---------------------------------------------------------------------
    float u  = 1.0 / r0;
    float dudp;
    {
      float disc = max(0.0, 1.0 / (b * b) - u * u + 2.0 * u * u * u);
      // sign: +sqrt if u increasing (photon heading toward BH)
      dudp = (dot(d, e1) < 0.0) ? sqrt(disc) : -sqrt(disc);
    }
    vec2 y = vec2(u, dudp);

    // step size and step count: balance quality vs perf
    const int   STEPS = 220;
    const float dphi  = (3.2 * PI) / float(STEPS);

    vec3  diskAccum = vec3(0.0);
    bool  hitPrimary  = false;
    bool  hitSecondary = false;
    bool  captured = false;
    float lastY = e1.y / r0;               // y-coord of starting position
    float lastU = u;
    float phi = 0.0;
    float phiAtCapture = 0.0;
    vec3  lastDir = d;                      // for asymptotic background

    for (int s = 0; s < STEPS; ++s) {
      vec2 yNext = rk4Step(y, dphi);
      float phiNext = phi + dphi;

      // capture: u → 1/(2M) means r → 2M (event horizon). In M-units, that's
      // u → 0.5. Use a safe threshold.
      if (yNext.x > 0.49) {
        captured = true;
        phiAtCapture = phiNext;
        break;
      }
      // escape: u → 0 means r → ∞
      if (yNext.x < 1e-4 && s > 4) {
        // direction at infinity = tangent to orbit at this phi
        float c = cos(phiNext), si = sin(phiNext);
        vec3 P = c * e1 + si * e2;          // unit radial
        vec3 T = -si * e1 + c * e2;         // tangential (direction of motion)
        // For outgoing photon, asymptotic dir is T (du < 0 => moving outward)
        lastDir = normalize(T);
        phi = phiNext;
        y = yNext;
        break;
      }

      // disk-plane crossing detection: did P_y change sign between phi & phiNext?
      // In the orbit plane: y(phi) = (1/u) * (cos(phi) e1.y + sin(phi) e2.y)
      float yNow  = (cos(phiNext) * e1.y + sin(phiNext) * e2.y) / yNext.x;
      // (we don't divide if yNext.x ~ 0 since escape branch caught it)
      if (lastY * yNow < 0.0) {
        // approximate crossing: linear interp in phi
        float frac = lastY / (lastY - yNow);
        float phiHit = phi + frac * dphi;
        float uHit   = mix(y.x, yNext.x, frac);
        float rHit   = 1.0 / max(uHit, 1e-5);
        // azimuthal disk angle (about y axis) at hit
        float ch = cos(phiHit), sh = sin(phiHit);
        vec3  Ph = (ch * e1 + sh * e2) * rHit;
        float diskPhi = atan(Ph.z, Ph.x);

        if (rHit >= uDiskInner && rHit <= uDiskOuter) {
          vec3 emit = diskColor(rHit, diskPhi);

          // --- relativistic g-factor (Doppler + gravitational) ---
          // Keplerian Omega in Schwarzschild: Omega = 1/(r^{3/2} + 2/r^{1/2})
          // simplified: Omega ~ r^{-3/2} for large r.
          float Omega = pow(rHit, -1.5);
          // disk velocity vector at Ph (tangent to circle in xz plane,
          // direction of orbital motion: -sin(diskPhi), 0, cos(diskPhi))
          vec3 vDisk = vec3(-sin(diskPhi), 0.0, cos(diskPhi)) * (Omega * rHit);
          // photon outgoing direction (toward observer = -photon velocity)
          // photon velocity tangent at hit:
          vec3 Th = -sh * e1 + ch * e2;     // unit tangent
          vec3 photonDir = normalize(Th);   // direction of motion
          // Doppler factor: 1 / (gamma (1 - v·n_emit))
          float vMag = length(vDisk);
          float vDotN = dot(vDisk, photonDir); // along motion
          float gamma = 1.0 / sqrt(max(1e-4, 1.0 - vMag * vMag));
          float doppler = 1.0 / (gamma * (1.0 - vDotN));
          // gravitational: sqrt(1 - 2M/r) for static observer at infinity
          float grav = sqrt(max(0.0, 1.0 - 2.0 / rHit));
          // combined g-factor (received freq / emitted freq)
          float g = doppler * grav;
          // surface brightness boost = g^4 (Liouville)
          float boost = g * g * g * g;
          // approach side: blue, recede: red — modulate color slightly
          vec3 tint = mix(vec3(1.10, 0.85, 0.55), vec3(0.55, 0.80, 1.20),
                          smoothstep(0.7, 1.5, g));
          emit *= mix(vec3(1.0), tint, 0.45);

          if (!hitPrimary) {
            diskAccum += emit * boost;
            hitPrimary = true;
          } else if (!hitSecondary && uShowSecondary > 0.5) {
            // ghost image — usually dimmer because we see disk underside
            diskAccum += emit * boost * 0.55;
            hitSecondary = true;
          }
        }
      }

      lastY = yNow;
      lastU = yNext.x;
      y    = yNext;
      phi  = phiNext;

      // stop early: both crossings done
      if (hitPrimary && (hitSecondary || uShowSecondary < 0.5) && y.x < 0.02) {
        // direction at this point
        float c = cos(phi), si = sin(phi);
        vec3 T = -si * e1 + c * e2;
        lastDir = normalize(T);
        break;
      }

      // direction estimate (kept current for break paths)
      {
        float c = cos(phi), si = sin(phi);
        vec3 T = -si * e1 + c * e2;
        lastDir = normalize(T);
      }
    }

    vec3 color = vec3(0.0);

    // background sky if photon escaped
    if (!captured) {
      color += sampleStars(lastDir);
    }

    // photon ring rim glow — sharp when |b - bCrit| is small AND photon
    // captured/near-captured. In Schwarzschild this is the n=1,2 image
    // peak just outside the shadow.
    float rimDist = abs(b - bCrit);
    float rim = exp(-rimDist * 9.0) * 0.9;
    if (b < bCrit) rim *= smoothstep(0.0, 0.4, bCrit - b) * 0.0; // inside = shadow
    color += vec3(1.05, 0.78, 0.42) * rim * 0.45;

    // accumulated disk light on top
    color += diskAccum;

    // exposure + tonemap (Reinhard-ish for highlight rolloff)
    color *= uExposure;
    color = color / (1.0 + color);

    // mild gamma
    color = pow(color, vec3(1.0 / 2.2));

    gl_FragColor = vec4(color, 1.0);
  }
`
