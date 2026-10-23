"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CollapsibleSection } from "./collapsible-section";
import { seasonEpLabel } from "@/lib/episodes";
import { updateTracking } from "@/lib/tracking-client";
import { cn } from "@/lib/utils";
import { useStoredBoolean } from "@/lib/use-stored-boolean";

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

function dayLabel(days: number, dateStr: string): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function daysLabel(days: number): string | null {
  if (days < -1) return `${-days} days ago`;
  if (days > 1) return `in ${days} days`;
  return null;
}

export function EpisodeScheduleList({
  episodes,
  icon,
  hint,
}: {
  episodes: ScheduleEntry[];
  icon?: React.ReactNode;
  hint?: string;
}) {
  const router = useRouter();
  const [marking, setMarking] = useState<string | null>(null);
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [hideWatched, setHideWatched] = useStoredBoolean(HIDE_WATCHED_KEY, false);
  const toggleHideWatched = () => setHideWatched(!hideWatched);

  async function handleMark(ep: ScheduleEntry) {
    if (!ep.absoluteNumber) return;

    const key = `${ep.mediaId}-${ep.absoluteNumber}`;
    setMarking(key);
    const ok = await updateTracking(ep.mediaId, { currentEpisode: ep.absoluteNumber });
    setMarking(null);
    if (!ok) return;

    setMarked((prev) => new Set(prev).add(key));
    toast.success(
      `${ep.title} ${seasonEpLabel(ep.seasonNumber, ep.episodeNumber)} marked as watched`
    );
    router.refresh();
  }

  const isWatched = (ep: ScheduleEntry) =>
    (ep.absoluteNumber !== null && ep.currentEpisode >= ep.absoluteNumber) ||
    marked.has(`${ep.mediaId}-${ep.absoluteNumber}`);

  const visibleEpisodes = hideWatched ? episodes.filter((ep) => !isWatched(ep)) : episodes;

  return (
    <CollapsibleSection
      id="schedule"
      title="Coming up"
      count={episodes.length}
      hint={hint}
      icon={icon}
      action={
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleHideWatched}
          aria-pressed={hideWatched}
          className="text-muted-foreground"
        >
          {hideWatched ? <Eye /> : <EyeOff />}
          {hideWatched ? "Show watched" : "Hide watched"}
        </Button>
      }
    >
      {visibleEpisodes.length === 0 ? (
        <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
          You&apos;ve watched everything in this window.
        </p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          {visibleEpisodes.map((ep, i) => {
            const { days } = ep;
            const isPast = days < 0;
            const watched = isWatched(ep);
            const canMark = ep.absoluteNumber !== null && !watched && days <= 0;
            const key = `${ep.mediaId}-${ep.absoluteNumber}`;
            const sub = daysLabel(days);

            return (
              <li
                key={`${ep.mediaId}-${ep.seasonNumber}-${ep.episodeNumber}-${i}`}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 sm:px-4",
                  watched && "opacity-60"
                )}
              >
                {ep.coverImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ep.coverImage}
                    alt=""
                    className="h-12 w-8 shrink-0 rounded object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/media/${ep.mediaId}`}
                    className="block truncate text-sm font-medium hover:underline"
                  >
                    {ep.title}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {seasonEpLabel(ep.seasonNumber, ep.episodeNumber)}
                    {ep.name ? ` · ${ep.name}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      days === 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : !isPast && days <= 3
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-muted-foreground"
                    )}
                  >
                    {dayLabel(days, ep.airDate)}
                  </p>
                  {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
                </div>
                <div className="flex w-9 shrink-0 justify-end sm:w-auto">
                  {canMark ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMark(ep)}
                      disabled={marking === key}
                      aria-label={`Mark ${ep.title} ${seasonEpLabel(ep.seasonNumber, ep.episodeNumber)} as watched`}
                    >
                      <Check />
                      <span className="hidden sm:inline">Watched</span>
                    </Button>
                  ) : watched ? (
                    <span className="flex items-center gap-1 px-2 text-xs text-emerald-600 dark:text-emerald-400">
                      <Check className="h-4 w-4" />
                      <span className="hidden sm:inline">Watched</span>
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </CollapsibleSection>
  );
}
