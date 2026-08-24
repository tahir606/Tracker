"use client";

import { useState } from "react";
import { MediaCard } from "./media-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SECTION_LABELS, SECTION_ORDER } from "@/lib/constants";
import { getLibrarySection } from "@/lib/library-section";
import type { TrackedMedia } from "@/types";
import type { NextEpisodeInfo } from "@/app/page";

const TYPE_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "ANIME", label: "Anime" },
  { value: "MANGA", label: "Manga" },
  { value: "TV", label: "TV" },
  { value: "MOVIE", label: "Movies" },
] as const;

export function DashboardClient({
  initialMedia,
  nextEpisodeMap,
}: {
  initialMedia: TrackedMedia[];
  nextEpisodeMap: Record<string, NextEpisodeInfo>;
}) {
  const [typeFilter, setTypeFilter] = useState("ALL");

  const filtered =
    typeFilter === "ALL"
      ? initialMedia
      : initialMedia.filter((m) => m.mediaType === typeFilter);

  const sectionOf = (m: TrackedMedia) => {
    const live = nextEpisodeMap[m.id];
    return getLibrarySection(m, {
      hasUpcomingEpisode: Boolean(live?.nextAiring),
      airedEpisodes: live?.airedEpisodes,
      runStatus: live?.runStatus,
    });
  };

  const grouped = SECTION_ORDER.map((section) => ({
    status: section,
    label: SECTION_LABELS[section],
    items: filtered.filter((m) => sectionOf(m) === section),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Library</h1>
        <Tabs value={typeFilter} onValueChange={setTypeFilter}>
          <TabsList>
            {TYPE_FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value} className="text-xs">
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {grouped.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <p className="text-lg">No media tracked yet</p>
          <p className="text-sm mt-1">
            Search for anime, manga, TV shows, or movies to get started
          </p>
        </div>
      ) : (
        grouped.map((group) => (
          <section key={group.status}>
            <h2 className="text-lg font-semibold mb-3">
              {group.label}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                ({group.items.length})
              </span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((item) => (
                <MediaCard key={item.id} media={item} nextEpisode={nextEpisodeMap[item.id]} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
