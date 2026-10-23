import { getAniListMedia } from "@/lib/anilist";
import { getTMDBEpisodeSchedule } from "@/lib/tmdb";

type MediaSnapshot = {
  source: string;
  externalId: string;
  mediaType: "ANIME" | "MANGA" | "TV" | "MOVIE";
  totalEpisodes: number | null;
  releasedEpisodes: number | null;
  totalChapters: number | null;
};

/**
 * Progress that means "watched/read everything released so far", used when an
 * item is marked Finished. Asks the provider for a live count because the
 * stored snapshot goes stale for ongoing series; falls back to the snapshot.
 * Returns {} when the count is unknown (e.g. an ongoing manga).
 */
export async function releasedProgress(
  media: MediaSnapshot
): Promise<{ currentEpisode?: number; currentChapter?: number }> {
  if (media.mediaType === "MOVIE") return { currentEpisode: 1 };

  if (media.mediaType === "MANGA") {
    let chapters = media.totalChapters;
    if (media.source === "anilist") {
      try {
        chapters = (await getAniListMedia(Number(media.externalId)))?.chapters ?? chapters;
      } catch {
        // provider unreachable — use the snapshot
      }
    }
    return chapters ? { currentChapter: chapters } : {};
  }

  let released = media.releasedEpisodes ?? media.totalEpisodes;
  try {
    if (media.source === "tmdb" && media.mediaType === "TV") {
      released = (await getTMDBEpisodeSchedule(Number(media.externalId))).airedEpisodes || released;
    } else if (media.source === "anilist") {
      const live = await getAniListMedia(Number(media.externalId));
      if (live) {
        released = live.nextAiringEpisode ? live.nextAiringEpisode.episode - 1 : live.episodes ?? released;
      }
    }
  } catch {
    // provider unreachable — use the snapshot
  }
  return released ? { currentEpisode: released } : {};
}
