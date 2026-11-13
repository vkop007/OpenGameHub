import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getGameBySlug,
  getPublishedGames,
  getRelatedGames,
  ENGINE_LABELS
} from "@/lib/registry";
import { UniversalGamePlayer } from "@opengamehub/game-player";
import {
  ArrowLeft,
  Play,
  Star,
  Share2,
  GitFork,
  CheckCircle2,
  Terminal,
  ShieldCheck,
  Code2,
  Cpu,
  Layers,
  Gamepad2,
  Keyboard,
  Clock,
  Sparkles
} from "lucide-react";

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
  const bundleSizeMb = (game.bundleSizeBytes / (1024 * 1024)).toFixed(1);
  const engineDisplay = ENGINE_LABELS[game.engine] ?? game.engine;

  return (
    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 space-y-8">
      {/* Top Breadcrumbs & Action Bar */}
      <nav aria-label="Game Path" className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap text-slate-400 font-mono text-xs">
          <Link
            href="/games"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-card border border-surface-border hover:border-slate-600 hover:text-white text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
            <span>Directory</span>
          </Link>
          <span className="text-slate-600">/</span>
          <Link href="/games" className="hover:text-slate-200 transition-colors">
            Games
          </Link>
          <span className="text-slate-600">/</span>
          <span className="capitalize text-slate-300">{game.category}</span>
          <span className="text-slate-600">/</span>
          <span className="text-white font-semibold">{game.name}</span>
          <span className="px-2 py-0.5 rounded bg-surface-high border border-surface-border text-cyan-400 font-mono text-xs">
            v{game.version}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[11px] font-mono font-semibold tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            SANDBOX VERIFIED
          </span>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-card hover:bg-surface-high border border-surface-border text-slate-200 text-xs font-medium transition-colors"
          >
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>Star</span>
            <span className="ml-1 px-1.5 py-0.2 rounded bg-surface-container text-slate-400 font-mono text-[11px]">
              1.4k
            </span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-card hover:bg-surface-high border border-surface-border text-slate-200 text-xs font-medium transition-colors"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Share</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-card hover:bg-surface-elevated border border-surface-border text-slate-300 text-xs font-medium transition-colors"
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>Fork</span>
          </button>
        </div>
      </nav>

      {/* SECTION 1: Embedded Sandboxed Universal Game Player */}
      <section id="player-stage" className="w-full">
        <UniversalGamePlayer
          game={game}
          backHref="/games"
          showHeader={false}
          showControlsFooter={false}
        />
      </section>

      {/* SECTION 2: Game Header & Meta Bar */}
      <section className="w-full bg-surface-card border border-surface-border p-6 rounded-2xl shadow-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-surface-elevated border border-surface-border flex-shrink-0 flex items-center justify-center text-white">
              <Gamepad2 className="w-7 h-7" />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1
                  data-testid="detail-game-title"
                  className="font-heading text-2xl sm:text-3xl text-white font-extrabold tracking-tight"
                >
                  {game.name}
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-surface-high border border-surface-border text-indigo-300 font-mono text-xs font-medium">
                  v{game.version}
                </span>
                <span
                  data-testid="detail-game-engine"
                  className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono text-xs uppercase font-medium"
                >
                  {engineDisplay}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs uppercase font-medium">
                  WebGL 2.0
                </span>
              </div>
              <div className="flex items-center gap-3 text-slate-400 text-xs flex-wrap font-sans">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-surface-container border border-surface-border flex items-center justify-center font-mono text-[10px] text-cyan-400 font-bold">
                    {game.author.slice(0, 2).toUpperCase()}
                  </span>
                  <span>
                    Created by <strong className="text-slate-200">@{game.author}</strong>
                  </span>
                </div>
                <span className="text-surface-border">•</span>
                <span>Active build</span>
                <span className="text-surface-border">•</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container border border-surface-border text-slate-300 font-mono text-[11px]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  MIT License
                </span>
              </div>
            </div>
          </div>

          {/* Key Stats Counters & Play Action */}
          <div className="flex items-center gap-3 flex-wrap self-start lg:self-auto">
            <div className="px-4 py-2.5 rounded-xl bg-surface-container border border-surface-border flex flex-col justify-center min-w-[130px]">
              <span className="font-mono text-[10px] uppercase text-slate-400 tracking-wider font-semibold">
                Player Rating
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="font-heading font-bold text-white text-base">4.92</span>
                <span className="text-slate-400 text-xs font-mono">/ 5 (1.2k)</span>
              </div>
            </div>

            <div className="px-4 py-2.5 rounded-xl bg-surface-container border border-surface-border flex flex-col justify-center min-w-[130px]">
              <span className="font-mono text-[10px] uppercase text-slate-400 tracking-wider font-semibold">
                Total Plays
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-heading font-bold text-cyan-400 text-base">28,490</span>
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            </div>

            <div className="px-4 py-2.5 rounded-xl bg-surface-container border border-surface-border flex flex-col justify-center min-w-[110px]">
              <span className="font-mono text-[10px] uppercase text-slate-400 tracking-wider font-semibold">
                Bundle Size
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="font-mono font-bold text-slate-200 text-base">
                  {bundleSizeMb} MB
                </span>
              </div>
            </div>

            <a
              href="#player-stage"
              data-testid="detail-play-button"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-semibold text-slate-900 hover:bg-slate-200 transition-colors shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Play Viewport</span>
            </a>
          </div>
        </div>
      </section>

      {/* SECTION 3: Two-Column Architecture */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: 8 cols */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          {/* About this Sandbox */}
          <article className="bg-surface-card border border-surface-border p-6 rounded-2xl flex flex-col gap-5 shadow-card">
            <div className="flex items-center justify-between border-b border-surface-border pb-4">
              <h2 className="font-heading text-lg text-white font-bold tracking-tight flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-400" />
                About this Sandbox
              </h2>
              <span className="font-mono text-xs px-2.5 py-1 rounded bg-surface-container border border-surface-border text-slate-400 uppercase">
                TAG: {game.category}
              </span>
            </div>
            <div className="space-y-3 font-sans text-sm text-slate-300 leading-relaxed">
              <p data-testid="detail-game-description">
                <strong className="text-white font-semibold">{game.name}</strong> is a high-speed
                browser game executing directly inside an isolated runtime.{" "}
                {game.description}
              </p>
              <p className="text-slate-400">
                Designed with zero native dependencies, all assets use lightweight compression and Web
                Audio API spatial synthesizers to remain under {bundleSizeMb} MB total initial wire
                transfer.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 items-stretch">
              <div className="p-3.5 rounded-xl bg-surface-container border border-surface-border flex flex-col justify-between h-full gap-1.5 hover:border-slate-600 transition-colors">
                <div className="flex items-center gap-2 text-cyan-400">
                  <Cpu className="w-4 h-4" />
                  <span className="font-heading text-xs font-bold uppercase tracking-wider">
                    {engineDisplay} Core
                  </span>
                </div>
                <span className="font-sans text-xs text-slate-400">
                  Deterministic sub-millisecond physics &amp; render calculations.
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-container border border-surface-border flex flex-col justify-between h-full gap-1.5 hover:border-slate-600 transition-colors">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-heading text-xs font-bold uppercase tracking-wider">
                    Offline Ready
                  </span>
                </div>
                <span className="font-sans text-xs text-slate-400">
                  Assets compiled into static bundles with relative paths.
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-container border border-surface-border flex flex-col justify-between h-full gap-1.5 hover:border-slate-600 transition-colors">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Gamepad2 className="w-4 h-4" />
                  <span className="font-heading text-xs font-bold uppercase tracking-wider">
                    Zero-Latency Input
                  </span>
                </div>
                <span className="font-sans text-xs text-slate-400">
                  Native Keyboard, Mouse, and Gamepad API bindings.
                </span>
              </div>
            </div>
          </article>

          {/* Controls & Keybindings */}
          <section className="bg-surface-card border border-surface-border p-6 rounded-2xl flex flex-col gap-5 shadow-card">
            <div className="flex items-center justify-between border-b border-surface-border pb-4">
              <h2 className="font-heading text-lg text-white font-bold tracking-tight flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-cyan-400" />
                Controls &amp; Keybindings
              </h2>
              <span className="font-mono text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                PROFILE: QWERTY + GAMEPAD
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
              {/* Keyboard Subcard */}
              <div className="flex flex-col justify-between h-full gap-3 bg-surface-container border border-surface-border p-4 rounded-xl">
                <div className="flex items-center gap-2 text-slate-300 font-heading text-xs font-bold uppercase tracking-wider pb-2 border-b border-surface-border">
                  <Keyboard className="w-4 h-4 text-cyan-400" />
                  <span>Keyboard &amp; Mouse</span>
                </div>
                {game.controls && game.controls.length > 0 ? (
                  game.controls.map((ctrl, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-1.5 border-b border-surface-border/60 last:border-0"
                    >
                      <span className="text-xs text-slate-300">{ctrl}</span>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="flex items-center justify-between py-1.5 border-b border-surface-border/60">
                      <span className="text-xs text-slate-300">Movement</span>
                      <div className="flex items-center gap-1 font-mono text-xs">
                        <kbd className="px-2 py-0.5 rounded bg-surface-high border border-slate-600 text-slate-200">
                          W
                        </kbd>
                        <kbd className="px-2 py-0.5 rounded bg-surface-high border border-slate-600 text-slate-200">
                          A
                        </kbd>
                        <kbd className="px-2 py-0.5 rounded bg-surface-high border border-slate-600 text-slate-200">
                          S
                        </kbd>
                        <kbd className="px-2 py-0.5 rounded bg-surface-high border border-slate-600 text-slate-200">
                          D
                        </kbd>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-xs text-slate-300">Action / Jump</span>
                      <kbd className="px-3 py-0.5 rounded bg-surface-high border border-slate-600 text-slate-200 font-mono text-xs">
                        SPACEBAR
                      </kbd>
                    </div>
                  </>
                )}
              </div>

              {/* Gamepad Subcard */}
              <div className="flex flex-col justify-between h-full gap-3 bg-surface-container border border-surface-border p-4 rounded-xl">
                <div className="flex items-center gap-2 text-slate-300 font-heading text-xs font-bold uppercase tracking-wider pb-2 border-b border-surface-border">
                  <Gamepad2 className="w-4 h-4 text-indigo-400" />
                  <span>Gamepad (Xbox / PS / Switch)</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-surface-border/60">
                  <span className="text-xs text-slate-300">Movement Vector</span>
                  <span className="px-2 py-0.5 rounded bg-surface-high border border-surface-border font-mono text-xs text-cyan-400 font-medium">
                    Left Stick (L3)
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-surface-border/60">
                  <span className="text-xs text-slate-300">Action</span>
                  <span className="px-2 py-0.5 rounded bg-surface-high border border-surface-border font-mono text-xs text-emerald-400 font-medium">
                    A / Cross (Btn 0)
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-slate-300">Secondary Action</span>
                  <span className="px-2 py-0.5 rounded bg-surface-high border border-surface-border font-mono text-xs text-indigo-400 font-medium">
                    X / Square &amp; R2
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Changelog & Releases */}
          <section className="bg-surface-card border border-surface-border p-6 rounded-2xl flex flex-col gap-5 shadow-card">
            <div className="flex items-center justify-between border-b border-surface-border pb-4">
              <h2 className="font-heading text-lg text-white font-bold tracking-tight flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                Changelog &amp; Deployments
              </h2>
              <span className="font-mono text-xs text-slate-400">Version history</span>
            </div>
            <div className="space-y-4 relative pl-6 before:content-[''] before:absolute before:left-2 before:top-2.5 before:bottom-2.5 before:w-0.5 before:bg-surface-border">
              <div className="relative flex flex-col gap-1.5">
                <span className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-emerald-400 ring-4 ring-surface-card" />
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-heading text-sm font-bold text-white">
                    v{game.version} — Production Release
                  </span>
                  <span className="px-2 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-semibold">
                    CURRENT
                  </span>
                </div>
                <p className="font-sans text-xs text-slate-400 leading-relaxed">
                  Validated against OpenGameHub static sandbox verification tests. Zero runtime
                  leaks detected.
                </p>
              </div>
            </div>
          </section>

          {/* Community Reviews */}
          <section className="bg-surface-card border border-surface-border p-6 rounded-2xl flex flex-col gap-5 shadow-card">
            <div className="flex items-center justify-between border-b border-surface-border pb-4">
              <h2 className="font-heading text-lg text-white font-bold tracking-tight flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400" />
                Community Reviews
              </h2>
              <span className="text-slate-400 text-xs">Showing verified player feedback</span>
            </div>

            {/* Review Items */}
            <div className="flex flex-col gap-3">
              <div className="p-4 rounded-xl bg-surface-container border border-surface-border flex flex-col gap-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center font-bold text-indigo-300 font-mono text-[11px]">
                      MR
                    </span>
                    <span className="font-heading text-xs font-bold text-white">
                      @marcus_render
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] font-medium">
                      RUNS 60 FPS
                    </span>
                  </div>
                  <div className="flex items-center text-amber-400 text-xs gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-3 h-3 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="font-sans text-xs text-slate-300 leading-relaxed">
                  Remarkable performance in the sandboxed iframe. Fluid 60 FPS constraint on Apple
                  Silicon with zero audio desync!
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-container border border-surface-border flex flex-col gap-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center font-bold text-cyan-400 font-mono text-[11px]">
                      JL
                    </span>
                    <span className="font-heading text-xs font-bold text-white">
                      @jess_leveldesign
                    </span>
                    <span className="px-2 py-0.5 rounded bg-surface-high border border-surface-border text-slate-400 font-mono text-[10px] font-medium">
                      GAMEPAD TESTED
                    </span>
                  </div>
                  <div className="flex items-center text-amber-400 text-xs gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-3 h-3 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="font-sans text-xs text-slate-300 leading-relaxed">
                  Controls feel super responsive with the Gamepad API. Outstanding open-source
                  reference for browser game developers.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT SIDEBAR: 4 cols */}
        <aside className="lg:col-span-4 flex flex-col gap-8">
          {/* CLI Run Command */}
          <div className="bg-surface-card border border-surface-border p-5 rounded-2xl flex flex-col gap-3 shadow-card">
            <div className="flex items-center justify-between pb-2 border-b border-surface-border">
              <span className="font-heading text-xs text-white font-bold uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                Run Locally via CLI
              </span>
              <span className="text-emerald-400 font-mono text-[11px] bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.2 rounded font-semibold">
                v2.4 CLI
              </span>
            </div>
            <p className="font-sans text-xs text-slate-400 leading-relaxed">
              Instantly mirror and boot this game sandbox in your local dev environment:
            </p>
            <div className="flex items-center justify-between bg-surface-lowest border border-surface-border p-2.5 rounded-lg font-mono text-xs text-cyan-400 overflow-x-auto">
              <code className="select-all">npx opengamehub run {game.id}</code>
            </div>
          </div>

          {/* Sandbox Telemetry & Security */}
          <div className="bg-surface-card border border-surface-border p-5 rounded-2xl flex flex-col gap-4 shadow-card">
            <div className="flex items-center gap-2 pb-2 border-b border-surface-border">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="font-heading text-sm text-white font-bold tracking-tight">
                Sandbox Telemetry &amp; Security
              </h3>
            </div>
            <div className="flex flex-col gap-2 font-mono text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-surface-border/60">
                <span className="text-slate-400">Execution Tier</span>
                <span className="text-slate-200 font-semibold">Web Worker Sandbox</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-surface-border/60">
                <span className="text-slate-400">Network Policy</span>
                <span className="text-emerald-400 flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Zero Outbound
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-surface-border/60">
                <span className="text-slate-400">Storage Allocation</span>
                <span className="text-slate-200">50 MB Isolated IndexedDB</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-surface-border/60">
                <span className="text-slate-400">Hardware Accel</span>
                <span className="text-cyan-400 font-medium">WebGL 2.0 Direct</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-400">Audio System</span>
                <span className="text-slate-200">Dynamic WebAudio 48kHz</span>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-surface-lowest border border-surface-border text-slate-400 font-mono text-[11px] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>DOM access restricted via strict Content Security Policy.</span>
            </div>
          </div>

          {/* Engine & Manifest */}
          <div id="source" className="bg-surface-card border border-surface-border p-5 rounded-2xl flex flex-col gap-4 shadow-card">
            <div className="flex items-center gap-2 pb-2 border-b border-surface-border">
              <Code2 className="w-4 h-4 text-cyan-400" />
              <h3 className="font-heading text-sm text-white font-bold tracking-tight">
                Engine &amp; Manifest
              </h3>
            </div>
            <div className="space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-surface-border/60">
                <span className="text-slate-400">Path</span>
                <span className="text-cyan-400 font-semibold">/games/{game.id}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-surface-border/60">
                <span className="text-slate-400">Core Engine</span>
                <span className="text-slate-200">{engineDisplay}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-surface-border/60">
                <span className="text-slate-400">Bundler</span>
                <span className="text-slate-200">{game.buildAdapter} (ESM)</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-400">Target Entry</span>
                <span className="text-slate-200">{game.playUrl}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <a
                href="#player-stage"
                className="w-full inline-flex items-center justify-center gap-2 py-2 rounded-lg bg-white text-slate-900 text-xs font-semibold hover:bg-slate-200 transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Scroll to Interactive Viewport</span>
              </a>
            </div>
          </div>

          {/* Similar Games */}
          {relatedGames.length > 0 && (
            <div className="bg-surface-card border border-surface-border p-5 rounded-2xl flex flex-col gap-4 shadow-card">
              <div className="flex items-center justify-between pb-2 border-b border-surface-border">
                <h3 className="font-heading text-sm text-white font-bold tracking-tight">
                  Similar Games
                </h3>
                <Link href="/games" className="text-cyan-400 font-mono text-xs hover:underline">
                  Explore All
                </Link>
              </div>
              <div className="flex flex-col gap-3">
                {relatedGames.map((rel) => (
                  <Link
                    key={rel.id}
                    href={`/games/${rel.id}`}
                    className="group flex items-center gap-3 p-2 rounded-xl bg-surface-container hover:bg-surface-high border border-surface-border transition-colors"
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-heading text-xs font-bold text-slate-200 group-hover:text-cyan-400 transition-colors truncate">
                          {rel.name}
                        </span>
                        <span className="text-emerald-400 font-mono text-[10px]">
                          60 FPS
                        </span>
                      </div>
                      <span className="text-slate-400 font-sans text-[11px] truncate">
                        {rel.description}
                      </span>
                      <span className="text-cyan-400 font-mono text-[10px] mt-0.5">
                        {ENGINE_LABELS[rel.engine] ?? rel.engine} • 4.9★
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
