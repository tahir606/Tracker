"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchResultCard } from "@/components/media/search-result-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { SearchResult, TrackedMedia } from "@/types";

const MEDIA_TYPES = ["ANIME", "MANGA", "TV", "MOVIE"] as const;
type MediaType = (typeof MEDIA_TYPES)[number];

const TYPE_LABELS: Record<MediaType, string> = {
  ANIME: "Anime",
  MANGA: "Manga",
  TV: "TV shows",
  MOVIE: "Movies",
};

/** How many results each type shows in the "All" view before "Show all". */
const ALL_VIEW_LIMIT = 6;

type Results = Partial<Record<MediaType, SearchResult[]>>;

const libraryKey = (externalId: string, source: string) => `${source}:${externalId}`;

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"ALL" | MediaType>("ALL");
  const [results, setResults] = useState<Results>({});
  const [loading, setLoading] = useState(false);
  const [searchedFor, setSearchedFor] = useState<string | null>(null);
  const [library, setLibrary] = useState<Map<string, string>>(new Map());
  const requestId = useRef(0);

  // Know what's already tracked so results can say "In library" instead of "Add".
  useEffect(() => {
    fetch("/api/media")
      .then((r) => (r.ok ? r.json() : []))
      .then((items: TrackedMedia[]) =>
        setLibrary(new Map(items.map((m) => [libraryKey(m.externalId, m.source), m.id])))
      )
      .catch(() => {});
  }, []);

  async function runSearch(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    const id = ++requestId.current;
    setLoading(true);
    setSearchedFor(trimmed);

    // AniList and TMDB are separate providers, so search every type at once
    // and let the tabs filter — nobody should have to guess the type first.
    const settled = await Promise.allSettled(
      MEDIA_TYPES.map(async (t) => {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&type=${t}`);
        if (!res.ok) throw new Error("Search failed");
        return [t, (await res.json()) as SearchResult[]] as const;
      })
    );
    if (id !== requestId.current) return;

    const next: Results = {};
    for (const r of settled) {
      if (r.status === "fulfilled") next[r.value[0]] = r.value[1];
    }
    setResults(next);
    setLoading(false);
  }

  const counts = Object.fromEntries(
    MEDIA_TYPES.map((t) => [t, results[t]?.length ?? 0])
  ) as Record<MediaType, number>;
  const total = MEDIA_TYPES.reduce((n, t) => n + counts[t], 0);
  // Lead with the type whose results open on an exact title match, so searching
  // "Severance" shows the TV series before a manga that merely shares the name.
  const normalized = (searchedFor ?? "").toLowerCase();
  const exactHit = (t: MediaType) => {
    const i = (results[t] ?? [])
      .slice(0, 3)
      .findIndex(
        (r) => r.title.toLowerCase() === normalized || r.titleEnglish?.toLowerCase() === normalized
      );
    return i === -1 ? 3 : i;
  };
  const visibleTypes =
    type === "ALL"
      ? MEDIA_TYPES.filter((t) => counts[t] > 0).sort((a, b) => exactHit(a) - exactHit(b))
      : [type];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Add a title</h1>
        <p className="text-sm text-muted-foreground">
          Search anime and manga (AniList) and TV shows and movies (TMDB).
        </p>
      </div>

      <form
        role="search"
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(query);
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search titles"
            placeholder="e.g. Frieren, Severance, Dune"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 pl-9 text-base sm:text-sm"
            autoFocus
          />
        </div>
        <Button type="submit" size="lg" className="h-10" disabled={!query.trim() || loading}>
          {loading ? <Loader2 className="animate-spin" /> : <Search />}
          <span className="hidden sm:inline">Search</span>
        </Button>
      </form>

      {searchedFor && (
        <Tabs value={type} onValueChange={(v) => setType(v as "ALL" | MediaType)}>
          <TabsList className="max-w-full overflow-x-auto overflow-y-hidden [scrollbar-width:none]">
            <TabsTrigger value="ALL" className="text-xs">
              All <span className="tabular-nums text-muted-foreground">{loading ? "" : total}</span>
            </TabsTrigger>
            {MEDIA_TYPES.map((t) => (
              <TabsTrigger key={t} value={t} className="text-xs">
                {TYPE_LABELS[t]}{" "}
                <span className="tabular-nums text-muted-foreground">{loading ? "" : counts[t]}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[140px] rounded-xl" />
          ))}
        </div>
      ) : !searchedFor ? (
        <p className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
          Type a title above and press Enter.
        </p>
      ) : visibleTypes.every((t) => counts[t] === 0) ? (
        <p className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
          {type === "ALL"
            ? `Nothing found for “${searchedFor}”. Check the spelling or try the original title.`
            : `No ${TYPE_LABELS[type].toLowerCase()} found for “${searchedFor}”.`}
        </p>
      ) : (
        <div className="space-y-8">
          {visibleTypes.map((t) => {
            const items = results[t] ?? [];
            const shown = type === "ALL" ? items.slice(0, ALL_VIEW_LIMIT) : items;
            return (
              <section key={t} className="space-y-3">
                {type === "ALL" && (
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">{TYPE_LABELS[t]}</h2>
                    {items.length > ALL_VIEW_LIMIT && (
                      <Button variant="ghost" size="sm" onClick={() => setType(t)}>
                        Show all {items.length}
                      </Button>
                    )}
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {shown.map((result) => (
                    <SearchResultCard
                      key={`${result.source}-${result.externalId}`}
                      result={result}
                      libraryId={library.get(libraryKey(result.externalId, result.source))}
                      onAdded={(id) =>
                        setLibrary((prev) =>
                          new Map(prev).set(libraryKey(result.externalId, result.source), id)
                        )
                      }
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
