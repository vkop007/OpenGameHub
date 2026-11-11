import React from "react";
import Link from "next/link";
import { getPublishedGames } from "@/lib/registry";
import { GameExplorer } from "@/components/game-explorer";
import { ArrowRight, GitPullRequest, Sparkles } from "lucide-react";

export default function HomePage() {
  const games = getPublishedGames();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Open, Unboxed Hero Section */}
      <section className="py-16 sm:py-24">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-indigo-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Open-Source Browser Game Platform</span>
          </div>

          <h1
            data-testid="hero-heading"
            className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl sm:leading-[1.08]"
          >
            Play community games.{" "}
            <span className="text-zinc-400">Contribute in one folder.</span>
          </h1>

          <p className="max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            Drop any Three.js, Phaser, PixiJS, Babylon.js, React, Vue, Svelte, or HTML5 game into{" "}
            <code className="text-zinc-200 font-mono text-sm">/games</code>. OpenGameHub automatically detects your stack, builds static bundles, and runs every game in an isolated sandbox.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/games"
              data-testid="hero-browse-games"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
            >
              <span>Browse Library</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contribute"
              data-testid="hero-contribute-cta"
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-zinc-300 ring-1 ring-white/15 transition hover:bg-white/[0.05] hover:text-white"
            >
              <GitPullRequest className="h-4 w-4 text-indigo-400" />
              <span>Contribute a Game</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Game Catalog (Cards Only for Games) */}
      <section className="space-y-6 pb-20">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-bold tracking-tight text-white">
            Featured & Playable Now
          </h2>
          <Link
            href="/games"
            className="text-xs font-medium text-zinc-400 transition hover:text-white"
          >
            View full directory →
          </Link>
        </div>

        <GameExplorer games={games} />
      </section>

      {/* Clean Minimal Footer CTA (No heavy nested boxes) */}
      <section className="border-t border-white/[0.06] py-16">
        <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div className="max-w-xl space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Built a browser game? Ship it with one Pull Request.
            </h2>
            <p className="text-sm leading-relaxed text-zinc-400">
              No database setup, no root config edits, and no custom SDK required. Paste your folder into{" "}
              <code className="text-zinc-200 font-mono">games/&lt;slug&gt;</code> or use our copyable AI prompt to verify static paths in seconds.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/contribute"
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-500"
            >
              <span>Contribution Guide & AI Prompt</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-medium text-zinc-300 ring-1 ring-white/10 transition hover:bg-white/[0.04] hover:text-white"
            >
              <span>Architecture Docs</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
