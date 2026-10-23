"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, ListOrdered } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { episodeLabel, toSeasonEp, type SeasonInfo } from "@/lib/episodes";
import { updateTracking } from "@/lib/tracking-client";
import { cn } from "@/lib/utils";
import type { EpisodesPageResponse, EpisodeItem } from "@/app/api/media/[id]/episodes/route";

interface EpisodeRowProps {
  ep: EpisodeItem;
  mediaId: string;
  source: EpisodesPageResponse["source"];
  currentEpisode: number;
  onSetProgress: (value: number) => void;
}

function EpisodeRow({
  ep,
  mediaId,
  source,
  currentEpisode,
  onSetProgress,
}: EpisodeRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [synopsis, setSynopsis] = useState<string | null | undefined>(
    ep.synopsis !== undefined ? ep.synopsis : undefined
  );
  const [loadingSynopsis, setLoadingSynopsis] = useState(false);

  // For TMDB TV shows use absoluteNumber (cumulative); for anime ep.number is already absolute
  const trackNum = ep.absoluteNumber ?? ep.number;
  const isNext = trackNum === currentEpisode + 1;
  const isWatched = currentEpisode >= trackNum;
  const isFuture = ep.airDate ? new Date(ep.airDate) > new Date() : false;

  async function toggleExpand() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (source === "jikan" && synopsis === null) {
      setLoadingSynopsis(true);
      try {
        const res = await fetch(`/api/media/${mediaId}/episodes/${ep.number}`);
        const data = await res.json();
        setSynopsis(data.synopsis || "No summary available for this episode.");
      } catch {
        setSynopsis("Failed to load summary.");
      } finally {
        setLoadingSynopsis(false);
      }
    } else if (!synopsis) {
      setSynopsis("No summary available for this episode.");
    }
  }

  const title = ep.title || `Episode ${ep.number}`;

  return (
    <div
      data-ep-number={ep.number}
      className={cn(
        "border-b last:border-b-0 transition-colors",
        isNext && "bg-primary/5 shadow-[inset_3px_0_0_var(--primary)]"
      )}
    >
      <div className="flex items-start gap-2 px-3 py-2.5 sm:px-4">
        <button
          type="button"
          onClick={toggleExpand}
          aria-expanded={expanded}
          className="-m-1 flex min-w-0 flex-1 items-start gap-3 rounded-md p-1 text-left hover:bg-muted/60"
        >
          <span
            className={cn(
              "mt-0.5 w-7 shrink-0 font-mono text-xs tabular-nums",
              isNext ? "font-bold text-foreground" : "text-muted-foreground"
            )}
          >
            {ep.number}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span
                className={cn(
                  "text-sm leading-snug",
                  isNext ? "font-semibold" : isWatched ? "text-muted-foreground" : "font-medium"
                )}
              >
                {title}
              </span>
              {isNext && <Badge className="h-4 px-1.5 text-[10px]">Up next</Badge>}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
              {ep.airDate && (
                <span className="text-xs text-muted-foreground">
                  {isFuture ? "Airs " : ""}
                  {new Date(ep.airDate).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
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
          </span>
          <ChevronDown
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
              expanded && "rotate-180"
            )}
          />
        </button>

        <div className="flex shrink-0 justify-end sm:w-40">
          {isWatched ? (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-emerald-600 hover:text-muted-foreground dark:text-emerald-400"
              title="Mark as not watched (also unmarks later episodes)"
              onClick={() => onSetProgress(trackNum - 1)}
            >
              <Check />
              <span className="hidden sm:inline">Watched</span>
            </Button>
          ) : (
            <Button
              variant={isNext ? "default" : "outline"}
              size="sm"
              className="shrink-0"
              disabled={isFuture}
              title={
                isNext
                  ? "Mark this episode as watched"
                  : "Mark this and every earlier episode as watched"
              }
              onClick={() => onSetProgress(trackNum)}
            >
              {isNext ? (
                "Mark watched"
              ) : (
                <>
                  <span className="sm:hidden">Up to here</span>
                  <span className="hidden sm:inline">Watched up to here</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-3 pl-14">
          {loadingSynopsis ? (
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          ) : (
            <div className={ep.thumbnail ? "flex flex-col gap-3 sm:flex-row sm:items-start" : ""}>
              {ep.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ep.thumbnail}
                  alt={title}
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
    </div>
  );
}

interface EpisodeListDialogProps {
  mediaId: string;
  mediaTitle: string;
  currentEpisode: number;
  onEpisodeUpdate: (epNumber: number) => void;
  seasons?: SeasonInfo[];
  /** Controlled mode: when provided, no trigger button is rendered. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EpisodeListDialog({
  mediaId,
  mediaTitle,
  currentEpisode,
  onEpisodeUpdate,
  seasons,
  open: openProp,
  onOpenChange,
}: EpisodeListDialogProps) {
  const [openState, setOpenState] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : openState;
  const setOpen = (next: boolean) => {
    if (!controlled) setOpenState(next);
    onOpenChange?.(next);
  };

  const [page, setPage] = useState(1);
  const [data, setData] = useState<EpisodesPageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localCurrentEp, setLocalCurrentEp] = useState(currentEpisode);

  // Refs for scroll-to-current behaviour
  const listRef = useRef<HTMLDivElement>(null);
  const hasAutoScrolledRef = useRef(false);

  // Jump to the correct page and reset scroll flag when dialog opens
  useEffect(() => {
    if (open) {
      const nextEp = localCurrentEp + 1;
      let jumpPage: number;
      if (seasons?.length) {
        // TMDB: page = season number — jump to the season containing the next episode
        const se = toSeasonEp(nextEp, seasons) ?? toSeasonEp(localCurrentEp, seasons);
        jumpPage = se ? se.season : 1;
      } else {
        // Jikan: 100 episodes per page
        jumpPage = Math.ceil(nextEp / 100);
      }
      setPage(jumpPage);
      hasAutoScrolledRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Opening fires a fetch for the previous page and then for the jump target;
  // only the latest request may update state, or a slow stale page wins.
  const latestRequest = useRef(0);

  const fetchEpisodes = useCallback(
    async (p: number) => {
      const id = ++latestRequest.current;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/media/${mediaId}/episodes?page=${p}`);
        if (!res.ok) throw new Error("Failed to load");
        const json: EpisodesPageResponse = await res.json();
        if (id !== latestRequest.current) return;
        if (json.source === "unsupported") {
          setError("Episode list is not available for this media type.");
        } else {
          setData(json);
        }
      } catch {
        if (id === latestRequest.current) {
          setError("Failed to load episodes. Please try again.");
        }
      } finally {
        if (id === latestRequest.current) setLoading(false);
      }
    },
    [mediaId]
  );

  // Fetch on open or page change
  useEffect(() => {
    if (open) {
      fetchEpisodes(page);
    }
  }, [open, page, fetchEpisodes]);

  // Scroll to next episode once after first load per open session
  useEffect(() => {
    if (!loading && data && listRef.current && !hasAutoScrolledRef.current) {
      hasAutoScrolledRef.current = true;
      const timer = setTimeout(() => {
        const container = listRef.current;
        const nextEp = localCurrentEp + 1;
        // For TMDB, ep.number is within-season; for Jikan it's absolute
        const scrollTarget = seasons?.length
          ? (toSeasonEp(nextEp, seasons)?.episode ?? nextEp)
          : nextEp;
        const el = container?.querySelector(
          `[data-ep-number="${scrollTarget}"]`
        ) as HTMLElement | null;
        if (container && el) {
          const containerRect = container.getBoundingClientRect();
          const elRect = el.getBoundingClientRect();
          const relativeTop = elRect.top - containerRect.top + container.scrollTop;
          container.scrollTop = relativeTop - container.clientHeight / 2 + el.clientHeight / 2;
        }
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [loading, data, localCurrentEp, seasons]);

  // Sync prop change
  useEffect(() => {
    setLocalCurrentEp(currentEpisode);
  }, [currentEpisode]);

  async function handleSetProgress(epNumber: number) {
    const previous = localCurrentEp;
    setLocalCurrentEp(epNumber);
    if (!(await updateTracking(mediaId, { currentEpisode: epNumber }))) {
      setLocalCurrentEp(previous);
      return;
    }
    onEpisodeUpdate(epNumber);
    toast.success(
      epNumber === 0
        ? "Progress cleared"
        : `Progress set to ${episodeLabel(epNumber, seasons)}`,
      {
        action: {
          label: "Undo",
          onClick: async () => {
            setLocalCurrentEp(previous);
            if (await updateTracking(mediaId, { currentEpisode: previous })) {
              onEpisodeUpdate(previous);
            }
          },
        },
      }
    );
  }

  const isTmdb = data?.source === "tmdb";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!controlled && (
        <DialogTrigger render={<Button variant="outline" />}>
          <ListOrdered />
          Browse episodes
        </DialogTrigger>
      )}

      <DialogContent
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        showCloseButton={true}
      >
        <DialogHeader className="shrink-0 gap-1 border-b px-4 pt-4 pb-3 pr-12 sm:px-6">
          <DialogTitle className="text-base">{mediaTitle}</DialogTitle>
          <DialogDescription className="text-xs">
            {localCurrentEp > 0
              ? `You've watched up to ${episodeLabel(localCurrentEp, seasons)}.`
              : "You haven't marked any episodes yet."}
          </DialogDescription>
        </DialogHeader>

        {data?.notice && !loading && (
          <p className="shrink-0 border-b bg-amber-50 px-4 py-2 text-xs text-amber-900 sm:px-6 dark:bg-amber-950/40 dark:text-amber-200">
            {data.notice}
          </p>
        )}

        {/* Scrollable episode list */}
        <div ref={listRef} className="flex-1 overflow-y-auto">
          {loading && (
            <div className="space-y-3 p-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="mt-0.5 h-4 w-6" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <p className="text-sm">{error}</p>
              <Button variant="outline" size="sm" onClick={() => fetchEpisodes(page)}>
                Retry
              </Button>
            </div>
          )}

          {!loading && !error && data && (
            <div>
              {data.episodes.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No episodes found.
                </p>
              ) : (
                data.episodes.map((ep) => (
                  <EpisodeRow
                    key={ep.number}
                    ep={ep}
                    mediaId={mediaId}
                    source={data.source}
                    currentEpisode={localCurrentEp}
                    onSetProgress={handleSetProgress}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* Pagination footer */}
        {data && data.pagination.totalPages > 1 && (
          <div className="flex shrink-0 items-center justify-between gap-2 border-t bg-muted/30 px-3 py-2.5 sm:px-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={data.pagination.currentPage <= 1 || loading}
            >
              <ChevronLeft />
              Previous
              {isTmdb && <span className="hidden sm:inline">season</span>}
            </Button>

            <span className="text-center text-xs text-muted-foreground">
              {isTmdb
                ? `${data.pagination.pageLabel || `Season ${data.pagination.currentPage}`} of ${data.pagination.totalPages}`
                : `Episodes ${(data.pagination.currentPage - 1) * 100 + 1}–${
                    (data.pagination.currentPage - 1) * 100 + data.episodes.length
                  }`}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!data.pagination.hasNextPage || loading}
            >
              Next
              {isTmdb && <span className="hidden sm:inline">season</span>}
              <ChevronRight />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
