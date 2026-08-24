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

/**
 * Derived-only section. Not a TrackingStatus — it never gets written to the DB,
 * so it must stay out of STATUS_LABELS (which populates the status dropdowns).
 */
export const CAUGHT_UP = "CAUGHT_UP";

export const SECTION_LABELS: Record<string, string> = {
  ...STATUS_LABELS,
  [CAUGHT_UP]: "Caught Up",
};

export const SECTION_COLORS: Record<string, string> = {
  ...STATUS_COLORS,
  [CAUGHT_UP]: "bg-emerald-500",
};

export const SECTION_ORDER = [
  "WATCHING",
  CAUGHT_UP,
  "PAUSED",
  "PLAN_TO_WATCH",
  "COMPLETED",
  "DROPPED",
] as const;
