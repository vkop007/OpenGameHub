import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGameBySlug, getPublishedGames } from "@/lib/registry";
import { UniversalGamePlayer } from "@opengamehub/game-player";

export function generateStaticParams() {
  return getPublishedGames().map((game) => ({
    slug: game.id
  }));
}

export default async function PlayGamePage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const game = getGameBySlug(slug);

  if (!game) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <UniversalGamePlayer game={game} backHref="/games" />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4 font-mono text-[11px] text-[#6e737c]">
        <span>
          Source Folder: <code>games/{game.id}/</code> • Static Target:{" "}
          <code>{game.playUrl}</code>
        </span>
        <Link
          href={`/games/${game.id}`}
          className="font-medium text-[#8b93ff] hover:text-[#c7f36b]"
        >
          View full game details & metadata →
        </Link>
      </div>
    </div>
  );
}
