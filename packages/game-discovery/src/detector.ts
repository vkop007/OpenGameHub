import fs from "node:fs";
import path from "node:path";
import type {
  BuildAdapterType,
  DiscoveredGame,
  GameCategory,
  GameEngine,
  GameFramework,
  OpenGameHubManifest,
  ValidationIssue
} from "./types.ts";
import { isSafeGameId, isSafeRelativePath, validateManifest } from "./schema.ts";

const VITE_CONFIG_FILES = [
  "vite.config.ts",
  "vite.config.js",
  "vite.config.mjs",
  "vite.config.mts"
];

const THUMBNAIL_CANDIDATES = [
  "thumbnail.webp",
  "thumbnail.png",
  "thumbnail.jpg",
  "thumbnail.svg",
  "public/thumbnail.webp",
  "public/thumbnail.png",
  "public/thumbnail.svg",
  "assets/thumbnail.webp",
  "assets/thumbnail.png",
  "assets/thumbnail.svg"
];

const UNSUPPORTED_SIGNATURES: Array<{
  check: (files: string[], allDeps: Record<string, string>) => boolean;
  reason: string;
}> = [
  {
    check: (files) => files.some((f) => f.endsWith(".unity3d") || f.endsWith(".data.unityweb") || f.endsWith(".wasm.unityweb") || f === "ProjectSettings/ProjectVersion.txt"),
    reason: "Unity WebGL and Unity projects are explicitly excluded in OpenGameHub V1."
  },
  {
    check: (files) => files.some((f) => f === "project.godot" || f.endsWith(".pck")),
    reason: "Godot Web projects are explicitly excluded in OpenGameHub V1."
  },
  {
    check: (_files, deps) => Boolean(deps["express"] || deps["fastify"] || deps["socket.io"] || deps["ws"] || deps["koa"] || deps["@nestjs/core"]),
    reason: "Server-dependent game applications are not supported in OpenGameHub V1. Games must compile to static browser-ready files."
  },
  {
    check: (_files, deps) => Boolean(deps["webpack"] || deps["parcel"] || deps["@angular/core"] || deps["next"]),
    reason: "Unsupported build tool detected. OpenGameHub V1 supports Static HTML and Vite build adapters."
  }
];

