import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { DiscoveredGame } from "@opengamehub/game-discovery";
import {
  StaticHtmlAdapter,
  ViteBuildAdapter,
  type GameBuildAdapter
} from "@opengamehub/game-adapters";

export interface GameBuildReport {
  id: string;
  name: string;
  version: string;
  engine: DiscoveredGame["engine"];
  framework: DiscoveredGame["framework"];
  adapter: DiscoveredGame["buildAdapter"];
  buildStatus: "success" | "failed";
  playUrl?: string;
  thumbnailUrl?: string;
  outputDir?: string;
  totalBytes: number;
  fileCount: number;
  durationMs: number;
  warnings: string[];
  error?: string;
}

export interface BuildAllGamesOptions {
  games: DiscoveredGame[];
  publicGamesRootDir: string;
  publicThumbnailsRootDir: string;
  maxGameSizeBytes?: number;
  maxTotalCollectionSizeBytes?: number;
  timeoutMs?: number;
}

const ADAPTERS: GameBuildAdapter[] = [
  new StaticHtmlAdapter(),
  new ViteBuildAdapter()
];

function generateDefaultSvgThumbnail(game: DiscoveredGame): string {
  const palette: Record<string, [string, string, string]> = {
    threejs: ["#0f172a", "#1e293b", "#38bdf8"],
    "react-three-fiber": ["#090d16", "#1e1b4b", "#818cf8"],
    phaser: ["#111827", "#1f2937", "#f59e0b"],
    pixijs: ["#0f172a", "#31102f", "#ec4899"],
    babylonjs: ["#18181b", "#27272a", "#fb7185"],
    playcanvas: ["#0c1322", "#1e293b", "#fb923c"],
    canvas2d: ["#052e16", "#064e3b", "#34d399"],
    none: ["#09090b", "#18181b", "#a855f7"]
  };
  const [bgStart, bgEnd, accent] = palette[game.engine] ?? palette.none;
  const safeTitle = game.name.replace(/[<>&"']/g, "");
  const safeEngine = game.engine.toUpperCase();
  const safeCategory = game.category.toUpperCase();

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bgStart}" />
      <stop offset="100%" stop-color="${bgEnd}" />
    </linearGradient>
    <radialGradient id="glow" cx="75%" cy="25%" r="55%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.32" />
      <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="800" height="450" fill="url(#bg)" />
  <rect width="800" height="450" fill="url(#glow)" />
  <g stroke="${accent}" stroke-opacity="0.14" stroke-width="1">
    <line x1="0" y1="90" x2="800" y2="90" />
    <line x1="0" y1="180" x2="800" y2="180" />
    <line x1="0" y1="270" x2="800" y2="270" />
    <line x1="0" y1="360" x2="800" y2="360" />
    <line x1="160" y1="0" x2="160" y2="450" />
    <line x1="320" y1="0" x2="320" y2="450" />
    <line x1="480" y1="0" x2="480" y2="450" />
    <line x1="640" y1="0" x2="640" y2="450" />
  </g>
  <rect x="48" y="48" width="140" height="32" rx="16" fill="${accent}" fill-opacity="0.18" stroke="${accent}" stroke-opacity="0.5" />
  <text x="118" y="69" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" text-anchor="middle">${safeCategory}</text>
  <text x="48" y="250" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="800" letter-spacing="-1">${safeTitle}</text>
  <text x="48" y="292" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="500">ENGINE: ${safeEngine} • V${game.version}</text>
  <circle cx="670" cy="225" r="78" fill="none" stroke="${accent}" stroke-width="3" stroke-opacity="0.55" />
  <polygon points="652,190 652,260 708,225" fill="${accent}" />
</svg>`;
}

export async function buildSingleGame(
  game: DiscoveredGame,
  options: {
    publicGamesRootDir: string;
    publicThumbnailsRootDir: string;
    maxGameSizeBytes?: number;
    timeoutMs?: number;
  }
): Promise<GameBuildReport> {
  const startTime = Date.now();

  if (game.status !== "supported") {
    const errorMsg =
      game.issues.filter((i) => i.severity === "error").map((i) => i.message).join("; ") ||
      "Game project is unsupported or invalid.";
    return {
      id: game.id,
      name: game.name,
      version: game.version,
      engine: game.engine,
      framework: game.framework,
      adapter: game.buildAdapter,
      buildStatus: "failed",
      totalBytes: 0,
      fileCount: 0,
      durationMs: Date.now() - startTime,
      warnings: game.issues.filter((i) => i.severity === "warning").map((i) => i.message),
      error: errorMsg
    };
  }

  const adapter = ADAPTERS.find((a) => a.canHandle(game));
  if (!adapter) {
    return {
      id: game.id,
      name: game.name,
      version: game.version,
      engine: game.engine,
      framework: game.framework,
      adapter: game.buildAdapter,
      buildStatus: "failed",
      totalBytes: 0,
      fileCount: 0,
      durationMs: Date.now() - startTime,
      warnings: [],
      error: `No build adapter available for "${game.buildAdapter}".`
    };
  }

  const outputDir = path.join(options.publicGamesRootDir, game.id, game.version);
  const tempWorkDir = fs.mkdtempSync(path.join(os.tmpdir(), `ogh-build-${game.id}-`));

  const result = await adapter.build({
    game,
    tempWorkDir,
    outputDir,
    timeoutMs: options.timeoutMs,
    maxOutputSizeBytes: options.maxGameSizeBytes
  });

  if (!result.success) {
    return {
      id: game.id,
      name: game.name,
      version: game.version,
      engine: game.engine,
      framework: game.framework,
      adapter: game.buildAdapter,
      buildStatus: "failed",
      totalBytes: result.totalBytes,
      fileCount: result.fileCount,
      durationMs: result.durationMs,
      warnings: result.warnings,
      error: result.error ?? "Production build failed"
    };
  }

  // Handle thumbnail copying or fallback SVG generation
  fs.mkdirSync(options.publicThumbnailsRootDir, { recursive: true });
  let thumbnailUrl = `/games-thumbnails/${game.id}.svg`;

  if (game.thumbnail) {
    const srcThumb = path.join(game.folderPath, game.thumbnail);
    if (fs.existsSync(srcThumb) && fs.statSync(srcThumb).isFile()) {
      const ext = path.extname(game.thumbnail) || ".webp";
      const destThumbName = `${game.id}${ext}`;
      fs.copyFileSync(srcThumb, path.join(options.publicThumbnailsRootDir, destThumbName));
      thumbnailUrl = `/games-thumbnails/${destThumbName}`;
    } else {
      fs.writeFileSync(
        path.join(options.publicThumbnailsRootDir, `${game.id}.svg`),
        generateDefaultSvgThumbnail(game),
        "utf8"
      );
    }
  } else {
    fs.writeFileSync(
      path.join(options.publicThumbnailsRootDir, `${game.id}.svg`),
      generateDefaultSvgThumbnail(game),
      "utf8"
    );
  }

  const playUrl = `/_games/${game.id}/${game.version}/${game.entry}`;

  return {
    id: game.id,
    name: game.name,
    version: game.version,
    engine: game.engine,
    framework: game.framework,
    adapter: game.buildAdapter,
    buildStatus: "success",
    playUrl,
    thumbnailUrl,
    outputDir,
    totalBytes: result.totalBytes,
    fileCount: result.fileCount,
    durationMs: result.durationMs,
    warnings: result.warnings
  };
}

export async function buildAllGames(
  options: BuildAllGamesOptions
): Promise<{
  reports: GameBuildReport[];
  totalBytes: number;
  collectionWarnings: string[];
}> {
  const reports: GameBuildReport[] = [];
  const collectionWarnings: string[] = [];
  const maxTotalBytes = options.maxTotalCollectionSizeBytes ?? 200 * 1024 * 1024; // 200 MB soft collection warning

  fs.mkdirSync(options.publicGamesRootDir, { recursive: true });
  fs.mkdirSync(options.publicThumbnailsRootDir, { recursive: true });

  let totalBytes = 0;

  for (const game of options.games) {
    const report = await buildSingleGame(game, {
      publicGamesRootDir: options.publicGamesRootDir,
      publicThumbnailsRootDir: options.publicThumbnailsRootDir,
      maxGameSizeBytes: options.maxGameSizeBytes,
      timeoutMs: options.timeoutMs
    });
    reports.push(report);
    if (report.buildStatus === "success") {
      totalBytes += report.totalBytes;
    }
  }

  if (totalBytes > maxTotalBytes) {
    collectionWarnings.push(
      `Total built games size (${(totalBytes / (1024 * 1024)).toFixed(2)} MB) exceeds configured warning threshold (${(maxTotalBytes / (1024 * 1024)).toFixed(2)} MB). Monitor Vercel static deployment size limits.`
    );
  }

  return {
    reports,
    totalBytes,
    collectionWarnings
  };
}
