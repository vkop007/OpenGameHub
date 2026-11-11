import type {
  GameCategory,
  GameEngine,
  GameFramework,
  OpenGameHubManifest,
  ValidationIssue
} from "./types.ts";

export const VALID_ENGINES: readonly GameEngine[] = [
  "threejs",
  "react-three-fiber",
  "babylonjs",
  "playcanvas",
  "phaser",
  "pixijs",
  "canvas2d",
  "none"
];

export const VALID_FRAMEWORKS: readonly GameFramework[] = [
  "vanilla",
  "react",
  "vue",
  "svelte"
];

export const VALID_ADAPTERS = ["static", "vite"] as const;

export const VALID_CATEGORIES: readonly GameCategory[] = [
  "action",
  "arcade",
  "puzzle",
  "racing",
  "rpg",
  "shooter",
  "simulation",
  "sports",
  "strategy",
  "adventure",
  "other"
];

export const MANIFEST_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "OpenGameHub Game Manifest",
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1, maxLength: 80 },
    description: { type: "string", minLength: 1, maxLength: 500 },
    version: {
      type: "string",
      pattern: "^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$"
    },
    author: { type: "string", minLength: 1, maxLength: 100 },
    engine: { type: "string", enum: VALID_ENGINES },
    framework: { type: "string", enum: VALID_FRAMEWORKS },
    buildAdapter: { type: "string", enum: VALID_ADAPTERS },
    entry: { type: "string", minLength: 1, maxLength: 120 },
    thumbnail: { type: "string", minLength: 1, maxLength: 200 },
    category: { type: "string", enum: VALID_CATEGORIES },
    tags: {
      type: "array",
      maxItems: 12,
      items: { type: "string", minLength: 1, maxLength: 32 }
    },
    controls: {
      type: "array",
      maxItems: 15,
      items: { type: "string", minLength: 1, maxLength: 64 }
    },
    aspectRatio: {
      type: "string",
      pattern: "^\\d+:\\d+$"
    }
  }
} as const;

const ALLOWED_KEYS = new Set(Object.keys(MANIFEST_JSON_SCHEMA.properties));
const FORBIDDEN_COMMAND_KEYS = new Set([
  "scripts",
  "buildCommand",
  "installCommand",
  "prebuild",
  "postbuild",
  "shell",
  "exec",
  "command",
  "env"
]);

export function isSafeRelativePath(inputPath: string): boolean {
  if (!inputPath || typeof inputPath !== "string") return false;
  if (inputPath.startsWith("/") || inputPath.startsWith("\\")) return false;
  if (/^[a-zA-Z]:/.test(inputPath)) return false;
  if (inputPath.includes("\0")) return false;
  const normalized = inputPath.replace(/\\/g, "/");
  const segments = normalized.split("/");
  for (const seg of segments) {
    if (seg === "..") return false;
  }
  return true;
}

export function isSafeGameId(id: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) && id.length >= 2 && id.length <= 64;
}

