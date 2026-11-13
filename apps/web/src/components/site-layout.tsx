"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Gamepad2, Plus, Search, Star, ExternalLink } from "lucide-react";

export function SiteHeader() {
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;

    const handleScroll = () => {
      // Clamp so rubber-band overscroll at the top or bottom doesn't flip the scroll direction
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const y = Math.max(0, Math.min(window.scrollY, maxScroll));

      if (y === lastY) return;

      // Hide only after scrolling down past the bar's own height (64px) so it doesn't flicker near the top
      const shouldHide = y > lastY && y > 64;
      setIsHidden(shouldHide);
      lastY = y;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`site-header sticky top-0 z-50 backdrop-blur-xl bg-surface-base/90 border-b border-surface-border transition-transform duration-300 focus-within:translate-y-0 ${
        isHidden ? "is-hidden -translate-y-full" : "translate-y-0"
      }`}
      data-purpose="primary-navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Nav */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            aria-label="OpenGameHub Home"
            className="flex items-center gap-3 group focus:outline-none"
          >
            <div className="w-9 h-9 rounded-xl bg-surface-card border border-surface-border flex items-center justify-center text-white transition-colors group-hover:border-slate-500 group-hover:bg-surface-elevated">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-heading font-bold tracking-tight text-base sm:text-lg text-white group-hover:text-slate-200 transition-colors flex items-center gap-1.5">
              OpenGameHub
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-surface-elevated text-slate-400 border border-surface-border font-medium tracking-wider">
                v2.4
              </span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-400">
            <Link
              href="/games"
              data-testid="nav-games"
              className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-surface-elevated transition-colors"
            >
              Games
            </Link>
            <Link
              href="/docs"
              data-testid="nav-docs"
              className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-surface-elevated transition-colors"
            >
              Docs
            </Link>
            <Link
              href="/contribute"
              data-testid="nav-contribute"
              className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-surface-elevated transition-colors"
            >
              Contribute
            </Link>
            <a
              href="https://github.com/opengamehub"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-surface-elevated transition-colors"
            >
              Community
            </a>
            <div className="px-3 py-1.5 rounded-lg text-slate-400 flex items-center gap-1.5 cursor-default">
              <span>Leaderboard</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          </nav>
        </div>

        {/* Quick Search & Actions */}
        <div className="flex items-center gap-3">
          {/* Quick Search trigger button */}
          <Link
            href="/games"
            aria-label="Quick Search"
            className="hidden sm:flex items-center gap-3 px-3 py-1.5 text-xs text-slate-400 bg-surface-elevated hover:bg-surface-card border border-surface-border rounded-lg transition-colors focus:outline-none focus:border-slate-500"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="pr-2">Search.</span>
            <kbd className="font-mono text-[10px] bg-surface-high text-slate-400 border border-surface-border px-1.5 py-0.5 rounded">
              ⌘K
            </kbd>
          </Link>

          {/* GitHub Stargazers pill */}
          <a
            href="https://github.com/opengamehub"
            target="_blank"
            rel="noreferrer"
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-surface-card hover:bg-surface-elevated border border-surface-border rounded-lg transition-colors"
          >
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>Stars</span>
            <span className="ml-1 text-[11px] font-mono px-1.5 py-0.2 rounded bg-surface-high text-slate-200 font-semibold">
              14.8k
            </span>
          </a>

          {/* Submit Game CTA Button */}
          <Link
            href="/contribute"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-950 bg-white hover:bg-slate-200 active:scale-[0.98] transition shadow-sm focus:outline-none"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Submit Game</span>
          </Link>

          {/* User Profile Avatar Pill */}
          <div className="h-8 w-8 rounded-full border border-surface-border bg-surface-card hover:border-slate-500 flex items-center justify-center font-mono text-[11px] font-bold text-slate-200 transition-colors ml-1 cursor-pointer">
            OG
          </div>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer
      className="border-t border-surface-border bg-surface-base text-slate-500 text-xs py-8 relative z-10"
      data-purpose="site-footer"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-slate-400 font-medium">All sandbox systems nominal</span>
          <span className="mx-2 text-slate-700">|</span>
          <span>MIT Licensed • OpenGameHub Project</span>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <Link href="/docs" className="hover:text-slate-300 transition-colors">
            Documentation
          </Link>
          <Link href="/docs#schema" className="hover:text-slate-300 transition-colors">
            Manifest Schema
          </Link>
          <a
            href="https://github.com/opengamehub"
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-300 transition-colors inline-flex items-center gap-1"
          >
            GitHub Repository
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://discord.gg"
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-300 transition-colors"
          >
            Discord Community
          </a>
        </div>
      </div>
    </footer>
  );
}
