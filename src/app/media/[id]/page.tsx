import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { MediaDetailClient } from "@/components/media/media-detail-client";
import { getTMDBEpisodeSchedule } from "@/lib/tmdb";
import type { NextEpisodeInfo } from "@/types";

export const dynamic = "force-dynamic";

export default async function MediaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const media = await prisma.media.findUnique({
    where: { id },
    include: { tracking: true },
  });

  if (!media) notFound();

  // Same live override as the dashboard: season layout for S/E labels and the
  // episode list, plus fresh aired counts so the derived state matches.
  let nextEpisode: NextEpisodeInfo | undefined;
  if (media.mediaType === "TV" && media.source === "tmdb") {
    try {
      const schedule = await getTMDBEpisodeSchedule(Number(media.externalId));
      nextEpisode = {
        nextAiring: schedule.next,
        seasons: schedule.seasons,
        airedEpisodes: schedule.airedEpisodes,
        runStatus: schedule.status,
      };
    } catch {
      // provider down — fall back to the stored snapshot
    }
  }

  return (
    <MediaDetailClient
      media={JSON.parse(JSON.stringify(media))}
      nextEpisode={nextEpisode}
    />
  );
}
