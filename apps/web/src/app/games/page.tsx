import React from "react";
import { getPublishedGames } from "@/lib/registry";
import { GameExplorer } from "@/components/game-explorer";
import { PageHeader } from "@/components/page-header";

export const metadata = {
  title: "Explore games — OpenGameHub",
  description: "Browse, search, and filter all community-contributed browser games on OpenGameHub."
};

export default function GamesLibraryPage() {
  const games = getPublishedGames();

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Games" }]}
        eyebrow="Game library"
        titleTestId="library-heading"
        title="Explore games"
        description={
          <>
            Every game is discovered from <code>/games</code>, built into a static bundle and played in
            an isolated sandbox. Pick one and jump in.
          </>
        }
        aside={
          <div className="inline-flex items-center gap-2.5 rounded-full border border-line-strong bg-white/[0.03] px-4 py-2 text-sm text-muted">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-accent" />
            </span>
            <span>
              <span className="font-semibold text-fg tabular-nums">{games.length}</span>{" "}
              {games.length === 1 ? "game" : "games"} playable now
            </span>
          </div>
        }
      />

      <div className="page-shell pb-16 pt-8">
        <GameExplorer games={games} />
      </div>
    </>
  );
}
