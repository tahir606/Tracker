"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MEDIA_TYPE_LABELS, STATUS_DESCRIPTIONS, STATUS_LABELS, STATUS_ORDER } from "@/lib/constants";
import type { SearchResult } from "@/types";

export function SearchResultCard({
  result,
  libraryId,
  onAdded,
}: {
  result: SearchResult;
  /** Set when this title is already tracked. */
  libraryId?: string;
  onAdded?: (id: string) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const title = result.titleEnglish || result.title;

  async function handleAdd(status: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...result, trackingStatus: status }),
      });
      if (!res.ok) throw new Error("Failed");
      const media = await res.json();
      onAdded?.(media.id);
      toast.success(`Added ${title} to ${STATUS_LABELS[status]}`, {
        action: {
          label: "Open",
          onClick: () => router.push(`/media/${media.id}`),
        },
      });
    } catch {
      toast.error(`Couldn't add ${title}. Try again.`);
    } finally {
      setLoading(false);
    }
  }

  const meta = [
    MEDIA_TYPE_LABELS[result.mediaType],
    result.releaseYear,
    result.totalEpisodes && result.mediaType !== "MOVIE" ? `${result.totalEpisodes} eps` : null,
    result.totalChapters ? `${result.totalChapters} ch` : null,
  ].filter(Boolean);

  return (
    <Card className="gap-0 p-0">
      <div className="flex gap-3 p-3">
        {result.coverImage ? (
          <Image
            src={result.coverImage}
            alt=""
            width={72}
            height={108}
            className="shrink-0 rounded-md object-cover"
            style={{ width: 72, height: 108 }}
          />
        ) : (
          <div className="flex h-[108px] w-[72px] shrink-0 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
            No image
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div>
            <p className="line-clamp-2 text-sm font-medium leading-tight">{title}</p>
            {result.titleEnglish && result.titleEnglish !== result.title && (
              <p className="line-clamp-1 text-xs text-muted-foreground">{result.title}</p>
            )}
            <p className="mt-0.5 text-xs text-muted-foreground">{meta.join(" · ")}</p>
          </div>

          {result.description && (
            <p className="line-clamp-2 text-xs text-muted-foreground">{result.description}</p>
          )}

          <div className="mt-auto pt-1">
            {libraryId ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3.5 w-3.5" /> In your library
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  render={<Link href={`/media/${libraryId}`} />}
                  nativeButton={false}
                >
                  Open
                </Button>
              </div>
            ) : (
              <div className="flex">
                <Button
                  size="sm"
                  className="rounded-r-none"
                  onClick={() => handleAdd("WATCHING")}
                  disabled={loading}
                >
                  <Plus />
                  {loading ? "Adding…" : "Add"}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        size="icon-sm"
                        className="rounded-l-none border-l border-l-primary-foreground/20"
                        disabled={loading}
                        aria-label="Add with a different status"
                      />
                    }
                  >
                    <ChevronDown />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-60">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Add to…</DropdownMenuLabel>
                      {STATUS_ORDER.filter((s) => s !== "DROPPED").map((s) => (
                        <DropdownMenuItem
                          key={s}
                          onClick={() => handleAdd(s)}
                          className="flex-col items-start gap-0"
                        >
                          <span>{STATUS_LABELS[s]}</span>
                          <span className="text-xs text-muted-foreground">
                            {STATUS_DESCRIPTIONS[s]}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
