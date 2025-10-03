# Project Guide

## GameWorld-centric Flow
- `index.html` bootstraps the Vite runtime and mounts `#app` for the game canvas.
- `src/main.ts` imports global styles, creates the canvas, instantiates `GameWorld`, and wires hot-module disposal.
- `src/game/GameWorld.ts` orchestrates rendering, input, HUD, AI, scoring, and race flow; it now seeds the starting grid, manages a countdown timer, handles vehicle collisions, awards score events, and streams racer positions into the minimap.
- On construction, `GameWorld` creates the `Renderer`, `SceneManager`, `Track`, `RaceManager`, `Hud`, `MiniMap`, and `InputManager`, then spins up the `Loop` that drives `update(delta)`.

## Directory Overview
- `src/core/` engine-style utilities shared by any scene or mode.
  - `Loop.ts` wraps `requestAnimationFrame`, computes delta time, and handles safe start/stop of the render loop.
  - `Renderer.ts` configures the Three.js `WebGLRenderer` with antialiasing, PCF soft shadows, clear color, and responsive sizing helpers.
  - `SceneManager.ts` owns the root `Scene`, far-clipping camera, and lighting rig (ambient + hemisphere fill light + shadow-casting directional sun) and keeps projection matrices in sync on resize.
- `src/game/` gameplay-specific systems.
  - `GameWorld.ts` coordinates object lifecycles, chase camera, Stats overlay, HUD/minimap updates, AI controllers, collision resolution, and race timer state.
  - `RaceManager.ts` tracks lap counts, checkpoint progress, cumulative distance, and now refines a score-based leaderboard (checkpoint/lap bonuses, progress deltas) returned via `ProgressUpdate` objects.
  - `AIController.ts` steers AI `Vehicle` instances by sampling forward points on the `Track`, modulating throttle/brake/steer inputs from profile data.
  - `Vehicle.ts` builds the car mesh, exposes `setTransform`, `halt`, `applyCollisionResponse`, `getBodyColorHex`, and configurable handling stats to simulate acceleration, braking, steering, and collision rebounds on/off the track surface.
  - `Track.ts` generates the spline-based circuit, registers bounds, exposes spawn helpers, surface checks, checkpoint markers, and returns centerline samples and bounds for systems like the minimap.
- `src/input/`
  - `InputManager.ts` listens to WASD/arrow keys, maintains a normalized input state, and notifies subscribers (e.g., the player `Vehicle`).
- `src/ui/`
  - `Hud.ts` renders a race overlay with timer, score, lap/position data, checkpoint progress, off-track warnings, top-score leaderboard, and final results modal; integrates a score ticker for transient bonuses.
  - `MiniMap.ts` projects the track and racer positions onto a 2D canvas overlay, highlighting the player and drawing the circuit outline using track bounds.
  - `ScoreTicker.ts` animates short-lived score flashes that the HUD triggers when checkpoints or laps award points.
- `src/assets/` placeholder bucket for textures, models, and audio referenced in the README roadmap (empty in this snapshot).
- `public/` static files copied verbatim by Vite (currently unused).

## Supporting Files & Tooling
- `INSTRUCTION.md` is an onboarding companion that explains how each core library contributes (Three.js renderer/geometry, Stats.js, Vite) and suggests learning experiments.
- `src/styles.css` locks the app to a full-screen dark background and zeroes browser defaults.
- `src/vite-env.d.ts` extends TypeScript with Vite-specific module globals.
- `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, and `vite.config.ts` configure dependencies, compiler options, and the Vite dev/build/preview commands.
- `README.md` walks through setup and long-term goals that align with this modular architecture.

## Race Loop & Scoring Lifecycle (from `GameWorld`)
1. `Loop` calls `GameWorld.update(delta)` each animation frame while the race timer counts down; when time expires `finishRace` halts vehicles and shows results.
2. AI controllers derive input from `Track.getProgress`, vehicles integrate motion with surface-dependent handling, and collision detection applies pushback/velocity dampening for overlapping racers.
3. `RaceManager.updateRacerProgress` records laps, checkpoints, and awards score bonuses; the return value drives HUD score flashes for the player.
4. `RaceManager.getLeaderboard` sorts by score before lap progress and feeds the HUD, which refreshes timer, score, standings, checkpoint status, and top-score snippets.
5. `MiniMap.update` projects every racer onto the overlay, the chase camera lerps toward the player, `Renderer` draws the scene with soft shadows, `Stats.js` tracks frame timing, and resize events keep `SceneManager`/`Renderer` aligned with the canvas.
