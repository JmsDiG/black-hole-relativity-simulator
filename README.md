# Black Hole Relativity Simulator

Browser-based interactive simulator for exploring how a nearby black hole affects what an observer sees and how time passes locally versus at infinity.

This project is built as an educational visualization, not as a full general-relativistic ray tracer. The goal is to make the main effects readable in real time in a browser: lensing, redshift and blueshift, orbital motion, and the separation between gravitational and kinematic time dilation.

## What the project does

The simulator places the user near a black hole and lets them change the observer state directly:

- radius from the hole in Schwarzschild radii;
- radial and tangential velocity;
- camera direction and field of view;
- simulation speed;
- motion mode and visual approximation mode.

The app then combines a lightweight physical model with real-time rendering to show:

- qualitative gravitational lensing of the star field;
- redshift and blueshift trends in the sky and accretion disk;
- accumulated proper time versus distant observer time;
- scenario presets for common teaching cases;
- side-by-side comparison and study overlays.

## What is implemented

### Visual scene

- black hole core and event-horizon region;
- photon-sphere-inspired visual structure;
- accretion disk with color and brightness asymmetry;
- procedural star background;
- observer trail and camera controls.

### Interaction and study tools

- four modes: `Free exploration`, `Scenarios`, `Compare observers`, `Study mode`;
- live control deck for observer parameters;
- formula panel with rendered equations;
- glossary and hint panels;
- worldline / timeline views;
- light-signal probe for estimated signal reception at infinity;
- screenshot export;
- JSON recording export;
- shareable URL state export.

### Data presets

The app includes several observed black hole mass presets:

- Sagittarius A*
- M87*
- Cygnus X-1
- GW150914 remnant

These presets rescale the physical size and characteristic time unit of the simulation.

## Physical model

The app uses Schwarzschild-scaled units and exposes the main ingredients directly in the UI:

- Schwarzschild radius: `R_s = 2GM / c^2`
- static gravitational factor: `sqrt(1 - R_s / r)`
- Lorentz factor: `gamma = 1 / sqrt(1 - beta^2)`
- combined time-rate estimate: `dτ / dt_inf ≈ sqrt(1 - R_s / r) / gamma`

This makes it possible to inspect, separately:

- gravitational contribution;
- kinematic contribution;
- total clock slowdown;
- accumulated proper-time difference.

## What this project is not

This repository does not claim to be a high-accuracy GR solver.

It does not currently implement:

- full null-geodesic ray tracing;
- Kerr spacetime integration;
- exact radiative transfer for the disk;
- exact geodesic motion of the observer;
- physically rigorous signal propagation.

Instead, it uses explicit approximations that are fast enough for interactive use in a browser. The intent is educational clarity first, not research-grade numerical fidelity.

## Tech stack

- Vite
- React
- TypeScript
- Three.js via `@react-three/fiber`
- Zustand
- KaTeX via `react-katex`

## Project structure

```text
src/
  components/           UI panels, controls, hints, glossary, formulas
  core/
    physics/            constants, orbital update logic, relativity helpers
    rendering/          shader code and rendering utilities
  presets/              teaching scenarios
  scenes/               canvas and 3D scene setup
  state/                Zustand store and simulation state
  ui/                   black hole catalog and glossary content
  utils/                formatting and share-state helpers
```

## Local development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Deployment

The project is configured for static deployment with GitHub Pages through GitHub Actions.

The repository includes:

- Vite base-path handling through `VITE_BASE_PATH`;
- a Pages deployment workflow in `.github/workflows/deploy.yml`.

The current workflow builds the app and deploys the generated `dist` folder.

If you need an explicit base path for a repository deployment, build with:

```bash
VITE_BASE_PATH=/your-repo-name/ npm run build
```

## Roadmap

Reasonable next steps for the project:

1. Add a higher-accuracy mode with numerical ray or geodesic integration.
2. Improve the accretion disk model beyond the current qualitative shader approach.
3. Extend comparison tools with richer saved scenarios and better observer-to-observer analysis.

## License

No license has been added yet. If you plan to keep the repository public, add one before inviting reuse.
