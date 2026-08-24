"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle, Circle, EyeOff } from "lucide-react";
import { toast } from "sonner";

const HIDE_WATCHED_KEY = "episode-schedule-hide-watched";

export type ScheduleEntry = {
  mediaId: string;
  title: string;
  coverImage: string | null;
  seasonNumber: number;
  episodeNumber: number;
  name: string | null;
  airDate: string;
  days: number;
  absoluteNumber: number | null;
  currentEpisode: number;
};

function formatAirDate(days: number, dateStr: string): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

export function EpisodeScheduleList({ episodes }: { episodes: ScheduleEntry[] }) {
  const router = useRouter();
  const [marking, setMarking] = useState<string | null>(null);
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [hideWatched, setHideWatched] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(HIDE_WATCHED_KEY);
    if (stored !== null) setHideWatched(stored === "true");
  }, []);

  function toggleHideWatched() {
    setHideWatched((prev) => {
      const next = !prev;
      localStorage.setItem(HIDE_WATCHED_KEY, String(next));
      return next;
    });
  }

  async function handleMark(ep: ScheduleEntry, e: React.MouseEvent) {
    e.preventDefault();
    if (!ep.absoluteNumber) return;

    const key = `${ep.mediaId}-${ep.absoluteNumber}`;
    setMarking(key);

    try {
      const res = await fetch(`/api/media/${ep.mediaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentEpisode: ep.absoluteNumber }),
      });

      if (!res.ok) throw new Error("Failed to mark episode");

      setMarked((prev) => new Set(prev).add(key));
      toast.success(`Marked S${ep.seasonNumber}E${ep.episodeNumber} as watched`);
      router.refresh();
    } catch {
      toast.error("Failed to mark episode");
    } finally {
      setMarking(null);
    }
  }

  const visibleEpisodes = hideWatched
    ? episodes.filter((ep) => !(ep.absoluteNumber !== null && ep.currentEpisode >= ep.absoluteNumber))
    : episodes;

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button
          onClick={toggleHideWatched}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border transition-colors ${
            hideWatched
              ? "bg-primary text-primary-foreground border-primary"
              : "text-muted-foreground border-border hover:bg-muted"
          }`}
        >
          <EyeOff className="h-3.5 w-3.5" />
          {hideWatched ? "Show watched" : "Hide watched"}
        </button>
      </div>
      {visibleEpisodes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No unwatched episodes in the schedule.</p>
      ) : (
      <div className="rounded-lg border divide-y overflow-hidden">
      {visibleEpisodes.map((ep, i) => {
        const { days } = ep;
        const isPast = days < 0;
        const isToday = days === 0;
        const label = formatAirDate(days, ep.airDate);
        const isAlreadyWatched = ep.absoluteNumber !== null && ep.currentEpisode >= ep.absoluteNumber;
        const canMark = ep.absoluteNumber !== null && !isAlreadyWatched;
        const key = `${ep.mediaId}-${ep.absoluteNumber}`;
        const isMarked = marked.has(key) || isAlreadyWatched;

        return (
          <Link
            key={`${ep.mediaId}-${ep.seasonNumber}-${ep.episodeNumber}-${i}`}
            href={`/media/${ep.mediaId}`}
            className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors ${isPast && !isToday ? "opacity-60" : ""}`}
          >
            {ep.coverImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ep.coverImage}
                alt=""
                className="h-10 w-7 rounded object-cover shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate text-sm">{ep.title}</p>
              <p className="text-xs text-muted-foreground truncate">
                S{ep.seasonNumber}E{ep.episodeNumber}
                {ep.name ? ` · ${ep.name}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <p
                  className={`text-sm font-medium ${
                    isToday
                      ? "text-green-500"
                      : isPast
                      ? "text-muted-foreground"
                      : days <= 3
                      ? "text-amber-500"
                      : "text-muted-foreground"
                  }`}
                >
                  {label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isPast && days !== 0
                    ? `${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} ago`
                    : days > 1
                    ? `in ${days} days`
                    : null}
                </p>
              </div>
              {canMark ? (
                <button
                  onClick={(e) => handleMark(ep, e)}
                  disabled={marking === key}
                  className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-40 shrink-0"
                  title="Mark as watched"
                >
                  {marking === key ? (
                    <Circle className="h-5 w-5 animate-pulse" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>
              ) : isMarked ? (
                <CheckCircle className="h-5 w-5 text-primary shrink-0" />
              ) : null}
            </div>
          </Link>
        );
      })}
      </div>
      )}
    </div>
  );
}
