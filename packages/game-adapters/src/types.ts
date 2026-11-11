import type { DiscoveredGame } from "@opengamehub/game-discovery";

export interface AdapterBuildOptions {
  game: DiscoveredGame;
  tempWorkDir: string;
  outputDir: string;
  timeoutMs?: number;
  maxOutputSizeBytes?: number;
}

export interface AdapterBuildResult {
  success: boolean;
  adapter: "static" | "vite";
  outputDir: string;
  entryFile: string;
  totalBytes: number;
  fileCount: number;
  durationMs: number;
  warnings: string[];
  error?: string;
}

export interface GameBuildAdapter {
  readonly name: "static" | "vite";
  canHandle(game: DiscoveredGame): boolean;
  build(options: AdapterBuildOptions): Promise<AdapterBuildResult>;
}
