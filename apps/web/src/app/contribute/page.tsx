import React from "react";
import Link from "next/link";
import { AI_MIGRATION_PROMPT_TEXT } from "@/lib/ai-prompt";
import { CopyPromptBlock } from "@/components/copy-prompt-block";
import { CodeWindow } from "@/components/code-window";
import { PageHeader, SectionHeading } from "@/components/page-header";
import { ArrowRight, Check, GitBranch } from "lucide-react";

export const metadata = {
  title: "Contribute a game — OpenGameHub",
  description:
    "Learn how to contribute your browser game to OpenGameHub using our one-folder architecture and AI Game Migration Prompt."
};

const STEPS = [
  {
    title: "Fork and clone",
    body: "Fork OpenGameHub on GitHub and clone it to your machine."
  },
  {
    title: "Add your folder",
    body: "Copy your static HTML or Vite project into games/your-slug/."
  },
  {
    title: "Test locally",
    body: "Run game:validate and game:build to confirm a clean, warning-free result."
  },
  {
    title: "Open a pull request",
    body: "CI checks the sandbox and publishes your build once it merges."
  }
];

const BENEFITS = [
  "Engine detection for Three.js, R3F, Babylon.js, PlayCanvas, Phaser, PixiJS and Canvas 2D",
  "Optional opengamehub.json for a custom title, controls and tags",
  "Relative asset paths verified for the published index.html",
  "Every game runs in its own sandboxed iframe"
];

export default function ContributePage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Contribute" }]}
        eyebrow="Contributor guide"
        eyebrowIcon={<GitBranch className="size-3.5" />}
        titleTestId="contribute-heading"
        title={
          <>
            One game,
            <br />
            <span className="text-muted">one folder.</span>
          </>
        }
        description={
          <>
            You never touch the website, root config or deploy files. Put a self-contained folder in{" "}
            <code>games/your-slug/</code> and open a pull request.
          </>
        }
        aside={
          <a
            href="https://github.com/vkop007/OpenGameHub"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2.5 rounded-full border border-line-strong bg-white/[0.03] px-4 py-2 text-sm text-muted transition-colors hover:border-white/25 hover:text-fg"
          >
            <span className="size-2 rounded-full bg-accent" />
            Pull requests welcome
          </a>
        }
      />

      <div className="page-shell space-y-16 pb-16 pt-10">
        {/* Steps */}
        <section aria-label="Contribution steps">
          <ol className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="bg-panel p-6 sm:p-7">
                <span className="text-sm font-semibold tabular-nums text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-4 text-lg font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Structure */}
        <section className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-6">
            <SectionHeading
              title="Keep the structure you already have"
              description="Whether you use src/scenes, a public folder or a flat index.html plus game.js, discovery reads your real dependencies and entry point."
            />
            <ul className="space-y-4">
              {BENEFITS.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15px] leading-relaxed text-muted">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <CodeWindow title="games/tumble-club" className="shadow-pop">
            <span className="text-subtle">opengamehub/</span>
            {"\n"}
            <span className="text-subtle">└── </span>
            <span className="text-fg">games/</span>
            {"\n"}
            <span className="text-subtle">    └── </span>
            <span className="text-fg">tumble-club/</span>
            <span className="text-subtle">   # Vite + Three.js</span>
            {"\n"}
            <span className="text-subtle">        ├── </span>package.json
            {"\n"}
            <span className="text-subtle">        ├── </span>vite.config.ts
            {"\n"}
            <span className="text-subtle">        ├── </span>
            <span className="text-accent">opengamehub.json</span>
            <span className="text-subtle">   # optional</span>
            {"\n"}
            <span className="text-subtle">        ├── </span>index.html
            {"\n"}
            <span className="text-subtle">        └── </span>src/
          </CodeWindow>
        </section>

        {/* AI prompt */}
        <section id="ai-prompt" className="space-y-6">
          <SectionHeading
            title="AI migration prompt"
            description="Paste this into Cursor, Claude Code or Gemini with your game open. It adjusts asset paths and build output so your project is ready to submit."
            action={
              <Link
                href="/docs"
                className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-fg"
              >
                Full technical docs
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            }
          />
          <CopyPromptBlock title="docs/AI_GAME_MIGRATION_PROMPT.md" content={AI_MIGRATION_PROMPT_TEXT} />
        </section>

        {/* Commands */}
        <section id="commands" className="space-y-6">
          <SectionHeading
            title="Local commands"
            description="Everything you need to check your game before opening a pull request."
          />
          <CodeWindow title="terminal">
            <span className="text-subtle">$ </span>
            <span className="text-fg">pnpm games:scan</span>
            <span className="text-subtle">                 # scan every folder in /games</span>
            {"\n"}
            <span className="text-subtle">$ </span>
            <span className="text-fg">pnpm game:validate</span> {"<game-slug>"}
            <span className="text-subtle">  # validate one game</span>
            {"\n"}
            <span className="text-subtle">$ </span>
            <span className="text-fg">pnpm game:build</span> {"<game-slug>"}
            <span className="text-subtle">     # build into public/_games/</span>
            {"\n"}
            <span className="text-subtle">$ </span>
            <span className="text-fg">pnpm dev</span>
            <span className="text-subtle">                        # run OpenGameHub locally</span>
          </CodeWindow>
        </section>
      </div>
    </>
  );
}
