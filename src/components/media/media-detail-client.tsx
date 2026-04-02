"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  Minus,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "./status-badge";
import { ProgressDisplay } from "./progress-display";
import { EpisodeListDialog } from "./episode-list-dialog";
import { MEDIA_TYPE_LABELS, STATUS_LABELS } from "@/lib/constants";
import { toast } from "sonner";
import type { TrackedMedia } from "@/types";

export function MediaDetailClient({ media }: { media: TrackedMedia }) {
  const router = useRouter();
  const tracking = media.tracking;

  const [currentEp, setCurrentEp] = useState(tracking?.currentEpisode ?? 0);
  const [currentCh, setCurrentCh] = useState(tracking?.currentChapter ?? 0);
  const [status, setStatus] = useState(tracking?.status ?? "WATCHING");
  const [rating, setRating] = useState(tracking?.rating ?? 0);
  const [notes, setNotes] = useState(tracking?.notes ?? "");
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const showEpisodes = media.mediaType !== "MANGA";
  const showChapters = media.mediaType === "MANGA";

  async function updateTracking(data: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/media/${media.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return true;
    } catch {
      toast.error("Failed to update");
      return false;
    }
  }

  async function handleStatusChange(newStatus: string | null) {
    if (!newStatus) return;
    setStatus(newStatus as typeof status);
    await updateTracking({ status: newStatus });
    toast.success(`Status updated to ${STATUS_LABELS[newStatus]}`);
  }

  async function handleEpisodeChange(delta: number) {
    const newVal = Math.max(0, currentEp + delta);
    const cap = media.releasedEpisodes ?? media.totalEpisodes;
    if (cap && newVal > cap) return;
    setCurrentEp(newVal);
    await updateTracking({ currentEpisode: newVal });
  }

  async function handleChapterChange(delta: number) {
    const newVal = Math.max(0, currentCh + delta);
    if (media.totalChapters && newVal > media.totalChapters) return;
    setCurrentCh(newVal);
    await updateTracking({ currentChapter: newVal });
  }

  async function handleRatingChange(val: string) {
    const r = parseInt(val) || 0;
    setRating(r);
    await updateTracking({ rating: r || null });
  }

  async function handleNotesBlur() {
    await updateTracking({ notes: notes || null });
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/media/${media.id}/refresh`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Metadata refreshed");
      router.refresh();
    } catch {
      toast.error("Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Remove this from your library?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/media/${media.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Removed from library");
      router.push("/");
    } catch {
      toast.error("Failed to delete");
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      <div className="flex flex-col gap-6 sm:flex-row">
        {media.coverImage ? (
          <Image
            src={media.coverImage}
            alt={media.title}
            width={200}
            height={300}
            className="rounded-lg object-cover self-start shrink-0"
            style={{ width: 200, height: 300 }}
          />
        ) : (
          <div className="flex h-[300px] w-[200px] shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            No Image
          </div>
        )}

        <div className="flex-1 space-y-3">
          <div>
            <h1 className="text-2xl font-bold">
              {media.titleEnglish || media.title}
            </h1>
            {media.titleEnglish && media.titleEnglish !== media.title && (
              <p className="text-muted-foreground">{media.title}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge status={status} />
              <span className="text-sm text-muted-foreground">
                {MEDIA_TYPE_LABELS[media.mediaType]}
                {media.releaseYear ? ` · ${media.releaseYear}` : ""}
                {media.status ? ` · ${media.status}` : ""}
              </span>
            </div>
          </div>

          {media.description && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
              {media.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 mr-1 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh Info
            </Button>
            {(media.mediaType === "ANIME" || media.mediaType === "TV") && (
              <EpisodeListDialog
                mediaId={media.id}
                mediaTitle={media.titleEnglish || media.title}
                currentEpisode={currentEp}
                onEpisodeUpdate={(epNumber) => setCurrentEp(epNumber)}
              />
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {showEpisodes && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Episodes
                  {media.releasedEpisodes && !media.totalEpisodes && (
                    <span className="text-xs text-muted-foreground font-normal ml-2">
                      ({media.releasedEpisodes} released)
                    </span>
                  )}
                </label>
                <ProgressDisplay
                  current={currentEp}
                  total={media.totalEpisodes}
                  released={media.releasedEpisodes}
                />
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => handleEpisodeChange(-1)}
                    disabled={currentEp <= 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    value={currentEp}
                    onChange={(e) => {
                      const v = parseInt(e.target.value) || 0;
                      setCurrentEp(v);
                    }}
                    onBlur={() =>
                      updateTracking({ currentEpisode: currentEp })
                    }
                    className="h-8 w-20 text-center"
                    min={0}
                    max={
                      media.releasedEpisodes ??
                      media.totalEpisodes ??
                      undefined
                    }
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => handleEpisodeChange(1)}
                    disabled={
                      (media.releasedEpisodes !== null &&
                        currentEp >= (media.releasedEpisodes ?? 0)) ||
                      (media.totalEpisodes !== null &&
                        currentEp >= media.totalEpisodes)
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {showChapters && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Chapters
                </label>
                <ProgressDisplay
                  current={currentCh}
                  total={media.totalChapters}
                />
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => handleChapterChange(-1)}
                    disabled={currentCh <= 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    value={currentCh}
                    onChange={(e) => {
                      const v = parseInt(e.target.value) || 0;
                      setCurrentCh(v);
                    }}
                    onBlur={() =>
                      updateTracking({ currentChapter: currentCh })
                    }
                    className="h-8 w-20 text-center"
                    min={0}
                    max={media.totalChapters ?? undefined}
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => handleChapterChange(1)}
                    disabled={
                      media.totalChapters !== null &&
                      currentCh >= media.totalChapters
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Rating (1-10)
              </label>
              <Input
                type="number"
                value={rating || ""}
                onChange={(e) => handleRatingChange(e.target.value)}
                placeholder="No rating"
                min={1}
                max={10}
                className="w-24"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Add notes..."
                className="w-full rounded-md border bg-transparent px-3 py-2 text-sm min-h-[80px] resize-none"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
