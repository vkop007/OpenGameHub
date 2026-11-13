# Security Policy

OpenGameHub runs community-contributed games as untrusted code, so we take
sandbox and supply-chain issues seriously.

## Reporting a vulnerability

**Please do not open a public issue for a security problem.**

Report it privately through GitHub: open the
[Security tab](https://github.com/vkop007/OpenGameHub/security) and choose
**Report a vulnerability**.

If that option is not available, open a public issue titled "Security contact
request" that contains **no technical details**. A maintainer will reply with a
private way to share them.

Please include:

- What the issue is and which part of the platform it affects
- Steps to reproduce, or a minimal proof of concept
- The impact you expect (for example, a game reading data from the parent page)

We aim to acknowledge reports within 5 business days and to share a fix plan
within 14 days. We will credit you in the release notes unless you prefer to stay
anonymous.

## In scope

- Escaping the game iframe sandbox
  (`sandbox="allow-scripts allow-pointer-lock"`, no `allow-same-origin`)
- Reading or changing the parent page, its cookies or its storage from a game
- Abuse of the `postMessage` / `MessageChannel` bridge in
  `packages/game-bridge`
- Path traversal, symlink or install-hook tricks that get past game validation
  and build isolation in `packages/game-discovery`, `game-adapters` and
  `game-builder`
- CI workflow weaknesses that could expose secrets or run untrusted code with
  write access

## Out of scope

- Issues in a contributed game's own gameplay logic that stay inside its sandbox
- Denial of service from a game using lots of CPU or memory in the player's own
  browser tab
- Reports that need a modified browser, or physical access to a device
- Findings from automated scanners with no demonstrated impact

## Supported versions

Only the latest commit on `main` is supported. Fixes are not backported.

## Guidance for game contributors

- Never commit secrets, API keys or tokens inside `games/`.
- `preinstall`, `install` and `postinstall` scripts and symbolic links inside
  `games/` are rejected by CI.
- Workflows must keep `permissions: contents: read` and must never use
  `pull_request_target`.
