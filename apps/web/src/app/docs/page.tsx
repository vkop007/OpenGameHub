import React from "react";
import Link from "next/link";
import { MANIFEST_JSON_SCHEMA } from "@opengamehub/game-discovery";
import { ArrowRight } from "lucide-react";

export const metadata = {
  title: "Documentation — OpenGameHub",
  description:
    "Complete technical documentation for OpenGameHub: supported frameworks, build adapters, manifest schema, asset rules, security isolation, and troubleshooting."
};

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-16 px-4 py-12 sm:px-6 lg:px-8">
      <header className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
          Documentation
        </div>
        <h1
          data-testid="docs-heading"
          className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl"
        >
          Architecture & Developer Reference
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-zinc-400">
          How OpenGameHub discovers, validates, builds, and sandboxes community browser games.
        </p>
      </header>

      {/* Supported Engines & Build Adapters */}
      <section className="grid gap-12 border-t border-white/[0.06] pt-10 md:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white">
            Supported V1 Engines & Frameworks
          </h2>
          <p className="text-xs leading-relaxed text-zinc-400">
            Detected automatically from <code>package.json</code> dependencies, Vite configs, and entry HTML/JS files:
          </p>
          <ul className="space-y-2 pt-1 text-xs leading-relaxed text-zinc-300">
            <li>
              <strong className="text-white">3D Engines:</strong> Three.js (<code>three</code>), React Three Fiber (<code>@react-three/fiber</code>), Babylon.js (<code>@babylonjs/core</code>), PlayCanvas (<code>playcanvas</code>)
            </li>
            <li>
              <strong className="text-white">2D Engines:</strong> Phaser (<code>phaser</code>), PixiJS (<code>pixi.js</code>), HTML5 Canvas 2D
            </li>
            <li>
              <strong className="text-white">Web Frameworks:</strong> Vanilla HTML/JS/TS, React + Vite, Vue + Vite, Svelte + Vite
            </li>
            <li>
              <strong className="text-zinc-400">Excluded in V1:</strong> Unity WebGL, Godot Web, native binaries, and server-dependent backends.
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white">Modular Build Adapters</h2>
          <p className="text-xs leading-relaxed text-zinc-400">
            Every supported project compiles through one of two isolated build adapters:
          </p>
          <div className="space-y-4 pt-1 text-xs leading-relaxed">
            <div>
              <div className="font-semibold text-white">1. Static HTML Adapter (<code>static</code>)</div>
              <p className="mt-0.5 text-zinc-400">
                Validates <code>index.html</code>, excludes dev config files, normalizes root-relative asset paths to <code>./</code>, and verifies all referenced files exist.
              </p>
            </div>
            <div>
              <div className="font-semibold text-white">2. Vite Build Adapter (<code>vite</code>)</div>
              <p className="mt-0.5 text-zinc-400">
                Builds Vite projects in an isolated temporary directory with relative base paths (<code>base: &quot;./&quot;</code>) and outputs static files to <code>/_games/&lt;id&gt;/&lt;version&gt;/</code>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Folder, Asset & Security Rules */}
      <section className="grid gap-8 border-t border-white/[0.06] pt-10 sm:grid-cols-3">
        <div className="space-y-1.5">
          <h3 className="text-sm font-bold text-white">Slug Naming</h3>
          <p className="text-xs leading-relaxed text-zinc-400">
            Folder names in <code>/games</code> must use lowercase kebab-case (<code>a-z0-9-</code>, 2–64 chars), e.g., <code>games/space-shooter/</code>.
          </p>
        </div>
        <div className="space-y-1.5">
          <h3 className="text-sm font-bold text-white">Relative Asset Paths</h3>
          <p className="text-xs leading-relaxed text-zinc-400">
            Games run from <code>/_games/&lt;slug&gt;/&lt;version&gt;/index.html</code>. Always use relative paths like <code>./assets/sprite.png</code>.
          </p>
        </div>
        <div className="space-y-1.5">
          <h3 className="text-sm font-bold text-white">Sandboxed Iframe</h3>
          <p className="text-xs leading-relaxed text-zinc-400">
            Executed with <code>sandbox=&quot;allow-scripts allow-pointer-lock&quot;</code> and no <code>allow-same-origin</code> to isolate parent DOM and storage.
          </p>
        </div>
      </section>

      {/* Optional Manifest JSON Schema */}
      <section className="space-y-3 border-t border-white/[0.06] pt-10">
        <h2 className="text-lg font-bold text-white">
          Optional Manifest Schema (<code>opengamehub.json</code>)
        </h2>
        <p className="text-xs text-zinc-400">
          <code>opengamehub.json</code> is optional. When provided, it is validated against this JSON schema. Custom shell commands are strictly forbidden.
        </p>
        <pre className="max-h-80 overflow-auto rounded-xl bg-white/[0.03] p-5 font-mono text-xs text-zinc-300 ring-1 ring-white/[0.06]">
          {JSON.stringify(MANIFEST_JSON_SCHEMA, null, 2)}
        </pre>
      </section>

      {/* Common Build Errors */}
      <section className="space-y-4 border-t border-white/[0.06] pt-10">
        <h2 className="text-lg font-bold text-white">Common Validation Errors</h2>
        <dl className="divide-y divide-white/[0.06] text-xs">
          <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="font-mono font-semibold text-rose-400">MISSING_ENTRY_HTML</dt>
            <dd className="mt-1 text-zinc-400 sm:col-span-2 sm:mt-0">
              Ensure <code>index.html</code> exists at the root of <code>games/&lt;your-game&gt;/index.html</code>.
            </dd>
          </div>
          <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="font-mono font-semibold text-rose-400">MANIFEST_FORBIDDEN_COMMAND_KEY</dt>
            <dd className="mt-1 text-zinc-400 sm:col-span-2 sm:mt-0">
              Remove shell overrides such as <code>buildCommand</code> or <code>scripts</code> from <code>opengamehub.json</code>.
            </dd>
          </div>
          <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="font-mono font-semibold text-rose-400">Missing referenced assets</dt>
            <dd className="mt-1 text-zinc-400 sm:col-span-2 sm:mt-0">
              Verify every <code>&lt;script src=&quot;...&quot;&gt;</code> and <code>&lt;link href=&quot;...&quot;&gt;</code> points to an existing relative file inside your game folder.
            </dd>
          </div>
        </dl>
        <div className="pt-2">
          <Link
            href="/contribute"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300"
          >
            <span>Copy the AI Game Migration Prompt</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
