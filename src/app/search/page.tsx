"use client";

import { useState, useCallback } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchResultCard } from "@/components/media/search-result-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { SearchResult } from "@/types";

const SEARCH_TYPES = [
  { value: "ANIME", label: "Anime" },
  { value: "MANGA", label: "Manga" },
  { value: "TV", label: "TV Shows" },
  { value: "MOVIE", label: "Movies" },
] as const;

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("ANIME");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(
    async (searchQuery?: string, searchType?: string) => {
      const q = searchQuery ?? query;
      const t = searchType ?? type;
      if (!q.trim()) return;

      setLoading(true);
      setSearched(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q)}&type=${t}`
        );
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [query, type]
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Search</h1>

      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search for anime, manga, TV shows, or movies..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Tabs
            value={type}
            onValueChange={(v) => {
              setType(v);
              if (query.trim()) handleSearch(query, v);
            }}
          >
            <TabsList>
              {SEARCH_TYPES.map((t) => (
                <TabsTrigger key={t.value} value={t.value} className="text-xs">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[150px] rounded-lg" />
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((result) => (
            <SearchResultCard key={result.externalId} result={result} />
          ))}
        </div>
      ) : searched ? (
        <div className="py-12 text-center text-muted-foreground">
          No results found
        </div>
      ) : (
        <div className="py-12 text-center text-muted-foreground">
          Search for anime, manga, TV shows, or movies to track them
        </div>
      )}
    </div>
  );
}
