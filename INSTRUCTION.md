# Getting Started with This Three.js Racing Game

This guide highlights the concrete features from each library that power the project and explains the overall approach so someone brand new to Three.js or web-based games can find their way around.

## Core Libraries and What They Do

- **Three.js rendering basics**
  - `WebGLRenderer` in `src/core/Renderer.ts` wraps the browser's WebGL context for us, handles the antialiasing/shadow-map settings, and resizes the canvas when the window changes.
  - `Scene`, `PerspectiveCamera`, and `Group` (see `src/core/SceneManager.ts`) give us the main scene graph, camera setup, and a root container that every mesh attaches to.
  - Global lighting combines `AmbientLight`, `HemisphereLight`, and a shadow-casting `DirectionalLight`, so vehicles and track meshes look readable without extra shaders.
- **Three.js geometry helpers**
  - `CatmullRomCurve3` and sampling helpers in `src/game/Track.ts` create the curving raceway, while `BufferGeometry` + typed attributes build the track surface by hand.
  - `MeshStandardMaterial` keeps materials PBR-friendly under the default Three.js lighting model, and `PCFSoftShadowMap` smooths the light shadows.
  - `Vector3`, `Quaternion`, and `MathUtils` provide the vector math used everywhere: orienting vehicles, smoothing camera motion, and steering AI racers.
- **Stats.js performance overlay**
  - `stats.js` (see `src/game/GameWorld.ts`) adds a tiny FPS meter so you can confirm the render loop is healthy while iterating.
- **Tooling: Vite + TypeScript**
  - Vite delivers instant reloads while you edit and compiles TypeScript down to browser-ready JavaScript with a single `npm run dev`.

## High-Level Architecture

- `GameWorld` (in `src/game/GameWorld.ts`) is the orchestration layer: it wires up rendering, scene management, input, AI, HUD, and the requestAnimationFrame loop.
- The `core/` folder keeps reusable engine pieces—rendering wrapper, scene/lens setup, and a deterministic `Loop` that throttles updates via `requestAnimationFrame`.
- The `game/` folder holds gameplay logic: the procedural track, vehicle physics, AI controllers, and race progression systems.
- `input/` and `ui/` isolate DOM work (keyboard listeners, HUD updates) so visual updates stay decoupled from logic.

## Rendering & Update Flow

1. `Loop` measures delta time and calls `GameWorld.update(delta)` each frame.
2. Vehicles integrate velocity/rotation based on keyboard or AI input, then report progress back to `RaceManager`.
3. The follow camera lerps toward the player vehicle for a smooth third-person view before the renderer draws the scene.
4. HUD text is refreshed with speed, lap, and leaderboard data pulled from the race state.

## Track and Vehicle Details

- The track path is authored once with a small list of `Vector3` control points; `CatmullRomCurve3` interpolates a smooth loop, and manual triangle indices create the road mesh and UVs.
- `Track.getProgress` projects any position onto the precomputed centerline, which fuels checkpoint logic and helps the AI know where to steer next.
- Vehicles are simple `Group` compositions of box meshes, but the physics step clamps acceleration, adds rolling resistance, and limits steering when off road to make the handling feel intentional.

## Input, AI, and HUD

- `InputManager` listens for WASD/arrow keys and broadcasts the current state to anything interested—here the player `Vehicle` subscribes during `GameWorld.initialize()`.
- `AIController` samples a look-ahead point on the spline and compares it with the car's forward vector to decide throttle and steering, so AI agents stay on the racing line without nav meshes.
- `Hud` is plain DOM manipulation: it builds a floating panel once and replaces its inner HTML each frame with current race stats to avoid rebuilding the element tree.

## Suggested Next Steps for Learners

- Tweak lighting or material settings in `SceneManager` and `Vehicle` to see how shading changes the scene.
- Adjust control point positions in `Track` to understand how `CatmullRomCurve3` responds and how checkpoints update automatically.
- Experiment with new AI profiles or vehicle stat presets to feel how acceleration, max speed, and turn rate influence gameplay.

Keep this file nearby as a map of where each system lives and which Three.js APIs are doing the heavy lifting.
