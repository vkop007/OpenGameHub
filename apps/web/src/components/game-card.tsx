import React from "react";
import Link from "next/link";
import type { PublishedGameEntry } from "@opengamehub/game-registry";
import { ENGINE_LABELS } from "@/lib/registry";
import { Play } from "lucide-react";

export function GameCard({ game }: { game: PublishedGameEntry }) {
  return (
    <div
      data-testid={`game-card-${game.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-zinc-900/40 ring-1 ring-white/[0.07] transition-all duration-300 hover:-translate-y-1 hover:bg-zinc-900/70 hover:ring-white/20 hover:shadow-2xl hover:shadow-indigo-950/30"
    >
      {/* Artwork Stage */}
      <Link
        href={`/games/${game.id}`}
        className="relative aspect-video w-full overflow-hidden bg-zinc-950"
      >
        <img
          src={game.thumbnail}
          alt={game.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/15 to-transparent" />

        {/* Subtle Category Tag */}
        <span className="absolute top-3 left-3 rounded-full bg-zinc-950/75 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-200 backdrop-blur-md">
          {game.category}
        </span>

        {/* Engine Label on Bottom Left */}
        <span className="absolute bottom-3 left-3 text-[11px] font-medium text-zinc-300">
          {ENGINE_LABELS[game.engine] ?? game.engine}
        </span>
      </Link>

      {/* Clean Typography Info Area */}
      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <Link
              href={`/games/${game.id}`}
              className="text-base font-semibold tracking-tight text-white transition group-hover:text-indigo-300"
            >
              {game.name}
            </Link>
            <span className="font-mono text-[11px] text-zinc-500">
              v{game.version}
            </span>
          </div>
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-zinc-400">
            {game.description}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/[0.05]">
          <Link
            href={`/games/${game.id}`}
            data-testid={`details-button-${game.id}`}
            className="text-xs font-medium text-zinc-400 transition hover:text-white"
          >
            Details
          </Link>
          <Link
            href={`/play/${game.id}`}
            data-testid={`play-button-${game.id}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-indigo-400 hover:text-white"
          >
            <Play className="h-3 w-3 fill-current" />
            <span>Play</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
