# Project Guide

## GameWorld-centric Flow
- `index.html` bootstraps the Vite runtime and mounts `#app` for the game canvas.
- `src/main.ts` now renders a circuit-selection overlay, lets the player pick a `GameMap`, then creates the canvas and spins up `GameWorld` with that map.
- `src/game/GameWorld.ts` orchestrates rendering, input, HUD, AI, scoring, and race flow; it applies map-driven track configs, calls optional scene decorators, seeds the starting grid, manages the countdown timer, resolves collisions, awards score events, and streams racer positions into the minimap and score bursts.
- On construction, `GameWorld` creates the `Renderer`, `SceneManager`, `Track`, `RaceManager`, `Hud`, `MiniMap`, `ScoreBurst`, and `InputManager`, then spins up the `Loop` that drives `update(delta)`.

## Directory Overview
- `src/core/` engine-style utilities shared by any scene or mode.
  - `Loop.ts` wraps `requestAnimationFrame`, computes delta time, and handles safe start/stop of the render loop.
  - `Renderer.ts` configures the Three.js `WebGLRenderer` with antialiasing, PCF soft shadows, clear color, and responsive sizing helpers.
  - `SceneManager.ts` owns the root `Scene`, far-clipping camera, and lighting rig (ambient + hemisphere fill light + shadow-casting directional sun) and keeps projection matrices in sync on resize.
- `src/game/` gameplay-specific systems.
  - `GameWorld.ts` coordinates object lifecycles, chase camera, Stats overlay, HUD/minimap updates, AI controllers, collision resolution, race timer state, and fires `ScoreBurst` cues when scoring events occur.
  - `RaceManager.ts` tracks lap counts, checkpoint progress, cumulative distance, and maintains a score-first leaderboard via `ProgressUpdate` payloads (checkpoint and lap bonuses).
  - `AIController.ts` steers AI `Vehicle` instances by sampling forward points on the `Track`, modulating throttle/brake/steer inputs from profile data.
  - `Vehicle.ts` builds the car mesh, exposes `setTransform`, `halt`, `applyCollisionResponse`, `getBodyColorHex`, and configurable handling stats to simulate acceleration, braking, steering, and collision rebounds on/off the track surface.
  - `Track.ts` generates spline-based circuits using `TrackConfig` (custom control points, widths, checkpoint counts, smoothing, loop flag), registers world bounds, exposes spawn helpers, surface checks, checkpoint markers, and returns centerline samples/bounds for UI systems.
- `src/maps/` holds reusable `GameMap` definitions (track configs plus optional `decorateScene` hooks) and the `availableMaps` list used by the selection overlay.
- `src/input/`
  - `InputManager.ts` listens to WASD/arrow keys, maintains a normalized input state, and notifies subscribers (e.g., the player `Vehicle`).
- `src/ui/`
  - `Hud.ts` renders a race overlay with timer, score, lap/position data, checkpoint progress, off-track warnings, top-score leaderboard, score ticker, and final results modal.
  - `MiniMap.ts` projects the track outline and racer positions onto a 2D canvas overlay, highlighting the player via track bounds scaling.
  - `ScoreTicker.ts` animates short-lived score flashes in the HUD when checkpoints or laps award points.
  - `ScoreBurst.ts` shows central burst animations for larger score gains or lap completions.
- `src/assets/` placeholder bucket for textures, models, and audio referenced in the README roadmap (empty in this snapshot).
- `src/types/` TypeScript declaration shims (e.g., `stats-js.d.ts`) so tooling understands external modules without bundled types.
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
3. `RaceManager.updateRacerProgress` records laps, checkpoints, and awards score bonuses; return values trigger HUD tickers and `ScoreBurst` animations for the player.
4. `RaceManager.getLeaderboard` sorts by score before lap progress and feeds the HUD, which refreshes timer, score, standings, checkpoint status, and top-score snippets.
5. `MiniMap.update` projects every racer onto the overlay, map-specific props remain in the scene, the chase camera lerps toward the player, `Renderer` draws the scene with soft shadows, `Stats.js` tracks frame timing, and resize events keep `SceneManager`/`Renderer` aligned with the canvas.
