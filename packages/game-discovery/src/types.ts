export type GameEngine =
  | "threejs"
  | "react-three-fiber"
  | "babylonjs"
  | "playcanvas"
  | "phaser"
  | "pixijs"
  | "canvas2d"
  | "none";

export type GameFramework =
  | "vanilla"
  | "react"
  | "vue"
  | "svelte";

export type BuildAdapterType = "static" | "vite" | "unsupported";

export type GameCategory =
  | "action"
  | "arcade"
  | "puzzle"
  | "racing"
  | "rpg"
  | "shooter"
  | "simulation"
  | "sports"
  | "strategy"
  | "adventure"
  | "other";

export interface OpenGameHubManifest {
  name?: string;
  description?: string;
  version?: string;
  author?: string;
  engine?: GameEngine;
  framework?: GameFramework;
  buildAdapter?: "static" | "vite";
  entry?: string;
  thumbnail?: string;
  category?: GameCategory;
  tags?: string[];
  controls?: string[];
  aspectRatio?: string;
}

export interface ValidationIssue {
  code: string;
  severity: "error" | "warning";
  message: string;
  field?: string;
  suggestion?: string;
}

export interface DiscoveredGame {
  id: string;
  folderName: string;
  folderPath: string;
  name: string;
  description: string;
  version: string;
  author: string;
  engine: GameEngine;
  framework: GameFramework;
  buildAdapter: BuildAdapterType;
  entry: string;
  thumbnail?: string;
  category: GameCategory;
  tags: string[];
  controls: string[];
  aspectRatio: string;
  hasPackageJson: boolean;
  hasViteConfig: boolean;
  hasManifest: boolean;
  packageManager: "pnpm" | "npm" | "yarn" | "none";
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  status: "supported" | "unsupported" | "invalid";
  issues: ValidationIssue[];
}
