import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getTMDBEpisodeSchedule } from "@/lib/tmdb";
import { CalendarDays } from "lucide-react";

type EpisodeEntry = {
  mediaId: string;
  title: string;
  coverImage: string | null;
  seasonNumber: number;
  episodeNumber: number;
  name: string | null;
  airDate: string;
  days: number; // negative = past, 0 = today, positive = future
};

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daysFromToday(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((parseDate(dateStr).getTime() - today.getTime()) / 86_400_000);
}

function formatAirDate(days: number, dateStr: string): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 0 && days <= 7)
    return parseDate(dateStr).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  if (days < 0 && days >= -7)
    return parseDate(dateStr).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  return parseDate(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export async function UpcomingEpisodes() {
  const tvShows = await prisma.media.findMany({
    where: {
      mediaType: "TV",
      tracking: { status: { in: ["WATCHING", "PLAN_TO_WATCH"] } },
    },
    select: { id: true, externalId: true, title: true, coverImage: true },
  });

  if (tvShows.length === 0) return null;

  const results = await Promise.allSettled(
    tvShows.map(async (show) => {
      const { next, last } = await getTMDBEpisodeSchedule(Number(show.externalId));
      const entries: EpisodeEntry[] = [];

      if (last?.airDate) {
        const days = daysFromToday(last.airDate);
        if (days >= -7 && days <= 0) {
          entries.push({ mediaId: show.id, title: show.title, coverImage: show.coverImage, ...last, airDate: last.airDate, days });
        }
      }
      if (next?.airDate) {
        const days = daysFromToday(next.airDate);
        if (days >= 0 && days <= 7) {
          // avoid duplicate if last and next are same episode (e.g. aired today)
          const alreadyAdded = entries.some((e) => e.airDate === next.airDate && e.episodeNumber === next.episodeNumber);
          if (!alreadyAdded) {
            entries.push({ mediaId: show.id, title: show.title, coverImage: show.coverImage, ...next, airDate: next.airDate, days });
          }
        }
      }

      return entries;
    })
  );

  const episodes: EpisodeEntry[] = results
    .filter((r): r is PromiseFulfilledResult<EpisodeEntry[]> => r.status === "fulfilled")
    .flatMap((r) => r.value)
    .sort((a, b) => a.airDate.localeCompare(b.airDate));

  if (episodes.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-muted-foreground" />
        Episode Schedule
        <span className="text-sm font-normal text-muted-foreground">
          ({episodes.length})
        </span>
      </h2>
      <div className="rounded-lg border divide-y overflow-hidden">
        {episodes.map((ep, i) => {
          const { days } = ep;
          const isPast = days < 0;
          const isToday = days === 0;
          const label = formatAirDate(days, ep.airDate);

          return (
            <Link
              key={`${ep.mediaId}-${ep.seasonNumber}-${ep.episodeNumber}-${i}`}
              href={`/media/${ep.mediaId}`}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors ${isPast ? "opacity-60" : ""}`}
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
              <div className="text-right shrink-0">
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
            </Link>
          );
        })}
      </div>
    </section>
  );
}
