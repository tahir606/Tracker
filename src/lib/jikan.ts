const JIKAN_BASE = "https://api.jikan.moe/v4";

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
  const res = await fetch(
    `${JIKAN_BASE}/anime/${malId}/episodes?page=${page}`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) throw new Error(`Jikan API error: ${res.status}`);
  return res.json();
}

export async function getJikanEpisodeDetail(
  malId: number,
  episodeId: number
): Promise<{ synopsis: string | null } | null> {
  const res = await fetch(
    `${JIKAN_BASE}/anime/${malId}/episodes/${episodeId}`,
    { next: { revalidate: 86400 } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return { synopsis: data.data?.synopsis || null };
}
