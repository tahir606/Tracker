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
