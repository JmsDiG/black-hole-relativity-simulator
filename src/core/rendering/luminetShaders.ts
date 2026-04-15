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
// Nebula background shader (very faint procedural haze on a back-side sphere).
// Designed to barely lift the background off pure black — a hint of cool /
// warm clouds, no bright spots, no high-frequency detail. Renders BEHIND
// the star points and the BH quad.
// -------------------------------------------------------------------------

export const nebulaVertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    // direction from camera to vertex on the shell — used as a stable
    // "sky direction" sampler for the procedural noise.
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vDir = normalize(worldPos.xyz - cameraPosition);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

export const nebulaFragmentShader = /* glsl */ `
  precision highp float;
  varying vec3 vDir;

  // Cheap value-noise + 4-octave fbm. Plenty for soft sky clouds.
  float hash3(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float vnoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n000 = hash3(i + vec3(0,0,0));
    float n100 = hash3(i + vec3(1,0,0));
    float n010 = hash3(i + vec3(0,1,0));
    float n110 = hash3(i + vec3(1,1,0));
    float n001 = hash3(i + vec3(0,0,1));
    float n101 = hash3(i + vec3(1,0,1));
    float n011 = hash3(i + vec3(0,1,1));
    float n111 = hash3(i + vec3(1,1,1));
    return mix(
      mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
      mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
      f.z
    );
  }
  float fbm(vec3 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 4; ++i) {
      s += a * vnoise(p);
      p *= 2.07;
      a *= 0.55;
    }
    return s;
  }

  void main() {
    vec3 d = normalize(vDir);

    // Monochrome blue-gray haze — feels like a real wide-field astro
    // photo rather than a stylised nebula. Two octaves is enough: a
    // coarse cloud body + a subtler wisp layer.
    float lo = fbm(d * 1.5);
    float mi = fbm(d * 2.9 + vec3(3.2));
    float mask = smoothstep(0.42, 0.86, lo);
    float wisp = smoothstep(0.55, 0.90, mi) * 0.35;
    float n    = mask + wisp * mask;

    // Single near-monochrome palette: cool steel-blue with a very slight
    // warm bias in the brightest cloud cores. No magenta / violet / warm
    // highlights — keeps the sky calm and realistic.
    vec3 cool = vec3(0.08, 0.11, 0.18);
    vec3 hint = vec3(0.14, 0.13, 0.15);
    vec3 col  = mix(cool, hint, smoothstep(0.72, 0.96, lo));

    // Moderate amplitude — clearly visible but the sky reads as mostly
    // dark with hints of cloud, not as a stylised background panel.
    gl_FragColor = vec4(col * n * 0.80, 1.0);
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
  uniform float uCamDistanceRs;   // |observer| in Rs — dims disk when close

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

          // ---- Smooth physical emission (no discrete rings)
          // Realistic accretion disks in photos / high-fidelity renders
          // show a continuous gradient, not stacked contour lines. We
          // keep a very subtle radial ripple (±7 %) as a cue that there
          // IS radial structure, but the dominant signal is the smooth
          // Page–Thorne radial profile.
          float radialFalloff = 1.0 - smoothstep(uDiskInner * 1.02,
                                                 uDiskOuter, rHitRs);
          float innerRamp     = smoothstep(uDiskInner,
                                           uDiskInner * 1.12, rHitRs);
          float body          = innerRamp * radialFalloff;
          float ripple        = 1.0 + 0.07 * cos(rHitRs * 3.8);
          float smoothField   = body * ripple;

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

          // ---- Page–Thorne style emissivity (physical radial profile),
          // normalised so the peak is O(1).
          float emisRaw = (1.0 - sqrt(uDiskInner / max(rHitRs, uDiskInner))) *
                          pow(uDiskInner / rHitRs, 2.0);
          float emis    = max(0.0, emisRaw) * 4.5 * smoothField;

          // Brightness: physical Doppler boost. g^2 (softer than g^3/g^4)
          // keeps the approach/recede contrast readable without burn-out.
          float gBoost = pow(clamp(g, 0.3, 1.7), 2.0);
          float brightness = mix(1.0, gBoost, uDopplerGain);

          // ---- Proximity attenuation ----
          // When the observer is close to the BH, the disk subtends a
          // large solid angle and otherwise reads as overexposed. Fade
          // brightness smoothly from 25 % at r ≤ 3 Rs up to 100 % at
          // r ≥ 18 Rs.
          float proxAtten = smoothstep(3.0, 18.0, uCamDistanceRs);
          brightness *= mix(0.25, 1.0, proxAtten);

          float contribution = emis * brightness * uDiskBrightness;

          // ---- Colour assembly (desaturated, photo-realistic palette)
          // Base: warm-white body that cools very slightly with radius —
          // the look of a real astrophysical accretion disk.
          vec3 baseWarm = vec3(1.08, 0.92, 0.72);
          vec3 baseCool = vec3(0.98, 0.96, 0.92);
          float radialT = smoothstep(uDiskInner, uDiskOuter, rHitRs);
          vec3 basePal  = mix(baseWarm, baseCool, radialT);

          // Subtle Doppler tint (±5 %). Approach side a touch cooler,
          // recede a touch warmer. No dramatic blue/red splash.
          vec3 dopApproach = vec3(0.95, 0.99, 1.05);
          vec3 dopRecede   = vec3(1.05, 0.99, 0.93);
          vec3 dopTint     = mix(dopRecede, dopApproach,
                                 smoothstep(0.65, 1.35, g));

          vec3 contribColor = basePal * dopTint;

          if (!hitPrimary) {
            // Primary image — the main disk arc.
            float w = 4.8;
            diskIntensity += contribution * w;
            diskColor     += contribColor * contribution * w;
            hitPrimary = true;
          } else if (!hitSecondary) {
            // Ghost / secondary image — the thin band bent under the
            // shadow (the signature Luminet feature), kept noticeably
            // dimmer than the primary.
            float w = 1.2;
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

    // ---- Assemble output (premultiplied-alpha semantics).
    // The material uses blend factors (ONE, ONE_MINUS_SRC_ALPHA), so the
    // final composite is:
    //   final = fragColor.rgb * 1 + dst.rgb * (1 - fragColor.a)
    // i.e. fragColor.rgb is EMISSIVE light that is simply ADDED to the
    // background, while fragColor.a is the amount by which the
    // background is dimmed. For emission-only elements (ring, disk)
    // we keep a = 0 so the nebula / stars behind are preserved, which
    // eliminates the dark halo artefact that normal SRC_ALPHA blending
    // was producing around the BH.
    vec3  emission = vec3(0.0);
    float blockout = 0.0;

    // 1. Photon ring — emission only, no background dimming.
    float rimSigma = 0.22;                       // width in M-units
    float rim     = exp(-pow((b - bCrit) / rimSigma, 2.0));
    float rimCore = exp(-pow((b - bCrit) / 0.07, 2.0));
    rim     *= step(bCrit - 0.02, b);
    rimCore *= step(bCrit - 0.02, b);
    vec3 rimColor = vec3(1.00, 0.94, 0.82);      // soft warm-white
    emission += rimColor * (rim * 0.45 + rimCore * 0.80);

    // 2. Disk (primary + ghost). Emission only.
    if (diskIntensity > 0.0) {
      // Gentle Reinhard rolloff so highlights never clip to pure white.
      vec3 diskRGB = diskColor / (1.0 + diskIntensity * 0.85);
      emission += diskRGB;
    }

    // 3. Shadow: the ONLY element that dims the background. This is
    //    what makes the BH actually look like a hole in the sky.
    if (captured) {
      emission = vec3(0.0);
      blockout = 1.0;
    }

    // Emission pixels alone don't need a writer; skip truly empty ones.
    if (!captured && emission.r + emission.g + emission.b < 0.002) discard;

    gl_FragColor = vec4(emission, blockout);
  }
`
