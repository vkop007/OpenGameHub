import React from "react";
import Link from "next/link";
import { getPublishedGames } from "@/lib/registry";
import { GameExplorer } from "@/components/game-explorer";
import {
  Sparkles,
  ArrowRight,
  GitBranch,
  Layers
} from "lucide-react";

export default function HomePage() {
  const games = getPublishedGames();

  return (
    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 space-y-16">
      {/* BEGIN: HeroSection */}
      <section
        aria-labelledby="hero-title"
        className="max-w-4xl space-y-8 pt-4"
        data-purpose="hero-banner"
      >
        {/* Top Pill Notification Badge */}
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-surface-elevated border border-surface-border text-slate-300 text-xs font-medium tracking-wide">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <Sparkles className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono text-[11px] uppercase tracking-wider font-semibold text-slate-300">
            Open-Source Browser Game Platform
          </span>
        </div>

        {/* Main Headline */}
        <div className="space-y-2">
          <h1
            data-testid="hero-heading"
            id="hero-title"
            className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08] font-heading"
          >
            Play community games. <br />
            <span className="text-slate-400">
              Contribute in one folder.
            </span>
          </h1>
        </div>

        {/* Hero Description */}
        <p className="text-slate-400 text-base sm:text-lg lg:text-xl font-normal max-w-3xl leading-relaxed">
          Drop any <span className="text-slate-200 font-medium">Three.js</span>,{" "}
          <span className="text-slate-200 font-medium">Phaser</span>,{" "}
          <span className="text-slate-200 font-medium">PixiJS</span>,{" "}
          <span className="text-slate-200 font-medium">Babylon.js</span>, React, Vue, Svelte, or
          HTML5 game into{" "}
          <code className="font-mono text-cyan-400 bg-surface-card px-2 py-0.5 rounded border border-surface-border text-sm">
            /games
          </code>
          . OpenGameHub automatically detects your stack, builds static bundles, and runs every
          game in an isolated sandbox.
        </p>

        {/* Action Buttons & Quick Terminal Command */}
        <div className="flex flex-wrap items-center gap-4 pt-2">
          {/* Primary Browse Library Button */}
          <Link
            href="/games"
            data-testid="hero-browse-games"
            className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-white hover:bg-slate-200 text-slate-950 font-semibold text-sm transition-all duration-200 shadow-sm active:scale-[0.98]"
          >
            <span>Browse Library</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>

          {/* Secondary Code/Terminal Contribute Button */}
          <Link
            href="/contribute"
            data-testid="hero-contribute-cta"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-surface-card hover:bg-surface-elevated text-slate-200 hover:text-white border border-surface-border hover:border-slate-500 font-medium text-sm transition-all active:scale-[0.98]"
          >
            <GitBranch className="w-4 h-4 text-slate-400" />
            <span>Contribute a Game</span>
          </Link>
        </div>

        {/* Feature Telemetry Chips */}
        <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-slate-400 border-t border-surface-border">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Zero-Config Sandboxing</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span>WebGL &amp; WebGPU Ready</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            <span>Isolated Memory Runtime</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span>GamePad &amp; WebRTC API</span>
          </div>
        </div>
      </section>
      {/* END: HeroSection */}

      {/* BEGIN: GamesDirectorySection */}
      <section
        id="games-directory"
        aria-labelledby="directory-title"
        className="space-y-6 pt-6"
        data-purpose="games-catalog"
      >
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-surface-border">
          <div>
            <h2
              id="directory-title"
              className="text-xl sm:text-2xl font-bold tracking-tight text-white font-heading"
            >
              Featured &amp; Playable Now
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Realtime community submissions curated and verified for in-browser execution.
            </p>
          </div>
          <Link
            href="/games"
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-white transition-colors group"
          >
            <span>View full directory</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Interactive Explorer Grid */}
        <GameExplorer games={games} />
      </section>
      {/* END: GamesDirectorySection */}

      {/* BEGIN: HowItWorksSection */}
      <section
        className="rounded-2xl border border-surface-border bg-surface-card p-6 sm:p-8"
        data-purpose="contribution-guide"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          <div className="space-y-3 lg:col-span-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 uppercase tracking-wider font-semibold">
              <Layers className="w-4 h-4" />
              <span>Universal Monorepo</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-heading">
              How simple is submitting?
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              No backend databases or complex registration. Commit a folder under{" "}
              <code className="text-cyan-400 font-mono">/games/&lt;your-title&gt;</code> with an
              entrypoint, and automated CI handles build, preview, and sandbox verification.
            </p>
          </div>
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs items-stretch">
            {/* Step 1 */}
            <div className="p-4 rounded-xl bg-surface-elevated border border-surface-border flex flex-col justify-between h-full space-y-2">
              <div>
                <span className="text-slate-200 font-bold block">01 / FORK &amp; CLONE</span>
                <p className="mt-1.5 text-slate-400 text-[11px] font-sans">
                  Fork the repo, create a branch, and run development server locally with hot reload.
                </p>
              </div>
              <div className="pt-2 text-[10px] text-slate-500 font-mono border-t border-surface-border/60">
                STEP 01
              </div>
            </div>
            {/* Step 2 */}
            <div className="p-4 rounded-xl bg-surface-elevated border border-surface-border flex flex-col justify-between h-full space-y-2">
              <div>
                <span className="text-slate-200 font-bold block">02 / ADD FOLDER</span>
                <p className="mt-1.5 text-slate-400 text-[11px] font-sans">
                  Add your Vite, Webpack, or raw HTML/JS bundle with a lightweight{" "}
                  <code className="text-slate-300">opengamehub.json</code> manifest.
                </p>
              </div>
              <div className="pt-2 text-[10px] text-slate-500 font-mono border-t border-surface-border/60">
                STEP 02
              </div>
            </div>
            {/* Step 3 */}
            <div className="p-4 rounded-xl bg-surface-elevated border border-surface-border flex flex-col justify-between h-full space-y-2">
              <div>
                <span className="text-slate-200 font-bold block">03 / PULL REQUEST</span>
                <p className="mt-1.5 text-slate-400 text-[11px] font-sans">
                  Submit PR. Once automated sandbox security tests pass, your game goes live to
                  thousands!
                </p>
              </div>
              <div className="pt-2 text-[10px] text-slate-500 font-mono border-t border-surface-border/60">
                STEP 03
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* END: HowItWorksSection */}
    </div>
  );
}
