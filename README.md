# codex-3d-racing-game-new

A modern 3D racing game prototype built with TypeScript and Three.js. The project ships with a modular architecture that keeps core game systems (rendering, physics, input, UI) loosely coupled so you can iterate quickly.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server with hot reload:
   ```bash
   npm run dev
   ```
3. Build an optimized production bundle:
   ```bash
   npm run build
   ```
4. Preview the production build locally:
   ```bash
   npm run preview
   ```

## Project Goals

- Responsive vehicle controls (keyboard + gamepad)
- Modular track generation pipeline
- Expandable physics layer with future integration hooks for Ammo.js/Cannon.js
- Camera system that supports cinematic replays
- HUD overlays for race position, lap time, and speedometer
- AI opponents with configurable difficulty profiles

## Directory Structure

```
├── public/                # Static assets served as-is
├── src/
│   ├── assets/            # Textures, models, audio
│   ├── core/              # Game loop, scene setup, time step utilities
│   ├── game/              # Gameplay systems (vehicles, tracks, AI)
│   ├── input/             # Keyboard + gamepad mappings
│   ├── ui/                # HUD components and overlay management
│   ├── main.ts            # Entry point
│   └── vite-env.d.ts      # Vite type declarations
├── package.json
└── tsconfig.json
```

## Roadmap

- Flesh out vehicle handling using raycast suspension
- Implement spline-based track authoring tools
- Integrate audio manager (engine, skid, ambient soundscapes)
- Add post-processing pipeline (motion blur, bloom)
- Ship CI/CD via GitHub Actions for automated lint/build/test

## License

MIT
