import React from "react";
import Link from "next/link";
import type { PublishedGameEntry } from "@opengamehub/game-registry";
import { ENGINE_LABELS } from "@/lib/registry";
import { ArrowUpRight, Play, Plus } from "lucide-react";

export function formatBundleSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function GameThumbnail({
  game,
  className = ""
}: {
  game: PublishedGameEntry;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-raised ${className}`}>
      {game.thumbnail ? (
        <img
          src={game.thumbnail}
          alt={`${game.name} preview`}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_30%_20%,rgb(255_180_41/0.18),transparent_60%)]">
          <span className="text-5xl font-semibold tracking-tight text-white/30">
            {game.name.slice(0, 1)}
          </span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
    </div>
  );
}

export function GameCard({ game }: { game: PublishedGameEntry }) {
  const engineLabel = ENGINE_LABELS[game.engine] ?? game.engine;
  const href = `/games/${game.id}`;

  return (
    <article
      data-testid={`game-card-${game.id}`}
      data-purpose="game-card"
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-lift transition-[transform,border-color,box-shadow] duration-300 ease-out-expo hover:-translate-y-1 hover:border-line-strong hover:shadow-pop"
    >
      <div className="relative">
        <GameThumbnail game={game} className="aspect-[16/10]" />

        <span className="absolute left-3 top-3 inline-flex h-6 items-center rounded-full border border-white/15 bg-black/45 px-2.5 text-xs font-medium capitalize text-white/90 backdrop-blur-md">
          {game.category}
        </span>

        <span
          aria-hidden="true"
          className="absolute bottom-3 right-3 grid size-10 translate-y-2 place-items-center rounded-full bg-accent text-accent-ink opacity-0 shadow-[0_8px_24px_-6px_rgb(255_180_41/0.6)] transition-all duration-300 ease-out-expo group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100"
        >
          <Play className="ml-0.5 size-4 fill-current" />
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-semibold leading-snug tracking-tight">
              <Link
                href={href}
                data-testid={`details-button-${game.id}`}
                className="rounded-md after:absolute after:inset-0 after:content-[''] focus-visible:after:rounded-2xl"
              >
                {game.name}
              </Link>
            </h3>
            <ArrowUpRight className="mt-1 size-4 shrink-0 text-subtle transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
          </div>
          <p className="line-clamp-2 text-sm leading-relaxed text-muted">{game.description}</p>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 pt-1 text-[13px] text-subtle">
          <span className="inline-flex items-center gap-1.5 text-muted">
            <span className="size-1.5 rounded-full bg-accent" />
            {engineLabel}
          </span>
          <span className="text-line-strong">·</span>
          <span>{formatBundleSize(game.bundleSizeBytes)}</span>
          <span className="text-line-strong">·</span>
          <span>@{game.author}</span>
        </div>

        {/* Visually hidden play link keeps the original, explicit action available */}
        <Link
          href={href}
          data-testid={`play-button-${game.id}`}
          className="sr-only"
          tabIndex={-1}
        >
          Play {game.name}
        </Link>
      </div>
    </article>
  );
}

/** Last cell of the catalog grid: an open invitation to add the next game. */
export function SubmitGameCard({ className }: { className?: string }) {
  return (
    <Link
      href="/contribute"
      data-testid="submit-game-card"
      className={`group relative flex min-h-[18rem] flex-col items-center justify-center gap-5 overflow-hidden rounded-2xl border border-dashed border-line-strong bg-[radial-gradient(120%_90%_at_50%_0%,rgb(255_180_41/0.07),transparent_60%)] p-8 text-center transition-[border-color,background-color,transform] duration-300 ease-out-expo hover:-translate-y-1 hover:border-accent-line ${className ?? ""}`}
    >
      <span className="grid size-12 place-items-center rounded-2xl border border-line-strong bg-panel text-muted transition-colors duration-300 group-hover:border-accent-line group-hover:text-accent">
        <Plus className="size-5" strokeWidth={2} />
      </span>
      <span className="space-y-1.5">
        <span className="block text-lg font-semibold tracking-tight">Your game here</span>
        <span className="mx-auto block max-w-[16rem] text-sm leading-relaxed text-muted">
          Add one folder and open a pull request. Yours could be next.
        </span>
      </span>
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent">
        How to contribute
        <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
