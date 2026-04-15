# Luminet renderer — run instructions

Replaces the visuals of the **Local Observer** window in BH Simulation
with a Schwarzschild ray-traced render in the style of
**Luminet (1979), "Image of a spherical black hole with thin accretion
disk"** (*Astronomy & Astrophysics* 75, 228–235).

**All other windows, panels, sliders and physics are unchanged** —
Distant Observer, ControlPanel, ScenarioPanel, TimePanel, FormulaPanel,
TimelinePanel, SignalPanel, ObservedModelPanel, hints/glossary and every
button behave identically to `main`. Only the Local Observer canvas
content swaps to the new renderer.

---

## What the renderer does

- Per-pixel RK4 integration of the photon orbit equation in Schwarzschild
  geometry: `(du/dφ)'' = −u + 3u²`
- Critical impact parameter `b_crit = 3√3·M` → BH shadow + thin photon
  ring
- Inner disk edge at ISCO (`6 M = 3 Rs`), disk drawn as **thin isoradial
  contour lines** (Luminet 1979 style), not a filled area
- Primary + secondary (ghost) disk image
- Gentle Doppler asymmetry (approaching side a touch brighter, receding
  side a touch redder — no loud colour splash)
- Background stars rendered as real THREE.Points — one circular sprite
  per star, size 1–4 px, pure white (brightest ~5 % get a faint blue
  tint)
- Each star's apparent direction is lensed every frame with the
  point-mass Schwarzschild lens equation
  `θ = ½(β + √(β² + 4θ_E²))`, `θ_E² = 4M/D`
- Background is pure `#000000` — no nebulae, no gradients, no glow

---

## 1. Install dependencies

```bash
npm install
```

No additional packages — same deps as `main`.

---

## 2. Run from VS Code

### Terminal (recommended)

```bash
npm run dev
```

Open the URL Vite prints (default <http://localhost:5173/>). The
application is unchanged; the Luminet render appears in the **"Local
observer"** canvas at the top-left of the viewport.

### Run button

Add to `.vscode/launch.json`:

```jsonc
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Vite dev",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}"
    }
  ]
}
```

Press **F5**, the dev server starts.

---

## 3. Parameters

All existing app controls continue to affect the Local Observer render —
nothing new to learn:

| UI control (Control Panel / Scenario Panel) | Effect on Luminet view |
| ------------------------------------------- | ---------------------- |
| Observer `radius r` (Rs)                    | Camera distance from BH |
| Observer `phase φ`                          | Orbital position around BH |
| Observer `yaw` / `pitch`                    | Head-look orientation |
| `FOV`                                       | Camera field of view |
| `Cinematic` toggle                          | Gentle yaw + lift sway |
| Mass / Scenario presets                     | Updates sim state; geometry is in Rs so visuals are scale-invariant |
| Pause / Reset / Resume                      | Works as before (freezes physics) |
| Screenshot button                           | Downloads PNG of the viewport |

---

## 4. Output

- **Live**: interactive in the browser at any viewport size.
- **Screenshot PNG**: use the existing *Screenshot* button in the hero
  toolbar — saves the current Local Observer canvas as `bh-simulation-
  screenshot.png`. For ≥1920×1080, resize the browser window (or use
  DevTools → device toolbar) before clicking.
- **URL sharing**: the existing *Copy URL* button continues to work.

---

## 5. Production build

```bash
npm run build
```

Same single entry as `main`. No multi-page setup, `vite.config.ts` is
unchanged vs `main`.

---

## File map — what changed vs main

```
Modified:
  src/scenes/BlackHoleCanvas.tsx      routes view="local" to the new view

Added:
  src/scenes/LuminetLocalView.tsx     R3F scene: black bg, star Points, BH quad
  src/core/rendering/luminetShaders.ts  GLSL: round-dot stars + BH quad shader
  src/core/rendering/luminetStars.ts    star catalog + Schwarzschild lens math
  LUMINET_RUN.md                      this file
```

Untouched (identical to main): all components in `src/components/*`,
`src/App.tsx`, `src/scenes/BlackHoleView.tsx` (still powers the Distant
Observer canvas), `src/state/*`, `src/core/physics/*`, `vite.config.ts`,
`package.json`.
