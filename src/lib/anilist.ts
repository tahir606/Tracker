import type { SearchResult } from "@/types";

const ANILIST_URL = "https://graphql.anilist.co";

const SEARCH_QUERY = `
  query ($search: String!, $type: MediaType!) {
    Page(page: 1, perPage: 20) {
      media(search: $search, type: $type, sort: POPULARITY_DESC) {
        id
        title {
          romaji
          english
        }
        description
        episodes
        chapters
        coverImage {
          large
        }
        status
        seasonYear
        nextAiringEpisode {
          episode
        }
      }
    }
  }
`;

const DETAIL_QUERY = `
  query ($id: Int!) {
    Media(id: $id) {
      id
      title {
        romaji
        english
      }
      description
      episodes
      chapters
      coverImage {
        large
        extraLarge
      }
      status
      seasonYear
      genres
      nextAiringEpisode {
        episode
        airingAt
      }
    }
  }
`;

async function anilistFetch(query: string, variables: Record<string, unknown>) {
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`AniList API error: ${res.status}`);
  }

  return res.json();
}

export async function searchAniList(
  query: string,
  type: "ANIME" | "MANGA"
): Promise<SearchResult[]> {
  const data = await anilistFetch(SEARCH_QUERY, { search: query, type });
  const results = data.data?.Page?.media || [];

  return results.map(
    (item: {
      id: number;
      title: { romaji: string; english: string | null };
      description: string | null;
      episodes: number | null;
      chapters: number | null;
      coverImage: { large: string } | null;
      status: string | null;
      seasonYear: number | null;
      nextAiringEpisode: { episode: number } | null;
    }): SearchResult => ({
      externalId: String(item.id),
      source: "anilist",
      mediaType: type,
      title: item.title.romaji,
      titleEnglish: item.title.english,
      description: item.description
        ? item.description.replace(/<[^>]*>/g, "")
        : null,
      coverImage: item.coverImage?.large || null,
      totalEpisodes: item.episodes,
      releasedEpisodes: item.nextAiringEpisode
        ? item.nextAiringEpisode.episode - 1
        : item.episodes,
      totalChapters: item.chapters,
      releaseYear: item.seasonYear,
      status: item.status,
    })
  );
}

export async function getAniListMedia(id: number) {
  const data = await anilistFetch(DETAIL_QUERY, { id });
  return data.data?.Media;
}

const MAL_ID_QUERY = `
  query ($id: Int!) {
    Media(id: $id) {
      idMal
    }
  }
`;

export async function getAniListMalId(anilistId: number): Promise<number | null> {
  const data = await anilistFetch(MAL_ID_QUERY, { id: anilistId });
  return data.data?.Media?.idMal ?? null;
}

const EPISODE_INFO_QUERY = `
  query ($id: Int!, $after: Int!, $before: Int!) {
    Media(id: $id) {
      episodes
      nextAiringEpisode {
        episode
      }
      streamingEpisodes {
        title
        thumbnail
      }
    }
    first: Page(page: 1, perPage: 50) {
      airingSchedules(mediaId: $id, episode_greater: $after, episode_lesser: $before, sort: EPISODE) {
        episode
        airingAt
      }
    }
    second: Page(page: 2, perPage: 50) {
      airingSchedules(mediaId: $id, episode_greater: $after, episode_lesser: $before, sort: EPISODE) {
        episode
        airingAt
      }
    }
  }
`;

export interface AniListEpisode {
  number: number;
  title: string | null;
  thumbnail: string | null;
  /** ISO timestamp of the broadcast, when AniList has a schedule entry. */
  airedAt: string | null;
}

/**
 * Episode list built from AniList alone, used when Jikan (MyAnimeList) is
 * unavailable. Pages hold 100 episodes to match Jikan's paging. Titles come
 * from streaming listings ("Episode 5 - Title"), so they're often missing.
 */
export async function getAniListEpisodes(anilistId: number, page: number) {
  const PER_PAGE = 100;
  const start = (page - 1) * PER_PAGE + 1;
  const end = page * PER_PAGE;

  const data = await anilistFetch(EPISODE_INFO_QUERY, {
    id: anilistId,
    after: start - 1,
    before: end + 1,
  });
  const media = data.data?.Media;
  if (!media) throw new Error("AniList media not found");

  // Only list what's out, like Jikan does.
  const released: number = media.nextAiringEpisode
    ? media.nextAiringEpisode.episode - 1
    : media.episodes ?? 0;
  const totalPages = Math.max(1, Math.ceil(released / PER_PAGE));

  const titles = new Map<number, { title: string; thumbnail: string | null }>();
  for (const s of (media.streamingEpisodes ?? []) as { title: string; thumbnail: string | null }[]) {
    const match = /^Episode\s+(\d+)\s*[-:]\s*(.+)$/i.exec(s.title ?? "");
    if (match) titles.set(Number(match[1]), { title: match[2].trim(), thumbnail: s.thumbnail });
  }

  const airedAt = new Map<number, string>();
  const schedules = [
    ...(data.data?.first?.airingSchedules ?? []),
    ...(data.data?.second?.airingSchedules ?? []),
  ] as { episode: number; airingAt: number }[];
  for (const s of schedules) {
    airedAt.set(s.episode, new Date(s.airingAt * 1000).toISOString());
  }

  const episodes: AniListEpisode[] = [];
  for (let n = start; n <= Math.min(end, released); n++) {
    episodes.push({
      number: n,
      title: titles.get(n)?.title ?? null,
      thumbnail: titles.get(n)?.thumbnail ?? null,
      airedAt: airedAt.get(n) ?? null,
    });
  }

  return { episodes, totalPages, hasNextPage: page < totalPages };
}
