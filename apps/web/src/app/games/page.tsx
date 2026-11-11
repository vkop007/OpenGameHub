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
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-2xl space-y-2">
        <h1
          data-testid="library-heading"
          className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
        >
          Games
        </h1>
        <p className="text-sm leading-relaxed text-zinc-400">
          Every game is automatically discovered from{" "}
          <code className="text-zinc-200 font-mono">/games</code>, compiled to static assets, and served inside an isolated sandbox.
        </p>
      </div>

      <GameExplorer games={games} />
    </div>
  );
}
