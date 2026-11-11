import registryData from "../../../../generated/games.json";
import type { GameRegistryDocument, PublishedGameEntry } from "@opengamehub/game-registry";

export function getGameRegistry(): GameRegistryDocument {
  return registryData as unknown as GameRegistryDocument;
}

export function getPublishedGames(): PublishedGameEntry[] {
  const reg = getGameRegistry();
  return reg.games ?? [];
}

export function getGameBySlug(slug: string): PublishedGameEntry | undefined {
  return getPublishedGames().find((g) => g.id === slug);
}

export function getRelatedGames(game: PublishedGameEntry, limit = 3): PublishedGameEntry[] {
  const all = getPublishedGames().filter((g) => g.id !== game.id);
  const scored = all.map((candidate) => {
    let score = 0;
    if (candidate.category === game.category) score += 3;
    if (candidate.engine === game.engine) score += 2;
    for (const tag of candidate.tags) {
      if (game.tags.includes(tag)) score += 1;
    }
    return { candidate, score };
  });
  scored.sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name));
  return scored.slice(0, limit).map((s) => s.candidate);
}

export const ENGINE_LABELS: Record<string, string> = {
  threejs: "Three.js",
  "react-three-fiber": "React Three Fiber",
  babylonjs: "Babylon.js",
  playcanvas: "PlayCanvas",
  phaser: "Phaser",
  pixijs: "PixiJS",
  canvas2d: "HTML5 Canvas",
  none: "Standard Web"
};

export const FRAMEWORK_LABELS: Record<string, string> = {
  vanilla: "Vanilla JS / TS",
  react: "React",
  vue: "Vue",
  svelte: "Svelte"
};
