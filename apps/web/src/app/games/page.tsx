import React from "react";
import Link from "next/link";
import { getPublishedGames } from "@/lib/registry";
import { GameExplorer } from "@/components/game-explorer";
import { ChevronRight } from "lucide-react";

export const metadata = {
  title: "Explore Games — OpenGameHub",
  description:
    "Browse, search, and filter all community-contributed browser games on OpenGameHub."
};

export default function GamesLibraryPage() {
  const games = getPublishedGames();

  return (
    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 space-y-8">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/" className="hover:text-white transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
        <span className="text-white font-semibold">Games</span>
      </nav>

      {/* Hero Intro */}
      <div className="flex flex-wrap justify-between items-start gap-4 pb-4 border-b border-surface-border">
        <div className="flex min-w-72 flex-col gap-2 max-w-3xl">
          <h1
            data-testid="library-heading"
            className="text-white text-3xl sm:text-5xl font-black leading-tight tracking-tight font-heading"
          >
            Explore Games
          </h1>
          <p className="text-slate-400 text-sm sm:text-base font-normal leading-relaxed">
            Every game is automatically discovered from{" "}
            <code className="bg-surface-elevated text-cyan-400 px-1.5 py-0.5 rounded font-mono text-xs border border-surface-border">
              /games
            </code>
            , built into self-contained static bundles, and run in isolated Web Worker &amp; WebGL/WebGPU
            sandboxes.
          </p>
        </div>

        <div className="flex shrink-0 items-center justify-center gap-2 rounded-lg h-10 px-4 bg-surface-elevated border border-surface-border text-white text-xs font-bold font-mono">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
          <span>{games.length} Open-Source Sandboxes</span>
        </div>
      </div>

      {/* Game Explorer with Telemetry Pills */}
      <GameExplorer games={games} showTelemetryPills={true} />
    </div>
  );
}
