import React from "react";
import Link from "next/link";
import type { PublishedGameEntry } from "@opengamehub/game-registry";
import { ENGINE_LABELS } from "@/lib/registry";
import { Play } from "lucide-react";

export function GameCard({ game }: { game: PublishedGameEntry }) {
  return (
    <div
      data-testid={`game-card-${game.id}`}
      className="group relative flex flex-col overflow-hidden border border-white/10 bg-[#12151a] transition-all duration-200 hover:-translate-y-1 hover:border-[#c7f36b]/60"
    >
      {/* Artwork Stage */}
      <Link
        href={`/games/${game.id}`}
        className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-950"
      >
        <img
          src={game.thumbnail}
          alt={game.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c0f]/90 via-transparent to-transparent" />

        {/* Subtle Category Tag */}
        <span className="absolute top-3 left-3 bg-[#0b0c0f]/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#c7f36b]">
          {game.category}
        </span>

        {/* Engine Label on Bottom Left */}
        <span className="absolute bottom-3 left-3 font-mono text-[10px] uppercase tracking-wider text-[#f4f1ea]/80">
          {ENGINE_LABELS[game.engine] ?? game.engine}
        </span>
      </Link>

      {/* Clean Typography Info Area */}
      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <Link
              href={`/games/${game.id}`}
              className="text-lg font-bold tracking-tight text-[#f4f1ea] transition group-hover:text-[#c7f36b]"
            >
              {game.name}
            </Link>
            <span className="font-mono text-[11px] text-zinc-500">
              v{game.version}
            </span>
          </div>
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#a2a5ad]">
            {game.description}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
          <Link
            href={`/games/${game.id}`}
            data-testid={`details-button-${game.id}`}
            className="text-xs font-medium text-[#a2a5ad] transition hover:text-[#f4f1ea]"
          >
            Details
          </Link>
          <Link
            href={`/play/${game.id}`}
            data-testid={`play-button-${game.id}`}
            className="inline-flex items-center gap-1.5 rounded-sm bg-[#c7f36b] px-3.5 py-2 text-xs font-bold text-[#0b0c0f] transition hover:bg-[#f4f1ea]"
          >
            <Play className="h-3 w-3 fill-current" />
            <span>Play</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
