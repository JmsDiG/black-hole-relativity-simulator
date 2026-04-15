# BH Simulation

An interactive browser-based black hole simulator designed for local development in VS Code and static deployment to GitHub Pages.

The app places the user in a first-person relativistic environment near a black hole and lets them explore:

- gravitational lensing;
- redshift and blueshift;
- radial and tangential velocity effects;
- proper time versus distant observer time;
- the separate roles of gravitational and kinematic time dilation.

This is an honest educational MVP+: analytic clock-rate factors are computed from a clear physical model, while the visual side uses shader-based parametric approximations so the simulation remains interactive in a browser.

## Stack

- Vite 5
- React 19
- TypeScript
- Three.js via `@react-three/fiber`
- Zustand
- KaTeX via `react-katex` for rendered formulas

## Implemented features

### Main scene

- first-person camera near a black hole;
- event horizon;
- photon sphere;
- accretion disk;
- procedural star background;
- shader-based strong-lensing approximation;
- redshift / blueshift colour response for stars and disk;
- observer trajectory trail.

### Modes

- `Free exploration`
- `Scenarios`
- `Compare observers`
- `Study mode`

### UI and learning tools

- explicit viewport / control-deck layout on desktop;
- hover tooltips with explanations and examples for controls;
- formula panel with rendered equations;
- live scientific dashboard for clocks and scales;
- glossary cards with official scientific terminology;
- worldline / trajectory plots;
- light-signal probe;
- screenshot export;
- JSON trajectory recording;
- shareable URL export;
- pause / resume / reset;
- cinematic mode;
- capture-cone overlay;
- observed black hole mass presets tied to scientific papers.

## Observed black hole presets

The app includes several paper-backed mass presets:

- Sagittarius A*
- M87*
- Cygnus X-1
- GW150914 remnant

These presets are used as physically motivated mass models and are linked to well-known publications in the UI.

## Physical model

### Analytic pieces

The simulator uses Schwarzschild-scaled units:

- `R_s = 2GM / c^2`
- local gravitational factor for a static observer:
  `sqrt(1 - R_s / r)`
- Lorentz factor:
  `gamma = 1 / sqrt(1 - beta^2)`
- combined clock-rate approximation:
  `dτ / dt_inf ≈ sqrt(1 - R_s / r) / gamma`

The UI exposes:

- gravitational contribution;
- kinematic contribution;
- total slowdown factor;
- accumulated proper-time versus distant-time difference.

The black hole mass rescales the physical size `R_s` and the physical time unit `R_s / c`.

### Approximations

The project **does not** implement full geodesic ray tracing in Schwarzschild or Kerr spacetime.

Instead, it uses clearly labeled approximations:

- background lensing: parametric ray bending driven by impact parameter;
- shadow size and glow: anchored to the photon sphere, not exact null-geodesic integration;
- accretion disk: shader model with brightness and colour asymmetry;
- observer motion: user-driven kinematics, not an exact geodesic integrator;
- `Rotating approximation`: qualitative frame-dragging-like asymmetry, not a Kerr solver.

When `Educational approximation` is enabled, the visual model is intentionally smoothed further to keep trends easy to read.

## Project structure

```text
src/
  components/           UI panels, controls, tooltips and formula views
  core/
    physics/            constants, formulas, time factors, motion model
    rendering/          GLSL shaders and rendering helpers
  presets/              scenario presets
  scenes/               canvas and 3D scene
  state/                zustand simulation store
  ui/                   glossary terms and observed black hole catalog
  utils/                formatting and share-state helpers
```

## Local run

```bash
npm install
npm run dev
```

Production checks:

```bash
npm run build
npm run preview
```

## GitHub Pages

`vite.config.ts` is already prepared:

- `base` comes from `VITE_BASE_PATH`;
- the default is `./`, which is convenient for static Pages deployment without routing.

Workflow file:

- `.github/workflows/deploy.yml`

The workflow:

1. installs dependencies with `npm ci`;
2. runs `npm run build`;
3. uploads `dist`;
4. deploys to GitHub Pages.

If you want an explicit repository base path, build with:

```bash
VITE_BASE_PATH=/your-repo-name/ npm run build
```

## Implemented fully

- modular Vite/React/TypeScript foundation;
- local dev / lint / build flow;
- first-person black hole scene;
- scenario presets and observer-comparison mode;
- live clock comparison;
- study hints, glossary and formulas;
- JSON export and share URL;
- GitHub Pages workflow.

## Implemented partially

- strong lensing: visually plausible parametric model, not a strict geodesic solver;
- rotating mode: qualitative approximation, not Kerr;
- light-signal probe: educational estimate, not full null-geodesic propagation;
- observer comparison: two synchronized views, not a full multi-frame laboratory relativity environment.

## Next improvements

1. Add numerical null/geodesic integration for selected rays and a high-accuracy mode.
2. Upgrade the accretion disk to a more physical emissivity and temperature profile.
3. Add richer observer laboratories with multiple worldlines and saved JSON scenario bundles.
