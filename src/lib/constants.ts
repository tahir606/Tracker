export const STATUS_LABELS: Record<string, string> = {
  WATCHING: "Watching",
  COMPLETED: "Completed",
  DROPPED: "Dropped",
  PAUSED: "Paused",
  PLAN_TO_WATCH: "Plan to Watch",
};

export const STATUS_COLORS: Record<string, string> = {
  WATCHING: "bg-blue-500",
  COMPLETED: "bg-green-500",
  DROPPED: "bg-red-500",
  PAUSED: "bg-yellow-500",
  PLAN_TO_WATCH: "bg-gray-500",
};

export const MEDIA_TYPE_LABELS: Record<string, string> = {
  ANIME: "Anime",
  MANGA: "Manga",
  TV: "TV Show",
  MOVIE: "Movie",
};

export const STATUS_ORDER = [
  "WATCHING",
  "PAUSED",
  "PLAN_TO_WATCH",
  "COMPLETED",
  "DROPPED",
] as const;
