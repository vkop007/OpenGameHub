import fs from "node:fs";
import path from "node:path";
import {
  isSafeGameId,
  type DiscoveredGame,
  type GameCategory,
  type GameEngine,
  type GameFramework
} from "@opengamehub/game-discovery";
import type { GameBuildReport } from "@opengamehub/game-builder";

export interface PublishedGameEntry {
  id: string;
  name: string;
  description: string;
  author: string;
  engine: GameEngine;
  framework: GameFramework;
  buildAdapter: "static" | "vite";
  category: GameCategory;
  tags: string[];
  thumbnail: string;
  playUrl: string;
  version: string;
  status: "published";
  controls: string[];
  aspectRatio: string;
  bundleSizeBytes: number;
}

export interface FailedGameEntry {
  id: string;
  name: string;
  buildStatus: "failed";
  error: string;
}

export interface GameRegistryDocument {
  generatedAt: string;
  games: PublishedGameEntry[];
  failedGames: FailedGameEntry[];
}

export function generateGameRegistry(
  discoveredGames: DiscoveredGame[],
  buildReports: GameBuildReport[]
): GameRegistryDocument {
  const reportById = new Map<string, GameBuildReport>();
  for (const r of buildReports) {
    reportById.set(r.id, r);
  }

  const seenIds = new Set<string>();
  const published: PublishedGameEntry[] = [];
  const failed: FailedGameEntry[] = [];

  for (const game of discoveredGames) {
    if (!isSafeGameId(game.id)) {
      failed.push({
        id: game.id,
        name: game.name,
        buildStatus: "failed",
        error: `Invalid game ID "${game.id}".`
      });
      continue;
    }

    if (seenIds.has(game.id)) {
      failed.push({
        id: game.id,
        name: game.name,
        buildStatus: "failed",
        error: `Duplicate game ID "${game.id}".`
      });
      continue;
    }
    seenIds.add(game.id);

    const report = reportById.get(game.id);
    if (
      !report ||
      report.buildStatus !== "success" ||
      !report.playUrl ||
      game.buildAdapter === "unsupported"
    ) {
      failed.push({
        id: game.id,
        name: game.name,
        buildStatus: "failed",
        error: report?.error ?? "Game build failed or project is unsupported."
      });
      continue;
    }

    published.push({
      id: game.id,
      name: game.name,
      description: game.description,
      author: game.author,
      engine: game.engine,
      framework: game.framework,
      buildAdapter: game.buildAdapter,
      category: game.category,
      tags: game.tags,
      thumbnail: report.thumbnailUrl ?? `/games-thumbnails/${game.id}.svg`,
      playUrl: report.playUrl,
      version: game.version,
      status: "published",
      controls: game.controls,
      aspectRatio: game.aspectRatio,
      bundleSizeBytes: report.totalBytes
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    games: published,
    failedGames: failed
  };
}

export function writeRegistryFile(
  registryFilePath: string,
  registry: GameRegistryDocument
): void {
  fs.mkdirSync(path.dirname(registryFilePath), { recursive: true });
  fs.writeFileSync(registryFilePath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
}

export function readRegistryFile(registryFilePath: string): GameRegistryDocument {
  if (!fs.existsSync(registryFilePath)) {
    return {
      generatedAt: new Date(0).toISOString(),
      games: [],
      failedGames: []
    };
  }
  return JSON.parse(fs.readFileSync(registryFilePath, "utf8")) as GameRegistryDocument;
}
