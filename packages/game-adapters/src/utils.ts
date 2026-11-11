import fs from "node:fs";
import path from "node:path";
import { isSafeRelativePath } from "@opengamehub/game-discovery";

const EXCLUDED_NAMES = new Set([
  "node_modules",
  ".git",
  ".DS_Store",
  ".env",
  ".env.local",
  ".env.production",
  ".turbo",
  "package.json",
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "tsconfig.json",
  "vite.config.ts",
  "vite.config.js",
  "vite.config.mjs",
  "opengamehub.json"
]);

export function copyStaticGameFiles(
  srcDir: string,
  destDir: string,
  options: { excludeConfigFiles: boolean }
): { totalBytes: number; fileCount: number } {
  let totalBytes = 0;
  let fileCount = 0;

  fs.mkdirSync(destDir, { recursive: true });

  function walkAndCopy(currentSrc: string, currentDest: string) {
    const entries = fs.readdirSync(currentSrc, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name === ".DS_Store") {
        continue;
      }
      if (options.excludeConfigFiles && EXCLUDED_NAMES.has(entry.name)) {
        continue;
      }

      const srcPath = path.join(currentSrc, entry.name);
      const destPath = path.join(currentDest, entry.name);
      const lstat = fs.lstatSync(srcPath);

      if (lstat.isSymbolicLink()) {
        throw new Error(`Symbolic link forbidden during build: ${srcPath}`);
      }

      if (lstat.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        walkAndCopy(srcPath, destPath);
      } else if (lstat.isFile()) {
        fs.copyFileSync(srcPath, destPath);
        totalBytes += lstat.size;
        fileCount += 1;
      }
    }
  }

  walkAndCopy(srcDir, destDir);
  return { totalBytes, fileCount };
}

export function normalizeHtmlRelativePaths(htmlContent: string): string {
  // Rewrite leading root-relative asset references (/assets/..., /js/..., /css/..., /style.css, /main.js)
  // to relative "./..." so the game works under /_games/<slug>/<version>/index.html
  return htmlContent.replace(
    /\b(src|href)=(["'])\/(?!\/|_games\/)([^"']+)\2/g,
    (_match, attr, quote, relPath) => `${attr}=${quote}./${relPath}${quote}`
  );
}

export function verifyHtmlReferencedAssets(
  htmlFilePath: string,
  rootOutputDir: string
): { missingAssets: string[]; warnings: string[] } {
  const missingAssets: string[] = [];
  const warnings: string[] = [];

  if (!fs.existsSync(htmlFilePath)) {
    missingAssets.push(path.basename(htmlFilePath));
    return { missingAssets, warnings };
  }

  const html = fs.readFileSync(htmlFilePath, "utf8");
  const attrRegex = /\b(?:src|href)=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;

  while ((match = attrRegex.exec(html)) !== null) {
    const rawRef = match[1].trim();
    if (
      !rawRef ||
      rawRef.startsWith("http://") ||
      rawRef.startsWith("https://") ||
      rawRef.startsWith("//") ||
      rawRef.startsWith("data:") ||
      rawRef.startsWith("blob:") ||
      rawRef.startsWith("#") ||
      rawRef.startsWith("mailto:")
    ) {
      continue;
    }

    const cleanRef = rawRef.split("?")[0].split("#")[0].replace(/^\.\//, "");
    if (!cleanRef) continue;

    if (!isSafeRelativePath(cleanRef)) {
      missingAssets.push(rawRef);
      continue;
    }

    const resolvedPath = path.resolve(path.dirname(htmlFilePath), cleanRef);
    if (!resolvedPath.startsWith(path.resolve(rootOutputDir))) {
      missingAssets.push(rawRef);
      continue;
    }

    if (!fs.existsSync(resolvedPath)) {
      missingAssets.push(rawRef);
    }
  }

  return { missingAssets, warnings };
}
