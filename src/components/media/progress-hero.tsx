"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EpisodesDialog } from "./episodes-dialog";
import { SetProgressDialog } from "./set-progress-dialog";
import { relativeDay, seasonEpLabel, toSeasonEp, type SeasonInfo } from "@/lib/episodes";
import { cn } from "@/lib/utils";
import type { EpisodesPageResponse } from "@/app/api/media/[id]/episodes/route";
import type { NextEpisodeInfo, TrackedMedia } from "@/types";

/** "12 Jan 2024" from either "YYYY-MM-DD" (read as a local date) or an ISO timestamp. */
function formatDate(value: string): string {
  let date = new Date(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    date = new Date(y, m - 1, d);
  }
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/**
 * The detail page's progress block: leads with the next thing to watch or read
 * and one button to mark it, with the full episode list and exact-number
 * editing one click away.
 */
export function ProgressHero({
  media,
  status,
  section,
  current,
  cap,
  nextEpisode,
  onSetProgress,
  onMarkMovieWatched,
}: {
  media: TrackedMedia;
  status: string;
  /** Derived library section (WATCHING, CAUGHT_UP, COMPLETED, …). */
  section: string;
  current: number;
  /** How many episodes/chapters are out; null when unknown. */
  cap: number | null;
  nextEpisode?: NextEpisodeInfo;
  onSetProgress: (value: number, opts?: { undoable?: boolean }) => Promise<void>;
  onMarkMovieWatched: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fetched, setFetched] = useState<{ forEp: number; title: string | null; airDate: string | null } | null>(null);

  const isManga = media.mediaType === "MANGA";
  const isMovie = media.mediaType === "MOVIE";
  const hasEpisodeList = media.mediaType === "ANIME" || media.mediaType === "TV";
  const seasons: SeasonInfo[] | undefined = nextEpisode?.seasons;
  const title = media.titleEnglish || media.title;
  const next = current + 1;
  const nextIsOut = !cap || next <= cap;
  const unit = isManga ? "chapters" : "episodes";

  // Title and air date of the next episode, from the same API the episode list uses.
  useEffect(() => {
    if (!hasEpisodeList || !nextIsOut) return;
    let cancelled = false;
    const page = seasons?.length
      ? (toSeasonEp(next, seasons)?.season ?? 1)
      : Math.ceil(next / 100);
    fetch(`/api/media/${media.id}/episodes?page=${page}`)
      .then((r) => (r.ok ? (r.json() as Promise<EpisodesPageResponse>) : null))
      .then((data) => {
        if (cancelled || !data?.episodes) return;
        const ep = data.episodes.find((e) => (e.absoluteNumber ?? e.number) === next);
        setFetched({ forEp: next, title: ep?.title ?? null, airDate: ep?.airDate ?? null });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [media.id, hasEpisodeList, nextIsOut, next, seasons]);
  const nextDetails = fetched?.forEp === next ? fetched : null;

  async function markNext() {
    setBusy(true);
    await onSetProgress(next, { undoable: true });
    setBusy(false);
  }

  const nextCode = isManga
    ? `Chapter ${next}`
    : seasons?.length
    ? (() => {
        const se = toSeasonEp(next, seasons);
        return se ? seasonEpLabel(se.season, se.episode) : `Episode ${next}`;
      })()
    : `Episode ${next}`;

  const nextAiring = nextEpisode?.nextAiring ?? null;
  const upcomingLine = nextAiring?.airDate
    ? `${seasonEpLabel(nextAiring.seasonNumber, nextAiring.episodeNumber)}${
        nextAiring.name ? ` · ${nextAiring.name}` : ""
      } airs ${relativeDay(nextAiring.airDate)}`
    : null;

  const percentage = cap ? Math.min((current / cap) * 100, 100) : 0;
  const hasPrimary = isMovie ? status !== "COMPLETED" : nextIsOut;

  // Headline block: what this item's next step is.
  let eyebrow: string;
  let headline: React.ReactNode;
  let subline: React.ReactNode = null;

  if (isMovie) {
    const watched = status === "COMPLETED";
    eyebrow = "Movie";
    headline = watched ? (
      <span className="inline-flex items-center gap-2">
        <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> Watched
      </span>
    ) : (
      "Not watched yet"
    );
  } else if (nextIsOut) {
    eyebrow = current === 0 ? "Start with" : "Up next";
    headline = (
      <>
        {nextCode}
        {nextDetails?.title && (
          <span className="font-normal text-muted-foreground"> · {nextDetails.title}</span>
        )}
      </>
    );
    subline = nextDetails?.airDate ? `Aired ${formatDate(nextDetails.airDate)}` : null;
  } else if (section === "COMPLETED") {
    eyebrow = "Finished";
    headline = `You've ${isManga ? "read" : "watched"} all ${current} ${unit}`;
    subline = status === "WATCHING" ? "The series has ended, so it's listed under Finished." : null;
  } else {
    eyebrow = "Up to date";
    headline = `You've ${isManga ? "read" : "watched"} everything out so far`;
    subline = upcomingLine ?? `No new ${unit} announced yet.`;
  }

  return (
    <Card className="gap-0 p-0">
      <div className="space-y-4 p-5">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {eyebrow}
          </p>
          <p className="text-lg font-semibold leading-snug">{headline}</p>
          {subline && <p className="text-sm text-muted-foreground">{subline}</p>}
        </div>

        {/* Ghost buttons carry inner padding; pull the row left when there's no
            filled button so their labels line up with the text above. */}
        <div className={cn("flex flex-wrap items-center gap-x-1 gap-y-2", !hasPrimary && "-ml-2.5")}>
          {isMovie ? (
            status !== "COMPLETED" && (
              <Button size="lg" onClick={onMarkMovieWatched} className="mr-2">
                <Check /> Mark watched
              </Button>
            )
          ) : (
            nextIsOut && (
              <Button size="lg" onClick={markNext} disabled={busy} className="mr-2">
                <Check /> {isManga ? "Mark read" : "Mark watched"}
              </Button>
            )
          )}
          {!isMovie && (
            <Button variant="ghost" onClick={() => setEditOpen(true)}>
              {isManga ? "Change chapter" : "Episodes"}
            </Button>
          )}
        </div>

        {nextIsOut && upcomingLine && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5 shrink-0" />
            New: {upcomingLine}
          </p>
        )}
      </div>

      {!isMovie && (
        <div className="flex items-center gap-3 border-t bg-muted/40 px-5 py-3">
          <div
            role="progressbar"
            aria-label={`${current} of ${cap ?? "?"} ${unit}`}
            aria-valuemin={0}
            aria-valuemax={cap ?? undefined}
            aria-valuenow={current}
            className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
          >
            <div
              className={cn("h-full rounded-full bg-primary transition-all", !cap && "w-0")}
              style={cap ? { width: `${percentage}%` } : undefined}
            />
          </div>
          <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
            <span className="font-medium text-foreground">{current}</span>
            {cap ? ` / ${cap}` : ""} {unit}
          </span>
        </div>
      )}

      {hasEpisodeList && (
        <EpisodesDialog
          mediaId={media.id}
          mediaTitle={title}
          currentEpisode={current}
          seasons={seasons}
          open={editOpen}
          onOpenChange={setEditOpen}
          onPick={(ep) => onSetProgress(ep, { undoable: true })}
        />
      )}
      {isManga && (
        <SetProgressDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          title={title}
          unit={unit}
          current={current}
          max={cap}
          seasons={seasons}
          onSave={(v) => onSetProgress(v, { undoable: true })}
        />
      )}
    </Card>
  );
}
