import React from "react";
import Link from "next/link";
import { Gamepad2, Plus, ArrowUpRight } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0c0f]/95">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#c7f36b] text-[#0b0c0f] transition group-hover:rotate-[-6deg]">
            <Gamepad2 className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold tracking-tight text-[#f4f1ea]">
            OpenGameHub
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/games"
            data-testid="nav-games"
            className="border-b border-transparent px-3 py-2 text-sm font-medium text-[#a2a5ad] transition hover:border-[#c7f36b] hover:text-[#f4f1ea]"
          >
            Games
          </Link>
          <Link
            href="/docs"
            data-testid="nav-docs"
            className="border-b border-transparent px-3 py-2 text-sm font-medium text-[#a2a5ad] transition hover:border-[#c7f36b] hover:text-[#f4f1ea]"
          >
            Docs
          </Link>
          <Link
            href="/contribute"
            data-testid="nav-contribute"
            className="ml-1 inline-flex items-center gap-1.5 rounded-sm bg-[#c7f36b] px-3 py-2 text-xs font-bold text-[#0b0c0f] transition hover:bg-[#f4f1ea]"
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
    <footer className="mt-24 border-t border-white/10 py-10 text-xs text-[#6e737c]">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <Gamepad2 className="h-4 w-4 text-[#c7f36b]" />
          <span className="font-medium text-[#f4f1ea]">OpenGameHub</span>
          <span className="text-zinc-600">•</span>
          <span>Open-source browser game platform</span>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <Link href="/games" className="transition hover:text-[#f4f1ea]">
            Library
          </Link>
          <Link href="/contribute" className="transition hover:text-[#f4f1ea]">
            Contribute
          </Link>
          <Link href="/docs" className="inline-flex items-center gap-1 transition hover:text-[#f4f1ea]">
            Documentation
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
