# Luminet renderer — run instructions

A standalone Schwarzschild black-hole renderer in the style of
**Luminet (1979), "Image of a spherical black hole with thin accretion disk"**
(*Astronomy & Astrophysics* 75, 228–235). Lives alongside the original
simulator on its own URL, so the existing `main` mode is unchanged.

## What it does

Per-pixel ray tracing in Schwarzschild geometry:

- Photon orbit equation `(du/dφ)² = 1/b² − u² + 2u³` (RK4, ~220 steps/ray)
- Critical impact parameter `b_crit = 3√3·M ≈ 5.196 M` → BH shadow + photon ring
- Disk inner radius = ISCO (`6M`), Page–Thorne emissivity
  `F(r) ∝ r⁻³ · (1 − √(6M/r))`
- Relativistic g-factor (Doppler boost + gravitational redshift), surface
  brightness ∝ g⁴
- Primary AND secondary (ghost) disk image — the photons that loop under
  the shadow
- Procedural background star field with IMF-weighted spectral classes
  (O / B / A / F / G / K / M) sampled in the **deflected** ray direction,
  so star lensing is automatic and exact (rays whose `b < b_crit` hit the
  shadow and are not rendered)

All physics is documented inline in
`src/luminet/luminetShaders.ts`.

---

## 1. Install dependencies

The Luminet renderer reuses the existing project stack (React 19 + Three.js
+ Vite). If you have not yet installed deps:

```bash
npm install
```

No additional packages are needed.

---

## 2. Run from VS Code

### Option A — Terminal (recommended)

In the integrated VS Code terminal:

```bash
npm run dev
```

Then open the URL Vite prints (default <http://localhost:5173/>) and
**append `/luminet.html`**:

> <http://localhost:5173/luminet.html>

The original simulator continues to live at `/` (or `/index.html`).

### Option B — VS Code "Run" button

Add a `.vscode/launch.json` entry like:

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

Press **F5**, then visit `/luminet.html`.

---

## 3. Controls

The HUD (top-right corner) has live sliders. Keyboard shortcuts:

| Key | Action                       |
| --- | ---------------------------- |
| `H` | Show / hide the HUD          |
| `P` | Pause / resume disk swirl    |
| `S` | Save current frame as PNG    |

Sliders / parameters:

| Parameter        | Range          | Default | Notes                                          |
| ---------------- | -------------- | ------- | ---------------------------------------------- |
| `Mass M`         | 0.2 – 4        | 1       | BH mass (geometrized units, sets the scale)    |
| `Inclination °`  | 0 – 89         | **80**  | Observer polar angle from disk normal (Luminet uses ≈80°) |
| `Distance (M)`   | 10 – 200       | 30      | Observer distance from BH centre               |
| `FOV °`          | 5 – 60         | 22      | Vertical field of view                         |
| `Disk inner (M)` | 3 – 20         | 6       | ISCO is 6M for Schwarzschild                   |
| `Disk outer (M)` | 6 – 60         | 22      | Outer disk edge                                |
| `Exposure`       | 0.2 – 5        | 1.6     | Tone-mapper input gain                         |
| `Star density`   | 0 – 3          | 1       | Background star multiplier                     |
| `Disk anim`      | 0 – 3          | 0.4     | Disk swirl rate                                |
| `Render ghost`   | on / off       | on      | Toggle the secondary disk image                |
| `Pause`          | on / off       | off     | Freeze time                                    |

All parameters are also accepted via URL query string, so configurations
are shareable. Example:

```
http://localhost:5173/luminet.html?inc=85&M=1.2&dist=22&fov=18&exp=2.1&ghost=1
```

URL keys: `M`, `inc`, `dist`, `fov`, `rin`, `rout`, `exp`, `stars`,
`anim`, `ghost`, `pause`.

---

## 4. Output

- **Live**: full-window WebGL render. Resize the browser window to change
  resolution; the shader rebuilds at the new aspect ratio every frame.
- **PNG export**: press `S` (or click *Save PNG*). The browser downloads
  `luminet-bh-<timestamp>.png` at the current viewport resolution. To
  capture ≥1920×1080, resize the browser window to that size before
  saving (or open browser DevTools → device toolbar → set 1920×1080).

---

## 5. Production build

```bash
npm run build
```

Both entries are bundled — you'll find `dist/index.html` (original) and
`dist/luminet.html` (Luminet renderer) ready to serve from any static host.

---

## File map

```
src/luminet/
  main.tsx             # entry — mounts <LuminetApp/>
  LuminetApp.tsx       # HUD, controls, PNG export, URL params
  LuminetScene.tsx     # full-screen quad + uniform plumbing
  luminetShaders.ts    # vertex + fragment shader (Schwarzschild RK4)
luminet.html           # standalone HTML page (Vite multi-page entry)
```

The original `main` route (`src/App.tsx`, `src/scenes/*`,
`src/core/rendering/shaders.ts`) is **untouched** — backward compatibility
preserved.
