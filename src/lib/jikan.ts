const JIKAN_BASE = "https://api.jikan.moe/v4";

/**
 * Jikan is an unofficial, volunteer-run API and goes down now and then. Fail
 * fast so callers can fall back instead of hanging on the default timeout.
 */
const JIKAN_TIMEOUT_MS = 5000;

/** After a failure, skip Jikan for a while rather than paying the timeout on every request. */
const JIKAN_COOLDOWN_MS = 5 * 60 * 1000;
let jikanDownUntil = 0;

async function jikanFetch(path: string, revalidate: number): Promise<Response> {
  if (Date.now() < jikanDownUntil) throw new Error("Jikan recently unavailable");
  try {
    const res = await fetch(`${JIKAN_BASE}${path}`, {
      next: { revalidate },
      signal: AbortSignal.timeout(JIKAN_TIMEOUT_MS),
    });
    if (res.status >= 500) jikanDownUntil = Date.now() + JIKAN_COOLDOWN_MS;
    return res;
  } catch (error) {
    jikanDownUntil = Date.now() + JIKAN_COOLDOWN_MS;
    throw error;
  }
}

export interface JikanEpisode {
  mal_id: number;
  title: string | null;
  title_japanese: string | null;
  aired: string | null;
  filler: boolean;
  recap: boolean;
}

export interface JikanEpisodesResponse {
  data: JikanEpisode[];
  pagination: {
    last_visible_page: number;
    has_next_page: boolean;
    current_page: number;
    items: { count: number; total: number; per_page: number };
  };
}

export async function getJikanEpisodes(
  malId: number,
  page: number = 1
): Promise<JikanEpisodesResponse> {
  const res = await jikanFetch(`/anime/${malId}/episodes?page=${page}`, 3600);
  if (!res.ok) throw new Error(`Jikan API error: ${res.status}`);
  return res.json();
}

export async function getJikanEpisodeDetail(
  malId: number,
  episodeId: number
): Promise<{ synopsis: string | null } | null> {
  const res = await jikanFetch(`/anime/${malId}/episodes/${episodeId}`, 86400).catch(
    () => null
  );
  if (!res?.ok) return null;
  const data = await res.json();
  return { synopsis: data.data?.synopsis || null };
}
