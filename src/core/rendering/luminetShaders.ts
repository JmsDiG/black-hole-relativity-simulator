/**
 * Minimalist Luminet-style renderer for the Local Observer window.
 *
 * Two materials:
 *   1. starDotMaterial — THREE.Points material that renders each star as a
 *      small ROUND dot (not a rectangle and not a line). Size attribute per
 *      star, colour pure white (or slight blue).
 *   2. luminetQuad{Vert,Frag}Shader — a full-screen NDC quad that draws the
 *      black hole ONLY: shadow + photon ring + disk isoradial contours.
 *      Background (no BH, no disk) is FULLY TRANSPARENT, so the star points
 *      rendered behind show through.
 *
 * The quad shader reconstructs the world-space ray per pixel from the
 * current camera's inverse view-projection matrix — this way the BH lines
 * up exactly with the existing camera controlled by the simulation store.
 */

// -------------------------------------------------------------------------
// Star-dot material
// -------------------------------------------------------------------------

export const starDotVertexShader = /* glsl */ `
  attribute float aSize;
  attribute vec3  aColor;
  varying   vec3  vColor;

  void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    // pixel size (flat; we want crisp small dots, not size-attenuated).
    gl_PointSize = aSize;
  }
`

export const starDotFragmentShader = /* glsl */ `
  precision highp float;
  varying vec3 vColor;

  void main() {
    // Round, anti-aliased point. No glow, no halo.
    vec2 d = gl_PointCoord - 0.5;
    float r = length(d);
    float alpha = 1.0 - smoothstep(0.42, 0.5, r);
    if (alpha <= 0.0) discard;
    gl_FragColor = vec4(vColor, alpha);
  }
`

// -------------------------------------------------------------------------
// Black-hole quad shader (shadow + photon ring + disk isoradials).
// -------------------------------------------------------------------------

export const luminetQuadVertexShader = /* glsl */ `
  varying vec2 vNDC;

  void main() {
    // planeGeometry(2,2) is centred at origin in XY, z=0 → already NDC.
    vNDC = position.xy;
    // push to far depth so regular scene objects (stars) render in front
    // when BH alpha = 0; their z is actual, this just holds the quad.
    gl_Position = vec4(position.xy, 0.9999, 1.0);
  }
`

