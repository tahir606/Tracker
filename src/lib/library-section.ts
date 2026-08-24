import { CAUGHT_UP } from "@/lib/constants";
import type { TrackedMedia } from "@/types";

// Run-ended markers from both sources: AniList uses FINISHED/CANCELLED,
// TMDB uses Ended/Canceled (TV) and Released (movies).
const FINISHED_RUN_STATUSES = new Set([
  "FINISHED",
  "CANCELLED",
  "Ended",
  "Canceled",
  "Cancelled",
  "Released",
]);

export function isFinishedRun(status: string | null): boolean {
  return status ? FINISHED_RUN_STATUSES.has(status) : false;
}

export interface SectionOverrides {
  /** Live value from the card's input, so a card can re-section without a reload. */
  currentEpisode?: number;
  currentChapter?: number;
  /** TMDB knows about an unaired episode — the run can't be complete. */
  hasUpcomingEpisode?: boolean;
  /**
   * Episodes aired as of now, straight from the provider. Takes precedence over
   * media.releasedEpisodes, which is only written on add or manual refresh and
   * so goes stale the moment a new season drops.
   */
  airedEpisodes?: number | null;
  /** Live run status from the provider, likewise fresher than media.status. */
  runStatus?: string | null;
}

/**
 * Which library section an item belongs in.
 *
 * Manual statuses other than WATCHING are respected as-is — a paused or dropped
 * show stays put. WATCHING splits three ways: still has unwatched released
 * episodes (WATCHING), seen everything released but more is coming (CAUGHT_UP),
 * or seen everything of a run that has ended (COMPLETED).
 */
export function getLibrarySection(
  media: TrackedMedia,
  overrides: SectionOverrides = {}
): string | null {
  const tracking = media.tracking;
  if (!tracking) return null;
  if (tracking.status !== "WATCHING") return tracking.status;

  const runStatus = overrides.runStatus ?? media.status;

  if (media.mediaType === "MANGA") {
    const current = overrides.currentChapter ?? tracking.currentChapter;
    const total = media.totalChapters;
    if (!total || current < total) return "WATCHING";
    return isFinishedRun(runStatus) ? "COMPLETED" : CAUGHT_UP;
  }

  const current = overrides.currentEpisode ?? tracking.currentEpisode;
  const available =
    overrides.airedEpisodes || media.releasedEpisodes || media.totalEpisodes;
  if (!available || current < available) return "WATCHING";

  const runComplete =
    !overrides.hasUpcomingEpisode &&
    isFinishedRun(runStatus) &&
    current >= available;

  return runComplete ? "COMPLETED" : CAUGHT_UP;
}
