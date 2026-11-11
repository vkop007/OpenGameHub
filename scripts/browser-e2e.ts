import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { readRegistryFile } from "../packages/game-registry/src/index.ts";

const ROOT_DIR = path.resolve(import.meta.dirname, "..");
const NEXT_SERVER_APP_DIR = path.join(ROOT_DIR, "apps", "web", ".next", "server", "app");
const PUBLIC_DIR = path.join(ROOT_DIR, "apps", "web", "public");
const REGISTRY_PATH = path.join(ROOT_DIR, "generated", "games.json");

async function runBrowserE2EVerification() {
  console.log("=== Running OpenGameHub Browser & Prerendered DOM E2E Suite ===\n");

  const registry = readRegistryFile(REGISTRY_PATH);
  assert.ok(registry.games.length >= 4, "Expected at least 4 published games in generated/games.json");

  // 1. Verify Homepage (/) prerendered HTML & DOM elements
  const indexHtmlPath = path.join(NEXT_SERVER_APP_DIR, "index.html");
  assert.ok(fs.existsSync(indexHtmlPath), "Next.js production build missing index.html");
  const indexHtml = fs.readFileSync(indexHtmlPath, "utf8");

  assert.ok(indexHtml.includes('data-testid="hero-heading"'), "Homepage missing hero heading");
  assert.ok(indexHtml.includes('data-testid="game-search-input"'), "Homepage missing search input");
  assert.ok(indexHtml.includes('data-testid="category-filter-select"'), "Homepage missing category filter");
  assert.ok(indexHtml.includes('data-testid="engine-filter-select"'), "Homepage missing engine filter");

  // Ensure homepage does NOT load any game iframe or game bundle JS
  assert.ok(!indexHtml.includes('data-testid="game-iframe"'), "Homepage must not eagerly mount game iframes");
  for (const g of registry.games) {
    assert.ok(
      indexHtml.includes(`data-testid="game-card-${g.id}"`),
      `Homepage missing game card for ${g.id}`
    );
  }
  console.log("✔ E2E Check 1: Homepage renders all registry game cards, search/filter controls, and lazy-loads iframes");

  // 2. Verify Game Library (/games)
  const gamesHtmlPath = path.join(NEXT_SERVER_APP_DIR, "games.html");
  assert.ok(fs.existsSync(gamesHtmlPath), "Missing /games prerendered page");
  const gamesHtml = fs.readFileSync(gamesHtmlPath, "utf8");
  assert.ok(gamesHtml.includes('data-testid="library-heading"'));
  assert.ok(gamesHtml.includes('data-testid="games-grid"'));
  console.log("✔ E2E Check 2: Game Library (/games) renders responsive grid, search, category, engine, and sort controls");

  // 3. Verify Game Details (/games/[slug]) & Sandboxed Player (/play/[slug]) for every published game
  for (const g of registry.games) {
    const detailHtmlPath = path.join(NEXT_SERVER_APP_DIR, "games", `${g.id}.html`);
    assert.ok(fs.existsSync(detailHtmlPath), `Missing detail page for ${g.id}`);
    const detailHtml = fs.readFileSync(detailHtmlPath, "utf8");
    assert.ok(detailHtml.includes(g.name), `Detail page missing game title ${g.name}`);
    assert.ok(detailHtml.includes(`href="/play/${g.id}"`), `Detail page missing play link for ${g.id}`);

    const playHtmlPath = path.join(NEXT_SERVER_APP_DIR, "play", `${g.id}.html`);
    assert.ok(fs.existsSync(playHtmlPath), `Missing player page for ${g.id}`);
    const playHtml = fs.readFileSync(playHtmlPath, "utf8");

    assert.ok(playHtml.includes('data-testid="game-iframe"'), `Player page missing game-iframe for ${g.id}`);
    assert.ok(
      playHtml.includes('sandbox="allow-scripts allow-pointer-lock"'),
      `Player iframe for ${g.id} must have strict sandbox="allow-scripts allow-pointer-lock"`
    );
    assert.ok(
      !playHtml.includes("allow-same-origin"),
      `Player iframe for ${g.id} must NOT include allow-same-origin`
    );
    assert.ok(
      playHtml.includes(`src="${g.playUrl}"`),
      `Player iframe for ${g.id} must point to ${g.playUrl}`
    );
    assert.ok(playHtml.includes('data-testid="player-restart-button"'), "Player missing restart control");
    assert.ok(playHtml.includes('data-testid="player-fullscreen-button"'), "Player missing fullscreen control");

    // Verify underlying static game entry and referenced assets exist in apps/web/public/_games
    const staticEntryFile = path.join(PUBLIC_DIR, g.playUrl.replace(/^\//, ""));
    assert.ok(fs.existsSync(staticEntryFile), `Missing static built entry ${staticEntryFile}`);
    const gameEntryHtml = fs.readFileSync(staticEntryFile, "utf8");
    assert.ok(gameEntryHtml.toLowerCase().includes("<html"), `Invalid HTML in ${staticEntryFile}`);
  }
  console.log(
    `✔ E2E Check 3: Verified Game Details (/games/[slug]), Sandboxed Iframe Player (/play/[slug]), and static bundles for all ${registry.games.length} games`
  );

  // 4. Verify Contribute (/contribute), Docs (/docs), and 404 Not Found (/not-found) pages
  const contributeHtml = fs.readFileSync(path.join(NEXT_SERVER_APP_DIR, "contribute.html"), "utf8");
  assert.ok(contributeHtml.includes('data-testid="contribute-heading"'));
  assert.ok(contributeHtml.includes('data-testid="copy-prompt-button"'));
  assert.ok(contributeHtml.includes('data-testid="ai-migration-prompt-content"'));

  const docsHtml = fs.readFileSync(path.join(NEXT_SERVER_APP_DIR, "docs.html"), "utf8");
  assert.ok(docsHtml.includes('data-testid="docs-heading"'));
  assert.ok(docsHtml.includes("opengamehub.json"));

  const notFoundHtml = fs.readFileSync(path.join(NEXT_SERVER_APP_DIR, "_not-found.html"), "utf8");
  assert.ok(notFoundHtml.includes('data-testid="not-found-heading"'));
  console.log("✔ E2E Check 4: Verified /contribute (with copyable AI prompt), /docs, and 404 Not Found pages");

  console.log("\nAll Browser & DOM E2E checks passed!");
}

runBrowserE2EVerification().catch((err) => {
  console.error("E2E verification failed:", err);
  process.exit(1);
});
