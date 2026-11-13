"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, Plus, Search, X } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const REPO_URL = "https://github.com/vkop007/OpenGameHub";

const NAV_LINKS = [
  { href: "/games", label: "Games", testId: "nav-games" },
  { href: "/docs", label: "Docs", testId: "nav-docs" },
  { href: "/contribute", label: "Contribute", testId: "nav-contribute" }
] as const;

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className} fill="none">
      <rect width="32" height="32" rx="9" className="fill-accent" />
      <path
        d="M12 9.6c0-1 1.1-1.6 1.95-1.07l9.1 5.9c.77.5.77 1.64 0 2.14l-9.1 5.9C13.1 22.97 12 22.37 12 21.4V9.6Z"
        fill="#1a1203"
        transform="translate(-0.5 1)"
      />
      <circle cx="23" cy="9" r="2.2" fill="#1a1203" fillOpacity="0.55" />
    </svg>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu whenever the route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      data-purpose="primary-navigation"
      className={cn(
        "sticky top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled || menuOpen
          ? "border-b border-line bg-canvas/90 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="page-shell flex h-16 items-center justify-between gap-6">
        <div className="flex items-center gap-10">
          <Link
            href="/"
            aria-label="OpenGameHub home"
            className="group flex items-center gap-2.5 rounded-lg"
          >
            <LogoMark className="size-7 transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-105" />
            <span className="text-[15px] font-semibold tracking-tight text-fg">OpenGameHub</span>
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                data-testid={link.testId}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={cn(
                  "relative rounded-lg px-3 py-1.5 text-sm transition-colors",
                  isActive(link.href)
                    ? "text-fg"
                    : "text-muted hover:text-fg"
                )}
              >
                {link.label}
                {isActive(link.href) && (
                  <span className="absolute inset-x-3 -bottom-[13px] h-px bg-accent" />
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/games"
            aria-label="Search games"
            className={buttonStyles({ variant: "ghost", size: "sm", className: "hidden sm:inline-flex" })}
          >
            <Search className="size-4" />
            <span>Search</span>
          </Link>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className={buttonStyles({ variant: "ghost", size: "sm", className: "hidden lg:inline-flex" })}
          >
            <span>GitHub</span>
            <ArrowUpRight className="size-3.5 opacity-70" />
          </a>
          <Link
            href="/contribute"
            className={buttonStyles({ variant: "primary", size: "sm", className: "hidden sm:inline-flex" })}
          >
            <Plus className="size-3.5" strokeWidth={2.5} />
            <span>Submit a game</span>
          </Link>

          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex size-9 items-center justify-center rounded-lg border border-line-strong text-fg transition-colors hover:bg-white/[0.06] md:hidden"
          >
            {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="mobile-menu" className="page-shell pb-5 md:hidden">
          <nav aria-label="Mobile" className="flex flex-col gap-1 border-t border-line pt-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={cn(
                  "rounded-xl px-3 py-3 text-base font-medium transition-colors",
                  isActive(link.href) ? "bg-white/[0.06] text-fg" : "text-muted hover:text-fg"
                )}
              >
                {link.label}
              </Link>
            ))}
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl px-3 py-3 text-base font-medium text-muted transition-colors hover:text-fg"
            >
              GitHub
            </a>
            <Link
              href="/contribute"
              className={buttonStyles({ variant: "primary", size: "lg", className: "mt-3" })}
            >
              <Plus className="size-4" strokeWidth={2.5} />
              <span>Submit a game</span>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

const FOOTER_COLUMNS: {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
}[] = [
  {
    title: "Platform",
    links: [
      { label: "Browse games", href: "/games" },
      { label: "Contribute", href: "/contribute" },
      { label: "Documentation", href: "/docs" }
    ]
  },
  {
    title: "Developers",
    links: [
      { label: "Manifest schema", href: "/docs#schema" },
      { label: "AI migration prompt", href: "/contribute#ai-prompt" },
      { label: "Local commands", href: "/contribute#commands" }
    ]
  },
  {
    title: "Community",
    links: [
      { label: "GitHub", href: REPO_URL, external: true },
      { label: "Open an issue", href: `${REPO_URL}/issues`, external: true },
      { label: "Pull requests", href: `${REPO_URL}/pulls`, external: true }
    ]
  }
];

export function SiteFooter() {
  return (
    <footer data-purpose="site-footer" className="relative z-10 border-t border-line bg-sunken">
      <div className="page-shell py-12">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-xs space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5 rounded-lg">
              <LogoMark className="size-7" />
              <span className="text-[15px] font-semibold tracking-tight">OpenGameHub</span>
            </Link>
            <p className="text-sm leading-relaxed text-subtle">
              An open-source home for browser games. One game, one folder, no platform code to touch.
            </p>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h2 className="text-xs font-medium uppercase tracking-[0.08em] text-subtle">
                {col.title}
              </h2>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-fg"
                      >
                        {link.label}
                        <ArrowUpRight className="size-3 opacity-60" />
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-muted transition-colors hover:text-fg"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col justify-between gap-3 border-t border-line pt-6 text-[13px] text-subtle sm:flex-row sm:items-center">
          <span>MIT licensed. Built by the OpenGameHub community.</span>
          <span>Games run in sandboxed iframes.</span>
        </div>
      </div>
    </footer>
  );
}
