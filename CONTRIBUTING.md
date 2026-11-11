# Contributing a Game to OpenGameHub

Welcome to **OpenGameHub**! Our core contribution rule is simple:

> **ONE GAME = ONE FOLDER INSIDE `/games`.**

You never need to modify the Next.js platform (`apps/web`), root `package.json`, shared `packages/*`, or GitHub workflows to contribute a game.

---

## 1. Quick Contribution Steps

1. **Fork & Clone** the repository:
   ```bash
   git clone https://github.com/<your-username>/OpenGameHub.git
   cd OpenGameHub
   pnpm install
   ```
2. **Add Your Game Folder** inside `/games/<your-game-slug>/`:
   - Slug must be lowercase alphanumeric with hyphens (`a-z0-9-`), 2–64 characters (e.g. `games/space-shooter/`).
3. **Validate & Build Locally**:
   ```bash
   pnpm game:validate <your-game-slug>
   pnpm game:build <your-game-slug>
   ```
4. **Test in the Universal Game Player**:
   ```bash
   pnpm dev
   ```
   Open `http://localhost:3000/play/<your-game-slug>` and verify controls, assets, restart, and fullscreen.
5. **Submit a Pull Request**:
   Push your branch and open a PR touching only `games/<your-game-slug>/`.

---

## 2. Supported Frameworks & Engines (V1)

OpenGameHub uses two modular build adapters (`static` and `vite`) and inspects your project dependencies and configuration automatically:

- **3D Game Engines**: Three.js (`three`), React Three Fiber (`@react-three/fiber`), Babylon.js (`@babylonjs/core` / `babylonjs`), PlayCanvas (`playcanvas`).
- **2D Game Engines**: Phaser (`phaser`), PixiJS (`pixi.js` / `@pixi/core`), HTML5 Canvas 2D.
- **Web Frameworks**: Vanilla HTML/JS/TS, React + Vite, Vue + Vite, Svelte + Vite.

### Explicitly Excluded in V1
- Unity WebGL and Godot Web exports
- Native desktop or mobile applications
- Server-dependent games requiring custom Node/Express/WebSocket backends

---

## 3. Optional `opengamehub.json` Manifest

Automatic detection is the default. If you want to customize your game's display title, description, controls, or category, add an optional `opengamehub.json` inside your game folder:

```json
{
  "name": "Space Shooter 3D",
  "description": "A 3D space combat game built with Three.js and Vite",
  "version": "1.0.0",
  "author": "Your Name",
  "engine": "threejs",
  "framework": "vanilla",
  "buildAdapter": "vite",
  "entry": "index.html",
  "category": "shooter",
  "tags": ["3d", "shooter"],
  "controls": ["WASD / Arrows", "Space to Fire"],
  "aspectRatio": "16:9"
}
```

---

## 4. AI-Assisted Game Migration

Have an existing game project that needs quick adjustments for nested static paths (`/_games/<slug>/<version>/index.html`) or sandboxed iframe execution?

Use our copyable **[AI Game Migration Prompt](./docs/AI_GAME_MIGRATION_PROMPT.md)** in Cursor, Claude Code, or Gemini.

---

## 5. Security, Licensing & Ownership Requirements

- **Code & Asset Ownership**: Only submit games and assets that you own or have an open-source compatible license to distribute.
- **Sandboxed Execution**: All games run in `<iframe sandbox="allow-scripts allow-pointer-lock" referrerPolicy="no-referrer">`. Games cannot access the parent page DOM, cookies, or storage.
- **No Lifecycle Scripts or Symlinks**: `preinstall`, `install`, and `postinstall` hooks in `package.json` and symbolic links inside `/games` are rejected by CI.
