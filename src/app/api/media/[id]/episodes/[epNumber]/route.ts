import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAniListMalId } from "@/lib/anilist";
import { getJikanEpisodeDetail } from "@/lib/jikan";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; epNumber: string }> }
) {
  const { id, epNumber } = await params;

  try {
    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (media.source === "anilist" && media.mediaType === "ANIME") {
      const malId = await getAniListMalId(parseInt(media.externalId));
      if (!malId) {
        return NextResponse.json({ synopsis: null });
      }

      const detail = await getJikanEpisodeDetail(malId, parseInt(epNumber));
      return NextResponse.json({ synopsis: detail?.synopsis || null });
    }

    return NextResponse.json({ synopsis: null });
  } catch (error) {
    console.error("Episode detail error:", error);
    return NextResponse.json({ synopsis: null });
  }
}
