import React from "react";
import Link from "next/link";
import { getPublishedGames } from "@/lib/registry";
import { GameExplorer } from "@/components/game-explorer";
import { ArrowRight, GitPullRequest, Sparkles, Boxes, ShieldCheck } from "lucide-react";

export default function HomePage() {
  const games = getPublishedGames();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Open, Unboxed Hero Section */}
      <section className="relative overflow-hidden border-b border-white/10 py-20 sm:py-28">
        <div className="pointer-events-none absolute right-0 top-10 font-mono text-[clamp(8rem,22vw,20rem)] font-bold leading-none text-white/[0.025]">01</div>
        <div className="relative max-w-4xl space-y-7">
          <div className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#c7f36b]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Open-Source Browser Game Platform</span>
          </div>

          <h1
            data-testid="hero-heading"
            className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] text-[#f4f1ea] sm:text-8xl"
          >
            Play community games.{" "}
            <span className="text-[#a2a5ad]">Contribute in one folder.</span>
          </h1>

          <p className="max-w-2xl text-base leading-relaxed text-[#a2a5ad] sm:text-lg">
            Drop any Three.js, Phaser, PixiJS, Babylon.js, React, Vue, Svelte, or HTML5 game into{" "}
            <code className="font-mono text-sm text-[#c7f36b]">/games</code>. OpenGameHub automatically detects your stack, builds static bundles, and runs every game in an isolated sandbox.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/games"
              data-testid="hero-browse-games"
              className="inline-flex items-center gap-2 rounded-sm bg-[#c7f36b] px-6 py-3 text-sm font-bold text-[#0b0c0f] transition hover:bg-[#f4f1ea]"
            >
              <span>Browse Library</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contribute"
              data-testid="hero-contribute-cta"
              className="inline-flex items-center gap-2 border border-white/15 px-5 py-3 text-sm font-medium text-[#a2a5ad] transition hover:border-white/35 hover:text-[#f4f1ea]"
            >
              <GitPullRequest className="h-4 w-4 text-indigo-400" />
              <span>Contribute a Game</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid border-b border-white/10 sm:grid-cols-3">
        {[
          { value: String(games.length).padStart(2, "0"), label: "playable releases", Icon: Boxes },
          { value: "01", label: "folder per game", Icon: GitPullRequest },
          { value: "100%", label: "sandboxed runtime", Icon: ShieldCheck }
        ].map(({ value, label, Icon }) => (
          <div key={String(label)} className="flex items-center gap-4 border-white/10 py-6 sm:border-r sm:px-6 first:pl-0 last:border-0">
            <Icon className="h-5 w-5 text-[#8b93ff]" />
            <div><div className="font-mono text-2xl font-bold text-[#f4f1ea]">{value}</div><div className="text-xs uppercase tracking-wider text-[#6e737c]">{label}</div></div>
          </div>
        ))}
      </section>

      {/* Main Game Catalog (Cards Only for Games) */}
      <section className="space-y-6 pb-20">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-[#f4f1ea]">
            Featured & Playable Now
          </h2>
          <Link
            href="/games"
            className="text-xs font-medium text-[#8b93ff] transition hover:text-[#f4f1ea]"
          >
            View full directory →
          </Link>
        </div>

        <GameExplorer games={games} />
      </section>

      {/* Clean Minimal Footer CTA (No heavy nested boxes) */}
      <section className="border-t border-white/10 py-16">
        <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div className="max-w-xl space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-[#f4f1ea]">
              Built a browser game? Ship it with one Pull Request.
            </h2>
            <p className="text-sm leading-relaxed text-[#a2a5ad]">
              No database setup, no root config edits, and no custom SDK required. Paste your folder into{" "}
              <code className="text-zinc-200 font-mono">games/&lt;slug&gt;</code> or use our copyable AI prompt to verify static paths in seconds.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/contribute"
              className="inline-flex items-center gap-2 rounded-sm bg-[#8b93ff] px-5 py-2.5 text-xs font-bold text-[#0b0c0f] transition hover:bg-[#c7f36b]"
            >
              <span>Contribution Guide & AI Prompt</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 border border-white/10 px-4 py-2.5 text-xs font-medium text-[#a2a5ad] transition hover:bg-white/[0.04] hover:text-[#f4f1ea]"
            >
              <span>Architecture Docs</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
