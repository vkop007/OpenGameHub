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
import { UniversalGamePlayer } from "@opengamehub/game-player";
import { Breadcrumbs } from "@/components/page-header";
import { ShareButton } from "@/components/share-button";
import { GameThumbnail, formatBundleSize } from "@/components/game-card";
import { buttonStyles } from "@/components/ui/button";
import { ArrowUpRight, Code2, Keyboard } from "lucide-react";

const REPO_URL = "https://github.com/vkop007/OpenGameHub";

export function generateStaticParams() {
  return getPublishedGames().map((game) => ({
    slug: game.id
  }));
}

/** "Shift to Dive" -> { keys: "Shift", action: "Dive" }. Falls back to plain text. */
function parseControl(control: string): { keys: string | null; action: string } {
  const match = control.match(/^(.+?)\s+to\s+(.+)$/i);
  if (!match) return { keys: null, action: control };
  return { keys: match[1], action: match[2] };
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
  const engineDisplay = ENGINE_LABELS[game.engine] ?? game.engine;
  const frameworkDisplay = FRAMEWORK_LABELS[game.framework] ?? game.framework;

  const details: { label: string; value: React.ReactNode }[] = [
    { label: "Engine", value: engineDisplay },
    { label: "Framework", value: frameworkDisplay },
    { label: "Build", value: <span className="capitalize">{game.buildAdapter}</span> },
    { label: "Bundle size", value: formatBundleSize(game.bundleSizeBytes) },
    { label: "Aspect ratio", value: game.aspectRatio },
    { label: "Version", value: `v${game.version}` }
  ];

  return (
    <div className="relative">
      <div className="ambient" />

      <div className="page-shell relative space-y-6 pb-16 pt-5">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Breadcrumbs
            trail={[
              { label: "Home", href: "/" },
              { label: "Games", href: "/games" },
              { label: game.name }
            ]}
          />
          <div className="flex items-center gap-2">
            <ShareButton title={`${game.name} on OpenGameHub`} />
            <a
              href={`${REPO_URL}/tree/main/games/${game.id}`}
              target="_blank"
              rel="noreferrer"
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              <Code2 className="size-3.5 text-muted" />
              Source
              <ArrowUpRight className="size-3 opacity-60" />
            </a>
          </div>
        </div>

        {/* Player */}
        <section id="player-stage" aria-label={`Play ${game.name}`}>
          <UniversalGamePlayer
            game={game}
            backHref="/games"
            showHeader={false}
            showControlsFooter={false}
          />
        </section>

        {/* Title block */}
        <section className="flex flex-col gap-4 border-b border-line pb-8">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1
              data-testid="detail-game-title"
              className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl"
            >
              {game.name}
            </h1>
            <span className="inline-flex h-6 items-center rounded-full border border-accent-line bg-accent-soft px-2.5 text-xs font-medium text-accent">
              Sandboxed
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
            <span className="inline-flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-full bg-raised text-[10px] font-semibold uppercase text-fg ring-1 ring-line-strong">
                {game.author.slice(0, 2)}
              </span>
              @{game.author}
            </span>
            <span className="text-line-strong">·</span>
            <span data-testid="detail-game-engine">{engineDisplay}</span>
            <span className="text-line-strong">·</span>
            <span className="capitalize">{game.category}</span>
          </div>
        </section>

        {/* Content */}
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_20rem] lg:gap-14">
          <div className="space-y-10">
            <section aria-labelledby="about-title" className="space-y-4">
              <h2 id="about-title" className="text-xl font-semibold tracking-tight">
                About
              </h2>
              <p
                data-testid="detail-game-description"
                className="max-w-2xl text-base leading-relaxed text-muted"
              >
                {game.description}
              </p>
              {game.tags.length > 0 && (
                <ul className="flex flex-wrap gap-2 pt-1">
                  {game.tags.map((tag) => (
                    <li
                      key={tag}
                      className="inline-flex h-7 items-center rounded-full border border-line-strong px-3 text-[13px] text-muted"
                    >
                      {tag.replace(/-/g, " ")}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {game.controls.length > 0 && (
              <section aria-labelledby="controls-title" className="space-y-5">
                <h2
                  id="controls-title"
                  className="flex items-center gap-2.5 text-xl font-semibold tracking-tight"
                >
                  <Keyboard className="size-5 text-muted" />
                  Controls
                </h2>
                <ul
                  data-testid="detail-controls"
                  className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2"
                >
                  {game.controls.map((control) => {
                    const { keys, action } = parseControl(control);
                    return (
                      <li
                        key={control}
                        className="flex items-center justify-between gap-4 bg-panel px-5 py-4"
                      >
                        <span className="text-sm text-muted">{action}</span>
                        {keys && (
                          <span className="flex flex-wrap justify-end gap-1.5">
                            {keys.split(/\s+\/\s+/).map((k) => (
                              <kbd key={k} className="kbd h-6 text-xs text-fg">
                                {k}
                              </kbd>
                            ))}
                          </span>
                        )}
                      </li>
                    );
                  })}
                  {game.controls.length % 2 === 1 && (
                    <li aria-hidden="true" className="hidden bg-panel sm:block" />
                  )}
                </ul>
              </section>
            )}
          </div>

          <aside className="space-y-8">
            <section id="source" aria-labelledby="details-title">
              <h2 id="details-title" className="text-sm font-semibold tracking-tight">
                Details
              </h2>
              <dl className="mt-4 divide-y divide-line border-y border-line">
                {details.map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-4 py-3 text-sm">
                    <dt className="text-subtle">{row.label}</dt>
                    <dd className="text-right font-medium">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {relatedGames.length > 0 && (
              <section aria-labelledby="related-title">
                <div className="flex items-center justify-between">
                  <h2 id="related-title" className="text-sm font-semibold tracking-tight">
                    More to play
                  </h2>
                  <Link href="/games" className="text-[13px] text-muted transition-colors hover:text-fg">
                    View all
                  </Link>
                </div>
                <ul className="mt-4 space-y-3">
                  {relatedGames.map((rel) => (
                    <li key={rel.id}>
                      <Link
                        href={`/games/${rel.id}`}
                        className="group flex items-center gap-3.5 rounded-xl border border-line bg-panel p-2.5 transition-colors hover:border-line-strong"
                      >
                        <GameThumbnail game={rel} className="aspect-[4/3] w-20 shrink-0 rounded-lg" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{rel.name}</span>
                          <span className="block truncate text-[13px] text-subtle">
                            {ENGINE_LABELS[rel.engine] ?? rel.engine}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
