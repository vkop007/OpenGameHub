## What does this change?

<!-- One or two sentences. Link the issue it closes, e.g. "Closes #12". -->

## Type of change

- [ ] New game (`games/<slug>/` only)
- [ ] Bug fix
- [ ] Platform feature or UI change
- [ ] Documentation or tooling

## New game checklist

Skip this section if you are not adding a game.

- [ ] The pull request only touches `games/<slug>/` (no changes to `apps/`, `packages/`, root config or workflows)
- [ ] Folder name is lowercase kebab-case
- [ ] `pnpm game:validate <slug>` passes
- [ ] `pnpm game:build <slug>` passes
- [ ] I tested the game locally with `pnpm dev`
- [ ] I own the code and assets, or they use a compatible open-source license
- [ ] No secrets, `node_modules`, install hooks or symbolic links are included
- [ ] A gameplay screenshot is attached below

## Platform change checklist

Skip this section if you are adding a game.

- [ ] `pnpm lint`, `pnpm typecheck` and `pnpm test` pass
- [ ] `pnpm build` and `pnpm test:e2e` pass
- [ ] Existing `data-testid` attributes are preserved
- [ ] Screenshots are attached for UI changes

## Screenshots
