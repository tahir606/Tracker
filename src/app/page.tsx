import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "@/components/media/dashboard-client";
import { UpcomingEpisodes } from "@/components/media/upcoming-episodes";
import { Skeleton } from "@/components/ui/skeleton";
import { getTMDBEpisodeSchedule } from "@/lib/tmdb";
import type { NextEpisodeInfo } from "@/types";

export const dynamic = "force-dynamic";

function UpcomingSkeleton() {
  return (
    <section className="space-y-3">
      <Skeleton className="h-6 w-40" />
      <div className="rounded-lg border divide-y overflow-hidden">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-10 w-7 rounded shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function DashboardPage() {
  const media = await prisma.media.findMany({
    include: { tracking: true },
    orderBy: { updatedAt: "desc" },
  });

  const tvShows = media.filter(
    (m) =>
      m.mediaType === "TV" &&
      m.externalId &&
      m.tracking?.status !== "COMPLETED" &&
      m.tracking?.status !== "DROPPED"
  );

  const nextEpisodeResults = await Promise.allSettled(
    tvShows.map(async (show) => {
      const schedule = await getTMDBEpisodeSchedule(Number(show.externalId));
      return { id: show.id, ...schedule };
    })
  );

  const nextEpisodeMap: Record<string, NextEpisodeInfo> = {};
  // totalEpisodes/releasedEpisodes are otherwise only written on add or a manual
  // refresh, so a show that gained a season since then looks finished. We already
  // have fresh numbers in hand here — write them back when they've drifted.
  const staleSyncs: Promise<unknown>[] = [];

  for (const result of nextEpisodeResults) {
    if (result.status !== "fulfilled") continue;
    const { id, next, seasons, airedEpisodes, totalEpisodes, status } = result.value;

    nextEpisodeMap[id] = {
      nextAiring: next,
      seasons,
      airedEpisodes,
      runStatus: status,
    };

    const show = media.find((m) => m.id === id);
    if (!show) continue;
    if (
      show.totalEpisodes === totalEpisodes &&
      show.releasedEpisodes === airedEpisodes &&
      show.status === status
    ) {
      continue;
    }

    staleSyncs.push(
      prisma.media.update({
        where: { id },
        data: { totalEpisodes, releasedEpisodes: airedEpisodes, status },
      })
    );
    // Keep this render consistent with what we just wrote.
    show.totalEpisodes = totalEpisodes;
    show.releasedEpisodes = airedEpisodes;
    show.status = status;
  }

  await Promise.allSettled(staleSyncs);

  return (
    <DashboardClient
      initialMedia={JSON.parse(JSON.stringify(media))}
      nextEpisodeMap={nextEpisodeMap}
      schedule={
        <Suspense key="schedule" fallback={<UpcomingSkeleton />}>
          <UpcomingEpisodes />
        </Suspense>
      }
    />
  );
}
