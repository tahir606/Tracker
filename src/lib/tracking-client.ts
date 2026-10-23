import { toast } from "sonner";

export type TrackingPatch = {
  status?: string;
  currentEpisode?: number;
  currentChapter?: number;
  rating?: number | null;
  notes?: string | null;
};

/** PATCHes a media item's tracking row. Shows an error toast and returns false on failure. */
export async function updateTracking(
  mediaId: string,
  data: TrackingPatch
): Promise<boolean> {
  try {
    const res = await fetch(`/api/media/${mediaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed");
    return true;
  } catch {
    toast.error("Couldn't save that change. Try again.");
    return false;
  }
}
