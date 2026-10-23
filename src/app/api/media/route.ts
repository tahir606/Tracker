import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTMDBDetails, getTMDBEpisodeSchedule } from "@/lib/tmdb";
import type { SearchResult } from "@/types";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const mediaType = searchParams.get("type");

  const where: Record<string, unknown> = {};
  if (mediaType) where.mediaType = mediaType;
  if (status) where.tracking = { status };

  const media = await prisma.media.findMany({
    where,
    include: { tracking: true },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(media);
}

export async function POST(request: NextRequest) {
  try {
    const body: SearchResult & { trackingStatus?: string } =
      await request.json();

    const existing = await prisma.media.findUnique({
      where: {
        externalId_source: {
          externalId: body.externalId,
          source: body.source,
        },
      },
      include: { tracking: true },
    });

    if (existing) {
      return NextResponse.json(existing);
    }

    // For TMDB TV shows, fetch episode/season counts upfront
    // (search results don't include episode counts)
    let totalEpisodes = body.totalEpisodes;
    let releasedEpisodes = body.releasedEpisodes;
    let mediaStatus = body.status;

    if (body.source === "tmdb" && body.mediaType === "TV") {
      try {
        const details = await getTMDBDetails(parseInt(body.externalId), "TV");
        totalEpisodes = details.totalEpisodes;
        mediaStatus = details.status;
        // number_of_episodes includes announced-but-unaired episodes, so count
        // released ones from the last episode that has actually aired.
        const { airedEpisodes } = await getTMDBEpisodeSchedule(
          parseInt(body.externalId)
        );
        releasedEpisodes = airedEpisodes;
      } catch {
        // non-fatal — we'll store nulls and user can refresh later
      }
    }

    const trackingStatus =
      (body.trackingStatus as "WATCHING" | "COMPLETED" | "DROPPED" | "PAUSED" | "PLAN_TO_WATCH") ||
      "WATCHING";

    // Adding something as Finished means everything released has been watched/read.
    const finishedProgress =
      trackingStatus === "COMPLETED"
        ? body.mediaType === "MOVIE"
          ? { currentEpisode: 1 }
          : body.mediaType === "MANGA"
          ? { currentChapter: body.totalChapters ?? 0 }
          : { currentEpisode: releasedEpisodes ?? totalEpisodes ?? 0 }
        : {};

    const media = await prisma.media.create({
      data: {
        externalId: body.externalId,
        source: body.source,
        mediaType: body.mediaType,
        title: body.title,
        titleEnglish: body.titleEnglish,
        description: body.description,
        coverImage: body.coverImage,
        totalEpisodes,
        releasedEpisodes,
        totalChapters: body.totalChapters,
        releaseYear: body.releaseYear,
        status: mediaStatus,
        tracking: {
          create: {
            status: trackingStatus,
            ...finishedProgress,
            completedAt: trackingStatus === "COMPLETED" ? new Date() : null,
            startedAt:
              body.trackingStatus === "WATCHING" ||
              !body.trackingStatus
                ? new Date()
                : null,
          },
        },
      },
      include: { tracking: true },
    });

    return NextResponse.json(media, { status: 201 });
  } catch (error) {
    console.error("Add media error:", error);
    return NextResponse.json(
      { error: "Failed to add media" },
      { status: 500 }
    );
  }
}
