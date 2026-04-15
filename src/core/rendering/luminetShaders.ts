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
  uniform float uMass;        // M in scene units (Rs/2)
  uniform float uDiskInner;   // r_in in scene units (Rs)
  uniform float uDiskOuter;   // r_out in scene units (Rs)
  uniform float uTime;
  uniform float uDopplerGain; // 0..1 how strong Doppler asymmetry shows

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

          // ---- Isoradial contour lines ----
          // Spacing in r_Rs: every 1.0 Rs a bright contour line.
          float spacing = 1.0;
          float phase   = rHitRs / spacing;
          float offset  = abs(fract(phase) - 0.5);
          float line    = smoothstep(0.10, 0.015, offset);

          // A very faint fill between the lines so the rings look like
          // they live on a disk (not floating isolated arcs).
          float fill = 0.06;

          // ---- Doppler asymmetry (gentle, no colour shift) ----
          float Omega   = pow(rHitM, -1.5);               // Keplerian
          vec3  vDisk   = vec3(-sin(diskPhi), 0.0, cos(diskPhi)) * (Omega * rHitM);
          vec3  photonT = normalize(-sh * e1 + ch * e2);
          float vMag    = length(vDisk);
          float vDotN   = dot(vDisk, photonT);
          float gamma   = 1.0 / sqrt(max(1e-4, 1.0 - vMag * vMag));
          float doppler = 1.0 / (gamma * (1.0 - vDotN));
          float grav    = sqrt(max(0.0, 1.0 - 2.0 / rHitM));
          float g       = doppler * grav;

          // Overall emissivity fall-off (Page–Thorne style, gentle).
          float emis = (1.0 - sqrt(uDiskInner / max(rHitRs, uDiskInner))) /
                       (rHitRs * rHitRs);
          emis = max(emis, 0.0);

          // Brightness: slight asymmetric Doppler, kept mild so it's a
          // deliberate "the approaching side is a touch brighter" cue
          // and not a dramatic colour splash.
          float brightness = mix(1.0, clamp(g, 0.55, 1.8), uDopplerGain);

          float contribution = (line + fill) * emis * brightness;

          // Pure white lines (near-neutral). A hair of warm tint vs cool
          // to suggest the Doppler direction without being colourful.
          vec3 lineColor = mix(vec3(0.95, 0.88, 0.80),
                               vec3(0.92, 0.95, 1.05),
                               smoothstep(0.9, 1.3, g));
          vec3 contribColor = lineColor;

          if (!hitPrimary) {
            diskIntensity += contribution * 2.4;
            diskColor     += contribColor * contribution * 2.4;
            hitPrimary = true;
          } else if (!hitSecondary) {
            // Ghost image — much fainter thin band.
            diskIntensity += contribution * 0.55;
            diskColor     += contribColor * contribution * 0.55;
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

    // 2. Photon ring: very thin line at b ≈ b_crit.
    //    Visible just outside the shadow — feathered ~0.25 in M-units.
    float rimSigma = 0.35;                 // width in M-units
    float rim = exp(-pow((b - bCrit) / rimSigma, 2.0));
    // only show outside the shadow
    rim *= step(bCrit, b);
    if (rim > 0.005) {
      vec3 rimColor = vec3(0.95, 0.92, 0.88);
      rgb += rimColor * rim * 0.55;
      alpha = max(alpha, rim * 0.65);
    }

    // 3. Disk isoradials (primary + ghost).
    if (diskIntensity > 0.0) {
      // Tonemap gently to keep things visually pleasant.
      vec3 diskRGB = diskColor / (1.0 + diskIntensity * 0.4);
      // Saturate brightness so thin lines stand out clearly.
      float a = clamp(diskIntensity * 0.85, 0.0, 1.0);
      // additive over whatever we already painted (rim / shadow)
      rgb = rgb + diskRGB;
      alpha = max(alpha, a);
    }

    if (alpha <= 0.001) discard;
    gl_FragColor = vec4(rgb, alpha);
  }
`
