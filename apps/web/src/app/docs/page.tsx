import React from "react";
import Link from "next/link";
import { MANIFEST_JSON_SCHEMA } from "@opengamehub/game-discovery";
import {
  ArrowRight,
  BookOpen,
  Layers,
  ShieldCheck,
  Terminal,
  Cpu,
  ChevronRight,
  CheckCircle2,
  FileCode,
  AlertTriangle
} from "lucide-react";

export const metadata = {
  title: "Documentation — OpenGameHub",
  description:
    "Complete technical documentation for OpenGameHub: supported frameworks, build adapters, manifest schema, asset rules, security isolation, and troubleshooting."
};

export default function DocsPage() {
  return (
    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 space-y-8">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/" className="hover:text-white transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
        <span className="text-white font-semibold">Docs</span>
      </nav>

      {/* Hero Header matching /games layout */}
      <div className="flex flex-wrap justify-between items-start gap-4 pb-4 border-b border-surface-border">
        <div className="flex min-w-72 flex-col gap-2 max-w-3xl">
          <div className="inline-flex items-center gap-2 self-start px-2.5 py-1 rounded-md bg-surface-elevated border border-surface-border text-cyan-400 font-mono text-[11px] font-semibold uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Developer Reference</span>
          </div>
          <h1
            data-testid="docs-heading"
            className="text-white text-3xl sm:text-5xl font-black leading-tight tracking-tight font-heading"
          >
            Architecture &amp; Developer Reference
          </h1>
          <p className="text-slate-400 text-sm sm:text-base font-normal leading-relaxed">
            How OpenGameHub discovers, validates, builds, and sandboxes community browser games into self-contained static Web Worker &amp; WebGL/WebGPU bundles.
          </p>
        </div>

        <div className="flex shrink-0 items-center justify-center gap-2 rounded-lg h-10 px-4 bg-surface-elevated border border-surface-border text-white text-xs font-bold font-mono">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
          <span>v2.4 Spec Verified</span>
        </div>
      </div>

      {/* Supported Engines & Build Adapters (Matched Width & Equal Heights) */}
      <section className="grid gap-6 md:grid-cols-2 items-stretch">
        {/* Card 1: Supported Engines */}
        <div className="p-6 rounded-2xl bg-surface-card border border-surface-border flex flex-col justify-between shadow-card h-full">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 text-cyan-400">
              <Cpu className="w-5 h-5" />
              <h2 className="text-base font-bold text-white font-heading">
                Supported V1 Engines &amp; Frameworks
              </h2>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              Detected automatically from <code>package.json</code> dependencies, Vite configs, and entry HTML/JS files:
            </p>
            <div className="space-y-3 pt-1 text-xs leading-relaxed text-slate-300">
              <div className="p-3.5 rounded-xl bg-surface-elevated border border-surface-border">
                <strong className="text-white block pb-1">3D WebGL / WebGPU Engines:</strong>
                <span>Three.js (<code>three</code>), React Three Fiber (<code>@react-three/fiber</code>), Babylon.js (<code>@babylonjs/core</code>), PlayCanvas (<code>playcanvas</code>)</span>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-elevated border border-surface-border">
                <strong className="text-white block pb-1">2D Sprite &amp; Physics Engines:</strong>
                <span>Phaser (<code>phaser</code>), PixiJS (<code>pixi.js</code>), HTML5 Canvas 2D</span>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-elevated border border-surface-border">
                <strong className="text-white block pb-1">Modern UI &amp; App Frameworks:</strong>
                <span>Vanilla HTML/JS/TS, React + Vite, Vue + Vite, Svelte + Vite</span>
              </div>
            </div>
          </div>
          <div className="mt-5 pt-3.5 border-t border-surface-border text-xs text-slate-500 flex items-center justify-between">
            <span><strong className="text-slate-400">Excluded in V1:</strong> Unity WebGL, Godot Web, native binaries</span>
            <span className="font-mono text-[11px] text-emerald-400">AUTO-DETECT</span>
          </div>
        </div>

        {/* Card 2: Modular Build Adapters */}
        <div className="p-6 rounded-2xl bg-surface-card border border-surface-border flex flex-col justify-between shadow-card h-full">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 text-indigo-400">
              <Layers className="w-5 h-5" />
              <h2 className="text-base font-bold text-white font-heading">
                Modular Build Adapters
              </h2>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              Every supported project compiles through one of two isolated build adapters:
            </p>
            <div className="space-y-3 pt-1 text-xs leading-relaxed">
              <div className="p-3.5 rounded-xl bg-surface-elevated border border-surface-border">
                <div className="font-semibold text-white block pb-1">1. Static HTML Adapter (<code>static</code>)</div>
                <p className="text-slate-400">
                  Validates <code>index.html</code>, excludes dev config files, normalizes root-relative asset paths to <code>./</code>, and verifies all referenced files exist.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-elevated border border-surface-border">
                <div className="font-semibold text-white block pb-1">2. Vite Build Adapter (<code>vite</code>)</div>
                <p className="text-slate-400">
                  Builds Vite projects in an isolated temporary directory with relative base paths (<code>base: &quot;./&quot;</code>) and outputs static files to <code>/_games/&lt;id&gt;/&lt;version&gt;/</code>.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-elevated border border-surface-border">
                <div className="font-semibold text-white block pb-1">3. Automated Sandbox Verification</div>
                <p className="text-slate-400">
                  Runs static asset checksum verification, script sanitization, and loads iframe without <code>allow-same-origin</code>.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-5 pt-3.5 border-t border-surface-border text-xs text-slate-500 flex items-center justify-between">
            <span><strong className="text-slate-400">Target Output:</strong> <code>public/_games/&lt;slug&gt;/&lt;version&gt;/</code></span>
            <span className="font-mono text-[11px] text-cyan-400">ZERO DEPENDENCY</span>
          </div>
        </div>
      </section>

      {/* Folder, Asset & Security Rules (3 Cards - Equal Width & Height) */}
      <section className="grid gap-6 border-t border-surface-border pt-8 sm:grid-cols-3 items-stretch">
        <div className="p-6 rounded-2xl bg-surface-card border border-surface-border flex flex-col justify-between shadow-card h-full">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>Rule 01 / Naming</span>
            </div>
            <h3 className="text-base font-bold text-white font-heading">Slug Naming</h3>
            <p className="text-xs leading-relaxed text-slate-400">
              Folder names in <code>/games</code> must use lowercase kebab-case (<code>a-z0-9-</code>, 2–64 characters), e.g., <code>games/tumble-club/</code>.
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-surface-border text-[11px] font-mono text-slate-500">
            Path: games/&lt;kebab-slug&gt;/
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-surface-card border border-surface-border flex flex-col justify-between shadow-card h-full">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Rule 02 / Bundling</span>
            </div>
            <h3 className="text-base font-bold text-white font-heading">Relative Asset Paths</h3>
            <p className="text-xs leading-relaxed text-slate-400">
              Games run from <code>/_games/&lt;slug&gt;/&lt;version&gt;/index.html</code>. Always use relative paths like <code>./assets/sprite.png</code> rather than root-relative <code>/assets/</code>.
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-surface-border text-[11px] font-mono text-slate-500">
            Base: relative ./
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-surface-card border border-surface-border flex flex-col justify-between shadow-card h-full">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-indigo-400 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <span>Rule 03 / Isolation</span>
            </div>
            <h3 className="text-base font-bold text-white font-heading">Sandboxed Iframe</h3>
            <p className="text-xs leading-relaxed text-slate-400">
              Executed with <code>sandbox=&quot;allow-scripts allow-pointer-lock&quot;</code> and strictly no <code>allow-same-origin</code> to fully isolate the parent DOM and tokens.
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-surface-border text-[11px] font-mono text-slate-500">
            Strict Zero-Trust DOM
          </div>
        </div>
      </section>

      {/* Manifest Schema & Common Validation Errors (2 Equal-Height Columns) */}
      <section className="grid gap-6 border-t border-surface-border pt-8 lg:grid-cols-2 items-stretch">
        {/* Left Col: Manifest Schema */}
        <div id="schema" className="p-6 rounded-2xl bg-surface-card border border-surface-border flex flex-col justify-between shadow-card h-full">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-cyan-400">
                <FileCode className="w-5 h-5" />
                <h2 className="text-base font-bold text-white font-heading">
                  Manifest Schema (<code>opengamehub.json</code>)
                </h2>
              </div>
              <span className="font-mono text-[10px] text-slate-400 px-2 py-0.5 rounded bg-surface-elevated border border-surface-border">OPTIONAL</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              <code>opengamehub.json</code> is validated against this JSON schema during <code>pnpm game:validate</code>. Custom shell commands are strictly forbidden.
            </p>
            <pre className="h-72 overflow-auto rounded-xl border border-surface-border bg-surface-lowest p-4 font-mono text-xs text-cyan-300">
              {JSON.stringify(MANIFEST_JSON_SCHEMA, null, 2)}
            </pre>
          </div>
          <div className="mt-4 pt-3 border-t border-surface-border text-xs text-slate-500">
            Validated by <code>@opengamehub/game-discovery</code>
          </div>
        </div>

        {/* Right Col: Common Validation Errors */}
        <div className="p-6 rounded-2xl bg-surface-card border border-surface-border flex flex-col justify-between shadow-card h-full">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              <h2 className="text-base font-bold text-white font-heading">
                Common Validation Errors &amp; Fixes
              </h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automated CI validates every PR. Here are the top 3 issues detected and their immediate remedies:
            </p>
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-surface-elevated border border-surface-border space-y-1">
                <div className="font-mono font-semibold text-rose-400 text-xs">MISSING_ENTRY_HTML</div>
                <p className="text-slate-400 text-xs">
                  Ensure <code>index.html</code> exists at the root of <code>games/&lt;your-game&gt;/index.html</code>.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-elevated border border-surface-border space-y-1">
                <div className="font-mono font-semibold text-rose-400 text-xs">MANIFEST_FORBIDDEN_COMMAND_KEY</div>
                <p className="text-slate-400 text-xs">
                  Remove shell overrides such as <code>buildCommand</code> or <code>scripts</code> from <code>opengamehub.json</code>.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-elevated border border-surface-border space-y-1">
                <div className="font-mono font-semibold text-rose-400 text-xs">Missing referenced assets</div>
                <p className="text-slate-400 text-xs">
                  Verify every <code>&lt;script src=&quot;...&quot;&gt;</code> and <code>&lt;link href=&quot;...&quot;&gt;</code> points to an existing relative file inside your game folder.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-surface-border flex items-center justify-between">
            <Link
              href="/contribute"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <span>Copy the AI Game Migration Prompt</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <span className="font-mono text-[11px] text-emerald-400">CI AUTOMATED</span>
          </div>
        </div>
      </section>
    </div>
  );
}
