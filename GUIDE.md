# Project Guide

## GameWorld-centric Flow
- `index.html` bootstraps the Vite runtime and mounts `#app` for the game canvas.
- `src/main.ts` imports global styles, creates the canvas, instantiates `GameWorld`, and wires hot-module disposal.
- `src/game/GameWorld.ts` orchestrates rendering, update loop, HUD, and gameplay actors; it seeds the starting grid, registers racers with `RaceManager`, and instantiates AI controllers alongside the player vehicle.
- On construction, `GameWorld` creates the `Renderer`, `SceneManager`, `Track`, `RaceManager`, `Hud`, and `InputManager`, then spins up the `Loop` that drives `update(delta)`.

## Directory Overview
- `src/core/` engine-style utilities shared by any scene or mode.
  - `Loop.ts` wraps `requestAnimationFrame`, computes delta time, and handles safe start/stop of the render loop.
  - `Renderer.ts` configures the Three.js `WebGLRenderer` with antialiasing, PCF soft shadows, clear color, and responsive sizing helpers.
  - `SceneManager.ts` owns the root `Scene`, far-clipping camera, and lighting rig (ambient + hemisphere fill light + shadow-casting directional sun) and keeps projection matrices in sync on resize.
- `src/game/` gameplay-specific systems.
  - `GameWorld.ts` coordinates object lifecycles, camera follow logic, Stats overlay, HUD updates, and handles race grid seeding plus AI controller wiring.
  - `RaceManager.ts` tracks lap counts, checkpoint progress, total distance, and produces sorted leaderboards for all registered racers.
  - `AIController.ts` steers AI `Vehicle` instances by sampling forward points on the `Track`, modulating throttle/brake/steer inputs from profile data.
  - `Vehicle.ts` builds the car mesh, exposes `setTransform`, `getForwardVector`, and configurable handling stats to simulate acceleration, braking, and steering on/off the track surface.
  - `Track.ts` generates the spline-based circuit, provides spawn helpers, surface checks, checkpoint markers, and progress queries (`getProgress`, `getPointAtDistance`, `getTotalLength`).
- `src/input/`
  - `InputManager.ts` listens to WASD/arrow keys, maintains a normalized input state, and notifies subscribers (e.g., the player `Vehicle`).
- `src/ui/`
  - `Hud.ts` renders a race overlay with speed, lap/position data, checkpoint progress, off-track warnings, and a trimmed leaderboard view.
- `src/assets/` placeholder bucket for textures, models, and audio referenced in the README roadmap (empty in this snapshot).
- `public/` static files copied verbatim by Vite (currently unused).

## Supporting Files & Tooling
- `INSTRUCTION.md` is an onboarding companion that explains how each core library contributes (Three.js renderer/geometry, Stats.js, Vite) and suggests learning experiments.
- `src/styles.css` locks the app to a full-screen dark background and zeroes browser defaults.
- `src/vite-env.d.ts` extends TypeScript with Vite-specific module globals.
- `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, and `vite.config.ts` configure dependencies, compiler options, and the Vite dev/build/preview commands.
- `README.md` walks through setup and long-term goals that align with this modular architecture.

## Frame Update Lifecycle (from `GameWorld`)
1. `Loop` calls `GameWorld.update(delta)` each animation frame.
2. AI controllers compute fresh input snapshots using `Track.getProgress` lookahead and feed their assigned vehicles.
3. Every racer updates: `Vehicle.update` integrates motion with surface-dependent handling, `Track.getProgress` returns lap/checkpoint info, and `RaceManager.updateRacerProgress` records standings.
4. `RaceManager.getLeaderboard` feeds the `Hud`, which reports speed, lap state, checkpoints, and leader snippets; off-track status toggles warning messaging.
5. Camera lerps toward the player vehicle, `Renderer` draws the scene with soft shadows, `Stats.js` wraps the frame timing, and resize events keep `SceneManager`/`Renderer` aligned with the canvas.
