"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { episodeLabel, type SeasonInfo } from "@/lib/episodes";
import { cn } from "@/lib/utils";
import { useEpisodePages } from "./use-episode-pages";

function shortDate(value: string): string {
  let date = new Date(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    date = new Date(y, m - 1, d);
  }
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** Above this many seasons, tabs stop fitting and a dropdown takes over. */
const MAX_SEASON_TABS = 6;

/**
 * "Where are you up to?" — pick the last episode you watched by its title
 * instead of typing a running count. Seasons are tabs for TV; anime pages by 100.
 */
export function EpisodePickerDialog({
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
  // Fixed when the picker mounts; only used to grey out episodes not out yet.
  const [now] = useState(() => Date.now());

  const tabsRef = useRef<HTMLDivElement>(null);
  // Keep the selected season tab visible in a strip that scrolls sideways.
  useEffect(() => {
    tabsRef.current
      ?.querySelector<HTMLElement>("[aria-selected=true]")
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [page, open]);

  // Bring the episode you're on into view once a page loads.
  useEffect(() => {
    if (loading || !data) return;
    const el = listRef.current?.querySelector<HTMLElement>("[data-current=true]");
    el?.scrollIntoView({ block: "center" });
  }, [loading, data]);

  function pick(episode: number) {
    onPick(episode);
    onOpenChange(false);
  }

  const isTmdb = data?.source === "tmdb";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 gap-1 px-4 pt-4 pb-3 pr-12 sm:px-5">
          <DialogTitle className="text-base">Where are you up to?</DialogTitle>
          <DialogDescription>
            Tap the last episode of {mediaTitle} you watched.
          </DialogDescription>
        </DialogHeader>

        {/* Season tabs for TV; a simple pager for long anime runs. */}
        {seasons && seasons.length > MAX_SEASON_TABS ? (
          <div className="shrink-0 border-b px-4 pb-3 sm:px-5">
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
                    <span className="text-xs text-muted-foreground">
                      {s.episodeCount} eps
                    </span>
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
            className="flex shrink-0 gap-1.5 overflow-x-auto border-b px-4 pb-3 [scrollbar-width:none] sm:px-5"
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
            <div className="flex shrink-0 items-center justify-between border-b px-4 pb-3 sm:px-5">
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
            <ul>
              {data.episodes.map((ep) => {
                const n = ep.absoluteNumber ?? ep.number;
                const isCurrent = n === currentEpisode;
                const watched = n <= currentEpisode;
                const notOut = ep.airDate ? new Date(ep.airDate).getTime() > now : false;
                return (
                  <li key={n} className="border-b last:border-b-0">
                    <button
                      type="button"
                      data-current={isCurrent}
                      disabled={notOut}
                      onClick={() => pick(n)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5",
                        isCurrent && "bg-primary/5 shadow-[inset_3px_0_0_var(--primary)]"
                      )}
                    >
                      <span className="w-7 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                        {ep.number}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              "truncate text-sm",
                              isCurrent ? "font-semibold" : watched ? "text-muted-foreground" : "font-medium"
                            )}
                          >
                            {ep.title || `Episode ${ep.number}`}
                          </span>
                          {isCurrent && (
                            <Badge className="h-4 shrink-0 px-1.5 text-[10px]">You&apos;re here</Badge>
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
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 flex-row items-center justify-between rounded-none sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {currentEpisode > 0
              ? `Now: ${seasons?.length ? episodeLabel(currentEpisode, seasons) : `Episode ${currentEpisode}`} watched`
              : "Not started"}
          </span>
          {currentEpisode > 0 && (
            <Button variant="ghost" size="sm" onClick={() => pick(0)}>
              I haven&apos;t started
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
