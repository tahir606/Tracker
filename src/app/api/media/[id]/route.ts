import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const media = await prisma.media.findUnique({
    where: { id },
    include: { tracking: true },
  });

  if (!media) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(media);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  try {
    const trackingData: Record<string, unknown> = {};

    if (body.status !== undefined) trackingData.status = body.status;
    if (body.currentEpisode !== undefined)
      trackingData.currentEpisode = body.currentEpisode;
    if (body.currentChapter !== undefined)
      trackingData.currentChapter = body.currentChapter;
    if (body.rating !== undefined) trackingData.rating = body.rating;
    if (body.notes !== undefined) trackingData.notes = body.notes;

    if (body.status === "COMPLETED") {
      trackingData.completedAt = new Date();
    }
    if (body.status === "WATCHING") {
      trackingData.startedAt = new Date();
      trackingData.completedAt = null;
    }

    const media = await prisma.media.update({
      where: { id },
      data: {
        tracking: {
          update: trackingData,
        },
      },
      include: { tracking: true },
    });

    return NextResponse.json(media);
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json(
      { error: "Failed to update" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.media.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete" },
      { status: 500 }
    );
  }
}
