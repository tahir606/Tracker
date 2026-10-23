"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { episodeLabel, type SeasonInfo } from "@/lib/episodes";
import { cn } from "@/lib/utils";
import type { EpisodeItem, EpisodesPageResponse } from "@/app/api/media/[id]/episodes/route";
import { useEpisodePages } from "./use-episode-pages";

/** Above this many seasons, tabs stop fitting and a dropdown takes over. */
const MAX_SEASON_TABS = 6;

function shortDate(value: string): string {
  let date = new Date(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    date = new Date(y, m - 1, d);
  }
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function EpisodeRow({
  ep,
  mediaId,
  source,
  currentEpisode,
  now,
  onPick,
}: {
  ep: EpisodeItem;
  mediaId: string;
  source: EpisodesPageResponse["source"];
  currentEpisode: number;
  now: number;
  onPick: (episode: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [synopsis, setSynopsis] = useState<string | null | undefined>(ep.synopsis);
  const [loadingSynopsis, setLoadingSynopsis] = useState(false);

  // TMDB numbers restart each season; tracking uses the running count.
  const n = ep.absoluteNumber ?? ep.number;
  const isCurrent = n === currentEpisode;
  const watched = n <= currentEpisode;
  const notOut = ep.airDate ? new Date(ep.airDate).getTime() > now : false;
  const title = ep.title || `Episode ${ep.number}`;

  async function toggleSummary() {
    const next = !expanded;
    setExpanded(next);
    // MyAnimeList summaries missing from the list are fetched one at a time.
    if (next && source === "jikan" && synopsis == null) {
      setLoadingSynopsis(true);
      try {
        const res = await fetch(`/api/media/${mediaId}/episodes/${ep.number}`);
        const data = await res.json();
        setSynopsis(data.synopsis || "");
      } catch {
        setSynopsis("");
      } finally {
        setLoadingSynopsis(false);
      }
    }
  }

  return (
    <li
      data-current={isCurrent}
      className={cn(
        "border-b last:border-b-0",
        isCurrent && "bg-primary/5 shadow-[inset_3px_0_0_var(--primary)]"
      )}
    >
      <div className="flex items-stretch">
        <button
          type="button"
          disabled={notOut}
          onClick={() => onPick(n)}
          title={notOut ? "Not out yet" : `Mark everything up to here as watched`}
          className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pr-2 pl-4 text-left transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50 sm:pl-5"
        >
          <span className="w-7 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
            {ep.number}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span
                className={cn(
                  "text-sm leading-snug",
                  isCurrent ? "font-semibold" : watched ? "text-muted-foreground" : "font-medium"
                )}
              >
                {title}
              </span>
              {isCurrent && (
                <Badge className="h-4 shrink-0 px-1.5 text-[10px]">You&apos;re here</Badge>
              )}
              {ep.filler && (
                <Badge
                  variant="outline"
                  className="h-4 border-amber-400 px-1.5 text-[10px] text-amber-600 dark:text-amber-400"
                >
                  Filler
                </Badge>
              )}
              {ep.recap && (
                <Badge
                  variant="outline"
                  className="h-4 border-blue-400 px-1.5 text-[10px] text-blue-600 dark:text-blue-400"
                >
                  Recap
                </Badge>
              )}
            </span>
            {ep.airDate && (
              <span className="block text-xs text-muted-foreground">
                {notOut ? "Airs " : ""}
                {shortDate(ep.airDate)}
              </span>
            )}
          </span>
          {watched && (
            <Check
              aria-label="Watched"
              className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
            />
          )}
        </button>
        <button
          type="button"
          onClick={toggleSummary}
          aria-expanded={expanded}
          aria-label={`${expanded ? "Hide" : "Show"} summary of ${title}`}
          className="flex w-11 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground sm:w-12"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-3 pl-14 sm:pl-15">
          {loadingSynopsis ? (
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          ) : (
            <div className={ep.thumbnail ? "flex flex-col gap-3 sm:flex-row sm:items-start" : ""}>
              {ep.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ep.thumbnail}
                  alt=""
                  className="h-20 w-36 shrink-0 rounded object-cover"
                />
              )}
              <p className="text-xs leading-relaxed text-muted-foreground">
                {synopsis || "No summary available for this episode."}
              </p>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * Every episode of a show in one place: tap one to mark it and everything
 * before it as watched, or open its summary. Seasons are tabs (a dropdown for
 * long-running shows); anime pages by 100.
 */
export function EpisodesDialog({
  mediaId,
  mediaTitle,
  currentEpisode,
  seasons,
  open,
  onOpenChange,
  onPick,
}: {
  mediaId: string;
  mediaTitle: string;
  currentEpisode: number;
  seasons?: SeasonInfo[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the cumulative episode number picked (0 = not started). */
  onPick: (episode: number) => void;
}) {
  const { page, setPage, data, loading, error, reload } = useEpisodePages({
    mediaId,
    open,
    startEpisode: Math.max(currentEpisode, 1),
    seasons,
  });
  const listRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  // Fixed when the dialog mounts; only used to grey out episodes not out yet.
  const [now] = useState(() => Date.now());

  // Keep the selected season tab visible in a strip that scrolls sideways.
  useEffect(() => {
    tabsRef.current
      ?.querySelector<HTMLElement>("[aria-selected=true]")
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [page, open]);

  // Bring the episode you're on into view once a page loads.
  useEffect(() => {
    if (loading || !data) return;
    listRef.current
      ?.querySelector<HTMLElement>("[data-current=true]")
      ?.scrollIntoView({ block: "center" });
  }, [loading, data]);

  const isTmdb = data?.source === "tmdb";
  const currentLabel = seasons?.length
    ? episodeLabel(currentEpisode, seasons)
    : `Episode ${currentEpisode}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="shrink-0 gap-1 px-4 pt-4 pb-3 pr-12 sm:px-5">
          <DialogTitle className="text-base">{mediaTitle} episodes</DialogTitle>
          <DialogDescription>
            Tap the last episode you watched to mark it and everything before it.
          </DialogDescription>
        </DialogHeader>

        {/* Season tabs for TV (a dropdown past a handful); a pager for long anime runs. */}
        {seasons && seasons.length > MAX_SEASON_TABS ? (
          <div className="shrink-0 px-4 pb-3 sm:px-5">
            <Select
              value={String(page)}
              onValueChange={(v) => v && setPage(Number(v))}
              items={Object.fromEntries(
                seasons.map((s) => [String(s.seasonNumber), `Season ${s.seasonNumber}`])
              )}
            >
              <SelectTrigger className="w-44" aria-label="Season">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {seasons.map((s) => (
                  <SelectItem key={s.seasonNumber} value={String(s.seasonNumber)}>
                    Season {s.seasonNumber}
                    <span className="text-xs text-muted-foreground">{s.episodeCount} eps</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : seasons && seasons.length > 1 ? (
          <div
            ref={tabsRef}
            role="tablist"
            aria-label="Seasons"
            className="flex shrink-0 gap-1.5 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:px-5"
          >
            {seasons.map((s) => (
              <Button
                key={s.seasonNumber}
                role="tab"
                aria-selected={page === s.seasonNumber}
                size="sm"
                variant={page === s.seasonNumber ? "default" : "outline"}
                onClick={() => setPage(s.seasonNumber)}
                className="shrink-0"
              >
                Season {s.seasonNumber}
              </Button>
            ))}
          </div>
        ) : (
          !isTmdb &&
          data &&
          data.pagination.totalPages > 1 && (
            <div className="flex shrink-0 items-center justify-between px-4 pb-3 sm:px-5">
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Earlier episodes"
                disabled={page <= 1 || loading}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft />
              </Button>
              <span className="text-xs text-muted-foreground">
                Episodes {(page - 1) * 100 + 1}–{(page - 1) * 100 + data.episodes.length}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Later episodes"
                disabled={!data.pagination.hasNextPage || loading}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          )
        )}

        {data?.notice && !loading && (
          <p className="shrink-0 border-t bg-amber-50 px-4 py-2 text-xs text-amber-900 sm:px-5 dark:bg-amber-950/40 dark:text-amber-200">
            {data.notice}
          </p>
        )}

        <div ref={listRef} className="flex-1 overflow-y-auto border-t">
          {loading && (
            <div className="space-y-3 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground">
              {error}
              <Button variant="outline" size="sm" onClick={reload}>
                Retry
              </Button>
            </div>
          )}

          {!loading && !error && data && (
            data.episodes.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No episodes found.</p>
            ) : (
              <ul>
                {data.episodes.map((ep) => (
                  <EpisodeRow
                    key={`${page}-${ep.number}`}
                    ep={ep}
                    mediaId={mediaId}
                    source={data.source}
                    currentEpisode={currentEpisode}
                    now={now}
                    onPick={onPick}
                  />
                ))}
              </ul>
            )
          )}
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 flex-row items-center justify-between rounded-none sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {currentEpisode > 0 ? `Watched up to ${currentLabel}` : "Not started"}
          </span>
          {currentEpisode > 0 && (
            <Button variant="ghost" size="sm" onClick={() => onPick(0)}>
              I haven&apos;t started
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
