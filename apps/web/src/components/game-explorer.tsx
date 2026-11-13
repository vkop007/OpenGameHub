"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { PublishedGameEntry } from "@opengamehub/game-registry";
import { ENGINE_LABELS } from "@/lib/registry";
import { GameCard, SubmitGameCard } from "@/components/game-card";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Search, RotateCcw, ChevronDown, X, Shuffle, SearchX } from "lucide-react";

type SortKey = "featured" | "name-asc" | "name-desc" | "size-asc";

export interface GameExplorerProps {
  games: PublishedGameEntry[];
  initialCategory?: string;
  initialEngine?: string;
}

const KNOWN_CATEGORIES = ["3d", "arcade", "puzzle", "action", "multiplayer", "experimental"];

function SelectField({
  label,
  testId,
  value,
  onChange,
  children
}: {
  label: string;
  testId: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-line-strong bg-panel pl-3.5 pr-9 text-sm text-fg transition-colors hover:border-white/25 focus:border-accent-line focus:outline-none focus:ring-2 focus:ring-accent/20"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
    </div>
  );
}

export function GameExplorer({
  games,
  initialCategory = "all",
  initialEngine = "all"
}: GameExplorerProps) {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedEngine, setSelectedEngine] = useState(initialEngine);
  const [sortBy, setSortBy] = useState<SortKey>("featured");

  // Cmd+K / Ctrl+K focuses the search field
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const categories = useMemo(() => {
    const found = new Set<string>();
    for (const g of games) {
      if (g.category) found.add(g.category.toLowerCase());
      for (const t of g.tags) {
        if (KNOWN_CATEGORIES.includes(t.toLowerCase())) found.add(t.toLowerCase());
      }
    }
    // Only offer categories that actually contain games
    return ["all", ...Array.from(found).sort()];
  }, [games]);

  const engines = useMemo(() => {
    const set = new Set<string>();
    for (const g of games) set.add(g.engine);
    return Array.from(set).sort();
  }, [games]);

  const matchesCategory = (game: PublishedGameEntry, cat: string) =>
    cat === "all" ||
    game.category?.toLowerCase() === cat ||
    game.tags.some((t) => t.toLowerCase() === cat);

  const filteredGames = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = games.filter((game) => {
      if (!matchesCategory(game, selectedCategory)) return false;
      if (selectedEngine !== "all" && game.engine !== selectedEngine) return false;
      if (!q) return true;
      return (
        game.name.toLowerCase().includes(q) ||
        game.description.toLowerCase().includes(q) ||
        game.engine.toLowerCase().includes(q) ||
        game.framework.toLowerCase().includes(q) ||
        game.author.toLowerCase().includes(q) ||
        game.tags.some((t) => t.toLowerCase().includes(q))
      );
    });

    list.sort((a, b) => {
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      if (sortBy === "name-desc") return b.name.localeCompare(a.name);
      if (sortBy === "size-asc") return a.bundleSizeBytes - b.bundleSizeBytes;
      return 0;
    });
    return list;
  }, [games, searchQuery, selectedCategory, selectedEngine, sortBy]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedEngine("all");
    setSortBy("featured");
  };

  const handleRandomGame = () => {
    const pool = filteredGames.length > 0 ? filteredGames : games;
    const random = pool[Math.floor(Math.random() * pool.length)];
    if (random) router.push(`/games/${random.id}`);
  };

  const categoryLabel = (cat: string) => {
    if (cat === "all") return "All";
    if (cat === "3d") return "3D";
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  const isFiltered =
    searchQuery !== "" ||
    selectedCategory !== "all" ||
    selectedEngine !== "all" ||
    sortBy !== "featured";

  return (
    <div className="space-y-6">
      {/* Search + selects */}
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <input
            ref={searchInputRef}
            type="search"
            data-testid="game-search-input"
            aria-label="Search games"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, engine, tag or author"
            className="h-11 w-full rounded-xl border border-line-strong bg-panel pl-11 pr-20 text-sm text-fg placeholder:text-subtle transition-colors hover:border-white/25 focus:border-accent-line focus:outline-none focus:ring-2 focus:ring-accent/20 [&::-webkit-search-cancel-button]:hidden"
          />
          <div className="absolute inset-y-0 right-3 flex items-center gap-2">
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="grid size-6 place-items-center rounded-md text-subtle transition-colors hover:bg-white/10 hover:text-fg"
              >
                <X className="size-3.5" />
              </button>
            )}
            <span className="kbd hidden sm:inline-flex" aria-hidden="true">
              ⌘K
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          {/* Category select stays in the DOM for assistive tech and tests; pills are the visual control */}
          <select
            aria-label="Filter by category"
            data-testid="category-filter-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="sr-only"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {categoryLabel(cat)}
              </option>
            ))}
          </select>

          <div className="min-w-[9.5rem] flex-1 sm:flex-none">
            <SelectField
              label="Filter by engine"
              testId="engine-filter-select"
              value={selectedEngine}
              onChange={setSelectedEngine}
            >
              <option value="all">All engines</option>
              {engines.map((eng) => (
                <option key={eng} value={eng}>
                  {ENGINE_LABELS[eng] ?? eng}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="min-w-[9.5rem] flex-1 sm:flex-none">
            <SelectField
              label="Sort games"
              testId="sort-select"
              value={sortBy}
              onChange={(v) => setSortBy(v as SortKey)}
            >
              <option value="featured">Featured</option>
              <option value="name-asc">Name A–Z</option>
              <option value="name-desc">Name Z–A</option>
              <option value="size-asc">Smallest first</option>
            </SelectField>
          </div>

          <button
            type="button"
            onClick={handleRandomGame}
            title="Open a random game"
            aria-label="Open a random game"
            className={buttonStyles({
              variant: "secondary",
              className: "h-11 !bg-panel px-3.5 sm:px-4"
            })}
          >
            <Shuffle className="size-4 text-accent" />
            <span className="hidden xl:inline">Surprise me</span>
          </button>
        </div>
      </div>

      {/* Category pills + result count */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="group"
          aria-label="Categories"
          className="no-scrollbar -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 py-1"
        >
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            const count = games.filter((g) => matchesCategory(g, cat)).length;
            return (
              <button
                key={cat}
                type="button"
                data-testid={`category-pill-${cat}`}
                aria-pressed={active}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors",
                  active
                    ? "border-accent bg-accent text-accent-ink"
                    : "border-line-strong text-muted hover:border-white/25 hover:text-fg"
                )}
              >
                {categoryLabel(cat)}
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    active ? "text-accent-ink/70" : "text-subtle"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-4 text-[13px] text-subtle">
          <span data-testid="games-count-summary" aria-live="polite">
            Showing <span className="font-medium text-fg">{filteredGames.length}</span> of{" "}
            {games.length} {games.length === 1 ? "game" : "games"}
          </span>
          {isFiltered && (
            <button
              type="button"
              data-testid="reset-filters-button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 font-medium text-muted transition-colors hover:text-accent"
            >
              <RotateCcw className="size-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {filteredGames.length > 0 ? (
        <div
          data-testid="games-grid"
          data-purpose="games-grid"
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filteredGames.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
          {!isFiltered && (
            // Stretch the invitation across whatever is left of the last row (3-column layout)
            <SubmitGameCard
              className={
                filteredGames.length % 3 === 1
                  ? "lg:col-span-2"
                  : "lg:col-span-1"
              }
            />
          )}
        </div>
      ) : (
        <div
          data-testid="empty-results-state"
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong px-6 py-16 text-center"
        >
          <div className="grid size-12 place-items-center rounded-2xl border border-line bg-panel text-subtle">
            <SearchX className="size-5" />
          </div>
          <h3 className="mt-5 text-lg font-semibold tracking-tight">No games match your search</h3>
          <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
            Try a different keyword, or clear the filters to see everything on the hub.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className={buttonStyles({ variant: "secondary", size: "md", className: "mt-6" })}
          >
            <RotateCcw className="size-4" />
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
