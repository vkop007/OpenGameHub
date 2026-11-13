"use client";

import React, { useMemo, useState } from "react";
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
  ChevronDown
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedEngine, setSelectedEngine] = useState(initialEngine);
  const [sortBy, setSortBy] = useState<"popular" | "name-asc" | "name-desc" | "rating" | "size-asc">("popular");

  // Dynamic categories from games plus common categories
  const categories = useMemo(() => {
    const defaultCats = ["all", "action", "arcade", "puzzle", "3d", "multiplayer", "experimental"];
    const gameCats = new Set<string>();
    for (const g of games) {
      if (g.category) gameCats.add(g.category.toLowerCase());
      for (const t of g.tags) {
        if (["3d", "arcade", "puzzle", "action", "multiplayer"].includes(t.toLowerCase())) {
          gameCats.add(t.toLowerCase());
        }
      }
    }
    const combined = Array.from(new Set([...defaultCats, ...Array.from(gameCats)]));
    return combined;
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

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedEngine("all");
    setSortBy("popular");
  };

  const getCategoryLabel = (cat: string) => {
    if (cat === "all") return "All Games";
    if (cat === "3d") return "3D WebGL";
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  };

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

      {/* Controls & Filter Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                data-testid={`category-pill-${cat}`}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-surface-elevated border border-transparent"
                }`}
              >
                {getCategoryLabel(cat)}
              </button>
            );
          })}
        </div>

        {/* Filter Dropdowns & Live Search Input */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
          {/* Search games or engines */}
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              data-testid="game-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search games or engines..."
              className="w-full pl-8 pr-3 py-1.5 bg-surface-elevated border border-surface-border rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500 transition-colors"
            />
          </div>

          {/* Category Filter Dropdown */}
          <div className="relative">
            <select
              aria-label="Filter by category"
              data-testid="category-filter-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="appearance-none bg-surface-elevated border border-surface-border text-slate-300 text-xs rounded-lg pl-3 pr-8 py-1.5 hover:border-slate-500 focus:outline-none focus:border-slate-500 transition-colors cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {getCategoryLabel(cat)}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
              <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>

          {/* Engine Filter Dropdown */}
          <div className="relative">
            <select
              aria-label="Filter by engine"
              data-testid="engine-filter-select"
              value={selectedEngine}
              onChange={(e) => setSelectedEngine(e.target.value)}
              className="appearance-none bg-surface-elevated border border-surface-border text-slate-300 text-xs rounded-lg pl-3 pr-8 py-1.5 hover:border-slate-500 focus:outline-none focus:border-slate-500 transition-colors cursor-pointer"
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
            <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-500">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Sorting Dropdown */}
          <div className="relative">
            <select
              aria-label="Sort games"
              data-testid="sort-select"
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as "popular" | "name-asc" | "name-desc" | "rating" | "size-asc"
                )
              }
              className="appearance-none bg-surface-elevated border border-surface-border text-slate-300 text-xs rounded-lg pl-3 pr-8 py-1.5 hover:border-slate-500 focus:outline-none focus:border-slate-500 transition-colors cursor-pointer"
            >
              <option value="popular">Most Popular</option>
              <option value="name-asc">A–Z</option>
              <option value="name-desc">Z–A</option>
              <option value="rating">Top Rated</option>
              <option value="size-asc">Smallest</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-500">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Reset Filters Button */}
          {(searchQuery || selectedCategory !== "all" || selectedEngine !== "all") && (
            <button
              type="button"
              data-testid="reset-filters-button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-surface-elevated border border-surface-border hover:border-slate-500 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Result Count Info */}
      <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
        <span data-testid="games-count-summary">
          Showing <span className="text-slate-100 font-semibold">{filteredGames.length}</span>{" "}
          of {games.length} games
        </span>
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
