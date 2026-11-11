import path from "node:path";
import fs from "node:fs";
import { inspectGameFolder, scanGamesDirectory } from "../packages/game-discovery/src/index.ts";
import { buildAllGames, buildSingleGame } from "../packages/game-builder/src/index.ts";
import {
  generateGameRegistry,
  writeRegistryFile
} from "../packages/game-registry/src/index.ts";

const ROOT_DIR = path.resolve(import.meta.dirname, "..");
const GAMES_DIR = path.join(ROOT_DIR, "games");
const PUBLIC_GAMES_DIR = path.join(ROOT_DIR, "apps", "web", "public", "_games");
const PUBLIC_THUMBS_DIR = path.join(ROOT_DIR, "apps", "web", "public", "games-thumbnails");
const REGISTRY_FILE = path.join(ROOT_DIR, "generated", "games.json");

const command = process.argv[2] ?? "scan";
const targetSlug = process.argv[3];

async function run() {
  if (command === "scan") {
    const { games, duplicateIds } = scanGamesDirectory(GAMES_DIR);
    console.log(`\n=== OpenGameHub Discovery Scan (${games.length} folder(s)) ===\n`);
    for (const g of games) {
      console.log(`• [${g.id}] ${g.name}`);
      console.log(`  Framework: ${g.framework} | Engine: ${g.engine} | Adapter: ${g.buildAdapter}`);
      console.log(`  Status: ${g.status.toUpperCase()}`);
      if (g.issues.length > 0) {
        for (const issue of g.issues) {
          console.log(`  - [${issue.severity.toUpperCase()}] ${issue.code}: ${issue.message}`);
        }
      }
    }
    if (duplicateIds.length > 0) {
      console.error(`\nDuplicate Game IDs detected: ${duplicateIds.join(", ")}`);
      process.exit(1);
    }
    return;
  }

  if (command === "validate") {
    const { games, duplicateIds } = scanGamesDirectory(GAMES_DIR);
    let hasError = duplicateIds.length > 0;
    console.log(`\n=== Validating ${games.length} Contributed Game(s) ===\n`);
    for (const g of games) {
      const errors = g.issues.filter((i) => i.severity === "error");
      if (errors.length > 0 || g.status !== "supported") {
        hasError = true;
        console.error(`✖ ${g.id}: INVALID (${errors.map((e) => e.message).join("; ")})`);
      } else {
        console.log(`✔ ${g.id}: Valid (${g.buildAdapter} adapter, engine: ${g.engine}, framework: ${g.framework})`);
      }
    }
    if (hasError) {
      process.exit(1);
    }
    return;
  }

  if (command === "validate-one") {
    if (!targetSlug) {
      console.error("Usage: pnpm game:validate <game-slug>");
      process.exit(1);
    }
    const folderPath = path.join(GAMES_DIR, targetSlug);
    if (!fs.existsSync(folderPath)) {
      console.error(`Game folder not found: games/${targetSlug}`);
      process.exit(1);
    }
    const discovered = inspectGameFolder(folderPath);
    console.log(`\n=== Validation Report for "${discovered.id}" ===`);
    console.log(`Detected framework: ${discovered.framework}`);
    console.log(`Detected engine:    ${discovered.engine}`);
    console.log(`Build adapter:      ${discovered.buildAdapter}`);
    console.log(`Status:             ${discovered.status.toUpperCase()}`);
    for (const issue of discovered.issues) {
      console.log(`[${issue.severity.toUpperCase()}] ${issue.code}: ${issue.message}`);
    }
    if (discovered.status !== "supported") {
      process.exit(1);
    }
    return;
  }

  if (command === "build-one") {
    if (!targetSlug) {
      console.error("Usage: pnpm game:build <game-slug>");
      process.exit(1);
    }
    const folderPath = path.join(GAMES_DIR, targetSlug);
    if (!fs.existsSync(folderPath)) {
      console.error(`Game folder not found: games/${targetSlug}`);
      process.exit(1);
    }
    const discovered = inspectGameFolder(folderPath);
    const report = await buildSingleGame(discovered, {
      publicGamesRootDir: PUBLIC_GAMES_DIR,
      publicThumbnailsRootDir: PUBLIC_THUMBS_DIR
    });
    console.log(JSON.stringify(report, null, 2));
    if (report.buildStatus !== "success") {
      process.exit(1);
    }
    return;
  }

  if (command === "build") {
    const { games } = scanGamesDirectory(GAMES_DIR);
    console.log(`\n=== Building ${games.length} Contributed Game(s) ===\n`);
    const { reports, totalBytes, collectionWarnings } = await buildAllGames({
      games,
      publicGamesRootDir: PUBLIC_GAMES_DIR,
      publicThumbnailsRootDir: PUBLIC_THUMBS_DIR
    });

    for (const r of reports) {
      if (r.buildStatus === "success") {
        console.log(
          `✔ ${r.id}@${r.version} [${r.adapter}] -> ${r.playUrl} (${(r.totalBytes / 1024).toFixed(1)} KB in ${r.durationMs}ms)`
        );
      } else {
        console.warn(`✖ ${r.id}@${r.version} FAILED: ${r.error}`);
      }
    }

    for (const w of collectionWarnings) {
      console.warn(`⚠ ${w}`);
    }

    const registry = generateGameRegistry(games, reports);
    writeRegistryFile(REGISTRY_FILE, registry);
    console.log(
      `\nGenerated registry at generated/games.json with ${registry.games.length} published game(s) (${(totalBytes / 1024).toFixed(1)} KB total).`
    );

    if (process.env.STRICT_GAME_BUILD === "true" && registry.failedGames.length > 0) {
      console.error(`Strict build mode enabled and ${registry.failedGames.length} game(s) failed to build.`);
      process.exit(1);
    }
    return;
  }

  if (command === "test") {
    const { games, duplicateIds } = scanGamesDirectory(GAMES_DIR);
    if (duplicateIds.length > 0) {
      console.error(`Duplicate game IDs found: ${duplicateIds.join(", ")}`);
      process.exit(1);
    }
    const { reports } = await buildAllGames({
      games,
      publicGamesRootDir: PUBLIC_GAMES_DIR,
      publicThumbnailsRootDir: PUBLIC_THUMBS_DIR
    });
    const registry = generateGameRegistry(games, reports);
    writeRegistryFile(REGISTRY_FILE, registry);

    let failedCount = 0;
    for (const r of reports) {
      if (r.buildStatus !== "success" || !r.outputDir) {
        console.error(`✖ Game integration test failed for ${r.id}: ${r.error}`);
        failedCount++;
        continue;
      }
      const entryFile = path.join(r.outputDir, "index.html");
      if (!fs.existsSync(entryFile)) {
        console.error(`✖ Missing index.html in built output for ${r.id}`);
        failedCount++;
        continue;
      }
      console.log(`✔ Verified build & output integrity for ${r.id} (${r.playUrl})`);
    }

    if (failedCount > 0) {
      process.exit(1);
    }
    console.log(`\nAll ${reports.length} contributed games passed integration verification.`);
    return;
  }

  console.error(`Unknown command: ${command}`);
  process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
