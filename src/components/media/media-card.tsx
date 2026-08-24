"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "./status-badge";
import { ProgressDisplay } from "./progress-display";
import { EpisodeListDialog } from "./episode-list-dialog";
import { MEDIA_TYPE_LABELS } from "@/lib/constants";
import { getLibrarySection } from "@/lib/library-section";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { TrackedMedia } from "@/types";
import type { NextEpisodeInfo } from "@/app/page";

function formatAirDate(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const days = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days > 1) return `in ${days}d`;
  if (days === -1) return "Yesterday";
  return `${Math.abs(days)}d ago`;
}

function pad(n: number) { return String(n).padStart(2, "0"); }

function toSeasonEp(
  absEp: number,
  seasons: { seasonNumber: number; episodeCount: number }[]
): { season: number; episode: number } | null {
  let cumulative = 0;
  for (const s of seasons) {
    if (absEp <= cumulative + s.episodeCount) {
      return { season: s.seasonNumber, episode: absEp - cumulative };
    }
    cumulative += s.episodeCount;
  }
  return null;
}

export function MediaCard({ media, nextEpisode }: { media: TrackedMedia; nextEpisode?: NextEpisodeInfo }) {
  const router = useRouter();
  const tracking = media.tracking;
  const [currentEp, setCurrentEp] = useState(tracking?.currentEpisode ?? 0);
  const [currentCh, setCurrentCh] = useState(tracking?.currentChapter ?? 0);
  const [status, setStatus] = useState(tracking?.status ?? "WATCHING");

  const showEpisodes = media.mediaType !== "MANGA";
  const showChapters = media.mediaType === "MANGA";

  // Badge follows the derived section, using the live input value so it updates
  // before the server refresh moves the card between sections.
  const section =
    getLibrarySection(media, {
      currentEpisode: currentEp,
      currentChapter: currentCh,
      hasUpcomingEpisode: Boolean(nextEpisode?.nextAiring),
      airedEpisodes: nextEpisode?.airedEpisodes,
      runStatus: nextEpisode?.runStatus,
    }) ?? status;

  async function handleDirectInput(
    field: "currentEpisode" | "currentChapter",
    value: number
  ) {
    try {
      const res = await fetch(`/api/media/${media.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error("Failed");
      // Re-render the dashboard so the card lands in the right section.
      router.refresh();
    } catch {
      toast.error("Failed to update");
    }
  }

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <div className="flex gap-3 p-3">
        <Link href={`/media/${media.id}`} className="shrink-0">
          {media.coverImage ? (
            <Image
              src={media.coverImage}
              alt={media.title}
              width={80}
              height={120}
              className="rounded-md object-cover"
              style={{ width: 80, height: 120 }}
            />
          ) : (
            <div className="flex h-[120px] w-[80px] items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
              No Image
            </div>
          )}
        </Link>

        <CardContent className="flex flex-1 flex-col gap-2 p-0 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/media/${media.id}`}
                className="font-medium text-sm leading-tight hover:underline line-clamp-2"
              >
                {media.titleEnglish || media.title}
              </Link>
              <p className="text-xs text-muted-foreground mt-0.5">
                {MEDIA_TYPE_LABELS[media.mediaType]}
                {media.releaseYear ? ` · ${media.releaseYear}` : ""}
              </p>
            </div>
            <StatusBadge status={section} className="shrink-0" />
          </div>

          <div className="mt-auto space-y-1.5">
            {showEpisodes && (
              <div>
                <ProgressDisplay
                  current={currentEp}
                  total={media.totalEpisodes}
                  released={media.releasedEpisodes}
                  label="Episodes"
                />
                {status !== "COMPLETED" && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Input
                      type="number"
                      value={currentEp}
                      onChange={(e) => {
                        const v = parseInt(e.target.value) || 0;
                        setCurrentEp(v);
                      }}
                      onBlur={() =>
                        handleDirectInput("currentEpisode", currentEp)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      className="h-7 w-16 text-center text-xs"
                      min={0}
                      max={
                        media.releasedEpisodes ??
                        media.totalEpisodes ??
                        undefined
                      }
                    />
                    {(media.mediaType === "TV" || media.mediaType === "ANIME") && (
                      <EpisodeListDialog
                        mediaId={media.id}
                        mediaTitle={media.titleEnglish || media.title}
                        currentEpisode={currentEp}
                        onEpisodeUpdate={(ep) => {
                          setCurrentEp(ep);
                          router.refresh();
                        }}
                        seasons={nextEpisode?.seasons}
                      />
                    )}
                  </div>
                )}
                {status !== "COMPLETED" && (() => {
                  const nextToWatch = currentEp + 1;
                  const maxAvailable = media.releasedEpisodes ?? media.totalEpisodes ?? 0;
                  const hasAvailable = maxAvailable > 0 && nextToWatch <= maxAvailable;
                  const nextAiring = nextEpisode?.nextAiring ?? null;

                  if (!hasAvailable && !nextAiring) return null;

                  const se = nextEpisode?.seasons?.length
                    ? toSeasonEp(nextToWatch, nextEpisode.seasons)
                    : null;
                  const nextLabel = se
                    ? `S${pad(se.season)}E${pad(se.episode)}`
                    : `Ep ${nextToWatch}`;

                  return (
                    <div className="mt-2 space-y-1">
                      {hasAvailable && (
                        <div className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1">
                          <span className="text-xs font-medium text-foreground/70 shrink-0">Up next:</span>
                          <span className="text-xs text-foreground/70 font-medium">{nextLabel}</span>
                        </div>
                      )}
                      {nextAiring && (
                        <div className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1 min-w-0">
                          <span className="text-xs font-medium text-foreground/70 shrink-0">On torrent:</span>
                          <span className="text-xs font-medium text-foreground/70 shrink-0">
                            S{pad(nextAiring.seasonNumber)}E{pad(nextAiring.episodeNumber)}
                          </span>
                          {nextAiring.name && (
                            <span className="text-xs text-muted-foreground truncate min-w-0">
                              · {nextAiring.name}
                            </span>
                          )}
                          {nextAiring.airDate && (
                            <span className="text-xs text-muted-foreground shrink-0 ml-auto">
                              {formatAirDate(nextAiring.airDate)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {showChapters && (
              <div>
                <ProgressDisplay
                  current={currentCh}
                  total={media.totalChapters}
                  label="Chapters"
                />
                {status !== "COMPLETED" && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Input
                      type="number"
                      value={currentCh}
                      onChange={(e) => {
                        const v = parseInt(e.target.value) || 0;
                        setCurrentCh(v);
                      }}
                      onBlur={() =>
                        handleDirectInput("currentChapter", currentCh)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      className="h-7 w-16 text-center text-xs"
                      min={0}
                      max={media.totalChapters ?? undefined}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