export function validateManifest(raw: unknown): {
  manifest: OpenGameHubManifest | null;
  issues: ValidationIssue[];
} {
  const issues: ValidationIssue[] = [];

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    issues.push({
      code: "MANIFEST_INVALID_ROOT",
      severity: "error",
      message: "opengamehub.json must be a JSON object."
    });
    return { manifest: null, issues };
  }

  const obj = raw as Record<string, unknown>;

  for (const key of Object.keys(obj)) {
    if (FORBIDDEN_COMMAND_KEYS.has(key)) {
      issues.push({
        code: "MANIFEST_FORBIDDEN_COMMAND_KEY",
        severity: "error",
        field: key,
        message: `Unsafe build override field "${key}" is not allowed in opengamehub.json.`,
        suggestion: "Remove arbitrary shell or command overrides. Configure standard Vite or Static HTML settings instead."
      });
    } else if (!ALLOWED_KEYS.has(key)) {
      issues.push({
        code: "MANIFEST_UNKNOWN_KEY",
        severity: "error",
        field: key,
        message: `Unknown property "${key}" in opengamehub.json.`,
        suggestion: `Allowed fields are: ${[...ALLOWED_KEYS].join(", ")}`
      });
    }
  }

  if (obj.name !== undefined) {
    if (typeof obj.name !== "string" || obj.name.trim().length === 0 || obj.name.length > 80) {
      issues.push({
        code: "MANIFEST_INVALID_NAME",
        severity: "error",
        field: "name",
        message: '"name" must be a non-empty string up to 80 characters.'
      });
    }
  }

  if (obj.description !== undefined) {
    if (typeof obj.description !== "string" || obj.description.trim().length === 0 || obj.description.length > 500) {
      issues.push({
        code: "MANIFEST_INVALID_DESCRIPTION",
        severity: "error",
        field: "description",
        message: '"description" must be a non-empty string up to 500 characters.'
      });
    }
  }

  if (obj.version !== undefined) {
    const semverRe = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
    if (typeof obj.version !== "string" || !semverRe.test(obj.version)) {
      issues.push({
        code: "MANIFEST_INVALID_VERSION",
        severity: "error",
        field: "version",
        message: '"version" must be a valid semantic version (e.g., "1.0.0").'
      });
    }
  }

  if (obj.author !== undefined) {
    if (typeof obj.author !== "string" || obj.author.trim().length === 0 || obj.author.length > 100) {
      issues.push({
        code: "MANIFEST_INVALID_AUTHOR",
        severity: "error",
        field: "author",
        message: '"author" must be a non-empty string up to 100 characters.'
      });
    }
  }

  if (obj.engine !== undefined) {
    if (typeof obj.engine !== "string" || !VALID_ENGINES.includes(obj.engine as GameEngine)) {
      issues.push({
        code: "MANIFEST_INVALID_ENGINE",
        severity: "error",
        field: "engine",
        message: `"engine" must be one of: ${VALID_ENGINES.join(", ")}.`
      });
    }
  }

  if (obj.framework !== undefined) {
    if (typeof obj.framework !== "string" || !VALID_FRAMEWORKS.includes(obj.framework as GameFramework)) {
      issues.push({
        code: "MANIFEST_INVALID_FRAMEWORK",
        severity: "error",
        field: "framework",
        message: `"framework" must be one of: ${VALID_FRAMEWORKS.join(", ")}.`
      });
    }
  }

  if (obj.buildAdapter !== undefined) {
    if (typeof obj.buildAdapter !== "string" || !VALID_ADAPTERS.includes(obj.buildAdapter as "static" | "vite")) {
      issues.push({
        code: "MANIFEST_INVALID_ADAPTER",
        severity: "error",
        field: "buildAdapter",
        message: `"buildAdapter" must be one of: ${VALID_ADAPTERS.join(", ")}.`
      });
    }
  }

  if (obj.entry !== undefined) {
    if (typeof obj.entry !== "string" || !isSafeRelativePath(obj.entry) || !obj.entry.endsWith(".html")) {
      issues.push({
        code: "MANIFEST_INVALID_ENTRY",
        severity: "error",
        field: "entry",
        message: '"entry" must be a safe relative path to an HTML file inside the game folder (e.g., "index.html").'
      });
    }
  }

  if (obj.thumbnail !== undefined) {
    if (typeof obj.thumbnail !== "string" || !isSafeRelativePath(obj.thumbnail)) {
      issues.push({
        code: "MANIFEST_INVALID_THUMBNAIL",
        severity: "error",
        field: "thumbnail",
        message: '"thumbnail" must be a safe relative file path inside the game folder.'
      });
    }
  }

  if (obj.category !== undefined) {
    if (typeof obj.category !== "string" || !VALID_CATEGORIES.includes(obj.category as GameCategory)) {
      issues.push({
        code: "MANIFEST_INVALID_CATEGORY",
        severity: "error",
        field: "category",
        message: `"category" must be one of: ${VALID_CATEGORIES.join(", ")}.`
      });
    }
  }

  if (obj.tags !== undefined) {
    if (
      !Array.isArray(obj.tags) ||
      obj.tags.length > 12 ||
      obj.tags.some((t) => typeof t !== "string" || t.trim().length === 0 || t.length > 32)
    ) {
      issues.push({
        code: "MANIFEST_INVALID_TAGS",
        severity: "error",
        field: "tags",
        message: '"tags" must be an array of up to 12 non-empty strings (max 32 chars each).'
      });
    }
  }

  if (obj.controls !== undefined) {
    if (
      !Array.isArray(obj.controls) ||
      obj.controls.length > 15 ||
      obj.controls.some((c) => typeof c !== "string" || c.trim().length === 0 || c.length > 64)
    ) {
      issues.push({
        code: "MANIFEST_INVALID_CONTROLS",
        severity: "error",
        field: "controls",
        message: '"controls" must be an array of up to 15 non-empty strings (max 64 chars each).'
      });
    }
  }

  if (obj.aspectRatio !== undefined) {
    if (typeof obj.aspectRatio !== "string" || !/^\d+:\d+$/.test(obj.aspectRatio)) {
      issues.push({
        code: "MANIFEST_INVALID_ASPECT_RATIO",
        severity: "error",
        field: "aspectRatio",
        message: '"aspectRatio" must be formatted like "16:9" or "4:3".'
      });
    }
  }

  if (issues.some((i) => i.severity === "error")) {
    return { manifest: null, issues };
  }

  return {
    manifest: obj as OpenGameHubManifest,
    issues
  };
}
