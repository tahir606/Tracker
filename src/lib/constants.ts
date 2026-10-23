/**
 * One vocabulary for both the status picker and the dashboard sections, so the
 * word a user picks is the word they then see as a section heading.
 */
export const STATUS_LABELS: Record<string, string> = {
  WATCHING: "In progress",
  PLAN_TO_WATCH: "Planned",
  PAUSED: "Paused",
  COMPLETED: "Finished",
  DROPPED: "Dropped",
};

export const STATUS_DESCRIPTIONS: Record<string, string> = {
  WATCHING: "Currently watching or reading",
  PLAN_TO_WATCH: "Saved for later",
  PAUSED: "On hold for now",
  COMPLETED: "Done with it",
  DROPPED: "Stopped and not coming back",
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
  "PLAN_TO_WATCH",
  "PAUSED",
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
  [CAUGHT_UP]: "Up to date",
};

/** One-line explanation under each dashboard section heading. */
export const SECTION_HINTS: Record<string, string> = {
  WATCHING: "Has episodes or chapters out that you haven't seen yet",
  [CAUGHT_UP]: "You've seen everything released so far — waiting for more",
  PLAN_TO_WATCH: "Saved for later",
  PAUSED: "On hold",
  COMPLETED: "Watched or read to the end",
  DROPPED: "Stopped watching",
};

/** Sections that start collapsed on the dashboard until the user opens them. */
export const COLLAPSED_SECTIONS = new Set<string>([
  "PLAN_TO_WATCH",
  "PAUSED",
  "COMPLETED",
  "DROPPED",
]);

export const SECTION_COLORS: Record<string, string> = {
  ...STATUS_COLORS,
  [CAUGHT_UP]: "bg-emerald-500",
};

export const SECTION_ORDER = [
  "WATCHING",
  CAUGHT_UP,
  "PLAN_TO_WATCH",
  "PAUSED",
  "COMPLETED",
  "DROPPED",
] as const;

/** Human wording for provider run statuses (AniList and TMDB use different ones). */
export const RUN_STATUS_LABELS: Record<string, string> = {
  RELEASING: "Airing",
  FINISHED: "Finished airing",
  NOT_YET_RELEASED: "Not yet released",
  CANCELLED: "Cancelled",
  HIATUS: "On hiatus",
  "Returning Series": "Returning series",
  Ended: "Ended",
  Canceled: "Cancelled",
  "In Production": "In production",
  Planned: "Announced",
  Released: "Released",
};
