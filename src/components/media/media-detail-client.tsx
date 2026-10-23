"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  Minus,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "./status-badge";
import { ProgressDisplay } from "./progress-display";
import { EpisodeListDialog } from "./episode-list-dialog";
import {
  CAUGHT_UP,
  MEDIA_TYPE_LABELS,
  RUN_STATUS_LABELS,
  SECTION_HINTS,
  STATUS_DESCRIPTIONS,
  STATUS_LABELS,
  STATUS_ORDER,
} from "@/lib/constants";
import { episodeLabel, relativeDay, seasonEpLabel } from "@/lib/episodes";
import { getLibrarySection } from "@/lib/library-section";
import { updateTracking } from "@/lib/tracking-client";
import { cn } from "@/lib/utils";
import type { NextEpisodeInfo, TrackedMedia } from "@/types";

const PROVIDER_NAMES: Record<string, string> = { anilist: "AniList", tmdb: "TMDB" };

export function MediaDetailClient({
  media,
  nextEpisode,
}: {
  media: TrackedMedia;
  nextEpisode?: NextEpisodeInfo;
}) {
  const router = useRouter();
  const tracking = media.tracking;

  const [currentEp, setCurrentEp] = useState(tracking?.currentEpisode ?? 0);
  const [currentCh, setCurrentCh] = useState(tracking?.currentChapter ?? 0);
  const [draft, setDraft] = useState<string | null>(null);
  const [status, setStatus] = useState(tracking?.status ?? "WATCHING");
  const [rating, setRating] = useState(tracking?.rating ?? 0);
  const [notes, setNotes] = useState(tracking?.notes ?? "");
  const [notesState, setNotesState] = useState<"idle" | "saving" | "saved">("idle");
  const [refreshing, setRefreshing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  const isManga = media.mediaType === "MANGA";
  const isMovie = media.mediaType === "MOVIE";
  const hasEpisodeList = media.mediaType === "ANIME" || media.mediaType === "TV";
  const title = media.titleEnglish || media.title;
  const seasons = nextEpisode?.seasons;
  const provider = PROVIDER_NAMES[media.source] ?? "the provider";
  const runStatus = nextEpisode?.runStatus ?? media.status;

  const current = isManga ? currentCh : currentEp;
  const released = isManga ? null : nextEpisode?.airedEpisodes || media.releasedEpisodes;
  const cap = isManga ? media.totalChapters : released || media.totalEpisodes;
  const unit = isManga ? "chapters" : "episodes";

  const section =
    getLibrarySection(
      { ...media, tracking: tracking ? { ...tracking, status } : null },
      {
        currentEpisode: currentEp,
        currentChapter: currentCh,
        hasUpcomingEpisode: Boolean(nextEpisode?.nextAiring),
        airedEpisodes: nextEpisode?.airedEpisodes,
        runStatus: nextEpisode?.runStatus,
      }
    ) ?? status;

  async function handleStatusChange(newStatus: string | null) {
    if (!newStatus || newStatus === status) return;
    const previous = status;
    setStatus(newStatus as typeof status);
    const saved = await updateTracking(media.id, { status: newStatus });
    if (saved) {
      // Marking Finished fills progress server-side; show what was saved.
      if (saved.tracking) {
        setCurrentEp(saved.tracking.currentEpisode);
        setCurrentCh(saved.tracking.currentChapter);
      }
      toast.success(`Moved to ${STATUS_LABELS[newStatus]}`);
      router.refresh();
    } else {
      setStatus(previous);
    }
  }

  async function saveProgress(value: number) {
    const clamped = Math.max(0, cap ? Math.min(value, cap) : value);
    const field = isManga ? "currentChapter" : "currentEpisode";
    const setLocal = isManga ? setCurrentCh : setCurrentEp;
    const previous = current;
    setLocal(clamped);
    setDraft(null);
    if (!(await updateTracking(media.id, { [field]: clamped }))) setLocal(previous);
  }

  async function handleRatingChange(r: number) {
    const next = r === rating ? 0 : r;
    setRating(next);
    await updateTracking(media.id, { rating: next || null });
  }

  async function handleNotesBlur() {
    if (notes === (tracking?.notes ?? "") && notesState === "idle") return;
    setNotesState("saving");
    const ok = await updateTracking(media.id, { notes: notes || null });
    setNotesState(ok ? "saved" : "idle");
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/media/${media.id}/refresh`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Updated details from ${provider}`);
      router.refresh();
    } catch {
      toast.error(`Couldn't reach ${provider}. Try again later.`);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/media/${media.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Removed ${title} from your library`);
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Couldn't remove it. Try again.");
      setDeleting(false);
    }
  }

  const nextAiring = nextEpisode?.nextAiring ?? null;
  const nextNum = current + 1;
  const nextIsOut = !cap || nextNum <= cap;
  const nextLabel = isManga ? `chapter ${nextNum}` : episodeLabel(nextNum, seasons);

  let progressNote: string | null = null;
  if (section === CAUGHT_UP) {
    progressNote = nextAiring?.airDate
      ? `You're up to date. ${seasonEpLabel(nextAiring.seasonNumber, nextAiring.episodeNumber)} airs ${relativeDay(nextAiring.airDate)}.`
      : `You're up to date. ${SECTION_HINTS[CAUGHT_UP]}.`;
  } else if (section === "COMPLETED" && status === "WATCHING") {
    progressNote = `You've ${isManga ? "read" : "watched"} everything and the series has ended, so it's listed under Finished.`;
  } else if (nextIsOut && current > 0 && status !== "COMPLETED") {
    progressNote = `Up next: ${nextLabel}`;
  }

  const description = media.description ?? "";
  const longDescription = description.length > 320;

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Library
      </Link>

      <div className="flex gap-4 sm:gap-6">
        {media.coverImage ? (
          <Image
            src={media.coverImage}
            alt=""
            width={180}
            height={270}
            className="h-[150px] w-[100px] shrink-0 self-start rounded-lg object-cover sm:h-[270px] sm:w-[180px]"
            priority
          />
        ) : (
          <div className="flex h-[150px] w-[100px] shrink-0 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground sm:h-[270px] sm:w-[180px]">
            No image
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold leading-tight sm:text-2xl">{title}</h1>
              {media.titleEnglish && media.titleEnglish !== media.title && (
                <p className="text-sm text-muted-foreground">{media.title}</p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon" aria-label="More actions" />}
              >
                <MoreHorizontal />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuItem onClick={handleRefresh} disabled={refreshing}>
                  <RefreshCw className={cn(refreshing && "animate-spin")} />
                  Update details from {provider}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
                  <Trash2 /> Remove from library
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <StatusBadge status={section} />
            <span>
              {[
                MEDIA_TYPE_LABELS[media.mediaType],
                media.releaseYear,
                runStatus ? RUN_STATUS_LABELS[runStatus] ?? runStatus : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>

          {description && (
            <div className="hidden sm:block">
              <p
                className={cn(
                  "text-sm leading-relaxed text-muted-foreground",
                  !showFullDescription && "line-clamp-4"
                )}
              >
                {description}
              </p>
              {longDescription && (
                <button
                  type="button"
                  onClick={() => setShowFullDescription((v) => !v)}
                  className="mt-1 text-xs font-medium text-foreground hover:underline"
                >
                  {showFullDescription ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {description && (
        <div className="sm:hidden">
          <p
            className={cn(
              "text-sm leading-relaxed text-muted-foreground",
              !showFullDescription && "line-clamp-4"
            )}
          >
            {description}
          </p>
          {longDescription && (
            <button
              type="button"
              onClick={() => setShowFullDescription((v) => !v)}
              className="mt-1 text-xs font-medium text-foreground hover:underline"
            >
              {showFullDescription ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Progress</CardTitle>
            {!isMovie && (
              <CardDescription>
                {progressNote ?? (current === 0 ? `You haven't started yet.` : null)}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {isMovie ? (
              status === "COMPLETED" ? (
                <p className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  <Check className="h-4 w-4" /> Watched
                </p>
              ) : (
                <Button onClick={() => handleStatusChange("COMPLETED")}>
                  <Check /> Mark as watched
                </Button>
              )
            ) : (
              <>
                <ProgressDisplay
                  current={current}
                  total={isManga ? media.totalChapters : media.totalEpisodes}
                  released={released}
                  unit={unit}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center">
                    <Button
                      size="icon"
                      variant="outline"
                      className="rounded-r-none"
                      onClick={() => saveProgress(current - 1)}
                      disabled={current <= 0}
                      aria-label={`One fewer ${isManga ? "chapter" : "episode"}`}
                    >
                      <Minus />
                    </Button>
                    <Input
                      type="number"
                      inputMode="numeric"
                      aria-label={isManga ? "Chapters read" : "Episodes watched"}
                      value={draft ?? String(current)}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => {
                        if (draft === null) return;
                        const v = Number.parseInt(draft, 10);
                        if (Number.isFinite(v) && v !== current) saveProgress(v);
                        else setDraft(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        if (e.key === "Escape") setDraft(null);
                      }}
                      className="h-8 w-16 rounded-none border-x-0 text-center tabular-nums"
                      min={0}
                      max={cap ?? undefined}
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="rounded-l-none"
                      onClick={() => saveProgress(current + 1)}
                      disabled={!nextIsOut}
                      aria-label={`One more ${isManga ? "chapter" : "episode"}`}
                    >
                      <Plus />
                    </Button>
                  </div>
                  {status === "WATCHING" && nextIsOut && (
                    <Button onClick={() => saveProgress(nextNum)}>
                      <Check />
                      {isManga ? `Read ch. ${nextNum}` : `Watched ${episodeLabel(nextNum, seasons)}`}
                    </Button>
                  )}
                  {hasEpisodeList && (
                    <EpisodeListDialog
                      mediaId={media.id}
                      mediaTitle={title}
                      currentEpisode={currentEp}
                      seasons={seasons}
                      onEpisodeUpdate={(ep) => {
                        setCurrentEp(ep);
                        router.refresh();
                      }}
                    />
                  )}
                </div>
                {nextAiring?.airDate && section !== CAUGHT_UP && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Next new episode: {seasonEpLabel(nextAiring.seasonNumber, nextAiring.episodeNumber)}
                    {nextAiring.name ? ` “${nextAiring.name}”` : ""}, airs {relativeDay(nextAiring.airDate)}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your list</CardTitle>
            <CardDescription>Status, rating and private notes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" id="status-label">
                Status
              </label>
              <Select
                value={status}
                onValueChange={handleStatusChange}
                items={STATUS_LABELS}
              >
                <SelectTrigger className="w-full sm:w-64" aria-labelledby="status-label">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_ORDER.map((key) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex flex-col">
                        <span>{STATUS_LABELS[key]}</span>
                        <span className="text-xs text-muted-foreground">
                          {STATUS_DESCRIPTIONS[key]}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {status === "WATCHING" && section !== "WATCHING" && (
                <p className="text-xs text-muted-foreground">
                  Shown under “{section === CAUGHT_UP ? "Up to date" : "Finished"}” on your
                  library because of your progress.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium" id="rating-label">
                  Rating
                </span>
                <span className="text-xs text-muted-foreground">
                  {rating ? `${rating} / 10` : "Not rated"}
                </span>
              </div>
              <div
                role="radiogroup"
                aria-labelledby="rating-label"
                className="grid grid-cols-10 gap-1"
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={rating === r}
                    aria-label={`${r} out of 10`}
                    onClick={() => handleRatingChange(r)}
                    className={cn(
                      "h-8 rounded-md border text-xs font-medium tabular-nums transition-colors",
                      r <= rating
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground dark:bg-input/30"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <label htmlFor="notes" className="text-sm font-medium">
                  Notes
                </label>
                <span className="text-xs text-muted-foreground" aria-live="polite">
                  {notesState === "saving" ? "Saving…" : notesState === "saved" ? "Saved" : ""}
                </span>
              </div>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setNotesState("idle");
                }}
                onBlur={handleNotesBlur}
                placeholder="Anything you want to remember. Saves when you click away."
                className="min-h-[96px] w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {title}?</DialogTitle>
            <DialogDescription>
              This deletes it from your library along with your progress, rating and
              notes. You can add it again later, but those will be gone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