export const luminetQuadFragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vNDC;

  uniform mat4  uInvViewProj;
  uniform vec3  uCamPos;
  uniform float uMass;            // M in scene units (Rs/2)
  uniform float uDiskInner;       // r_in in scene units (Rs)
  uniform float uDiskOuter;       // r_out in scene units (Rs)
  uniform float uTime;
  uniform float uDopplerGain;     // 0..1 how strong Doppler asymmetry shows
  uniform float uDiskBrightness;  // overall disk emissivity multiplier (0.2..2.0)

  const float PI    = 3.14159265359;
  const float SQRT3 = 1.73205080757;

  // Photon orbit in Schwarzschild, M-units normalised:
  //   (du/dphi)'' = -u + 3 u^2
  vec2 orbitRHS(vec2 y) {
    return vec2(y.y, -y.x + 3.0 * y.x * y.x);
  }
  vec2 rk4Step(vec2 y, float h) {
    vec2 k1 = orbitRHS(y);
    vec2 k2 = orbitRHS(y + 0.5 * h * k1);
    vec2 k3 = orbitRHS(y + 0.5 * h * k2);
    vec2 k4 = orbitRHS(y + h * k3);
    return y + (h / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4);
  }

  void main() {
    // --- reconstruct world-space ray from NDC + inverse VP ---
    vec4 wNear = uInvViewProj * vec4(vNDC, -1.0, 1.0);
    vec4 wFar  = uInvViewProj * vec4(vNDC,  1.0, 1.0);
    wNear.xyz /= wNear.w;
    wFar.xyz  /= wFar.w;
    vec3 rayDir = normalize(wFar.xyz - wNear.xyz);

    // Scene units: Rs = 1. M = Rs/2 = uMass.
    float M = max(uMass, 1e-4);
    vec3 C  = uCamPos / M;              // observer position in M-units
    vec3 d  = rayDir;
    float r0 = length(C);
    if (r0 < 0.5) {
      // inside event horizon (pathological) — discard
      discard;
    }

    // Impact parameter and orbit-plane basis.
    vec3 Lvec = cross(C, d);
    float b = length(Lvec);
    float bCrit = 3.0 * SQRT3;          // ≈ 5.196 in M-units

    vec3 nOrbit = (b > 1e-5) ? Lvec / b : vec3(0.0, 1.0, 0.0);
    vec3 e1 = C / r0;
    vec3 e2 = normalize(cross(nOrbit, e1));
    if (dot(e2, d) < 0.0) e2 = -e2;

    // Disk plane is y=0 (world). Find phi values where orbit crosses y=0.
    float phiDisk;
    if (abs(e2.y) < 1e-6) {
      phiDisk = 1e9;
    } else {
      phiDisk = atan(-e1.y, e2.y);
      if (phiDisk < 0.0) phiDisk += PI;
    }
    // (second crossing is phiDisk + PI)

    // Initial (u, du/dphi) with correct sign (photon moving inward if ray
    // heads toward BH, i.e. dot(d,e1) < 0).
    float u  = 1.0 / r0;
    float disc = max(0.0, 1.0 / (b * b) - u * u + 2.0 * u * u * u);
    float dudp = (dot(d, e1) < 0.0) ? sqrt(disc) : -sqrt(disc);
    vec2 y = vec2(u, dudp);

    const int   STEPS = 200;
    const float dphi  = (3.0 * PI) / float(STEPS);

    float phi   = 0.0;
    float lastY = e1.y / r0;            // starting y-coordinate
    bool  hitPrimary   = false;
    bool  hitSecondary = false;
    bool  captured     = false;
    float diskIntensity = 0.0;
    vec3  diskColor     = vec3(0.0);

    for (int s = 0; s < STEPS; ++s) {
      vec2  yNext   = rk4Step(y, dphi);
      float phiNext = phi + dphi;

      if (yNext.x > 0.49) { captured = true; break; }
      if (yNext.x < 1e-4 && s > 4) break;

      float yNow = (cos(phiNext) * e1.y + sin(phiNext) * e2.y) / yNext.x;
      if (lastY * yNow < 0.0) {
        float frac = lastY / (lastY - yNow);
        float phiHit = phi + frac * dphi;
        float uHit   = mix(y.x, yNext.x, frac);
        float rHitM  = 1.0 / max(uHit, 1e-5);
        float rHitRs = rHitM * M;        // back to scene units (Rs)

        if (rHitRs >= uDiskInner && rHitRs <= uDiskOuter) {
          // 3D hit point for azimuth (disk frame).
          float ch = cos(phiHit), sh = sin(phiHit);
          vec3  Ph = (ch * e1 + sh * e2) * rHitM;
          float diskPhi = atan(Ph.z, Ph.x);

          // ---- Isoradial contour lines + soft halo (gaussian-like glow)
          // Sharp core (~1 px equivalent) + soft outer wash that simulates
          // gentle scattering of light off the disk surface. Together they
          // give the disk a subtle bloom WITHOUT any heavy post-process.
          float spacing  = 0.85;                       // ring spacing in Rs
          float phase    = rHitRs / spacing;
          float offset   = abs(fract(phase) - 0.5);
          float lineCore = smoothstep(0.07, 0.005, offset);
          float lineHalo = smoothstep(0.30, 0.06,  offset) * 0.45;
          float line     = lineCore + lineHalo;

          // Faint disk-surface fill so rings clearly read as a disk, not
          // floating arcs. Decays with r so outer edges are subtler.
          float radialFalloff = 1.0 - smoothstep(uDiskInner, uDiskOuter, rHitRs);
          float fill = 0.16 * radialFalloff;

          // ---- Relativistic g-factor (Doppler + gravitational redshift)
          float Omega   = pow(rHitM, -1.5);               // Keplerian
          vec3  vDisk   = vec3(-sin(diskPhi), 0.0, cos(diskPhi)) * (Omega * rHitM);
          vec3  photonT = normalize(-sh * e1 + ch * e2);
          float vMag    = length(vDisk);
          float vDotN   = dot(vDisk, photonT);
          float gamma   = 1.0 / sqrt(max(1e-4, 1.0 - vMag * vMag));
          float doppler = 1.0 / (gamma * (1.0 - vDotN));   // >1 approach
          float grav    = sqrt(max(0.0, 1.0 - 2.0 / rHitM));
          float g       = doppler * grav;                  // composite

          // ---- Page–Thorne style emissivity profile, normalised so the
          // peak is O(1) (independent of overall flux level — that's
          // controlled by uDiskBrightness).
          float emisRaw = (1.0 - sqrt(uDiskInner / max(rHitRs, uDiskInner))) *
                          pow(uDiskInner / rHitRs, 2.0);
          // peak of the profile lives at r ≈ 9/4 · r_in; rescale to ~1 there
          float emis = max(0.0, emisRaw) * 4.5;

          // Brightness: physical Doppler boost (g^3 looks plausible while
          // staying readable; full g^4 is too aggressive on screen).
          float gBoost = pow(clamp(g, 0.25, 1.9), 3.0);
          float brightness = mix(1.0, gBoost, uDopplerGain);

          float contribution = (line + fill) * emis * brightness *
                               uDiskBrightness;

          // ---- Colour assembly
          // 1) Doppler tint: approaching side cooler/blue, receding warmer.
          vec3 cool = vec3(0.78, 0.92, 1.18);
          vec3 warm = vec3(1.18, 0.92, 0.66);
          vec3 dopplerTint = mix(warm, cool, smoothstep(0.55, 1.45, g));
          // 2) Gravitational redshift: inner rings (small grav) → warmer
          vec3 gravTint = mix(vec3(1.20, 0.78, 0.55),
                              vec3(1.0, 1.0, 1.0),
                              smoothstep(0.45, 0.85, grav));
          // 3) Combine: multiplicative, both kept deliberate but gentle.
          vec3 contribColor = dopplerTint * gravTint;

          if (!hitPrimary) {
            // Primary image — the upper, dominant arc.
            float w = 95.0;
            diskIntensity += contribution * w;
            diskColor     += contribColor * contribution * w;
            hitPrimary = true;
          } else if (!hitSecondary) {
            // Ghost / secondary image — thin, dimmer band beneath shadow.
            float w = 28.0;
            diskIntensity += contribution * w;
            diskColor     += contribColor * contribution * w;
            hitSecondary = true;
          }
        }
      }

      lastY = yNow;
      y     = yNext;
      phi   = phiNext;
    }

    // ---- Assemble output ----
    vec3 rgb = vec3(0.0);
    float alpha = 0.0;

    // 1. Shadow: rays captured by the BH — opaque BLACK (covers stars).
    if (captured) {
      rgb = vec3(0.0);
      alpha = 1.0;
    }

    // 2. Photon ring — thin, crisp, the main visual accent of the BH.
    //    A narrow gaussian at b = b_crit, plus an even narrower bright
    //    core that gives a distinct 1–1.5 px line.
    float rimSigma = 0.18;                       // width in M-units
    float rim     = exp(-pow((b - bCrit) / rimSigma, 2.0));
    float rimCore = exp(-pow((b - bCrit) / 0.06, 2.0));
    rim     *= step(bCrit - 0.02, b);            // outside shadow only
    rimCore *= step(bCrit - 0.02, b);
    if (rim + rimCore > 0.005) {
      vec3 rimColor = vec3(1.00, 0.95, 0.86);    // soft warm-white
      rgb   += rimColor * (rim * 0.85 + rimCore * 1.30);
      alpha  = max(alpha, clamp(rim * 0.85 + rimCore * 0.75, 0.0, 1.0));
    }

    // 3. Disk isoradials (primary + ghost).
    if (diskIntensity > 0.0) {
      // Soft Reinhard-style rolloff so highlights don't blow out but the
      // disk stays clearly readable on the black background.
      vec3  diskRGB = diskColor / (1.0 + diskIntensity * 0.18);
      float a       = clamp(diskIntensity * 0.55, 0.10, 1.0);
      rgb   = rgb + diskRGB;
      alpha = max(alpha, a);
    }

    if (alpha <= 0.001) discard;
    gl_FragColor = vec4(rgb, alpha);
  }
`
