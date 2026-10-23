export type SeasonInfo = { seasonNumber: number; episodeCount: number };

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Maps a cumulative episode number onto TMDB's season/episode pair. */
export function toSeasonEp(
  absEp: number,
  seasons: SeasonInfo[]
): { season: number; episode: number } | null {
  let cumulative = 0;
  for (const s of seasons) {
    if (absEp <= cumulative + s.episodeCount) {
      return { season: s.seasonNumber, episode: absEp - cumulative };
    }
    cumulative += s.episodeCount;
  }
  return null;
}

export function seasonEpLabel(season: number, episode: number): string {
  return `S${pad(season)}E${pad(episode)}`;
}

/** "S02E03" when season data is known, otherwise "ep 9". */
export function episodeLabel(absEp: number, seasons?: SeasonInfo[]): string {
  const se = seasons?.length ? toSeasonEp(absEp, seasons) : null;
  return se ? seasonEpLabel(se.season, se.episode) : `ep ${absEp}`;
}

/** Whole days from today (local) to a "YYYY-MM-DD" date. */
export function daysFromToday(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return Math.round((date.getTime() - today.getTime()) / 86_400_000);
}

/** "today", "tomorrow", "in 3 days", "Fri, Oct 30", "2 days ago". */
export function relativeDay(dateStr: string): string {
  const days = daysFromToday(dateStr);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days < 0) return `${-days} days ago`;
  if (days <= 6) return `in ${days} days`;
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
