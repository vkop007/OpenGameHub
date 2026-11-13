import React from "react";
import Link from "next/link";
import { getPublishedGames, ENGINE_LABELS } from "@/lib/registry";
import { GameExplorer } from "@/components/game-explorer";
import { GameThumbnail } from "@/components/game-card";
import { SectionHeading } from "@/components/page-header";
import { buttonStyles } from "@/components/ui/button";
import { ArrowRight, ArrowUpRight, GitPullRequest, Play, ShieldCheck } from "lucide-react";

const TECH_STACK = [
  "Three.js",
  "React Three Fiber",
  "Babylon.js",
  "PlayCanvas",
  "Phaser",
  "PixiJS",
  "Canvas 2D",
  "React",
  "Vue",
  "Svelte",
  "Vanilla JS"
];

const STEPS = [
  {
    title: "Add your game folder",
    body: "Fork the repo and drop your project into games/your-game. Static HTML or Vite, any supported engine."
  },
  {
    title: "Validate locally",
    body: "Run one command. The discovery engine detects your stack and flags missing assets before you push."
  },
  {
    title: "Open a pull request",
    body: "CI builds a static bundle and sandboxes it. When checks pass and it merges, your game goes live."
  }
];

const rise = (i: number) => ({ "--i": i }) as React.CSSProperties;

