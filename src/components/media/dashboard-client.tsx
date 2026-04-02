"use client";

import { useState } from "react";
import { MediaCard } from "./media-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/constants";
import type { TrackedMedia } from "@/types";

const TYPE_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "ANIME", label: "Anime" },
  { value: "MANGA", label: "Manga" },
  { value: "TV", label: "TV" },
  { value: "MOVIE", label: "Movies" },
] as const;

export function DashboardClient({
  initialMedia,
}: {
  initialMedia: TrackedMedia[];
}) {
  const [typeFilter, setTypeFilter] = useState("ALL");

  const filtered =
    typeFilter === "ALL"
      ? initialMedia
      : initialMedia.filter((m) => m.mediaType === typeFilter);

  const grouped = STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    items: filtered.filter((m) => m.tracking?.status === status),
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
                <MediaCard key={item.id} media={item} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
