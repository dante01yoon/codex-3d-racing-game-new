# Project Guide

## GameWorld-centric Flow
- `index.html` bootstraps the Vite runtime and mounts `#app` for the game canvas.
- `src/main.ts` imports global styles, creates the canvas, instantiates `GameWorld`, and wires hot-module disposal.
- `src/game/GameWorld.ts` is the orchestration hub: it wires rendering, the update loop, input, HUD, and gameplay actors around a shared Three.js scene graph.
- On construction, `GameWorld` creates the `Renderer`, `SceneManager`, `Track`, and `Vehicle`, subscribes to `InputManager` updates, attaches the `Hud`, and enables the `Loop` that drives `update(delta)`.

## Directory Overview
- `src/core/` engine-style utilities shared by any scene or mode.
  - `Loop.ts` wraps `requestAnimationFrame`, computes delta time, and handles safe start/stop of the render loop.
  - `Renderer.ts` configures the Three.js `WebGLRenderer` (antialiasing, shadows, clear color) and exposes resize/dispose helpers.
  - `SceneManager.ts` owns the root `Scene`, camera, and baseline lighting rig; `onResize` keeps the projection matrix in sync with the viewport.
- `src/game/` gameplay-specific systems.
  - `GameWorld.ts` coordinates object lifecycles, camera follow logic, Stats overlay, and HUD updates.
  - `Vehicle.ts` builds the car mesh and simulates acceleration, braking, turning, and surface-dependent drag using keyboard input snapshots.
  - `Track.ts` generates a closed circuit from a Catmull-Rom spline, extrudes the road mesh, adds ground/centerline visuals, and exposes helpers like `isPointOnTrack`, `getStartPosition`, and `getStartDirection` for spawn logic.
- `src/input/`
  - `InputManager.ts` listens to WASD/arrow keys, maintains a normalized input state, and notifies subscribers (e.g., `GameWorld` forwarding to `Vehicle`).
- `src/ui/`
  - `Hud.ts` mounts a DOM overlay that reports speed and off-track warnings; includes cleanup for hot reloads.
- `src/assets/` placeholder bucket for textures, models, and audio referenced in the README roadmap (empty in this snapshot).
- `public/` static files copied verbatim by Vite (currently unused).

## Supporting Files & Tooling
- `src/styles.css` locks the app to a full-screen dark background and zeroes browser defaults.
- `src/vite-env.d.ts` extends TypeScript with Vite-specific module globals.
- `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, and `vite.config.ts` configure dependencies, compiler options, and the Vite dev/build/preview commands.
- `README.md` walks through setup and long-term goals that align with this modular architecture.

## Frame Update Lifecycle (from `GameWorld`)
1. `Loop` calls `GameWorld.update(delta)` each animation frame.
2. The player `Vehicle` updates using the latest input and the track-surface flag from `Track.isPointOnTrack`.
3. `GameWorld` lerps the chase camera using player orientation, renders via `Renderer`, and refreshes HUD telemetry.
4. `Stats.js` instrumentation wraps the frame for basic performance profiling.
5. Resize events propagate through `SceneManager` and `Renderer` to keep the viewport aligned with the canvas.
