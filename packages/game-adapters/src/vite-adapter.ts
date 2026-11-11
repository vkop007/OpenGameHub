import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import type { DiscoveredGame } from "@opengamehub/game-discovery";
import type {
  AdapterBuildOptions,
  AdapterBuildResult,
  GameBuildAdapter
} from "./types.ts";
import {
  copyStaticGameFiles,
  normalizeHtmlRelativePaths,
  verifyHtmlReferencedAssets
} from "./utils.ts";

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_BYTES = 50 * 1024 * 1024; // 50 MB

function getSafeBuildEnv(): NodeJS.ProcessEnv {
  // Strip any deployment secrets or tokens from child build processes
  return {
    PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH ?? "/usr/bin:/bin"}`,
    HOME: process.env.HOME ?? "/tmp",
    NODE_ENV: "production",
    CI: "true"
  };
}

function bundleViteProjectLight(
  workDir: string,
  entryHtmlRel: string,
  distDir: string
): void {
  fs.mkdirSync(distDir, { recursive: true });
  const assetsOutDir = path.join(distDir, "assets");
  fs.mkdirSync(assetsOutDir, { recursive: true });

  // Copy public/ directory contents to dist root if present
  const publicDir = path.join(workDir, "public");
  if (fs.existsSync(publicDir) && fs.statSync(publicDir).isDirectory()) {
    copyStaticGameFiles(publicDir, distDir, { excludeConfigFiles: false });
  }

  // Copy any static asset folders at root (like assets/, textures/, models/, audio/, css/)
  for (const folder of ["assets", "textures", "models", "audio", "sounds", "css", "images"]) {
    const candidate = path.join(workDir, folder);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      copyStaticGameFiles(candidate, path.join(distDir, folder), { excludeConfigFiles: false });
    }
  }

  // Copy thumbnail if present at root
  for (const thumb of ["thumbnail.svg", "thumbnail.webp", "thumbnail.png", "thumbnail.jpg"]) {
    const thumbPath = path.join(workDir, thumb);
    if (fs.existsSync(thumbPath) && fs.statSync(thumbPath).isFile()) {
      fs.copyFileSync(thumbPath, path.join(distDir, thumb));
    }
  }

  const entryHtmlPath = path.join(workDir, entryHtmlRel);
  let html = fs.readFileSync(entryHtmlPath, "utf8");

  // Find module script tags pointing to local TypeScript/JavaScript entry files
  const scriptRegex = /<script\b[^>]*\bsrc=(["'])([^"']+\.(?:ts|tsx|js|jsx|mjs))\1[^>]*><\/script>/gi;

  html = html.replace(scriptRegex, (fullMatch, _quote, srcAttr: string) => {
    if (srcAttr.startsWith("http://") || srcAttr.startsWith("https://") || srcAttr.startsWith("//")) {
      return fullMatch;
    }
    const cleanSrc = srcAttr.replace(/^\.?\/+/, "");
    const absEntry = path.join(workDir, cleanSrc);
    if (!fs.existsSync(absEntry)) {
      throw new Error(`Referenced Vite script entry "${srcAttr}" does not exist.`);
    }

    const bundledCode = bundleModuleGraph(absEntry, workDir);
    const outFileName = "bundle.js";
    fs.writeFileSync(path.join(assetsOutDir, outFileName), bundledCode, "utf8");
    return `<script type="module" src="./assets/${outFileName}"></script>`;
  });

  html = normalizeHtmlRelativePaths(html);
  fs.writeFileSync(path.join(distDir, entryHtmlRel), html, "utf8");
}

function stripTypeScriptAnnotations(source: string): string {
  let code = source;
  // Remove `import type ...` statements
  code = code.replace(/^\s*import\s+type\s+[\s\S]*?from\s+["'][^"']+["'];?\s*$/gm, "");
  // Remove interface and type alias blocks (single and multi-line simple declarations)
  code = code.replace(/^\s*(?:export\s+)?type\s+[A-Za-z0-9_]+(?:<[^>]+>)?\s*=\s*[^;]+;\s*$/gm, "");
  code = code.replace(/^\s*(?:export\s+)?interface\s+[A-Za-z0-9_]+(?:\s+extends\s+[^{]+)?\s*\{[\s\S]*?^\s*\}/gm, "");
  // Remove `as Type` assertions for common identifiers
  code = code.replace(/\s+as\s+(?:const|any|unknown|HTMLElement|HTMLCanvasElement|CanvasRenderingContext2D|Window|[A-Z][A-Za-z0-9_<>[\]|&\s]*)(?=[,;)\]\n])/g, "");
  // Remove variable type annotations like `const x: number =`
  code = code.replace(/\b(const|let|var)\s+([A-Za-z0-9_$]+)\s*:\s*[^=;,\n]+(\s*=)/g, "$1 $2$3");
  // Remove function parameter and return type annotations on simple signatures
  code = code.replace(/(\([A-Za-z0-9_$,\s]*?):\s*[A-Za-z0-9_<>[\]|&\s]+(?=[,)])/g, "$1");
  return code;
}

function resolveLocalModule(fromFile: string, specifier: string): string | null {
  const baseDir = path.dirname(fromFile);
  const targetBase = path.resolve(baseDir, specifier.replace(/\.(js|ts|tsx|jsx)$/, ""));
  const extensions = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", "/index.ts", "/index.js"];
  for (const ext of extensions) {
    const candidate = ext ? `${targetBase}${ext}` : path.resolve(baseDir, specifier);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

function resolvePackageBrowserBundle(workDir: string, pkgName: string): string | null {
  // Check local vendor or node_modules inside the game or workspace
  const searchRoots = [
    path.join(workDir, "vendor"),
    path.join(workDir, "src", "vendor"),
    path.join(workDir, "node_modules")
  ];
  for (const root of searchRoots) {
    const directFile = path.join(root, `${pkgName}.js`);
    if (fs.existsSync(directFile) && fs.statSync(directFile).isFile()) {
      return directFile;
    }
    const pkgDir = path.join(root, pkgName);
    const pkgJsonFile = path.join(pkgDir, "package.json");
    if (fs.existsSync(pkgJsonFile)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgJsonFile, "utf8")) as Record<string, unknown>;
        const moduleEntry = (pkg.module || pkg.main || "index.js") as string;
        const resolved = path.join(pkgDir, moduleEntry);
        if (fs.existsSync(resolved)) return resolved;
      } catch {
        // ignore
      }
    }
    const indexCandidate = path.join(pkgDir, "index.js");
    if (fs.existsSync(indexCandidate)) return indexCandidate;
  }
  return null;
}

function bundleModuleGraph(entryFile: string, workDir: string): string {
  const visited = new Set<string>();
  const modulesOutput: string[] = [];
  const cssOutput: string[] = [];

  function visit(filePath: string) {
    const real = path.resolve(filePath);
    if (visited.has(real)) return;
    visited.add(real);

    if (real.endsWith(".css")) {
      const css = fs.readFileSync(real, "utf8");
      cssOutput.push(css);
      return;
    }

    let content = fs.readFileSync(real, "utf8");

    // Process imports
    const importRegex = /^\s*import\s+(?:([\s\S]*?)\s+from\s+)?(["'])([^"']+)\2\s*;?\s*$/gm;
    content = content.replace(importRegex, (_match, importedClause: string | undefined, _q, specifier: string) => {
      if (specifier.startsWith(".")) {
        const resolved = resolveLocalModule(real, specifier);
        if (!resolved) {
          throw new Error(`Cannot resolve local import "${specifier}" from "${path.relative(workDir, real)}"`);
        }
        visit(resolved);
        return "";
      } else {
        const resolvedPkg = resolvePackageBrowserBundle(workDir, specifier);
        if (resolvedPkg) {
          visit(resolvedPkg);
          return "";
        }
        throw new Error(`Unresolved external package "${specifier}" in "${path.relative(workDir, real)}"`);
      }
    });

    // Strip export keywords so top-level declarations share bundle scope cleanly
    content = content.replace(/^\s*export\s+default\s+/gm, "");
    content = content.replace(/^\s*export\s+(?=(?:const|let|var|function|class|async)\b)/gm, "");
    content = content.replace(/^\s*export\s*\{[^}]*\}\s*;?\s*$/gm, "");

    if (real.endsWith(".ts") || real.endsWith(".tsx")) {
      content = stripTypeScriptAnnotations(content);
    }

    modulesOutput.push(`// --- Module: ${path.relative(workDir, real)} ---\n${content}`);
  }

  visit(entryFile);

  let styleInjection = "";
  if (cssOutput.length > 0) {
    const combinedCss = JSON.stringify(cssOutput.join("\n"));
    styleInjection = `(function(){const s=document.createElement("style");s.textContent=${combinedCss};document.head.appendChild(s);})();\n`;
  }

  return `${styleInjection}${modulesOutput.join("\n\n")}\n`;
}

