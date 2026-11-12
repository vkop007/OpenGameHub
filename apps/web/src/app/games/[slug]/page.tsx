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
          className="inline-flex items-center gap-2 font-mono text-xs font-medium text-[#a2a5ad] transition hover:text-[#c7f36b]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>All Games</span>
        </Link>
      </div>

      {/* Unboxed Editorial Split Layout */}
      <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
        {/* Game Artwork Frame */}
        <div className="lg:col-span-7">
          <div className="overflow-hidden border border-white/10 bg-zinc-950">
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
            <div className="flex items-center gap-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-[#c7f36b]">
              <span>{game.category}</span>
              <span className="text-zinc-600">•</span>
              <span className="font-mono text-[#a2a5ad]">v{game.version}</span>
            </div>

            <h1
              data-testid="detail-game-title"
              className="text-5xl font-black tracking-[-0.05em] text-[#f4f1ea] sm:text-6xl"
            >
              {game.name}
            </h1>

            <p className="text-xs text-[#a2a5ad]">
              By <span className="font-medium text-[#f4f1ea]">{game.author}</span>
            </p>
          </div>

          <p
            data-testid="detail-game-description"
            className="text-sm leading-relaxed text-[#a2a5ad]"
          >
            {game.description}
          </p>

          {/* Primary Play Action */}
          <div>
            <Link
              href={`/play/${game.id}`}
              data-testid="detail-play-button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-[#c7f36b] px-6 py-3.5 text-sm font-bold text-[#0b0c0f] transition hover:bg-[#f4f1ea] sm:w-auto sm:min-w-[220px]"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>Play Now</span>
            </Link>
          </div>

          {/* Minimal Metadata Divider List (No nested boxes) */}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/10 pt-6 text-xs">
            <div>
              <dt className="text-[#6e737c]">Engine</dt>
              <dd
                data-testid="detail-game-engine"
                className="mt-1 font-medium text-[#f4f1ea]"
              >
                {ENGINE_LABELS[game.engine] ?? game.engine}
              </dd>
            </div>
            <div>
              <dt className="text-[#6e737c]">Framework</dt>
              <dd
                data-testid="detail-game-framework"
                className="mt-1 font-medium text-[#f4f1ea]"
              >
                {FRAMEWORK_LABELS[game.framework] ?? game.framework}
              </dd>
            </div>
            <div>
              <dt className="text-[#6e737c]">Build Adapter</dt>
              <dd className="mt-1 font-medium uppercase text-[#f4f1ea]">
                {game.buildAdapter}
              </dd>
            </div>
            <div>
              <dt className="text-[#6e737c]">Bundle Size</dt>
              <dd className="mt-1 font-medium text-[#f4f1ea]">
                {(game.bundleSizeBytes / 1024).toFixed(1)} KB
              </dd>
            </div>
          </dl>

          {/* Controls Inline Text */}
          <div className="space-y-2 border-t border-white/10 pt-6">
            <div className="text-xs font-medium text-[#6e737c]">Controls</div>
            <div className="flex flex-wrap gap-2">
              {game.controls.map((ctrl) => (
                <span
                  key={ctrl}
                  className="border border-white/15 bg-[#171b21] px-3 py-1 text-xs font-mono text-[#f4f1ea]"
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
        <section className="space-y-6 border-t border-white/10 pt-12">
          <h2 className="text-lg font-bold tracking-tight text-[#f4f1ea]">
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
