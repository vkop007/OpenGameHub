# Contributing a Game to OpenGameHub

Welcome to **OpenGameHub**! Our core contribution rule is simple:

> **ONE GAME = ONE FOLDER INSIDE `/games`.**

By taking part you agree to follow our [Code of Conduct](./CODE_OF_CONDUCT.md). Contributions are
released under the project's [MIT License](./LICENSE.md). To report a security problem, see
[SECURITY.md](./SECURITY.md).

The recommended workflow is AI-assisted and end to end. Give the prompt below to
your coding agent from the repository or game-project directory. The agent should
inspect the project, prepare the game, validate it, launch it, capture a gameplay
screenshot, and prepare a reviewable pull request without asking you to perform
routine terminal or Git steps. If you'd rather not use AI, jump to
[Manual Contribution (No AI)](#manual-contribution-no-ai).

## Autonomous AI Contribution Prompt

Copy the prompt between the fences into your coding agent:

```text
# TASK: CONTRIBUTE THIS GAME TO OPENGAMEHUB

You are an autonomous coding agent contributing a browser game to
https://github.com/vkop007/OpenGameHub. Complete the entire contribution workflow:
game setup, compatibility work, validation, local testing, screenshot capture,
Git commit, fork/remote setup, push, and pull request creation.

Do not stop after giving instructions. Perform the work yourself. Only stop and
ask me for input when credentials, GitHub permissions, a genuinely destructive
choice, or a product decision that cannot be inferred is required.

## 1. Safety and repository boundaries

- Inspect the current directory and Git status before changing anything.
- Never delete, reset, overwrite, or revert unrelated user changes.
- Keep the contribution limited to `games/<game-slug>/` and the minimum required
  contribution metadata. Do not modify `apps/web`, shared `packages/*`, root
  configuration, GitHub workflows, or another game.
- Do not commit secrets, credentials, generated dependency caches, or `node_modules`.
- Never force-push. Never rewrite existing commits.
- Only submit code and assets that I own or that have a compatible open-source
  license. If ownership or licensing is unclear, stop and ask.
- Use the repository's existing package manager and scripts. Do not add a new
  dependency unless it is required and approved by the repository configuration.

## 2. Inspect and set up the game

1. Identify the game source, its build system, engine, framework, entry point,
   assets, and required commands.
2. Choose a lowercase slug matching `^[a-z0-9-]{2,64}$`. Reuse an existing
   slug only when this is an update to that game.
3. If this is an external game project, copy or move only the game into
   `games/<game-slug>/`. Preserve gameplay, controls, visual quality, and assets.
4. Configure the supported adapter:
   - Use `static` for an already browser-ready HTML/CSS/JS game.
   - Use `vite` for Vite-based projects and supported JS/TS frameworks or engines.
5. Create or update `games/<game-slug>/opengamehub.json` with accurate metadata.
   Do not add custom shell commands, `buildCommand`, or lifecycle scripts.
6. Make nested-path compatibility fixes:
   - Vite builds must use `base: "./"` and output to `dist`.
   - Replace root-absolute asset and fetch paths with relative paths.
   - Do not access `window.parent.document` or depend on a same-origin parent.
   - Guard browser storage access where the sandbox can reject it.
   - Do not add `preinstall`, `install`, or `postinstall` scripts.
7. Remove symlinks and do not introduce server-side dependencies. Unity WebGL,
   Godot Web, native apps, and games requiring a custom backend are not supported.

## 3. Validate and test the actual game

Run the smallest relevant checks first, then fix every failure:

    pnpm install
    pnpm game:validate <game-slug>
    pnpm game:build <game-slug>

Run the site with `pnpm dev` and open:

    http://localhost:3000/play/<game-slug>

Use the available browser or desktop automation tool to test the real rendered
game. Check that it loads without console errors, starts, responds to its main
controls, displays assets, can restart, and supports fullscreen when applicable.
Do not claim success based only on source inspection or a successful build.

## 4. Capture and include a gameplay screenshot

After the game is visibly running, capture one clear screenshot showing the
gameplay (not an editor, terminal, or blank loading screen). Save it as:

    games/<game-slug>/screenshots/gameplay.png

Keep the image reasonably sized and commit it with the game unless repository
validation explicitly rejects image files. If the automation tool cannot capture
screenshots, explain that limitation and continue only after recording the
validation evidence; do not fabricate a screenshot.

## 5. Create the commit and pull request

1. Review `git diff` and `git status`. Confirm every changed file is in scope.
2. Create a focused branch such as `contribute/<game-slug>`.
3. Create one focused commit with a useful message, for example:
   `Add <game title> game`.
4. Check GitHub authentication with `gh auth status`.
5. If the current remote is not writable:
   - Create a fork with `gh repo fork vkop007/OpenGameHub --remote`.
   - Push the branch to the fork.
   - Never push to upstream unless the authenticated account explicitly has
     permission and the user has authorized direct pushes.
6. Push the branch without force:

   `git push -u <fork-remote> <branch>`

7. Open a pull request targeting `vkop007/OpenGameHub` using `gh pr create`.
   The PR body must include:
   - a concise summary of the game and its controls;
   - the exact validation and test commands run;
   - the local play URL;
   - a link or Markdown image reference to `screenshots/gameplay.png`;
   - any known limitations or follow-up work.
8. Return the commit SHA, branch, PR URL, screenshot path, and test results.

If GitHub authentication, fork creation, pushing, or PR creation fails, report
the exact command and error, leave the local work committed and ready, and give
me only the one next action needed. Do not silently skip a failed step.
```

## Manual Contribution (No AI)

Prefer to set things up yourself? Follow these steps instead of using the prompt.

1. **Fork and clone** the repository:

       gh repo fork vkop007/OpenGameHub --clone
       cd OpenGameHub
       git checkout -b contribute/<game-slug>

   (Without `gh`: fork on GitHub, then `git clone` your fork.)

2. **Add your game** in `games/<game-slug>/`. The slug must match
   `^[a-z0-9-]{2,64}$`. Only touch that folder.
3. **Make it browser-ready** for a nested path:
   - Use `static` (plain HTML/CSS/JS) or `vite` (`base: "./"`, output to `dist`).
   - Use relative asset and fetch paths, not root-absolute (`/img.png`).
   - Don't access `window.parent.document`; guard `localStorage` access.
   - No `preinstall`/`install`/`postinstall` scripts, symlinks, or custom backends.
4. **Add `opengamehub.json`** in the game folder (see the manifest example below).
   Do not add `buildCommand` or custom shell commands.
5. **Validate and build**:

       pnpm install
       pnpm game:validate <game-slug>
       pnpm game:build <game-slug>

6. **Play-test** with `pnpm dev` and open `http://localhost:3000/play/<game-slug>`.
   Confirm it loads without console errors, starts, responds to controls, and restarts.
7. **Take a screenshot** of real gameplay and save it as
   `games/<game-slug>/screenshots/gameplay.png`.
8. **Commit and push** (never force-push):

       git add games/<game-slug>
       git commit -m "Add <game title> game"
       git push -u origin contribute/<game-slug>

9. **Open a pull request** against `vkop007/OpenGameHub` (`gh pr create` or the
   GitHub UI). Include a summary and controls, the commands you ran, the play URL,
   the screenshot, and any known limitations.

## Repository rules

You never need to modify the Next.js platform (`apps/web`), root `package.json`,
shared `packages/*`, or GitHub workflows to contribute a game.

### Supported frameworks and engines (V1)

OpenGameHub uses two modular build adapters (`static` and `vite`) and inspects
your project dependencies and configuration automatically:

- **3D game engines**: Three.js, React Three Fiber, Babylon.js, PlayCanvas.
- **2D game engines**: Phaser, PixiJS, HTML5 Canvas 2D.
- **Web frameworks**: Vanilla HTML/JS/TS, React + Vite, Vue + Vite, Svelte + Vite.

### Explicitly excluded in V1

- Unity WebGL and Godot Web exports
- Native desktop or mobile applications
- Server-dependent games requiring custom Node/Express/WebSocket backends

## Optional `opengamehub.json` manifest

Automatic detection is the default. To customize your game's display title,
description, controls, or category, add `opengamehub.json` inside the game folder:

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

## AI-assisted game migration

For a focused migration prompt, see
[AI Game Migration Prompt](./docs/AI_GAME_MIGRATION_PROMPT.md).

## Security, licensing, and ownership

- Submit only games and assets that you own or have an open-source compatible
  license to distribute.
- Games run in
  `<iframe sandbox="allow-scripts allow-pointer-lock" referrerPolicy="no-referrer">`.
- Games cannot access the parent page DOM, cookies, or storage.
- `preinstall`, `install`, and `postinstall` hooks and symbolic links inside
  `/games` are rejected by CI.
