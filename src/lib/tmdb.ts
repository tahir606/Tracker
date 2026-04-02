import type { SearchResult } from "@/types";

const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

async function tmdbFetch(endpoint: string) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || apiKey === "your_tmdb_api_key_here") {
    throw new Error("TMDB_API_KEY not configured in .env");
  }

  const url = `${BASE_URL}${endpoint}${endpoint.includes("?") ? "&" : "?"}api_key=${apiKey}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`TMDB API error: ${res.status}`);
  }

  return res.json();
}

export async function searchTMDB(
  query: string,
  type: "TV" | "MOVIE"
): Promise<SearchResult[]> {
  const endpoint =
    type === "TV"
      ? `/search/tv?query=${encodeURIComponent(query)}`
      : `/search/movie?query=${encodeURIComponent(query)}`;

  const data = await tmdbFetch(endpoint);
  const results = data.results || [];

  return results.slice(0, 20).map(
    (item: {
      id: number;
      name?: string;
      title?: string;
      overview: string | null;
      poster_path: string | null;
      first_air_date?: string;
      release_date?: string;
      number_of_episodes?: number;
      number_of_seasons?: number;
    }): SearchResult => ({
      externalId: String(item.id),
      source: "tmdb",
      mediaType: type,
      title: item.name || item.title || "Unknown",
      titleEnglish: null,
      description: item.overview || null,
      coverImage: item.poster_path ? `${IMAGE_BASE}${item.poster_path}` : null,
      totalEpisodes: null, // TMDB search doesn't return episode count
      totalChapters: null,
      releaseYear: getYear(item.first_air_date || item.release_date),
      status: null,
    })
  );
}

export async function getTMDBDetails(id: number, type: "TV" | "MOVIE") {
  const endpoint = type === "TV" ? `/tv/${id}` : `/movie/${id}`;
  const data = await tmdbFetch(endpoint);

  // Build per-season episode counts (season_number >= 1 only; 0 = Specials)
  const seasonEpisodeCounts: { seasonNumber: number; episodeCount: number }[] =
    type === "TV"
      ? (
          (data.seasons as { season_number: number; episode_count: number }[]) ?? []
        )
          .filter((s) => s.season_number >= 1)
          .map((s) => ({ seasonNumber: s.season_number, episodeCount: s.episode_count }))
      : [];

  return {
    totalEpisodes: type === "TV" ? data.number_of_episodes || null : null,
    seasonCount: type === "TV" ? (data.number_of_seasons as number | null) || null : null,
    status: data.status || null,
    seasonEpisodeCounts,
  };
}

export async function getTMDBSeasonEpisodes(tvId: number, season: number) {
  const data = await tmdbFetch(`/tv/${tvId}/season/${season}`);
  const episodes = (
    data.episodes as {
      episode_number: number;
      name: string | null;
      overview: string | null;
      air_date: string | null;
      still_path: string | null;
    }[]
  ).map((ep) => ({
    number: ep.episode_number,
    title: ep.name || null,
    airDate: ep.air_date || null,
    synopsis: ep.overview || null,
    thumbnail: ep.still_path
      ? `https://image.tmdb.org/t/p/w300${ep.still_path}`
      : null,
  }));
  return { episodes, seasonName: (data.name as string) || `Season ${season}` };
}

type TMDBEpisodeStub = {
  season_number: number;
  episode_number: number;
  name: string | null;
  air_date: string | null;
} | null;

function mapEpisodeStub(ep: TMDBEpisodeStub) {
  if (!ep) return null;
  return {
    seasonNumber: ep.season_number,
    episodeNumber: ep.episode_number,
    name: ep.name || null,
    airDate: ep.air_date || null,
  };
}

export async function getTMDBEpisodeSchedule(id: number) {
  const data = await tmdbFetch(`/tv/${id}`);
  return {
    next: mapEpisodeStub(data.next_episode_to_air as TMDBEpisodeStub),
    last: mapEpisodeStub(data.last_episode_to_air as TMDBEpisodeStub),
  };
}

function getYear(dateStr?: string): number | null {
  if (!dateStr) return null;
  const year = parseInt(dateStr.split("-")[0]);
  return isNaN(year) ? null : year;
}
