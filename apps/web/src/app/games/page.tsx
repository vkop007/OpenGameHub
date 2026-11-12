import React from "react";
import { getPublishedGames } from "@/lib/registry";
import { GameExplorer } from "@/components/game-explorer";

export const metadata = {
  title: "Games — OpenGameHub",
  description: "Browse, search, and filter all community-contributed browser games on OpenGameHub."
};

export default function GamesLibraryPage() {
  const games = getPublishedGames();

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-3xl space-y-4 border-l-2 border-[#c7f36b] pl-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#c7f36b]">The archive / 001</div>
        <h1
          data-testid="library-heading"
          className="text-5xl font-black tracking-[-0.05em] text-[#f4f1ea] sm:text-6xl"
        >
          Games
        </h1>
        <p className="text-sm leading-relaxed text-[#a2a5ad]">
          Every game is automatically discovered from{" "}
          <code className="text-zinc-200 font-mono">/games</code>, compiled to static assets, and served inside an isolated sandbox.
        </p>
      </div>

      <GameExplorer games={games} />
    </div>
  );
}
