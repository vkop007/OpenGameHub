# OpenGameHub

**OpenGameHub** is an open-source, community-driven universal browser game platform where developers can contribute browser games built with different frameworks and engines without modifying the main platform codebase.

> **Core Contribution Philosophy: ONE GAME = ONE FOLDER INSIDE `/games`.**

---

## 1. Project Overview & Key Features

- **One-Folder Contribution System**: Developers fork the repository, copy their game folder into `games/<game-slug>/`, and open a Pull Request. Zero edits to root config, shared packages, or frontend code are needed.
- **Automatic Discovery Engine (`@opengamehub/game-discovery`)**: Scans `/games`, inspects `package.json` dependencies, Vite configs, and entry HTML/JS files to detect frameworks, engines, and build adapters automatically.
- **Modular Build System (`@opengamehub/game-adapters` & `@opengamehub/game-builder`)**:
  - **Static HTML Adapter (`static`)**: Validates `index.html`, normalizes relative asset paths, verifies referenced resources exist, and outputs static files without unnecessary package installs.
  - **Vite Build Adapter (`vite`)**: Builds Vite projects in an isolated temporary directory with relative base paths (`base: "./"`), strips deployment secrets, enforces size limits, and outputs browser-ready static bundles.
  - **Failure Isolation**: One broken game never crashes the platform. Failed games are reported clearly and excluded from playable listings while valid games publish normally.
- **Automated Game Registry (`@opengamehub/game-registry`)**: Generates `generated/games.json` and copies static builds into `apps/web/public/_games/<slug>/<version>/`.
- **Universal Sandboxed Game Player (`@opengamehub/game-player`)**: Loads any published game inside an isolated iframe (`sandbox="allow-scripts allow-pointer-lock"`) with fullscreen, restart, responsive aspect-ratio sizing, controls guide, and validated message bridge support (`@opengamehub/game-bridge`).
- **Vercel-Only Static Hosting**: Serves both the Next.js App Router platform and all compiled static games directly from Vercel without Cloudflare R2, AWS S3, or external object storage.

---

## 2. Supported Frameworks & Engines (V1 Scope)

| Category | Technology | Detection Mechanism | Build Adapter | V1 Status |
|---|---|---|---|---|
| **3D Engine** | Three.js | `three` dependency / import | `vite` or `static` | Supported & Runtime Verified |
| **3D Engine** | React Three Fiber | `@react-three/fiber` dependency | `vite` | Supported (Detection & Adapter Verified) |
| **3D Engine** | Babylon.js | `@babylonjs/core` / `babylonjs` | `vite` or `static` | Supported (Detection & Adapter Verified) |
| **3D Engine** | PlayCanvas | `playcanvas` dependency | `vite` or `static` | Supported (Detection & Adapter Verified) |
| **2D Engine** | Phaser | `phaser` dependency / `Phaser.Game` | `vite` or `static` | Supported & Runtime Verified |
| **2D Engine** | PixiJS | `pixi.js` / `@pixi/core` | `vite` or `static` | Supported (Detection & Adapter Verified) |
| **2D Canvas** | HTML5 Canvas 2D | `getContext("2d")` / manifest | `static` or `vite` | Supported & Runtime Verified |
| **Web Framework** | Vanilla HTML / JS / TS | `index.html` + JS/TS | `static` or `vite` | Supported & Runtime Verified |
| **Web Framework** | React + Vite | `react` + `vite` | `vite` | Supported & Runtime Verified |
| **Web Framework** | Vue + Vite | `vue` + `vite` | `vite` | Supported (Detection & Adapter Verified) |
| **Web Framework** | Svelte + Vite | `svelte` + `vite` | `vite` | Supported (Detection & Adapter Verified) |

*Explicitly Excluded in V1*: Unity WebGL, Godot Web, native desktop/mobile games, and server-dependent backends (Express, Socket.io, WebSockets).

---

## 3. Repository Architecture

