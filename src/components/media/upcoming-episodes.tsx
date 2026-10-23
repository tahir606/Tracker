import { prisma } from "@/lib/prisma";
import { getTMDBEpisodeSchedule } from "@/lib/tmdb";
import { CalendarDays } from "lucide-react";
import { daysFromToday } from "@/lib/episodes";
import { EpisodeScheduleList, type ScheduleEntry } from "./episode-schedule-list";

export async function UpcomingEpisodes() {
  const tvShows = await prisma.media.findMany({
    where: {
      mediaType: "TV",
      tracking: { status: { in: ["WATCHING", "PLAN_TO_WATCH"] } },
    },
    select: {
      id: true,
      externalId: true,
      title: true,
      coverImage: true,
      tracking: { select: { currentEpisode: true } },
    },
  });

  if (tvShows.length === 0) return null;

  const results = await Promise.allSettled(
    tvShows.map(async (show) => {
      const { next, last } = await getTMDBEpisodeSchedule(Number(show.externalId));
      const currentEpisode = show.tracking?.currentEpisode ?? 0;
      const entries: ScheduleEntry[] = [];

      if (last?.airDate) {
        const days = daysFromToday(last.airDate);
        if (days >= -7 && days <= 0) {
          entries.push({ mediaId: show.id, title: show.title, coverImage: show.coverImage, ...last, airDate: last.airDate, days, currentEpisode });
        }
      }
      if (next?.airDate) {
        const days = daysFromToday(next.airDate);
        if (days >= 0 && days <= 7) {
          const alreadyAdded = entries.some((e) => e.airDate === next.airDate && e.episodeNumber === next.episodeNumber);
          if (!alreadyAdded) {
            entries.push({ mediaId: show.id, title: show.title, coverImage: show.coverImage, ...next, airDate: next.airDate, days, currentEpisode });
          }
        }
      }

      return entries;
    })
  );

  const episodes: ScheduleEntry[] = results
    .filter((r): r is PromiseFulfilledResult<ScheduleEntry[]> => r.status === "fulfilled")
    .flatMap((r) => r.value)
    .sort((a, b) => a.airDate.localeCompare(b.airDate));

  if (episodes.length === 0) return null;

  return (
    <EpisodeScheduleList
      episodes={episodes}
      icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />}
      hint="TV episodes that aired in the past week or air in the next week."
    />
  );
}
