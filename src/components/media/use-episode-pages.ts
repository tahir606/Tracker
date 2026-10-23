"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toSeasonEp, type SeasonInfo } from "@/lib/episodes";
import type { EpisodesPageResponse } from "@/app/api/media/[id]/episodes/route";

/** The page holding an episode: its season for TMDB, or a block of 100 for anime. */
export function episodePageFor(absEp: number, seasons?: SeasonInfo[]): number {
  if (seasons?.length) {
    const se = toSeasonEp(Math.max(absEp, 1), seasons);
    return se ? se.season : seasons[seasons.length - 1].seasonNumber;
  }
  return Math.max(1, Math.ceil(absEp / 100));
}

/**
 * Loads one page of a media item's episodes while a dialog is open, starting
 * on the page that holds `startEpisode`.
 */
export function useEpisodePages({
  mediaId,
  open,
  startEpisode,
  seasons,
}: {
  mediaId: string;
  open: boolean;
  startEpisode: number;
  seasons?: SeasonInfo[];
}) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<EpisodesPageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Jump to the page holding the start episode each time the dialog opens.
  useEffect(() => {
    if (open) setPage(episodePageFor(startEpisode, seasons));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Opening fires a fetch for the previous page and then for the jump target;
  // only the latest request may update state, or a slow stale page wins.
  const latestRequest = useRef(0);

  const load = useCallback(
    async (p: number) => {
      const id = ++latestRequest.current;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/media/${mediaId}/episodes?page=${p}`);
        if (!res.ok) throw new Error("Failed to load");
        const json: EpisodesPageResponse = await res.json();
        if (id !== latestRequest.current) return;
        if (json.source === "unsupported") {
          setError("Episode list is not available for this media type.");
        } else {
          setData(json);
        }
      } catch {
        if (id === latestRequest.current) {
          setError("Failed to load episodes. Please try again.");
        }
      } finally {
        if (id === latestRequest.current) setLoading(false);
      }
    },
    [mediaId]
  );

  useEffect(() => {
    if (open) load(page);
  }, [open, page, load]);

  return { page, setPage, data, loading, error, reload: () => load(page) };
}
