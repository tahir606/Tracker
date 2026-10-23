export interface SearchResult {
  externalId: string;
  source: "anilist" | "tmdb";
  mediaType: "ANIME" | "MANGA" | "TV" | "MOVIE";
  title: string;
  titleEnglish: string | null;
  description: string | null;
  coverImage: string | null;
  totalEpisodes: number | null;
  releasedEpisodes: number | null;
  totalChapters: number | null;
  releaseYear: number | null;
  status: string | null;
}

export interface TrackedMedia {
  id: string;
  externalId: string;
  source: string;
  mediaType: "ANIME" | "MANGA" | "TV" | "MOVIE";
  title: string;
  titleEnglish: string | null;
  description: string | null;
  coverImage: string | null;
  totalEpisodes: number | null;
  releasedEpisodes: number | null;
  totalChapters: number | null;
  releaseYear: number | null;
  status: string | null;
  tracking: {
    id: string;
    status: "WATCHING" | "COMPLETED" | "DROPPED" | "PAUSED" | "PLAN_TO_WATCH";
    currentEpisode: number;
    currentChapter: number;
    rating: number | null;
    notes: string | null;
    startedAt: string | null;
    completedAt: string | null;
  } | null;
}

/** Live TMDB schedule data fetched at request time, overriding the DB snapshot. */
export type NextEpisodeInfo = {
  nextAiring: {
    seasonNumber: number;
    episodeNumber: number;
    name: string | null;
    airDate: string | null;
  } | null;
  seasons: { seasonNumber: number; episodeCount: number }[];
  /** Episodes aired as of this request, not as of when the show was added. */
  airedEpisodes: number | null;
  runStatus: string | null;
};
