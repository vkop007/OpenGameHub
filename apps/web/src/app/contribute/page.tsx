import React from "react";
import Link from "next/link";
import { AI_MIGRATION_PROMPT_TEXT } from "@/lib/ai-prompt";
import { CopyPromptBlock } from "@/components/copy-prompt-block";
import {
  Check,
  ArrowRight,
  GitBranch,
  FolderGit2,
  Sparkles,
  Terminal,
  ChevronRight,
  Code2
} from "lucide-react";

export const metadata = {
  title: "Contribute a Game — OpenGameHub",
  description:
    "Learn how to contribute your browser game to OpenGameHub using our one-folder architecture and AI Game Migration Prompt."
};

export default function ContributePage() {
  return (
    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 space-y-8">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/" className="hover:text-white transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
        <span className="text-white font-semibold">Contribute</span>
      </nav>

      {/* Hero Intro matching /games layout */}
      <div className="flex flex-wrap justify-between items-start gap-4 pb-4 border-b border-surface-border">
        <div className="flex min-w-72 flex-col gap-2 max-w-3xl">
          <div className="inline-flex items-center gap-2 self-start px-2.5 py-1 rounded-md bg-surface-elevated border border-surface-border text-indigo-400 font-mono text-[11px] font-semibold uppercase tracking-wider">
            <GitBranch className="w-3.5 h-3.5" />
            <span>Contributor Guide</span>
          </div>
          <h1
            data-testid="contribute-heading"
            className="text-white text-3xl sm:text-5xl font-black leading-tight tracking-tight font-heading"
          >
            One Game = One Folder.
          </h1>
          <p className="text-slate-400 text-sm sm:text-base font-normal leading-relaxed">
            Never touch the main website, root config, or deployment files. Place your self-contained game
            folder inside{" "}
            <code className="text-cyan-400 font-mono bg-surface-elevated px-1.5 py-0.5 rounded border border-surface-border">
              games/&lt;your-slug&gt;/
            </code>{" "}
            and open a Pull Request.
          </p>
        </div>

        <div className="flex shrink-0 items-center justify-center gap-2 rounded-lg h-10 px-4 bg-surface-elevated border border-surface-border text-white text-xs font-bold font-mono">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
          <span>PRs Welcome</span>
        </div>
      </div>

      {/* Horizontal Step Cards (Equal Width & Equal Height) */}
      <section className="border-t border-surface-border pt-4">
        <div className="grid gap-4 sm:grid-cols-4 font-mono text-xs items-stretch">
          {[
            {
              num: "01",
              title: "FORK & CLONE",
              desc: "Fork OpenGameHub on GitHub and clone the repository locally to your dev machine.",
              color: "text-indigo-400"
            },
            {
              num: "02",
              title: "ADD FOLDER",
              desc: "Copy your Static HTML or Vite game directory directly into games/<game-slug>/.",
              color: "text-cyan-400"
            },
            {
              num: "03",
              title: "TEST LOCALLY",
              desc: "Run pnpm game:validate <slug> and pnpm game:build <slug> to confirm zero warnings.",
              color: "text-emerald-400"
            },
            {
              num: "04",
              title: "PULL REQUEST",
              desc: "Submit your PR. Automated CI verifies sandbox security and publishes your build.",
              color: "text-purple-400"
            }
          ].map((step) => (
            <div
              key={step.num}
              className="p-5 rounded-2xl bg-surface-card border border-surface-border flex flex-col justify-between shadow-card h-full space-y-4"
            >
              <div>
                <div className={`font-mono text-xs font-bold ${step.color}`}>
                  {step.num} / {step.title}
                </div>
                <p className="mt-2 text-slate-300 text-xs font-sans leading-relaxed">{step.desc}</p>
              </div>
              <div className="pt-2 border-t border-surface-border/60 text-[10px] text-slate-500 font-mono">
                STEP {step.num} COMPLETE
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Folder Structure (2 Columns with Matched Height) */}
      <section className="grid gap-6 border-t border-surface-border pt-8 lg:grid-cols-12 items-stretch">
        <div className="p-6 rounded-2xl bg-surface-card border border-surface-border flex flex-col justify-between shadow-card h-full lg:col-span-6 space-y-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold mb-2">
              <FolderGit2 className="w-4 h-4" />
              <span>Zero-Config Discovery</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white font-heading">
              Keep your original folder structure
            </h2>
            <p className="text-xs leading-relaxed text-slate-400 mt-2">
              Whether your project uses <code>src/scenes/</code>, <code>public/</code>, or a flat{" "}
              <code>index.html</code> + <code>game.js</code>, the discovery engine inspects your actual
              dependencies and entry point automatically.
            </p>
            <ul className="space-y-3 pt-4 text-xs text-slate-300">
              {[
                "Automatic engine detection for Three.js, R3F, Babylon.js, PlayCanvas, Phaser, PixiJS, and Canvas 2D",
                "Optional opengamehub.json manifest for custom title, controls, and tags",
                "Relative path verification for /_games/<slug>/<version>/index.html",
                "Sandboxed iframe execution with zero cross-game interference"
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-surface-elevated border border-surface-border">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="pt-3 border-t border-surface-border text-xs text-slate-500">
            Validated by <code>packages/game-discovery</code>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-surface-card border border-surface-border flex flex-col justify-between shadow-card h-full lg:col-span-6 space-y-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-indigo-400 uppercase tracking-wider font-semibold mb-2">
              <Code2 className="w-4 h-4" />
              <span>Target File Tree</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white font-heading">
              Expected Layout in <code>/games</code>
            </h2>
            <p className="text-xs leading-relaxed text-slate-400 mt-2">
              Standard folder layout for a community contribution. Self-contained with no root dependencies:
            </p>
            <pre className="mt-4 overflow-x-auto rounded-xl border border-surface-border bg-surface-lowest p-4 font-mono text-xs leading-relaxed text-cyan-300 shadow-card">{`opengamehub/
└── games/
    └── tumble-club/            # Vite + Three.js
        ├── package.json
        ├── vite.config.ts
        ├── opengamehub.json    # Optional metadata
        ├── index.html
        └── src/
            ├── main.ts
            └── scenes/`}</pre>
          </div>
          <div className="pt-3 border-t border-surface-border text-xs text-slate-500 flex items-center justify-between">
            <span>One game = One folder</span>
            <span className="font-mono text-[11px] text-emerald-400">ISOLATED SCOPE</span>
          </div>
        </div>
      </section>

      {/* AI Game Migration Prompt */}
      <section className="space-y-4 border-t border-surface-border pt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-white font-heading">
              AI Game Migration Prompt
            </h2>
            <p className="text-xs text-slate-400">
              Paste this prompt into Cursor, Claude Code, or Gemini while your existing game is open to verify
              relative asset paths and static output automatically.
            </p>
          </div>
          <Link
            href="/docs"
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
          >
            <span>Full Technical Docs</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <CopyPromptBlock
          title="docs/AI_GAME_MIGRATION_PROMPT.md"
          content={AI_MIGRATION_PROMPT_TEXT}
        />
      </section>

      {/* CLI Quick Reference */}
      <section className="space-y-3 border-t border-surface-border pt-8">
        <h2 className="text-xl font-bold tracking-tight text-white font-heading">
          Local Verification Commands
        </h2>
        <pre className="overflow-x-auto rounded-2xl border border-surface-border bg-surface-lowest p-5 font-mono text-xs leading-relaxed text-cyan-300 shadow-card">{`pnpm games:scan                  # Scan all folders in /games
pnpm game:validate <game-slug>   # Validate a single game folder
pnpm game:build <game-slug>      # Build a single game into public/_games/
pnpm dev                         # Launch OpenGameHub locally`}</pre>
      </section>
    </div>
  );
}
