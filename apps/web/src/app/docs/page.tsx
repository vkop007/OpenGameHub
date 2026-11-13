import React from "react";
import Link from "next/link";
import { MANIFEST_JSON_SCHEMA } from "@opengamehub/game-discovery";
import { PageHeader } from "@/components/page-header";
import { CodeWindow } from "@/components/code-window";
import { ArrowRight, BookOpen } from "lucide-react";

export const metadata = {
  title: "Documentation — OpenGameHub",
  description:
    "Technical documentation for OpenGameHub: supported frameworks, build adapters, manifest schema, asset rules, security isolation, and troubleshooting."
};

const TOC = [
  { id: "engines", label: "Supported engines" },
  { id: "adapters", label: "Build adapters" },
  { id: "rules", label: "Folder and asset rules" },
  { id: "schema", label: "Manifest schema" },
  { id: "errors", label: "Common errors" }
];

function DocSection({
  id,
  title,
  intro,
  children
}: {
  id: string;
  title: string;
  intro: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-6 border-t border-line pt-10 first:border-t-0 first:pt-0">
      <div className="max-w-2xl space-y-3">
        <h2 className="text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">{title}</h2>
        <p className="text-[15px] leading-relaxed text-muted">{intro}</p>
      </div>
      {children}
    </section>
  );
}

