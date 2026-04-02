"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "./status-badge";
import { ProgressDisplay } from "./progress-display";
import { MEDIA_TYPE_LABELS } from "@/lib/constants";
import { toast } from "sonner";
import type { TrackedMedia } from "@/types";

export function MediaCard({ media }: { media: TrackedMedia }) {
  const tracking = media.tracking;
  const [currentEp, setCurrentEp] = useState(tracking?.currentEpisode ?? 0);
  const [currentCh, setCurrentCh] = useState(tracking?.currentChapter ?? 0);
  const [status, setStatus] = useState(tracking?.status ?? "WATCHING");

  const showEpisodes = media.mediaType !== "MANGA";
  const showChapters = media.mediaType === "MANGA";

  async function handleDirectInput(
    field: "currentEpisode" | "currentChapter",
    value: number
  ) {
    try {
      const res = await fetch(`/api/media/${media.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      toast.error("Failed to update");
    }
  }

  async function handleIncrement(field: "currentEpisode" | "currentChapter") {
    try {
      const res = await fetch(`/api/media/${media.id}/increment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (field === "currentEpisode") {
        setCurrentEp(data.tracking.currentEpisode);
      } else {
        setCurrentCh(data.tracking.currentChapter);
      }
      if (data.tracking.status === "COMPLETED") {
        setStatus("COMPLETED");
        toast.success("Completed!");
      }
    } catch {
      toast.error("Failed to update");
    }
  }

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <div className="flex gap-3 p-3">
        <Link href={`/media/${media.id}`} className="shrink-0">
          {media.coverImage ? (
            <Image
              src={media.coverImage}
              alt={media.title}
              width={80}
              height={120}
              className="rounded-md object-cover"
              style={{ width: 80, height: 120 }}
            />
          ) : (
            <div className="flex h-[120px] w-[80px] items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
              No Image
            </div>
          )}
        </Link>

        <CardContent className="flex flex-1 flex-col gap-2 p-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link
                href={`/media/${media.id}`}
                className="font-medium text-sm leading-tight hover:underline line-clamp-2"
              >
                {media.titleEnglish || media.title}
              </Link>
              <p className="text-xs text-muted-foreground mt-0.5">
                {MEDIA_TYPE_LABELS[media.mediaType]}
                {media.releaseYear ? ` · ${media.releaseYear}` : ""}
              </p>
            </div>
            <StatusBadge status={status} />
          </div>

          <div className="mt-auto space-y-1.5">
            {showEpisodes && (
              <div>
                <ProgressDisplay
                  current={currentEp}
                  total={media.totalEpisodes}
                  released={media.releasedEpisodes}
                  label="Episodes"
                />
                {status !== "COMPLETED" && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Input
                      type="number"
                      value={currentEp}
                      onChange={(e) => {
                        const v = parseInt(e.target.value) || 0;
                        setCurrentEp(v);
                      }}
                      onBlur={() =>
                        handleDirectInput("currentEpisode", currentEp)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      className="h-7 w-16 text-center text-xs"
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
                      className="h-7 w-7"
                      onClick={() => handleIncrement("currentEpisode")}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {showChapters && (
              <div>
                <ProgressDisplay
                  current={currentCh}
                  total={media.totalChapters}
                  label="Chapters"
                />
                {status !== "COMPLETED" && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Input
                      type="number"
                      value={currentCh}
                      onChange={(e) => {
                        const v = parseInt(e.target.value) || 0;
                        setCurrentCh(v);
                      }}
                      onBlur={() =>
                        handleDirectInput("currentChapter", currentCh)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      className="h-7 w-16 text-center text-xs"
                      min={0}
                      max={media.totalChapters ?? undefined}
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => handleIncrement("currentChapter")}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
