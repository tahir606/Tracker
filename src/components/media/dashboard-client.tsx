"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { MediaCard } from "./media-card";
import { CollapsibleSection } from "./collapsible-section";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  COLLAPSED_SECTIONS,
  SECTION_HINTS,
  SECTION_LABELS,
  SECTION_ORDER,
} from "@/lib/constants";
import { getLibrarySection } from "@/lib/library-section";
import type { NextEpisodeInfo, TrackedMedia } from "@/types";

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
  schedule,
}: {
  initialMedia: TrackedMedia[];
  nextEpisodeMap: Record<string, NextEpisodeInfo>;
  /** Server-rendered "Coming up" block, shown above the library sections. */
  schedule?: React.ReactNode;
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

  const typeCounts = Object.fromEntries(
    TYPE_FILTERS.map((f) => [
      f.value,
      f.value === "ALL"
        ? initialMedia.length
        : initialMedia.filter((m) => m.mediaType === f.value).length,
    ])
  );

  if (initialMedia.length === 0) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-2xl font-bold">Your library is empty</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add anime, manga, TV shows or movies to track what you&apos;ve watched,
          what&apos;s next, and when new episodes come out.
        </p>
        <Button render={<Link href="/search" />} nativeButton={false} className="mt-6" size="lg">
          <Plus />
          Add your first title
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Library</h1>
          <p className="text-sm text-muted-foreground">
            {initialMedia.length} title{initialMedia.length === 1 ? "" : "s"} tracked
          </p>
        </div>
        <Tabs value={typeFilter} onValueChange={setTypeFilter}>
          <TabsList className="max-w-full overflow-x-auto overflow-y-hidden [scrollbar-width:none]">
            {TYPE_FILTERS.map((f) => (
              <TabsTrigger
                key={f.value}
                value={f.value}
                disabled={f.value !== "ALL" && typeCounts[f.value] === 0}
                className="text-xs"
              >
                {f.label}
                <span className="tabular-nums text-muted-foreground">
                  {typeCounts[f.value]}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {schedule}

      {grouped.map((group) => (
        <CollapsibleSection
          key={group.status}
          id={`library-${group.status}`}
          title={group.label}
          count={group.items.length}
          hint={SECTION_HINTS[group.status]}
          defaultOpen={!COLLAPSED_SECTIONS.has(group.status)}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((item) => (
              <MediaCard
                key={item.id}
                media={item}
                nextEpisode={nextEpisodeMap[item.id]}
              />
            ))}
          </div>
        </CollapsibleSection>
      ))}
    </div>
  );
}
