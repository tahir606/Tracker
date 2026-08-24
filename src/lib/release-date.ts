/**
 * Torrent releases show up a day after broadcast, so every episode date the app
 * surfaces is the broadcast date shifted forward by this many days — i.e. when
 * the episode is actually grabbable, not when it aired.
 */
export const TORRENT_DELAY_DAYS = 1;

/**
 * Shifts a source air date to the date the episode is expected on torrent.
 * Accepts either a plain "YYYY-MM-DD" (TMDB) or a full ISO timestamp (Jikan)
 * and returns the same shape so downstream formatting is unaffected.
 */
export function toAvailableDate(
  airDate: string | null | undefined
): string | null {
  if (!airDate) return null;

  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(airDate);
  const parsed = new Date(dateOnly ? `${airDate}T00:00:00Z` : airDate);
  if (Number.isNaN(parsed.getTime())) return airDate;

  parsed.setUTCDate(parsed.getUTCDate() + TORRENT_DELAY_DAYS);
  return dateOnly ? parsed.toISOString().slice(0, 10) : parsed.toISOString();
}
