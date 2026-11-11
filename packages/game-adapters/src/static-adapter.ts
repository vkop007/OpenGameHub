import fs from "node:fs";
import path from "node:path";
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

const DEFAULT_MAX_BYTES = 50 * 1024 * 1024; // 50 MB default per-game limit

export class StaticHtmlAdapter implements GameBuildAdapter {
  public readonly name = "static" as const;

  public canHandle(game: DiscoveredGame): boolean {
    return game.buildAdapter === "static" && game.status === "supported";
  }

  public async build(options: AdapterBuildOptions): Promise<AdapterBuildResult> {
    const startTime = Date.now();
    const {
      game,
      outputDir,
      maxOutputSizeBytes = DEFAULT_MAX_BYTES
    } = options;
    const warnings: string[] = [];

    try {
      const entrySourcePath = path.join(game.folderPath, game.entry);
      if (!fs.existsSync(entrySourcePath)) {
        return {
          success: false,
          adapter: "static",
          outputDir,
          entryFile: game.entry,
          totalBytes: 0,
          fileCount: 0,
          durationMs: Date.now() - startTime,
          warnings,
          error: `Entry HTML file "${game.entry}" does not exist.`
        };
      }

      // Clean and copy static files directly without running any package install
      fs.rmSync(outputDir, { recursive: true, force: true });
      const { totalBytes, fileCount } = copyStaticGameFiles(game.folderPath, outputDir, {
        excludeConfigFiles: true
      });

      if (totalBytes > maxOutputSizeBytes) {
        fs.rmSync(outputDir, { recursive: true, force: true });
        return {
          success: false,
          adapter: "static",
          outputDir,
          entryFile: game.entry,
          totalBytes,
          fileCount,
          durationMs: Date.now() - startTime,
          warnings,
          error: `Game output size (${(totalBytes / (1024 * 1024)).toFixed(2)} MB) exceeds maximum limit (${(maxOutputSizeBytes / (1024 * 1024)).toFixed(2)} MB).`
        };
      }

      const outputEntryPath = path.join(outputDir, game.entry);
      const originalHtml = fs.readFileSync(outputEntryPath, "utf8");
      const normalizedHtml = normalizeHtmlRelativePaths(originalHtml);
      if (normalizedHtml !== originalHtml) {
        fs.writeFileSync(outputEntryPath, normalizedHtml, "utf8");
        warnings.push("Normalized root-relative asset paths in index.html to relative './' paths.");
      }

      const { missingAssets, warnings: verifyWarnings } = verifyHtmlReferencedAssets(
        outputEntryPath,
        outputDir
      );
      warnings.push(...verifyWarnings);

      if (missingAssets.length > 0) {
        return {
          success: false,
          adapter: "static",
          outputDir,
          entryFile: game.entry,
          totalBytes,
          fileCount,
          durationMs: Date.now() - startTime,
          warnings,
          error: `Missing referenced assets in ${game.entry}: ${missingAssets.join(", ")}`
        };
      }

      return {
        success: true,
        adapter: "static",
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
        adapter: "static",
        outputDir,
        entryFile: game.entry,
        totalBytes: 0,
        fileCount: 0,
        durationMs: Date.now() - startTime,
        warnings,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }
}
