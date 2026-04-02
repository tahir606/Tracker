import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const field = body.field as "currentEpisode" | "currentChapter";

  if (field !== "currentEpisode" && field !== "currentChapter") {
    return NextResponse.json(
      { error: "field must be currentEpisode or currentChapter" },
      { status: 400 }
    );
  }

  try {
    const media = await prisma.media.findUnique({
      where: { id },
      include: { tracking: true },
    });

    if (!media || !media.tracking) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const currentValue = media.tracking[field];
    const totalField =
      field === "currentEpisode" ? "totalEpisodes" : "totalChapters";
    const total = media[totalField];

    // For episodes, use releasedEpisodes as the cap for ongoing series
    const cap =
      field === "currentEpisode" && media.releasedEpisodes
        ? media.releasedEpisodes
        : total;

    // Don't increment past cap
    if (cap !== null && currentValue >= cap) {
      return NextResponse.json(media);
    }

    const newValue = currentValue + 1;
    const isCompleted = total !== null && newValue >= total;

    const updated = await prisma.media.update({
      where: { id },
      data: {
        tracking: {
          update: {
            [field]: { increment: 1 },
            ...(isCompleted
              ? { status: "COMPLETED", completedAt: new Date() }
              : {}),
          },
        },
      },
      include: { tracking: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Increment error:", error);
    return NextResponse.json(
      { error: "Failed to increment" },
      { status: 500 }
    );
  }
}