```text
opengamehub/
├── apps/
│   └── web/                        # Next.js App Router platform (Tailwind CSS, shadcn/ui, Lucide)
├── games/                          # Community-contributed games (One Game = One Folder)
│   ├── neon-breakout/              # Reference Game 1: Vanilla Static HTML5 Canvas
│   ├── space-shooter/              # Reference Game 2: Vite + Three.js 3D
│   ├── dungeon-crawler/            # Reference Game 3: Vite + Phaser 2D
│   └── cyber-2048/                 # Reference Game 4: Vite + React Puzzle
├── packages/
│   ├── game-discovery/             # Automatic scanner, detector & JSON schema validator
│   ├── game-adapters/              # StaticHtmlAdapter & ViteBuildAdapter
│   ├── game-builder/               # Isolated build runner & thumbnail generator
│   ├── game-registry/              # generated/games.json builder & reader
│   ├── game-player/                # Universal sandboxed iframe game player
│   └── game-bridge/                # Optional validated postMessage / MessageChannel SDK
├── scripts/
│   ├── games-cli.ts                # CLI for scan, validate, build, test
│   ├── lint.ts                     # Security & source linter
│   ├── run-tests.ts                # Unit & integration test runner
│   └── browser-e2e.ts              # Headless browser E2E verification runner
├── generated/
│   └── games.json                  # Auto-generated game registry consumed by Next.js
├── docs/
│   └── AI_GAME_MIGRATION_PROMPT.md # Copyable AI migration prompt for contributors
├── templates/
│   └── opengamehub.template.json   # Optional manifest template
├── .github/workflows/              # CI/CD workflows (validate-games, test-platform, deploy)
├── CONTRIBUTING.md
├── README.md
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

---

## 4. Quick Start & Developer Commands

```bash
# Install dependencies
pnpm install

# Scan all contributed games in /games
pnpm games:scan

# Validate all games (manifests, entry points, security checks)
pnpm games:validate

# Build all games into apps/web/public/_games/ and update generated/games.json
pnpm games:build

# Run integration verification on all games
pnpm games:test

# Validate or build a single game by folder slug
pnpm game:validate space-shooter
pnpm game:build space-shooter

# Start the Next.js platform locally (automatically builds games first)
pnpm dev

# Run lint checks
pnpm lint

# Run TypeScript checks across all workspace packages
pnpm typecheck

# Run unit and integration tests
pnpm test

# Build the complete platform for production
pnpm build
```

---

## 5. How to Contribute & AI-Powered Game Integration

1. Fork the repository and place your game folder inside `games/<your-game-slug>/`.
2. If your game needs adjustments to work from a nested static path (`/_games/<slug>/<version>/index.html`) or inside a sandboxed iframe, open your game project in **Cursor**, **Claude Code**, or **Gemini** and paste the prompt from **[`docs/AI_GAME_MIGRATION_PROMPT.md`](./docs/AI_GAME_MIGRATION_PROMPT.md)** (also available on the `/contribute` page).
3. Test locally with `pnpm game:validate <slug>` and `pnpm game:build <slug>`, then submit a Pull Request!

### Copyable AI Migration Prompt Quick Reference

See **[`docs/AI_GAME_MIGRATION_PROMPT.md`](./docs/AI_GAME_MIGRATION_PROMPT.md)** for the full copy-paste prompt that instructs coding agents to inspect your game, preserve gameplay, configure relative paths (`base: "./"`), generate an optional `opengamehub.json`, and verify static production output without modifying any files outside your game folder.

---

## 6. Vercel Deployment Instructions

OpenGameHub is designed to deploy strictly on **Vercel** with zero external object storage dependencies.

### Exact Vercel Project Settings

When importing the monorepo into Vercel:

- **Framework Preset**: `Next.js`
- **Root Directory**: `apps/web` (ensure *"Include source files outside of the Root Directory in the Build Step"* is enabled, which is on by default in Vercel).
- **Install Command**: `pnpm install --prefix ../..` (configured automatically via `apps/web/vercel.json`)
- **Build Command**: `cd ../.. && pnpm build` (configured automatically via `apps/web/vercel.json`)
- **Output Directory**: `.next` (default Next.js output; static games in `apps/web/public/_games/` are served automatically by Vercel's CDN at `/_games/<slug>/<version>/index.html`).

### Build Execution Sequence on Vercel

1. Installs workspace dependencies via `pnpm`.
2. Runs `pnpm games:build`, which scans `../../games`, validates manifests, builds each supported game in isolation, copies static outputs to `apps/web/public/_games/<id>/<version>/`, and writes `generated/games.json`.
3. Compiles the Next.js App Router application (`@opengamehub/web`) consuming `generated/games.json`.
4. Publishes the complete static and SSR output to Vercel's edge network.

### Plan & Size Considerations

- By default, `@opengamehub/game-builder` enforces a configurable per-game static output limit of **50 MB** (`maxGameSizeBytes`) and emits a collection warning at **200 MB** (`maxTotalCollectionSizeBytes`) so deployments stay well within standard Vercel deployment artifact limits.

---

## 7. Security & Licensing

- Contributed games are treated as untrusted input.
- Every game executes inside `<iframe sandbox="allow-scripts allow-pointer-lock" referrerPolicy="no-referrer">` without `allow-same-origin`, preventing access to parent DOM, cookies, or web storage.
- Pull request validation workflows run with `permissions: contents: read` and never use `pull_request_target` or expose deployment secrets.
- Licensed under the **MIT License**.
