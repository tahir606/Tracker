import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAniListEpisodes, getAniListMalId } from "@/lib/anilist";
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
  source: "jikan" | "anilist" | "tmdb" | "unsupported";
  malId?: number;
  /** Shown above the list, e.g. when a fallback source was used. */
  notice?: string;
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

    // Anime from AniList — use MyAnimeList data (Tenrai, via MAL ID) for titles,
    // filler and recap flags, falling back to AniList's own (sparser) data when Jikan is down.
    if (media.source === "anilist" && media.mediaType === "ANIME") {
      const anilistId = parseInt(media.externalId);
      const malId = await getAniListMalId(anilistId);

      if (malId) {
        try {
          const data = await getJikanEpisodes(malId, page);
          const episodes: EpisodeItem[] = data.data.map((ep) => ({
            number: ep.mal_id,
            title: ep.title,
            airDate: toAvailableDate(ep.aired),
            filler: ep.filler,
            recap: ep.recap,
            // null means "not loaded" — the dialog fetches it via /episodes/[epNumber]
            synopsis: ep.synopsis ?? null,
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
        } catch (error) {
          console.warn("MyAnimeList (Tenrai) unavailable, falling back to AniList:", error);
        }
      }

      const data = await getAniListEpisodes(anilistId, page);
      const response: EpisodesPageResponse = {
        episodes: data.episodes.map((ep) => ({
          number: ep.number,
          title: ep.title,
          airDate: toAvailableDate(ep.airedAt),
          thumbnail: ep.thumbnail,
        })),
        pagination: {
          currentPage: page,
          totalPages: data.totalPages,
          hasNextPage: data.hasNextPage,
        },
        source: "anilist",
        notice: malId
          ? "MyAnimeList isn't responding right now, so episode titles, summaries and filler tags may be missing."
          : "This anime isn't on MyAnimeList, so episode titles, summaries and filler tags may be missing.",
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
