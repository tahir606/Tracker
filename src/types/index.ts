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
