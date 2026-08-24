import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAniListMalId } from "@/lib/anilist";
import { getJikanEpisodes } from "@/lib/jikan";
import { getTMDBDetails, getTMDBSeasonEpisodes } from "@/lib/tmdb";
import { toAvailableDate } from "@/lib/release-date";

export interface EpisodeItem {
  number: number;         // season-relative (for display)
  absoluteNumber?: number; // cumulative across seasons (for tracking)
  title: string | null;
  airDate: string | null;
  filler?: boolean;
  recap?: boolean;
  synopsis?: string | null;
  thumbnail?: string | null;
}

export interface EpisodesPageResponse {
  episodes: EpisodeItem[];
  pagination: {
    currentPage: number;
    totalPages: number;
    hasNextPage: boolean;
    pageLabel?: string; // e.g. "Season 1" for TMDB
  };
  source: "jikan" | "tmdb" | "unsupported";
  malId?: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const page = parseInt(request.nextUrl.searchParams.get("page") || "1");

  try {
    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Anime from AniList — use Jikan via MAL ID
    if (media.source === "anilist" && media.mediaType === "ANIME") {
      const malId = await getAniListMalId(parseInt(media.externalId));
      if (!malId) {
        return NextResponse.json(
          { error: "No MAL ID available for this anime" },
          { status: 404 }
        );
      }

      const data = await getJikanEpisodes(malId, page);
      const episodes: EpisodeItem[] = data.data.map((ep) => ({
        number: ep.mal_id,
        title: ep.title,
        airDate: toAvailableDate(ep.aired),
        filler: ep.filler,
        recap: ep.recap,
        synopsis: null, // loaded lazily via /episodes/[epNumber]
      }));

      const response: EpisodesPageResponse = {
        episodes,
        pagination: {
          currentPage: page,
          totalPages: data.pagination.last_visible_page,
          hasNextPage: data.pagination.has_next_page,
        },
        source: "jikan",
        malId,
      };

      return NextResponse.json(response);
    }

    // TV from TMDB — use seasons as pages
    if (media.source === "tmdb" && media.mediaType === "TV") {
      const details = await getTMDBDetails(
        parseInt(media.externalId),
        "TV"
      );
      const totalSeasons = details.seasonCount || 1;
      const safePage = Math.max(1, Math.min(page, totalSeasons));

      const { episodes: rawEps, seasonName } = await getTMDBSeasonEpisodes(
        parseInt(media.externalId),
        safePage
      );

      // Compute episode offset: sum of episodes in all seasons before this one
      const seasonOffset = details.seasonEpisodeCounts
        .filter((s) => s.seasonNumber < safePage)
        .reduce((sum, s) => sum + s.episodeCount, 0);

      const episodes: EpisodeItem[] = rawEps.map((ep) => ({
        number: ep.number,
        absoluteNumber: seasonOffset + ep.number,
        title: ep.title,
        airDate: ep.airDate,
        synopsis: ep.synopsis,
        thumbnail: ep.thumbnail,
      }));

      const response: EpisodesPageResponse = {
        episodes,
        pagination: {
          currentPage: safePage,
          totalPages: totalSeasons,
          hasNextPage: safePage < totalSeasons,
          pageLabel: seasonName,
        },
        source: "tmdb",
      };

      return NextResponse.json(response);
    }

    return NextResponse.json(
      {
        episodes: [],
        pagination: { currentPage: 1, totalPages: 1, hasNextPage: false },
        source: "unsupported",
      } satisfies EpisodesPageResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error("Episodes fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch episodes" },
      { status: 500 }
    );
  }
}
