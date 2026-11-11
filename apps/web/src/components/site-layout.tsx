import React from "react";
import Link from "next/link";
import { Gamepad2, Plus } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#07070a]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-zinc-950 transition group-hover:scale-105">
            <Gamepad2 className="h-4 w-4" />
          </div>
          <span className="text-base font-bold tracking-tight text-white">
            OpenGameHub
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link
            href="/games"
            data-testid="nav-games"
            className="text-sm font-medium text-zinc-400 transition hover:text-white"
          >
            Games
          </Link>
          <Link
            href="/docs"
            data-testid="nav-docs"
            className="text-sm font-medium text-zinc-400 transition hover:text-white"
          >
            Docs
          </Link>
          <Link
            href="/contribute"
            data-testid="nav-contribute"
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-zinc-200"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Submit Game</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-white/[0.06] py-12 text-xs text-zinc-500">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <Gamepad2 className="h-4 w-4 text-zinc-400" />
          <span className="font-medium text-zinc-300">OpenGameHub</span>
          <span className="text-zinc-600">•</span>
          <span>Open-source browser game platform</span>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <Link href="/games" className="transition hover:text-zinc-300">
            Library
          </Link>
          <Link href="/contribute" className="transition hover:text-zinc-300">
            Contribute
          </Link>
          <Link href="/docs" className="transition hover:text-zinc-300">
            Documentation
          </Link>
        </div>
      </div>
    </footer>
  );
}