/** Label on the left, detail on the right, hairline between rows. */
function DefinitionList({ items }: { items: { term: React.ReactNode; detail: React.ReactNode }[] }) {
  return (
    <dl className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">
      {items.map((item, i) => (
        <div key={i} className="grid gap-1.5 px-5 py-5 sm:grid-cols-[14rem_1fr] sm:gap-8 sm:px-6">
          <dt className="text-[15px] font-medium text-fg">{item.term}</dt>
          <dd className="text-[15px] leading-relaxed text-muted">{item.detail}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function DocsPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Docs" }]}
        eyebrow="Developer reference"
        eyebrowIcon={<BookOpen className="size-3.5" />}
        titleTestId="docs-heading"
        title="Architecture and developer reference"
        description="How OpenGameHub discovers, validates, builds and sandboxes community browser games into self-contained static bundles."
      />

      <div className="page-shell grid gap-10 pb-16 pt-8 lg:grid-cols-[13rem_1fr] lg:gap-14">
        {/* Table of contents */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <nav aria-label="On this page">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.08em] text-subtle">
              On this page
            </p>
            <ul className="flex gap-1 overflow-x-auto no-scrollbar lg:flex-col lg:gap-0.5 lg:overflow-visible">
              {TOC.map((item) => (
                <li key={item.id} className="shrink-0">
                  <a
                    href={`#${item.id}`}
                    className="block rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:bg-white/[0.05] hover:text-fg lg:-ml-3"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0 max-w-3xl space-y-10">
          <DocSection
            id="engines"
            title="Supported engines and frameworks"
            intro={
              <>
                Detected automatically from <code>package.json</code> dependencies, Vite configs and
                entry HTML or JS files. Unity WebGL, Godot Web and native binaries are not supported in
                V1.
              </>
            }
          >
            <DefinitionList
              items={[
                {
                  term: "3D engines",
                  detail: (
                    <>
                      Three.js (<code>three</code>), React Three Fiber (<code>@react-three/fiber</code>
                      ), Babylon.js (<code>@babylonjs/core</code>), PlayCanvas (<code>playcanvas</code>)
                    </>
                  )
                },
                {
                  term: "2D engines",
                  detail: (
                    <>
                      Phaser (<code>phaser</code>), PixiJS (<code>pixi.js</code>), HTML5 Canvas 2D
                    </>
                  )
                },
                {
                  term: "App frameworks",
                  detail: "Vanilla HTML, JS or TS, React with Vite, Vue with Vite, Svelte with Vite"
                }
              ]}
            />
          </DocSection>

          <DocSection
            id="adapters"
            title="Build adapters"
            intro="Every supported project compiles through one of two isolated adapters, then passes a sandbox verification step."
          >
            <DefinitionList
              items={[
                {
                  term: (
                    <>
                      Static HTML <code>static</code>
                    </>
                  ),
                  detail: (
                    <>
                      Validates <code>index.html</code>, excludes dev config files, rewrites root-relative
                      asset paths to <code>./</code> and verifies that every referenced file exists.
                    </>
                  )
                },
                {
                  term: (
                    <>
                      Vite <code>vite</code>
                    </>
                  ),
                  detail: (
                    <>
                      Builds in an isolated temporary directory with <code>base: &quot;./&quot;</code> and
                      writes static files to <code>/_games/&lt;id&gt;/&lt;version&gt;/</code>.
                    </>
                  )
                },
                {
                  term: "Sandbox verification",
                  detail: (
                    <>
                      Runs asset checks and script sanitization, then loads the game in an iframe without{" "}
                      <code>allow-same-origin</code>.
                    </>
                  )
                }
              ]}
            />
          </DocSection>

          <DocSection
            id="rules"
            title="Folder and asset rules"
            intro="Three rules cover almost every validation failure."
          >
            <DefinitionList
              items={[
                {
                  term: "Slug naming",
                  detail: (
                    <>
                      Folder names in <code>/games</code> use lowercase kebab-case (<code>a-z0-9-</code>,
                      2 to 64 characters), for example <code>games/tumble-club/</code>.
                    </>
                  )
                },
                {
                  term: "Relative asset paths",
                  detail: (
                    <>
                      Games run from <code>/_games/&lt;slug&gt;/&lt;version&gt;/index.html</code>. Use{" "}
                      <code>./assets/sprite.png</code>, not <code>/assets/sprite.png</code>.
                    </>
                  )
                },
                {
                  term: "Sandboxed iframe",
                  detail: (
                    <>
                      Games run with <code>sandbox=&quot;allow-scripts allow-pointer-lock&quot;</code> and
                      never <code>allow-same-origin</code>, which keeps the parent page and its storage
                      out of reach.
                    </>
                  )
                }
              ]}
            />
          </DocSection>

          <DocSection
            id="schema"
            title="Manifest schema"
            intro={
              <>
                <code>opengamehub.json</code> is optional. When present it is validated against this JSON
                schema by <code>pnpm game:validate</code>. Custom shell commands are not allowed.
              </>
            }
          >
            <CodeWindow title="opengamehub.schema.json" preClassName="max-h-[28rem] text-[12.5px] leading-6">
              {JSON.stringify(MANIFEST_JSON_SCHEMA, null, 2)}
            </CodeWindow>
          </DocSection>

          <DocSection
            id="errors"
            title="Common validation errors"
            intro="CI validates every pull request. These are the failures contributors hit most often."
          >
            <DefinitionList
              items={[
                {
                  term: <span className="font-mono text-[13px] text-danger">MISSING_ENTRY_HTML</span>,
                  detail: (
                    <>
                      Make sure <code>index.html</code> exists at the root of{" "}
                      <code>games/&lt;your-game&gt;/</code>.
                    </>
                  )
                },
                {
                  term: (
                    <span className="font-mono text-[13px] text-danger">
                      MANIFEST_FORBIDDEN_COMMAND_KEY
                    </span>
                  ),
                  detail: (
                    <>
                      Remove shell overrides such as <code>buildCommand</code> or <code>scripts</code>{" "}
                      from <code>opengamehub.json</code>.
                    </>
                  )
                },
                {
                  term: "Missing referenced assets",
                  detail: (
                    <>
                      Check that every <code>&lt;script src&gt;</code> and <code>&lt;link href&gt;</code>{" "}
                      points to a relative file that exists inside your game folder.
                    </>
                  )
                }
              ]}
            />
            <Link
              href="/contribute#ai-prompt"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:text-accent-strong"
            >
              Fix most of these with the AI migration prompt
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </DocSection>
        </div>
      </div>
    </>
  );
}
