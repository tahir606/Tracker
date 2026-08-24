import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAniListMedia } from "@/lib/anilist";
import { getTMDBDetails, getTMDBEpisodeSchedule } from "@/lib/tmdb";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (media.source === "anilist") {
      const data = await getAniListMedia(parseInt(media.externalId));
      if (data) {
        updateData.totalEpisodes = data.episodes;
        updateData.releasedEpisodes = data.nextAiringEpisode
          ? data.nextAiringEpisode.episode - 1
          : data.episodes;
        updateData.totalChapters = data.chapters;
        updateData.status = data.status;
        updateData.coverImage = data.coverImage?.extraLarge || data.coverImage?.large;
        updateData.description = data.description
          ? data.description.replace(/<[^>]*>/g, "")
          : null;
      }
    } else if (media.source === "tmdb") {
      const details = await getTMDBDetails(
        parseInt(media.externalId),
        media.mediaType as "TV" | "MOVIE"
      );
      updateData.totalEpisodes = details.totalEpisodes;
      updateData.status = details.status;
      if (media.mediaType === "TV") {
        // number_of_episodes counts announced episodes too, so take the released
        // count from the last episode that has actually aired.
        const { airedEpisodes } = await getTMDBEpisodeSchedule(
          parseInt(media.externalId)
        );
        updateData.releasedEpisodes = airedEpisodes;
      }
    }

    const updated = await prisma.media.update({
      where: { id },
      data: updateData,
      include: { tracking: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Refresh error:", error);
    return NextResponse.json(
      { error: "Failed to refresh" },
      { status: 500 }
    );
  }
}
