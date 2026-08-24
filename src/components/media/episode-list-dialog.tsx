"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { EpisodesPageResponse, EpisodeItem } from "@/app/api/media/[id]/episodes/route";

interface EpisodeRowProps {
  ep: EpisodeItem;
  mediaId: string;
  source: "jikan" | "tmdb" | "unsupported";
  currentEpisode: number;
  onMarkWatched: (epNumber: number) => void;
}

function EpisodeRow({
  ep,
  mediaId,
  source,
  currentEpisode,
  onMarkWatched,
}: EpisodeRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [synopsis, setSynopsis] = useState<string | null | undefined>(
    ep.synopsis !== undefined ? ep.synopsis : undefined
  );
  const [loadingSynopsis, setLoadingSynopsis] = useState(false);

  // For TMDB TV shows use absoluteNumber (cumulative); for anime ep.number is already absolute
  const trackNum = ep.absoluteNumber ?? ep.number;
  const isCurrentEp = trackNum === currentEpisode + 1; // next episode to watch
  const isWatched = currentEpisode >= trackNum;         // already watched
  const isPast = currentEpisode >= trackNum;            // already watched (for styling)

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

  return (
    <div
      data-ep-number={ep.number}
      className={`border-b last:border-b-0 transition-colors ${
        isCurrentEp
          ? "bg-primary/8 border-l-[3px] border-l-primary"
          : isPast
          ? "bg-muted/30"
          : ""
      }`}
    >
      <div
        className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 select-none"
        onClick={toggleExpand}
      >
        {/* Episode number */}
        <span
          className={`text-xs font-mono w-8 shrink-0 mt-0.5 ${
            isCurrentEp
              ? "text-primary font-bold"
              : isPast
              ? "text-muted-foreground"
              : "text-foreground"
          }`}
        >
          {ep.number}
        </span>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p
              className={`text-sm leading-snug ${
                isCurrentEp
                  ? "font-semibold text-foreground"
                  : isPast
                  ? "text-muted-foreground line-through decoration-muted-foreground/40"
                  : "font-medium"
              }`}
            >
              {ep.title || `Episode ${ep.number}`}
            </p>
            {isCurrentEp && (
              <Badge variant="default" className="text-xs h-4 px-1.5 py-0 shrink-0">
                Up next
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {ep.airDate && (
              <span className="text-xs text-muted-foreground">
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
                className="text-xs h-4 px-1.5 py-0 border-amber-400 text-amber-600"
              >
                Filler
              </Badge>
            )}
            {ep.recap && (
              <Badge
                variant="outline"
                className="text-xs h-4 px-1.5 py-0 border-blue-400 text-blue-600"
              >
                Recap
              </Badge>
            )}
          </div>
        </div>

        {/* Mark watched button + expand chevron */}
        <div className="flex items-center gap-1 shrink-0">
          {!isWatched && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2 hover:bg-primary/10 hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                onMarkWatched(trackNum);
              }}
            >
              Mark
            </Button>
          )}
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {/* Expanded synopsis */}
      {expanded && (
        <div className="px-4 pb-3 ml-11">
          {loadingSynopsis ? (
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          ) : (
            <div className={ep.thumbnail ? "flex gap-3 items-start" : ""}>
              {ep.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ep.thumbnail}
                  alt={ep.title || `Episode ${ep.number}`}
                  className="w-36 h-20 object-cover rounded shrink-0"
                />
              )}
              <p className="text-xs text-muted-foreground leading-relaxed">
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
  seasons?: { seasonNumber: number; episodeCount: number }[];
}

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

export function EpisodeListDialog({
  mediaId,
  mediaTitle,
  currentEpisode,
  onEpisodeUpdate,
  seasons,
}: EpisodeListDialogProps) {
  const [open, setOpen] = useState(false);
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
        const se = toSeasonEp(nextEp, seasons);
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

  const fetchEpisodes = useCallback(
    async (p: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/media/${mediaId}/episodes?page=${p}`);
        if (!res.ok) throw new Error("Failed to load");
        const json: EpisodesPageResponse = await res.json();
        if (json.source === "unsupported") {
          setError("Episode list is not available for this media type.");
        } else {
          setData(json);
        }
      } catch {
        setError("Failed to load episodes. Please try again.");
      } finally {
        setLoading(false);
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

  async function handleMarkWatched(epNumber: number) {
    try {
      const res = await fetch(`/api/media/${mediaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentEpisode: epNumber }),
      });
      if (!res.ok) throw new Error("Failed");
      setLocalCurrentEp(epNumber);
      onEpisodeUpdate(epNumber);
    } catch {
      // no-op
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <List className="h-3.5 w-3.5 mr-1" />
        Episodes
      </DialogTrigger>

      <DialogContent
        className="sm:max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden"
        showCloseButton={true}
      >
        <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="text-base">
            {mediaTitle} — Episodes
          </DialogTitle>
          {data && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {data.pagination.pageLabel ||
                `Page ${data.pagination.currentPage} of ${data.pagination.totalPages}`}
              {data.source === "jikan" &&
                ` · ${data.episodes.length} episodes`}
              {localCurrentEp > 0 && (
                <span className="ml-2 text-primary font-medium">
                  · You&apos;re on ep {localCurrentEp}
                </span>
              )}
            </p>
          )}
        </DialogHeader>

        {/* Scrollable episode list */}
        <div ref={listRef} className="flex-1 overflow-y-auto">
          {loading && (
            <div className="p-4 space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <Skeleton className="h-4 w-6 mt-0.5" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <p className="text-sm">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchEpisodes(page)}
              >
                Retry
              </Button>
            </div>
          )}

          {!loading && !error && data && (
            <div>
              {data.episodes.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-12">
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
                    onMarkWatched={handleMarkWatched}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* Pagination footer */}
        {data && data.pagination.totalPages > 1 && (
          <div className="shrink-0 border-t px-4 py-3 flex items-center justify-between bg-muted/30">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={data.pagination.currentPage <= 1 || loading}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {data.source === "tmdb" ? "Prev Season" : "Prev"}
            </Button>

            <span className="text-xs text-muted-foreground">
              {data.source === "tmdb"
                ? `Season ${data.pagination.currentPage} / ${data.pagination.totalPages}`
                : `Page ${data.pagination.currentPage} / ${data.pagination.totalPages}`}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!data.pagination.hasNextPage || loading}
            >
              {data.source === "tmdb" ? "Next Season" : "Next"}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
