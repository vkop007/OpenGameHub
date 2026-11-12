"use client";

import React, { useMemo, useState } from "react";
import type { PublishedGameEntry } from "@opengamehub/game-registry";
import { ENGINE_LABELS } from "@/lib/registry";
import { GameCard } from "@/components/game-card";
import { Search, RotateCcw, Sparkles } from "lucide-react";

export interface GameExplorerProps {
  games: PublishedGameEntry[];
  initialCategory?: string;
  initialEngine?: string;
}

export function GameExplorer({
  games,
  initialCategory = "all",
  initialEngine = "all"
}: GameExplorerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedEngine, setSelectedEngine] = useState(initialEngine);
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "size-asc">("name-asc");

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const g of games) set.add(g.category);
    return ["all", ...Array.from(set).sort()];
  }, [games]);

  const engines = useMemo(() => {
    const set = new Set<string>();
    for (const g of games) set.add(g.engine);
    return ["all", ...Array.from(set).sort()];
  }, [games]);

  const filteredGames = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = games.filter((game) => {
      if (selectedCategory !== "all" && game.category !== selectedCategory) {
        return false;
      }
      if (selectedEngine !== "all" && game.engine !== selectedEngine) {
        return false;
      }
      if (!q) return true;
      return (
        game.name.toLowerCase().includes(q) ||
        game.description.toLowerCase().includes(q) ||
        game.engine.toLowerCase().includes(q) ||
        game.framework.toLowerCase().includes(q) ||
        game.tags.some((t) => t.toLowerCase().includes(q))
      );
    });

    list.sort((a, b) => {
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      if (sortBy === "name-desc") return b.name.localeCompare(a.name);
      return a.bundleSizeBytes - b.bundleSizeBytes;
    });

    return list;
  }, [games, searchQuery, selectedCategory, selectedEngine, sortBy]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedEngine("all");
    setSortBy("name-asc");
  };

  return (
    <div className="space-y-8">
      {/* Open, Unboxed Toolbar */}
      <div className="flex flex-col gap-5 border-y border-white/10 py-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#6e737c]">Filter the archive</div>
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              data-testid={`category-pill-${cat}`}
              onClick={() => setSelectedCategory(cat)}
              className={`border px-3 py-1.5 text-xs font-medium transition ${
                selectedCategory === cat
                    ? "border-[#c7f36b] bg-[#c7f36b] font-semibold text-[#0b0c0f]"
                    : "border-white/10 text-[#a2a5ad] hover:border-white/30 hover:text-[#f4f1ea]"
              }`}
            >
              {cat === "all" ? "All Games" : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
          </div>
        </div>

        {/* Search & Inline Selects */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px] flex-1 sm:w-64">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <input
              type="search"
              data-testid="game-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search games or engines..."
              className="h-10 w-full border border-white/10 bg-[#12151a] pl-9 pr-4 text-xs text-[#f4f1ea] placeholder:text-[#6e737c] transition focus:border-[#c7f36b]"
            />
          </div>

          {/* Keep category select accessible for automated filters */}
          <select
            aria-label="Filter by category"
            data-testid="category-filter-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="sr-only"
          >
            <option value="all">All Categories</option>
            {categories
              .filter((c) => c !== "all")
              .map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
          </select>

          <select
            aria-label="Filter by engine"
            data-testid="engine-filter-select"
            value={selectedEngine}
            onChange={(e) => setSelectedEngine(e.target.value)}
            className="h-10 rounded-sm border border-white/10 bg-[#12151a] px-3 text-xs text-[#a2a5ad] focus:border-[#c7f36b] focus:outline-none"
          >
            <option value="all">All Engines</option>
            {engines
              .filter((e) => e !== "all")
              .map((eng) => (
                <option key={eng} value={eng}>
                  {ENGINE_LABELS[eng] ?? eng}
                </option>
              ))}
          </select>

          <select
            aria-label="Sort games"
            data-testid="sort-select"
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as "name-asc" | "name-desc" | "size-asc")
            }
            className="h-10 rounded-sm border border-white/10 bg-[#12151a] px-3 text-xs text-[#a2a5ad] focus:border-[#c7f36b] focus:outline-none"
          >
            <option value="name-asc">A–Z</option>
            <option value="name-desc">Z–A</option>
            <option value="size-asc">Smallest</option>
          </select>

          {(searchQuery || selectedCategory !== "all" || selectedEngine !== "all") && (
            <button
              type="button"
              data-testid="reset-filters-button"
              onClick={resetFilters}
              className="inline-flex h-10 items-center gap-1 px-3 text-xs font-medium text-[#8b93ff] transition hover:bg-white/5 hover:text-[#f4f1ea]"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Subtle Count Summary */}
      <div className="flex items-center justify-between font-mono text-xs text-[#6e737c]">
        <span data-testid="games-count-summary">
          Showing           <strong className="font-medium text-[#c7f36b]">{filteredGames.length}</strong> of{" "}
          {games.length} games
        </span>
      </div>

      {/* Game Cards Grid */}
      {filteredGames.length > 0 ? (
        <div
          data-testid="games-grid"
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {filteredGames.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      ) : (
        <div
          data-testid="empty-results-state"
          className="flex flex-col items-center justify-center border border-dashed border-white/15 py-20 text-center"
        >
          <Sparkles className="mb-3 h-8 w-8 text-[#c7f36b]" />
          <h3 className="text-base font-semibold text-[#f4f1ea]">No matching games found</h3>
          <p className="mt-1 max-w-sm text-xs text-[#a2a5ad]">
            Try clearing your search or engine filter to see all available browser games.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 inline-flex items-center gap-1.5 rounded-sm bg-[#c7f36b] px-4 py-2 text-xs font-semibold text-[#0b0c0f] hover:bg-[#f4f1ea]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Filters</span>
          </button>
        </div>
      )}
    </div>
  );
}
