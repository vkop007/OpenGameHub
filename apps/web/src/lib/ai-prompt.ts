export const AI_MIGRATION_PROMPT_TEXT = `# TASK: PREPARE THIS GAME FOR OPENGAMEHUB ("ONE GAME = ONE FOLDER")

You are an expert browser game engineer and build-system specialist.

I want to contribute this game project to OpenGameHub (games/<game-slug>/).
OpenGameHub is a static browser game platform where one game = one folder inside /games.

Follow these strict engineering steps and constraints:

## 1. MANDATORY PRESERVATION & BOUNDARY RULES
- NEVER modify any files outside this game folder.
- NEVER modify the OpenGameHub main website, root package.json, shared packages/*, GitHub workflows, Vercel configuration, or any other game folder.
- DO NOT rebuild or rewrite the game from scratch.
- Preserve existing gameplay mechanics, rendering, physics, controls, and visual quality.
- Make ONLY the minimal compatibility adjustments required to produce a self-contained static browser build.

## 2. INSPECT THE EXISTING GAME
1. Inspect the folder structure, package.json (if present), lockfiles, and build configuration (vite.config.*, etc.).
2. Identify the game engine (threejs, react-three-fiber, babylonjs, playcanvas, phaser, pixijs, canvas2d, or none) and UI framework (vanilla, react, vue, svelte).
3. Locate the entry HTML file (must be index.html at the root of the game folder or explicitly configured via "entry" in opengamehub.json).
4. Inspect all referenced assets (textures, models, audio, stylesheets, scripts, fonts).

## 3. SELECT THE SUPPORTED OPENGAMEHUB BUILD ADAPTER
OpenGameHub V1 supports two build adapters:
1. Static HTML Adapter ("static"):
   - Used when the project already has a browser-ready index.html, JS, CSS, and asset files that require no bundler step.
2. Vite Build Adapter ("vite"):
   - Used for projects built with Vite (Three.js, React Three Fiber, Babylon.js, PlayCanvas, Phaser, PixiJS, React, Vue, Svelte, or Vanilla TS/JS).

Note: Unity WebGL, Godot Web, native desktop/mobile games, and server-dependent games (Node/Express/WebSocket backends) are excluded from OpenGameHub V1.

## 4. ENSURE NESTED STATIC URL COMPATIBILITY
In production on OpenGameHub, your built game is served from a nested path inside a sandboxed iframe (sandbox="allow-scripts allow-pointer-lock"):
/_games/<game-slug>/<version>/index.html

Therefore:
- If using Vite, ensure base: "./" is configured in vite.config.ts / vite.config.js and build.outDir is "dist".
- Replace any broken root-absolute asset paths (such as fetch("/assets/level.json") or <script src="/main.js">) with relative paths ("./assets/level.json", "./main.js").
- Do not rely on window.top or window.parent.document (the game runs in an isolated sandboxed iframe without allow-same-origin).
- Guard any localStorage or sessionStorage calls with try { ... } catch {} so strict sandboxed environments never throw uncaught SecurityError exceptions.
- Do not add preinstall, install, or postinstall lifecycle scripts in package.json (forbidden by OpenGameHub security validation).

## 5. CREATE OR UPDATE OPTIONAL opengamehub.json
Create a valid opengamehub.json at the root of the game folder:

{
  "name": "Your Game Title",
  "description": "Concise description of gameplay and goals",
  "version": "1.0.0",
  "author": "Your Name or Handle",
  "engine": "threejs",
  "framework": "vanilla",
  "buildAdapter": "vite",
  "entry": "index.html",
  "category": "action",
  "tags": ["3d", "arcade"],
  "controls": ["WASD", "Mouse", "Space"],
  "aspectRatio": "16:9"
}

## 6. VERIFY PRODUCTION BUILD & ASSETS
1. Run the production build locally (if using Vite, run npx vite build --base=./) and verify dist/index.html is generated.
2. Check that all referenced scripts, stylesheets, models, and textures exist and use relative paths.
3. Ensure no symlinks exist inside the game folder.
4. Provide a summary of the final folder layout and show the exact OpenGameHub verification commands:
   - Copy folder to games/<game-slug>/
   - Run pnpm game:validate <game-slug>
   - Run pnpm game:build <game-slug>
   - Run pnpm dev and test at http://localhost:3000/play/<game-slug>`;
