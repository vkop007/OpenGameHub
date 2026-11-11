import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getGameBySlug,
  getPublishedGames,
  getRelatedGames,
  ENGINE_LABELS,
  FRAMEWORK_LABELS
} from "@/lib/registry";
import { GameCard } from "@/components/game-card";
import { ArrowLeft, Play } from "lucide-react";

export function generateStaticParams() {
  return getPublishedGames().map((game) => ({
    slug: game.id
  }));
}

export default async function GameDetailsPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const game = getGameBySlug(slug);

  if (!game) {
    notFound();
  }

  const relatedGames = getRelatedGames(game, 3);

  return (
    <div className="mx-auto max-w-7xl space-y-16 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <Link
          href="/games"
          className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 transition hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>All Games</span>
        </Link>
      </div>

      {/* Unboxed Editorial Split Layout */}
      <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
        {/* Game Artwork Frame */}
        <div className="lg:col-span-7">
          <div className="overflow-hidden rounded-2xl bg-zinc-950 ring-1 ring-white/10 shadow-2xl">
            <img
              src={game.thumbnail}
              alt={game.name}
              className="aspect-video w-full object-cover"
            />
          </div>
        </div>

        {/* Clean Unboxed Typography Column */}
        <div className="space-y-8 lg:col-span-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-indigo-400">
              <span>{game.category}</span>
              <span className="text-zinc-600">•</span>
              <span className="font-mono text-zinc-400">v{game.version}</span>
            </div>

            <h1
              data-testid="detail-game-title"
              className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
            >
              {game.name}
            </h1>

            <p className="text-xs text-zinc-400">
              By <span className="font-medium text-zinc-200">{game.author}</span>
            </p>
          </div>

          <p
            data-testid="detail-game-description"
            className="text-sm leading-relaxed text-zinc-300"
          >
            {game.description}
          </p>

          {/* Primary Play Action */}
          <div>
            <Link
              href={`/play/${game.id}`}
              data-testid="detail-play-button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-zinc-950 transition hover:bg-indigo-400 hover:text-white sm:w-auto sm:min-w-[220px]"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>Play Now</span>
            </Link>
          </div>

          {/* Minimal Metadata Divider List (No nested boxes) */}
          <dl className="grid grid-cols-2 gap-y-4 gap-x-6 border-t border-white/[0.06] pt-6 text-xs">
            <div>
              <dt className="text-zinc-500">Engine</dt>
              <dd
                data-testid="detail-game-engine"
                className="mt-1 font-medium text-zinc-200"
              >
                {ENGINE_LABELS[game.engine] ?? game.engine}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Framework</dt>
              <dd
                data-testid="detail-game-framework"
                className="mt-1 font-medium text-zinc-200"
              >
                {FRAMEWORK_LABELS[game.framework] ?? game.framework}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Build Adapter</dt>
              <dd className="mt-1 font-medium uppercase text-zinc-200">
                {game.buildAdapter}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Bundle Size</dt>
              <dd className="mt-1 font-medium text-zinc-200">
                {(game.bundleSizeBytes / 1024).toFixed(1)} KB
              </dd>
            </div>
          </dl>

          {/* Controls Inline Text */}
          <div className="space-y-2 border-t border-white/[0.06] pt-6">
            <div className="text-xs font-medium text-zinc-500">Controls</div>
            <div className="flex flex-wrap gap-2">
              {game.controls.map((ctrl) => (
                <span
                  key={ctrl}
                  className="rounded-full bg-white/[0.05] px-3 py-1 text-xs font-mono text-zinc-300"
                >
                  {ctrl}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Related Games */}
      {relatedGames.length > 0 && (
        <section className="space-y-6 border-t border-white/[0.06] pt-12">
          <h2 className="text-lg font-bold tracking-tight text-white">
            More Games to Play
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedGames.map((rel) => (
              <GameCard key={rel.id} game={rel} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
