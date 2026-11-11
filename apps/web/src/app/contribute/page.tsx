import React from "react";
import Link from "next/link";
import { AI_MIGRATION_PROMPT_TEXT } from "@/lib/ai-prompt";
import { CopyPromptBlock } from "@/components/copy-prompt-block";
import { Check, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Contribute a Game — OpenGameHub",
  description:
    "Learn how to contribute your browser game to OpenGameHub using our one-folder architecture and AI Game Migration Prompt."
};

export default function ContributePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-16 px-4 py-12 sm:px-6 lg:px-8">
      {/* Editorial Header */}
      <header className="space-y-4">
        <div className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
          Contributor Guide
        </div>
        <h1
          data-testid="contribute-heading"
          className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl"
        >
          One Game = One Folder.
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-zinc-400">
          Never touch the main website, root config, or deployment files. Place your self-contained game folder inside{" "}
          <code className="text-zinc-200 font-mono">games/&lt;your-slug&gt;/</code> and open a Pull Request.
        </p>
      </header>

      {/* Clean Horizontal Step Timeline (No boxy cards) */}
      <section className="border-t border-white/[0.06] pt-10">
        <div className="grid gap-8 sm:grid-cols-4">
          {[
            {
              num: "01",
              title: "Fork & Clone",
              desc: "Fork OpenGameHub on GitHub and clone the repository locally."
            },
            {
              num: "02",
              title: "Drop Your Folder",
              desc: "Copy your Static HTML or Vite game into games/<game-slug>/."
            },
            {
              num: "03",
              title: "Test Locally",
              desc: "Run pnpm game:validate <slug> and pnpm game:build <slug>."
            },
            {
              num: "04",
              title: "Open a PR",
              desc: "Submit your Pull Request. CI verifies and publishes your game."
            }
          ].map((step) => (
            <div key={step.num} className="space-y-2">
              <div className="font-mono text-xs font-bold text-indigo-400">
                {step.num}
              </div>
              <h2 className="text-base font-bold text-white">{step.title}</h2>
              <p className="text-xs leading-relaxed text-zinc-400">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Unboxed Two-Column Architecture Explanation */}
      <section className="grid gap-10 border-t border-white/[0.06] pt-10 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-6">
          <h2 className="text-xl font-bold tracking-tight text-white">
            Keep your original folder structure
          </h2>
          <p className="text-sm leading-relaxed text-zinc-400">
            Whether your project uses <code>src/scenes/</code>, <code>public/</code>, or a flat <code>index.html</code> + <code>game.js</code>, the discovery engine inspects your actual dependencies and entry point.
          </p>
          <ul className="space-y-2.5 pt-2 text-xs text-zinc-300">
            {[
              "Automatic engine detection for Three.js, R3F, Babylon.js, PlayCanvas, Phaser, PixiJS, and Canvas 2D",
              "Optional opengamehub.json manifest for custom title, controls, and tags",
              "Relative path verification for /_games/<slug>/<version>/index.html",
              "Sandboxed iframe execution with zero cross-game interference"
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-6">
          <pre className="overflow-x-auto rounded-xl bg-white/[0.03] p-5 font-mono text-xs leading-relaxed text-zinc-300 ring-1 ring-white/[0.06]">{`opengamehub/
└── games/
    ├── space-shooter/          # Vite + Three.js
    │   ├── package.json
    │   ├── vite.config.ts
    │   ├── opengamehub.json    # Optional metadata
    │   ├── index.html
    │   └── src/
    │
    └── neon-breakout/          # Static HTML5
        ├── index.html
        ├── game.js
        └── assets/`}</pre>
        </div>
      </section>

      {/* AI Game Migration Prompt */}
      <section className="space-y-4 border-t border-white/[0.06] pt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-white">
              AI Game Migration Prompt
            </h2>
            <p className="text-xs text-zinc-400">
              Paste this prompt into Cursor, Claude Code, or Gemini while your existing game is open to verify relative asset paths and static output automatically.
            </p>
          </div>
          <Link
            href="/docs"
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300"
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
      <section className="space-y-3 border-t border-white/[0.06] pt-10">
        <h2 className="text-lg font-bold tracking-tight text-white">
          Local Verification Commands
        </h2>
        <pre className="overflow-x-auto rounded-xl bg-white/[0.03] p-5 font-mono text-xs leading-relaxed text-zinc-300 ring-1 ring-white/[0.06]">{`pnpm games:scan                  # Scan all folders in /games
pnpm game:validate <game-slug>   # Validate a single game folder
pnpm game:build <game-slug>      # Build a single game into public/_games/
pnpm dev                         # Launch OpenGameHub locally`}</pre>
      </section>
    </div>
  );
}
