import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { scanGamesDirectory, inspectGameFolder } from "../../packages/game-discovery/src/index.ts";
import { buildAllGames } from "../../packages/game-builder/src/index.ts";
import { generateGameRegistry } from "../../packages/game-registry/src/index.ts";

export async function runPipelineIntegrationTests(): Promise<number> {
  let passed = 0;
  const repoRoot = path.resolve(import.meta.dirname, "../..");
  const realGamesDir = path.join(repoRoot, "games");

  // 1. Verify real repository /games discovery and build
  const { games, duplicateIds } = scanGamesDirectory(realGamesDir);
  assert.equal(duplicateIds.length, 0);
  assert.ok(games.length >= 4, "Expected at least 4 reference games in /games");

  const tmpOut = fs.mkdtempSync(path.join(os.tmpdir(), "ogh-int-pipeline-"));
  try {
    const publicGamesDir = path.join(tmpOut, "_games");
    const publicThumbsDir = path.join(tmpOut, "games-thumbnails");

    // 2. Add a simulated broken game alongside valid games to verify failure isolation
    const brokenDir = path.join(tmpOut, "broken-game");
    fs.mkdirSync(brokenDir, { recursive: true });
    // index.html references a non-existent script "./missing-bundle.js"
    fs.writeFileSync(
      path.join(brokenDir, "index.html"),
      '<html><body><script src="./missing-bundle.js"></script></body></html>'
    );
    const brokenDiscovered = inspectGameFolder(brokenDir);

    const allToBuild = [...games, brokenDiscovered];
    const { reports } = await buildAllGames({
      games: allToBuild,
      publicGamesRootDir: publicGamesDir,
      publicThumbnailsRootDir: publicThumbsDir
    });

    const successReports = reports.filter((r) => r.buildStatus === "success");
    const failedReports = reports.filter((r) => r.buildStatus === "failed");

    assert.equal(successReports.length, games.length);
    assert.equal(failedReports.length, 1);
    assert.equal(failedReports[0].id, "broken-game");
    assert.ok(failedReports[0].error?.includes("missing-bundle.js"));
    passed++;

    // 3. Verify registry generation excludes failed games and includes valid games
    const registry = generateGameRegistry(allToBuild, reports);
    assert.equal(registry.games.length, games.length);
    assert.equal(registry.failedGames.length, 1);
    assert.equal(registry.failedGames[0].id, "broken-game");

    for (const entry of registry.games) {
      assert.equal(entry.status, "published");
      assert.ok(entry.playUrl.startsWith(`/_games/${entry.id}/${entry.version}/`));
      const builtIndex = path.join(publicGamesDir, entry.id, entry.version, "index.html");
      assert.ok(fs.existsSync(builtIndex), `Missing built index.html for ${entry.id}`);
    }
    passed++;
  } finally {
    fs.rmSync(tmpOut, { recursive: true, force: true });
  }

  return passed;
}