export default function HomePage() {
  const games = getPublishedGames();
  const featured = games[0];
  const engineCount = new Set(games.map((g) => g.engine)).size;
  const engineLabel = featured ? (ENGINE_LABELS[featured.engine] ?? featured.engine) : "";

  return (
    <div className="relative">
      {/* HERO */}
      <section
        aria-labelledby="hero-title"
        data-purpose="hero-banner"
        className="relative overflow-hidden border-b border-line"
      >
        <div className="ambient" />
        <div className="dot-grid" />

        <div className="page-shell relative grid items-center gap-12 pb-14 pt-10 sm:pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pb-18 lg:pt-16">
          <div className="max-w-xl">
            <a
              href="#games-directory"
              className="rise group inline-flex items-center gap-2 rounded-full border border-line-strong bg-white/[0.03] py-1 pl-1 pr-3.5 text-[13px] text-muted transition-colors hover:border-white/25 hover:text-fg"
              style={rise(0)}
            >
              <span className="whitespace-nowrap rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-ink">
                Open source
              </span>
              <span className="whitespace-nowrap">Built by the community</span>
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </a>

            <h1
              id="hero-title"
              data-testid="hero-heading"
              className="rise mt-7 text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl lg:text-[4.25rem]"
              style={rise(1)}
            >
              <span className="bg-gradient-to-b from-white to-white/65 bg-clip-text text-transparent">
                Play great games.
              </span>
              <br />
              <span className="text-muted">Ship your own.</span>
            </h1>

            <p
              className="rise mt-6 max-w-lg text-base leading-relaxed text-muted sm:text-lg"
              style={rise(2)}
            >
              OpenGameHub is an open library of browser games. Drop a Three.js, Phaser, PixiJS or plain
              HTML5 project into <code>/games</code> and it is built, sandboxed and published for you.
            </p>

            <div className="rise mt-9 flex flex-wrap items-center gap-3" style={rise(3)}>
              <Link
                href="/games"
                data-testid="hero-browse-games"
                className={buttonStyles({ variant: "primary", size: "lg" })}
              >
                Browse games
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/contribute"
                data-testid="hero-contribute-cta"
                className={buttonStyles({ variant: "secondary", size: "lg" })}
              >
                <GitPullRequest className="size-4 text-muted" />
                Contribute a game
              </Link>
            </div>

            <dl
              className="rise mt-9 grid max-w-md grid-cols-3 gap-6 border-t border-line pt-6"
              style={rise(4)}
            >
              {[
                { value: games.length, label: games.length === 1 ? "Game live" : "Games live" },
                { value: engineCount || 1, label: engineCount === 1 ? "Engine in use" : "Engines in use" },
                { value: "MIT", label: "Licensed" }
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col">
                  <dd className="order-first text-3xl font-semibold tracking-tight tabular-nums">
                    {stat.value}
                  </dd>
                  <dt className="mt-1 text-[13px] text-subtle">{stat.label}</dt>
                </div>
              ))}
            </dl>
          </div>

          {/* Featured game */}
          {featured && (
            <div className="rise relative" style={rise(3)}>
              <div
                aria-hidden="true"
                className="absolute -inset-6 -z-10 rounded-[2rem] bg-[radial-gradient(closest-side,rgb(255_180_41/0.16),transparent)] blur-2xl"
              />
              <Link
                href={`/games/${featured.id}`}
                aria-label={`Play ${featured.name}`}
                className="glow-ring group relative block overflow-hidden rounded-3xl border border-line bg-panel shadow-pop"
              >
                <GameThumbnail game={featured} className="aspect-[16/11]" />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 to-transparent"
                />

                <div className="absolute inset-0 grid place-items-center">
                  <span className="grid size-16 place-items-center rounded-full bg-accent text-accent-ink shadow-[0_12px_40px_-8px_rgb(255_180_41/0.7)] transition-transform duration-300 ease-out-expo group-hover:scale-110">
                    <Play className="ml-1 size-6 fill-current" />
                  </span>
                </div>

                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-6">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-accent">Featured</p>
                    <p className="mt-1 truncate text-xl font-semibold tracking-tight text-white">
                      {featured.name}
                    </p>
                    <p className="mt-0.5 text-[13px] text-white/70">
                      {engineLabel} · by @{featured.author}
                    </p>
                  </div>
                  <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md sm:inline-flex">
                    <ShieldCheck className="size-3.5 text-accent" />
                    Sandboxed
                  </span>
                </div>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* TECH STRIP */}
      <section aria-label="Supported technologies" className="border-b border-line bg-sunken">
        <div className="page-shell flex flex-col gap-4 py-6 lg:flex-row lg:items-center lg:gap-8">
          <p className="shrink-0 text-sm text-subtle lg:w-44">Bring the stack you already use</p>
          <div className="marquee -mx-5 min-w-0 flex-1 sm:-mx-8 lg:mx-0">
            <div className="marquee-track">
              {[false, true].map((hidden) => (
                <ul
                  key={String(hidden)}
                  aria-hidden={hidden || undefined}
                  className="flex shrink-0 gap-2.5 pr-2.5"
                >
                  {TECH_STACK.map((tech) => (
                    <li
                      key={tech}
                      className="inline-flex h-9 items-center whitespace-nowrap rounded-full border border-line bg-white/[0.02] px-4 text-sm font-medium text-muted"
                    >
                      {tech}
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* GAMES */}
      <section
        id="games-directory"
        aria-labelledby="directory-title"
        data-purpose="games-catalog"
        className="page-shell space-y-8 py-14 sm:py-16"
      >
        <SectionHeading
          id="directory-title"
          title="Play now"
          description="Every game runs right in your browser. No installs, no sign-ups."
          action={
            <Link
              href="/games"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-fg"
            >
              Open the full library
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          }
        />
        <GameExplorer games={games} />
      </section>

      {/* HOW IT WORKS */}
      <section
        data-purpose="contribution-guide"
        className="border-y border-line bg-sunken"
      >
        <div className="page-shell grid gap-10 py-14 sm:py-16 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div className="space-y-8">
            <SectionHeading
              title="From folder to live in three steps"
              description="No database, no registration, no changes to the platform. A game is a folder, and the pipeline does the rest."
            />
            <ol className="space-y-0">
              {STEPS.map((step, i) => (
                <li key={step.title} className="relative flex gap-5 pb-7 last:pb-0">
                  {i < STEPS.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 left-[15px] top-9 w-px bg-gradient-to-b from-line-strong to-transparent"
                    />
                  )}
                  <span className="relative grid size-8 shrink-0 place-items-center rounded-full border border-accent-line bg-accent-soft text-sm font-semibold text-accent tabular-nums">
                    {i + 1}
                  </span>
                  <div className="space-y-1.5 pt-0.5">
                    <h3 className="text-lg font-semibold tracking-tight">{step.title}</h3>
                    <p className="text-[15px] leading-relaxed text-muted">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Terminal */}
          <div className="self-center">
            <div className="overflow-hidden rounded-2xl border border-line bg-canvas shadow-pop">
              <div className="flex items-center gap-2 border-b border-line px-4 py-3">
                <span className="size-2.5 rounded-full bg-white/15" />
                <span className="size-2.5 rounded-full bg-white/15" />
                <span className="size-2.5 rounded-full bg-white/15" />
                <span className="ml-3 font-mono text-xs text-subtle">~/opengamehub</span>
              </div>
              <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-7 text-muted sm:p-6">
                <span className="text-subtle">$</span> <span className="text-fg">pnpm game:validate my-game</span>
                {"\n"}
                <span className="text-accent">✓</span> Detected Three.js + Vite
                {"\n"}
                <span className="text-accent">✓</span> Entry point and assets resolved
                {"\n"}
                <span className="text-accent">✓</span> Ready to publish
                {"\n\n"}
                <span className="text-subtle">games/</span>
                {"\n"}
                <span className="text-subtle">└── </span>
                <span className="text-fg">my-game/</span>
                {"\n"}
                <span className="text-subtle">    ├── </span>index.html
                {"\n"}
                <span className="text-subtle">    ├── </span>opengamehub.json
                {"\n"}
                <span className="text-subtle">    └── </span>src/
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="page-shell py-14 sm:py-16">
        <div className="glow-ring relative overflow-hidden rounded-3xl border border-line bg-panel px-6 py-12 text-center sm:px-12 sm:py-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-64 max-w-xl bg-[radial-gradient(closest-side,rgb(255_180_41/0.18),transparent)] blur-2xl"
          />
          <div className="relative mx-auto max-w-xl space-y-5">
            <h2 className="text-3xl font-semibold leading-tight tracking-[-0.03em] sm:text-4xl">
              Built a game? Put it in front of players.
            </h2>
            <p className="text-base leading-relaxed text-muted sm:text-lg">
              It takes one folder and one pull request. We handle builds, hosting and sandboxing.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
              <Link href="/contribute" className={buttonStyles({ variant: "primary", size: "lg" })}>
                Start contributing
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/docs" className={buttonStyles({ variant: "secondary", size: "lg" })}>
                Read the docs
                <ArrowUpRight className="size-4 text-muted" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
