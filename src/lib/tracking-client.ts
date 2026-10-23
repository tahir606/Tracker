import { toast } from "sonner";
import type { TrackedMedia } from "@/types";

export type TrackingPatch = {
  status?: string;
  currentEpisode?: number;
  currentChapter?: number;
  rating?: number | null;
  notes?: string | null;
};

/**
 * PATCHes a media item's tracking row and returns the saved item (the server
 * may fill in more than was sent, e.g. progress when marking Finished).
 * Shows an error toast and returns null on failure.
 */
export async function updateTracking(
  mediaId: string,
  data: TrackingPatch
): Promise<TrackedMedia | null> {
  try {
    const res = await fetch(`/api/media/${mediaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed");
    return (await res.json()) as TrackedMedia;
  } catch {
    toast.error("Couldn't save that change. Try again.");
    return null;
  }
}