export class ViteBuildAdapter implements GameBuildAdapter {
  public readonly name = "vite" as const;

  public canHandle(game: DiscoveredGame): boolean {
    return game.buildAdapter === "vite" && game.status === "supported";
  }

  public async build(options: AdapterBuildOptions): Promise<AdapterBuildResult> {
    const startTime = Date.now();
    const {
      game,
      tempWorkDir,
      outputDir,
      timeoutMs = DEFAULT_TIMEOUT_MS,
      maxOutputSizeBytes = DEFAULT_MAX_BYTES
    } = options;
    const warnings: string[] = [];

    try {
      // 1. Copy game into isolated temporary working directory
      fs.rmSync(tempWorkDir, { recursive: true, force: true });
      fs.mkdirSync(tempWorkDir, { recursive: true });
      copyStaticGameFiles(game.folderPath, tempWorkDir, { excludeConfigFiles: false });

      // 2. Check if Vite CLI is installed in game or workspace; otherwise use the built-in isolated Vite bundler
      const localViteBin = path.join(tempWorkDir, "node_modules", ".bin", "vite");
      let builtViaCli = false;

      if (fs.existsSync(localViteBin)) {
        const res = spawnSync(localViteBin, ["build", "--base=./"], {
          cwd: tempWorkDir,
          env: getSafeBuildEnv(),
          timeout: timeoutMs,
          encoding: "utf8"
        });
        if (res.status === 0 && fs.existsSync(path.join(tempWorkDir, "dist", "index.html"))) {
          builtViaCli = true;
        } else {
          const errMsg = res.stderr || res.stdout || "Vite CLI build failed.";
          throw new Error(errMsg.trim());
        }
      } else {
        // Offline / zero-install isolated Vite static bundler
        const distDir = path.join(tempWorkDir, "dist");
        bundleViteProjectLight(tempWorkDir, game.entry, distDir);
        builtViaCli = true;
      }

      if (!builtViaCli) {
        throw new Error("Vite build did not produce output.");
      }

      const distDir = path.join(tempWorkDir, "dist");
      const distEntry = path.join(distDir, game.entry);
      if (!fs.existsSync(distEntry)) {
        throw new Error(`Vite build succeeded, but "${game.entry}" was not found in dist/.`);
      }

      // 3. Copy dist output to final target outputDir
      fs.rmSync(outputDir, { recursive: true, force: true });
      const { totalBytes, fileCount } = copyStaticGameFiles(distDir, outputDir, {
        excludeConfigFiles: false
      });

      if (totalBytes > maxOutputSizeBytes) {
        fs.rmSync(outputDir, { recursive: true, force: true });
        return {
          success: false,
          adapter: "vite",
          outputDir,
          entryFile: game.entry,
          totalBytes,
          fileCount,
          durationMs: Date.now() - startTime,
          warnings,
          error: `Game output size (${(totalBytes / (1024 * 1024)).toFixed(2)} MB) exceeds maximum limit (${(maxOutputSizeBytes / (1024 * 1024)).toFixed(2)} MB).`
        };
      }

      // 4. Verify relative paths and assets in output HTML
      const finalEntryPath = path.join(outputDir, game.entry);
      const htmlContent = fs.readFileSync(finalEntryPath, "utf8");
      const normalizedHtml = normalizeHtmlRelativePaths(htmlContent);
      if (normalizedHtml !== htmlContent) {
        fs.writeFileSync(finalEntryPath, normalizedHtml, "utf8");
      }

      const { missingAssets, warnings: assetWarnings } = verifyHtmlReferencedAssets(
        finalEntryPath,
        outputDir
      );
      warnings.push(...assetWarnings);

      if (missingAssets.length > 0) {
        return {
          success: false,
          adapter: "vite",
          outputDir,
          entryFile: game.entry,
          totalBytes,
          fileCount,
          durationMs: Date.now() - startTime,
          warnings,
          error: `Vite output HTML references missing assets: ${missingAssets.join(", ")}`
        };
      }

      return {
        success: true,
        adapter: "vite",
        outputDir,
        entryFile: game.entry,
        totalBytes,
        fileCount,
        durationMs: Date.now() - startTime,
        warnings
      };
    } catch (err) {
      return {
        success: false,
        adapter: "vite",
        outputDir,
        entryFile: game.entry,
        totalBytes: 0,
        fileCount: 0,
        durationMs: Date.now() - startTime,
        warnings,
        error: err instanceof Error ? err.message : String(err)
      };
    } finally {
      try {
        fs.rmSync(tempWorkDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup error
      }
    }
  }
}