export function formatTitleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function detectEngineFromDepsAndFiles(
  allDeps: Record<string, string>,
  htmlAndJsContent: string
): GameEngine {
  if (allDeps["@react-three/fiber"] || allDeps["@react-three/drei"]) {
    return "react-three-fiber";
  }
  if (allDeps["three"] || /from\s+["']three["']|THREE\./.test(htmlAndJsContent)) {
    return "threejs";
  }
  if (
    allDeps["@babylonjs/core"] ||
    allDeps["babylonjs"] ||
    /BABYLON\.|@babylonjs\/core/.test(htmlAndJsContent)
  ) {
    return "babylonjs";
  }
  if (allDeps["playcanvas"] || /pc\.Application|from\s+["']playcanvas["']/.test(htmlAndJsContent)) {
    return "playcanvas";
  }
  if (allDeps["phaser"] || /new\s+Phaser\.Game|from\s+["']phaser["']/.test(htmlAndJsContent)) {
    return "phaser";
  }
  if (allDeps["pixi.js"] || allDeps["@pixi/core"] || /PIXI\.Application|from\s+["']pixi\.js["']/.test(htmlAndJsContent)) {
    return "pixijs";
  }
  if (/getContext\(\s*["']2d["']\s*\)/.test(htmlAndJsContent)) {
    return "canvas2d";
  }
  return "none";
}

export function detectFrameworkFromDeps(allDeps: Record<string, string>): GameFramework {
  if (allDeps["react"] || allDeps["react-dom"] || allDeps["@react-three/fiber"]) {
    return "react";
  }
  if (allDeps["vue"]) {
    return "vue";
  }
  if (allDeps["svelte"] || allDeps["@sveltejs/vite-plugin-svelte"]) {
    return "svelte";
  }
  return "vanilla";
}

export function detectBuildAdapter(params: {
  hasPackageJson: boolean;
  hasViteConfig: boolean;
  allDeps: Record<string, string>;
  scripts: Record<string, string>;
  hasEntryHtml: boolean;
}): BuildAdapterType {
  const { hasPackageJson, hasViteConfig, allDeps, scripts, hasEntryHtml } = params;

  const usesVite =
    hasViteConfig ||
    Boolean(allDeps["vite"]) ||
    Object.values(scripts).some((s) => /\bvite\b/.test(s));

  if (usesVite && hasEntryHtml) {
    return "vite";
  }

  if (!hasPackageJson && hasEntryHtml) {
    return "static";
  }

  if (hasPackageJson && !usesVite && Object.keys(allDeps).length === 0 && hasEntryHtml) {
    return "static";
  }

  return "unsupported";
}

function collectSampleSourceText(folderPath: string, entryHtmlPath: string): string {
  const chunks: string[] = [];
  if (fs.existsSync(entryHtmlPath)) {
    try {
      chunks.push(fs.readFileSync(entryHtmlPath, "utf8").slice(0, 16000));
    } catch {
      // ignore read errors
    }
  }
  const candidateFiles = [
    "game.js",
    "main.js",
    "index.js",
    "src/main.ts",
    "src/main.tsx",
    "src/main.js",
    "src/index.ts",
    "src/index.js",
    "src/game.ts",
    "src/game.js",
    "js/game.js",
    "js/main.js"
  ];
  for (const rel of candidateFiles) {
    const full = path.join(folderPath, rel);
    if (fs.existsSync(full) && fs.statSync(full).isFile()) {
      try {
        chunks.push(fs.readFileSync(full, "utf8").slice(0, 16000));
      } catch {
        // ignore
      }
    }
  }
  return chunks.join("\n");
}

function listRelativeFilesSafe(rootDir: string, maxFiles = 500): {
  files: string[];
  hasSymlink: boolean;
  symlinkPaths: string[];
} {
  const files: string[] = [];
  const symlinkPaths: string[] = [];

  function walk(currentDir: string) {
    if (files.length >= maxFiles) return;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") {
        continue;
      }
      const fullPath = path.join(currentDir, entry.name);
      const relPath = path.relative(rootDir, fullPath).replace(/\\/g, "/");
      let lstat: fs.Stats;
      try {
        lstat = fs.lstatSync(fullPath);
      } catch {
        continue;
      }
      if (lstat.isSymbolicLink()) {
        symlinkPaths.push(relPath);
        continue;
      }
      if (lstat.isDirectory()) {
        walk(fullPath);
      } else if (lstat.isFile()) {
        files.push(relPath);
      }
    }
  }

  walk(rootDir);
  return {
    files,
    hasSymlink: symlinkPaths.length > 0,
    symlinkPaths
  };
}

export function inspectGameFolder(folderPath: string): DiscoveredGame {
  const folderName = path.basename(folderPath);
  const issues: ValidationIssue[] = [];

  if (!isSafeGameId(folderName)) {
    issues.push({
      code: "INVALID_GAME_ID",
      severity: "error",
      message: `Game folder name "${folderName}" is not a valid slug. Use lowercase alphanumeric characters and hyphens (e.g. "space-shooter").`
    });
  }

  const { files, hasSymlink, symlinkPaths } = listRelativeFilesSafe(folderPath);
  if (hasSymlink) {
    issues.push({
      code: "SYMLINK_FORBIDDEN",
      severity: "error",
      message: `Symbolic links are forbidden inside contributed game folders for security: ${symlinkPaths.join(", ")}`
    });
  }

  // 1. Optional Manifest
  const manifestPath = path.join(folderPath, "opengamehub.json");
  const hasManifest = fs.existsSync(manifestPath);
  let manifest: OpenGameHubManifest | null = null;

  if (hasManifest) {
    try {
      const rawText = fs.readFileSync(manifestPath, "utf8");
      const parsed = JSON.parse(rawText);
      const validated = validateManifest(parsed);
      manifest = validated.manifest;
      issues.push(...validated.issues);
    } catch (err) {
      issues.push({
        code: "MANIFEST_PARSE_ERROR",
        severity: "error",
        message: `Failed to parse opengamehub.json: ${err instanceof Error ? err.message : String(err)}`
      });
    }
  }

  // 2. Inspect package.json if present
  const pkgJsonPath = path.join(folderPath, "package.json");
  const hasPackageJson = fs.existsSync(pkgJsonPath);
  let pkgJson: Record<string, unknown> = {};
  let dependencies: Record<string, string> = {};
  let devDependencies: Record<string, string> = {};
  let scripts: Record<string, string> = {};

  if (hasPackageJson) {
    try {
      pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8")) as Record<string, unknown>;
      if (pkgJson.dependencies && typeof pkgJson.dependencies === "object") {
        dependencies = pkgJson.dependencies as Record<string, string>;
      }
      if (pkgJson.devDependencies && typeof pkgJson.devDependencies === "object") {
        devDependencies = pkgJson.devDependencies as Record<string, string>;
      }
      if (pkgJson.scripts && typeof pkgJson.scripts === "object") {
        scripts = pkgJson.scripts as Record<string, string>;
      }
    } catch (err) {
      issues.push({
        code: "PACKAGE_JSON_PARSE_ERROR",
        severity: "error",
        message: `Failed to parse package.json: ${err instanceof Error ? err.message : String(err)}`
      });
    }
  }

  const allDeps: Record<string, string> = { ...devDependencies, ...dependencies };

  // Check suspicious install scripts in package.json
  const lifecycleHooks = ["preinstall", "install", "postinstall", "prepare"];
  for (const hook of lifecycleHooks) {
    if (scripts[hook]) {
      issues.push({
        code: "UNSAFE_LIFECYCLE_SCRIPT",
        severity: "error",
        field: `scripts.${hook}`,
        message: `Lifecycle script "${hook}" in package.json is forbidden for security reasons.`,
        suggestion: "Remove preinstall/install/postinstall scripts from package.json."
      });
    }
  }

  // Detect lockfile / package manager
  let packageManager: "pnpm" | "npm" | "yarn" | "none" = "none";
  if (hasPackageJson) {
    if (fs.existsSync(path.join(folderPath, "pnpm-lock.yaml"))) {
      packageManager = "pnpm";
    } else if (fs.existsSync(path.join(folderPath, "package-lock.json"))) {
      packageManager = "npm";
    } else if (fs.existsSync(path.join(folderPath, "yarn.lock"))) {
      packageManager = "yarn";
    } else {
      packageManager = "pnpm";
    }
  }

  // Check Vite config
  const hasViteConfig = VITE_CONFIG_FILES.some((file) =>
    fs.existsSync(path.join(folderPath, file))
  );

  // Entry HTML file
  const entryRel = manifest?.entry ?? "index.html";
  const hasEntryHtml =
    isSafeRelativePath(entryRel) && fs.existsSync(path.join(folderPath, entryRel));

  if (!hasEntryHtml) {
    issues.push({
      code: "MISSING_ENTRY_HTML",
      severity: "error",
      field: "entry",
      message: `Entry HTML file "${entryRel}" was not found in ${folderName}.`,
      suggestion: "Ensure an index.html exists at the root of your game folder."
    });
  }

  // Check explicitly unsupported project signatures
  for (const sig of UNSUPPORTED_SIGNATURES) {
    if (sig.check(files, allDeps)) {
      issues.push({
        code: "UNSUPPORTED_PROJECT_TYPE",
        severity: "error",
        message: sig.reason
      });
    }
  }

  // Detect framework & engine
  const sampleSource = collectSampleSourceText(
    folderPath,
    path.join(folderPath, entryRel)
  );
  const detectedFramework = detectFrameworkFromDeps(allDeps);
  const detectedEngine = detectEngineFromDepsAndFiles(allDeps, sampleSource);
  const detectedAdapter = detectBuildAdapter({
    hasPackageJson,
    hasViteConfig,
    allDeps,
    scripts,
    hasEntryHtml
  });

  const finalFramework: GameFramework = manifest?.framework ?? detectedFramework;
  const finalEngine: GameEngine = manifest?.engine ?? detectedEngine;
  const finalAdapter: BuildAdapterType = manifest?.buildAdapter ?? detectedAdapter;

  if (finalAdapter === "unsupported") {
    issues.push({
      code: "UNSUPPORTED_BUILD_SYSTEM",
      severity: "error",
      message:
        "Could not detect a supported build adapter. OpenGameHub V1 supports Static HTML games and Vite projects.",
      suggestion:
        "Provide a standalone index.html for static games, or configure Vite in package.json / vite.config.ts."
    });
  }

  // Check thumbnail
  let resolvedThumbnail: string | undefined = manifest?.thumbnail;
  if (resolvedThumbnail) {
    const thumbFull = path.join(folderPath, resolvedThumbnail);
    if (!fs.existsSync(thumbFull)) {
      issues.push({
        code: "MISSING_THUMBNAIL",
        severity: "warning",
        field: "thumbnail",
        message: `Configured thumbnail "${resolvedThumbnail}" was not found; a generated fallback cover will be used.`
      });
      resolvedThumbnail = undefined;
    }
  } else {
    for (const candidate of THUMBNAIL_CANDIDATES) {
      if (fs.existsSync(path.join(folderPath, candidate))) {
        resolvedThumbnail = candidate;
        break;
      }
    }
  }

  // Fallback metadata
  const pkgName = typeof pkgJson.name === "string" ? pkgJson.name.replace(/^@[^/]+\//, "") : undefined;
  const pkgDesc = typeof pkgJson.description === "string" ? pkgJson.description : undefined;
  const pkgVersion =
    typeof pkgJson.version === "string" && /^\d+\.\d+\.\d+/.test(pkgJson.version)
      ? pkgJson.version
      : undefined;
  const pkgAuthor =
    typeof pkgJson.author === "string"
      ? pkgJson.author
      : typeof (pkgJson.author as { name?: string })?.name === "string"
        ? (pkgJson.author as { name: string }).name
        : undefined;

  const name = manifest?.name ?? formatTitleFromSlug(pkgName || folderName);
  const description =
    manifest?.description ??
    pkgDesc ??
    `Play ${name}, a community-contributed ${finalEngine !== "none" ? finalEngine : finalFramework} browser game on OpenGameHub.`;
  const version = manifest?.version ?? pkgVersion ?? "1.0.0";
  const author = manifest?.author ?? pkgAuthor ?? "OpenGameHub Community";
  const category: GameCategory = manifest?.category ?? "arcade";
  const defaultTags = [
    finalEngine !== "none" ? finalEngine : "web",
    finalFramework,
    category
  ];
  const tags = manifest?.tags && manifest.tags.length > 0 ? manifest.tags : defaultTags;
  const controls =
    manifest?.controls && manifest.controls.length > 0
      ? manifest.controls
      : ["Keyboard", "Mouse / Touch"];
  const aspectRatio = manifest?.aspectRatio ?? "16:9";

  const hasErrors = issues.some((i) => i.severity === "error");
  const status: DiscoveredGame["status"] = hasErrors
    ? issues.some((i) => i.code === "UNSUPPORTED_PROJECT_TYPE" || i.code === "UNSUPPORTED_BUILD_SYSTEM")
      ? "unsupported"
      : "invalid"
    : "supported";

  return {
    id: folderName,
    folderName,
    folderPath,
    name,
    description,
    version,
    author,
    engine: finalEngine,
    framework: finalFramework,
    buildAdapter: finalAdapter,
    entry: entryRel,
    thumbnail: resolvedThumbnail,
    category,
    tags,
    controls,
    aspectRatio,
    hasPackageJson,
    hasViteConfig,
    hasManifest,
    packageManager,
    dependencies,
    devDependencies,
    status,
    issues
  };
}

export function scanGamesDirectory(gamesRootDir: string): {
  games: DiscoveredGame[];
  duplicateIds: string[];
} {
  if (!fs.existsSync(gamesRootDir)) {
    return { games: [], duplicateIds: [] };
  }

  const entries = fs.readdirSync(gamesRootDir, { withFileTypes: true });
  const games: DiscoveredGame[] = [];
  const seenIds = new Map<string, string>();
  const duplicateIds: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(gamesRootDir, entry.name);
    let lstat: fs.Stats;
    try {
      lstat = fs.lstatSync(fullPath);
    } catch {
      continue;
    }

    if (lstat.isSymbolicLink() || !lstat.isDirectory()) {
      continue;
    }

    const discovered = inspectGameFolder(fullPath);
    const normalizedId = discovered.id.toLowerCase();

    if (seenIds.has(normalizedId)) {
      duplicateIds.push(normalizedId);
      discovered.issues.push({
        code: "DUPLICATE_GAME_ID",
        severity: "error",
        message: `Duplicate game ID "${normalizedId}" conflicts with folder "${seenIds.get(normalizedId)}".`
      });
      discovered.status = "invalid";
    } else {
      seenIds.set(normalizedId, discovered.folderName);
    }

    games.push(discovered);
  }

  games.sort((a, b) => a.id.localeCompare(b.id));
  return { games, duplicateIds };
}
