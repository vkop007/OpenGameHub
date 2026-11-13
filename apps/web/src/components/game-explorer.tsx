"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { PublishedGameEntry } from "@opengamehub/game-registry";
import { ENGINE_LABELS } from "@/lib/registry";
import { GameCard } from "@/components/game-card";
import {
  Search,
  RotateCcw,
  Sparkles,
  PlayCircle,
  CheckCircle2,
  Gamepad,
  ShieldCheck,
  ChevronDown,
  X,
  Shuffle
} from "lucide-react";

export interface GameExplorerProps {
  games: PublishedGameEntry[];
  initialCategory?: string;
  initialEngine?: string;
  showTelemetryPills?: boolean;
}

export function GameExplorer({
  games,
  initialCategory = "all",
  initialEngine = "all",
  showTelemetryPills = false
}: GameExplorerProps) {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedEngine, setSelectedEngine] = useState(initialEngine);
  const [sortBy, setSortBy] = useState<"popular" | "name-asc" | "name-desc" | "size-asc">("popular");

  // Global shortcut to focus search input (Cmd+K / Ctrl+K)
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

  // Dynamic categories from games plus common standard categories
  const categories = useMemo(() => {
    const defaultCats = ["all", "action", "arcade", "puzzle", "3d", "multiplayer", "experimental"];
    const gameCats = new Set<string>();
    for (const g of games) {
      if (g.category) gameCats.add(g.category.toLowerCase());
      for (const t of g.tags) {
        if (["3d", "arcade", "puzzle", "action", "multiplayer", "experimental"].includes(t.toLowerCase())) {
          gameCats.add(t.toLowerCase());
        }
      }
    }
    return Array.from(new Set([...defaultCats, ...Array.from(gameCats)]));
  }, [games]);

  const engines = useMemo(() => {
    const set = new Set<string>();
    for (const g of games) set.add(g.engine);
    return ["all", ...Array.from(set).sort()];
  }, [games]);

  const filteredGames = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = games.filter((game) => {
      if (selectedCategory !== "all") {
        const matchesCategory =
          game.category?.toLowerCase() === selectedCategory ||
          game.tags.some((t) => t.toLowerCase() === selectedCategory);
        if (!matchesCategory) return false;
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
      if (sortBy === "size-asc") return a.bundleSizeBytes - b.bundleSizeBytes;
      return 0; // Default order
    });

    return list;
  }, [games, searchQuery, selectedCategory, selectedEngine, sortBy]);

  const getCategoryCount = (cat: string) => {
    if (cat === "all") return games.length;
    return games.filter(
      (g) =>
        g.category?.toLowerCase() === cat ||
        g.tags.some((t) => t.toLowerCase() === cat)
    ).length;
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedEngine("all");
    setSortBy("popular");
  };

  const handleRandomGame = () => {
    if (games.length === 0) return;
    const pool = filteredGames.length > 0 ? filteredGames : games;
    const random = pool[Math.floor(Math.random() * pool.length)];
    if (random) {
      router.push(`/games/${random.id}`);
    }
  };

  const getCategoryLabel = (cat: string) => {
    if (cat === "all") return "All Games";
    if (cat === "3d") return "3D WebGL";
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  const isFiltered = searchQuery !== "" || selectedCategory !== "all" || selectedEngine !== "all" || sortBy !== "popular";

  return (
    <div className="space-y-6">
      {/* Optional Telemetry / Feature Stat Pills */}
      {showTelemetryPills && (
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          <div className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-surface-card pl-3 pr-4 border border-surface-border text-xs text-slate-300">
            <PlayCircle className="w-4 h-4 text-slate-400" />
            <span>100% In-Browser Playable</span>
          </div>
          <div className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-surface-card pl-3 pr-4 border border-surface-border text-xs text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Zero Local Dependencies</span>
          </div>
          <div className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-surface-card pl-3 pr-4 border border-surface-border text-xs text-slate-300">
            <Gamepad className="w-4 h-4 text-slate-400" />
            <span>Gamepad &amp; Keyboard Supported</span>
          </div>
          <div className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-surface-card pl-3 pr-4 border border-surface-border text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Community Verified</span>
          </div>
        </div>
      )}

      {/* SECTION 1: SEARCH & TOOLBAR (Separated Discovery Bar) */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-3 sm:p-4 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              data-testid="game-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, engine, tag, or author..."
              className="w-full pl-10 pr-20 py-2.5 bg-surface-elevated border border-surface-border rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all font-body-md"
            />
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1.5">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-surface-card transition-colors"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <kbd
                onClick={() => searchInputRef.current?.focus()}
                className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-surface-card text-slate-400 border border-surface-border cursor-pointer select-none"
              >
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Controls: Engine Filter, Sort, Random Action, Reset */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            {/* Screen-reader accessible Category Filter Select (Keeps test & a11y compatibility without visual duplication) */}
            <select
              aria-label="Filter by category"
              data-testid="category-filter-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="sr-only"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {getCategoryLabel(cat)}
                </option>
              ))}
            </select>

            {/* Engine Filter Dropdown */}
            <div className="relative">
              <select
                aria-label="Filter by engine"
                data-testid="engine-filter-select"
                value={selectedEngine}
                onChange={(e) => setSelectedEngine(e.target.value)}
                className="appearance-none bg-surface-elevated border border-surface-border text-slate-200 text-xs font-medium rounded-lg h-10 pl-3 pr-8 hover:border-slate-500 focus:outline-none focus:border-slate-400 transition-colors cursor-pointer"
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
              <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                aria-label="Sort games"
                data-testid="sort-select"
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as "popular" | "name-asc" | "name-desc" | "size-asc"
                  )
                }
                className="appearance-none bg-surface-elevated border border-surface-border text-slate-200 text-xs font-medium rounded-lg h-10 pl-3 pr-8 hover:border-slate-500 focus:outline-none focus:border-slate-400 transition-colors cursor-pointer"
              >
                <option value="popular">Sort: Most Popular</option>
                <option value="name-asc">Sort: Name (A–Z)</option>
                <option value="name-desc">Sort: Name (Z–A)</option>
                <option value="size-asc">Sort: Smallest Size</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Random Game Action */}
            <button
              type="button"
              onClick={handleRandomGame}
              className="h-10 px-3.5 bg-surface-elevated hover:bg-slate-800 border border-surface-border text-slate-200 hover:text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Play a random game"
            >
              <Shuffle className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Random</span>
            </button>

            {/* Reset Filters Action */}
            {isFiltered && (
              <button
                type="button"
                data-testid="reset-filters-button"
                onClick={resetFilters}
                className="h-10 px-3 bg-surface-elevated hover:bg-red-950/30 border border-surface-border hover:border-red-500/40 text-slate-300 hover:text-red-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: CATEGORY FILTER TABS & RESULTS COUNT */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-b border-surface-border pb-3">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            const count = getCategoryCount(cat);
            return (
              <button
                key={cat}
                type="button"
                data-testid={`category-pill-${cat}`}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-white text-slate-950 font-semibold shadow-sm"
                    : "bg-surface-card hover:bg-surface-elevated text-slate-400 hover:text-white border border-surface-border"
                }`}
              >
                <span>{getCategoryLabel(cat)}</span>
                <span
                  className={`ml-1.5 text-[10px] font-mono ${
                    isActive ? "text-slate-800 font-bold" : "text-slate-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Live Result Counter */}
        <div className="text-xs text-slate-400 font-medium shrink-0 flex items-center gap-2">
          <span data-testid="games-count-summary">
            Showing <span className="text-white font-semibold">{filteredGames.length}</span>{" "}
            of {games.length} {games.length === 1 ? "game" : "games"}
          </span>
        </div>
      </div>

      {/* Games Card Grid */}
      {filteredGames.length > 0 ? (
        <div
          data-testid="games-grid"
          data-purpose="games-grid"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {filteredGames.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      ) : (
        <div
          data-testid="empty-results-state"
          className="flex flex-col items-center justify-center border border-dashed border-surface-border rounded-xl py-20 px-4 text-center bg-surface-card"
        >
          <Sparkles className="mb-3 h-8 w-8 text-slate-400" />
          <h3 className="text-base font-semibold text-white">No matching games found</h3>
          <p className="mt-1 max-w-sm text-xs text-slate-400">
            Try clearing your search query or engine filters to browse all community sandboxes.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-slate-200 transition-colors shadow-sm"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Filters</span>
          </button>
        </div>
      )}
    </div>
  );
}
