import React from "react";
import Link from "next/link";
import type { PublishedGameEntry } from "@opengamehub/game-registry";
import { ENGINE_LABELS } from "@/lib/registry";
import { Play, Code2, Star } from "lucide-react";

export function GameCard({ game }: { game: PublishedGameEntry }) {
  const rating = "4.9";
  const engineLabel = (ENGINE_LABELS[game.engine] ?? game.engine).toUpperCase();

  return (
    <article
      data-testid={`game-card-${game.id}`}
      data-purpose="game-card"
      className="group bg-surface-card border border-surface-border rounded-xl overflow-hidden hover:border-slate-500 transition-colors duration-200 flex flex-col justify-between shadow-card hover:shadow-card-hover"
    >
      <div>
        {/* Visual Sandbox Preview Area (Clean, solid dark stage with zero gradients) */}
        <div className="relative h-44 w-full bg-[#13161f] border-b border-surface-border p-4 flex flex-col justify-between overflow-hidden">
          {/* Top badges row */}
          <div className="relative z-10 flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-wider font-semibold uppercase px-2 py-0.5 rounded bg-surface-card text-slate-300 border border-surface-border">
              {game.category}
            </span>
            <span className="text-[11px] font-mono text-slate-400 bg-surface-card px-2 py-0.5 rounded border border-surface-border">
              v{game.version}
            </span>
          </div>

          {/* Center Interactive Play Button */}
          <div className="relative z-10 my-auto flex items-center justify-center">
            <Link
              href={`/games/${game.id}`}
              aria-label={`Play ${game.name}`}
              className="w-11 h-11 rounded-full bg-surface-card hover:bg-white text-slate-200 hover:text-slate-950 border border-surface-border hover:border-white flex items-center justify-center transition-all duration-200 group-hover:scale-105 shadow-sm"
            >
              <Play className="w-4 h-4 ml-0.5 fill-current" />
            </Link>
          </div>

          {/* Bottom Canvas Metadata Badge */}
          <div className="relative z-10 flex items-end justify-between">
            <div>
              <Link href={`/games/${game.id}`}>
                <h3 className="font-bold text-white tracking-tight text-base group-hover:text-slate-300 transition-colors">
                  {game.name}
                </h3>
              </Link>
              <p className="text-[10px] font-mono text-slate-400 tracking-wider">
                ENGINE: {engineLabel}
              </p>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-amber-400 bg-surface-card px-1.5 py-0.5 rounded border border-surface-border">
              <Star className="w-3 h-3 fill-current text-amber-400" />
              <span className="text-slate-300 font-mono text-xs">{rating}</span>
            </div>
          </div>
        </div>

        {/* Card Content Body */}
        <div className="p-4 space-y-3">
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {game.description}
          </p>

          {/* Tags / Meta Row */}
          <div className="flex flex-wrap gap-1.5 text-[10px] font-mono text-slate-400">
            {game.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded bg-surface-elevated border border-surface-border capitalize text-slate-400"
              >
                {tag.replace(/-/g, " ")}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="px-4 pb-4 pt-2 flex items-center justify-between border-t border-surface-border">
        <Link
          href={`/games/${game.id}`}
          data-testid={`details-button-${game.id}`}
          className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1 font-medium"
        >
          <span>Details</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/games/${game.id}#source`}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-surface-elevated transition-colors"
            title="Inspect Source Code"
          >
            <Code2 className="w-4 h-4" />
          </Link>
          <Link
            href={`/games/${game.id}`}
            data-testid={`play-button-${game.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-950 hover:bg-slate-200 active:scale-[0.98] transition-colors shadow-sm"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Play</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
