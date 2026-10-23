"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Check,
  ExternalLink,
  ListOrdered,
  MoreHorizontal,
  Pencil,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProgressDisplay } from "./progress-display";
import { EpisodeListDialog } from "./episode-list-dialog";
import { SetProgressDialog } from "./set-progress-dialog";
import { EpisodePickerDialog } from "./episode-picker-dialog";
import { CAUGHT_UP, MEDIA_TYPE_LABELS, STATUS_LABELS, STATUS_ORDER } from "@/lib/constants";
import { episodeLabel, relativeDay, seasonEpLabel } from "@/lib/episodes";
import { getLibrarySection } from "@/lib/library-section";
import { updateTracking } from "@/lib/tracking-client";
import type { NextEpisodeInfo, TrackedMedia } from "@/types";

export function MediaCard({
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
  const [busy, setBusy] = useState(false);
  const [episodesOpen, setEpisodesOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);

  const status = tracking?.status ?? "WATCHING";
  const isManga = media.mediaType === "MANGA";
  const isMovie = media.mediaType === "MOVIE";
  const hasEpisodeList = media.mediaType === "TV" || media.mediaType === "ANIME";
  const seasons = nextEpisode?.seasons;
  const title = media.titleEnglish || media.title;
  const href = `/media/${media.id}`;

  const section =
    getLibrarySection(media, {
      currentEpisode: currentEp,
      currentChapter: currentCh,
      hasUpcomingEpisode: Boolean(nextEpisode?.nextAiring),
      airedEpisodes: nextEpisode?.airedEpisodes,
      runStatus: nextEpisode?.runStatus,
    }) ?? status;

  const current = isManga ? currentCh : currentEp;
  // Same "how much is out" figure library-section uses, so the button and the
  // section never disagree about whether there's something left to watch.
  const available = isManga
    ? media.totalChapters
    : nextEpisode?.airedEpisodes || media.releasedEpisodes || media.totalEpisodes;
  const next = current + 1;
  const nextIsOut = !available || next <= available;
  const nextLabel = isManga ? `ch. ${next}` : episodeLabel(next, seasons);
  const unit = isManga ? "chapters" : "episodes";

  async function setProgress(value: number, { undoable = false } = {}) {
    const previous = current;
    const field = isManga ? "currentChapter" : "currentEpisode";
    const setLocal = isManga ? setCurrentCh : setCurrentEp;
    setLocal(value);
    const ok = await updateTracking(media.id, { [field]: value });
    if (!ok) {
      setLocal(previous);
      return;
    }
    router.refresh();
    if (undoable) {
      const what = isManga
        ? `Chapter ${value}`
        : seasons?.length
        ? episodeLabel(value, seasons)
        : `Episode ${value}`;
      const message =
        value === 0
          ? `${title}: progress cleared`
          : value === previous + 1
          ? `${what} of ${title} marked as ${isManga ? "read" : "watched"}`
          : `${title}: up to ${what}`;
      toast.success(message, {
        action: {
          label: "Undo",
          onClick: async () => {
            setLocal(previous);
            if (await updateTracking(media.id, { [field]: previous })) router.refresh();
          },
        },
      });
    }
  }

  async function setStatus(newStatus: string, extra: Record<string, number> = {}) {
    setBusy(true);
    const saved = await updateTracking(media.id, { status: newStatus, ...extra });
    setBusy(false);
    if (!saved) return;
    // Marking Finished fills progress server-side; show what was saved.
    if (saved.tracking) {
      setCurrentEp(saved.tracking.currentEpisode);
      setCurrentCh(saved.tracking.currentChapter);
    }
    toast.success(`${title} moved to ${STATUS_LABELS[newStatus]}`);
    router.refresh();
  }

  async function markNext() {
    setBusy(true);
    await setProgress(next, { undoable: true });
    setBusy(false);
  }

  // One obvious next step per card, depending on where it sits.
  let primary: { label: string; icon: React.ReactNode; onClick: () => void; variant: "default" | "outline" } | null = null;
  if (isMovie) {
    if (status !== "COMPLETED" && status !== "DROPPED") {
      primary = {
        label: "Mark watched",
        icon: <Check />,
        onClick: () => setStatus("COMPLETED", { currentEpisode: 1 }),
        variant: status === "WATCHING" ? "default" : "outline",
      };
    }
  } else if (status === "PLAN_TO_WATCH") {
    primary = { label: isManga ? "Start reading" : "Start watching", icon: <Play />, onClick: () => setStatus("WATCHING"), variant: "outline" };
  } else if (status === "PAUSED") {
    primary = { label: "Resume", icon: <Play />, onClick: () => setStatus("WATCHING"), variant: "outline" };
  } else if (status === "WATCHING" && nextIsOut) {
    primary = {
      label: isManga ? `Read ${nextLabel}` : `Watched ${nextLabel}`,
      icon: <Check />,
      onClick: markNext,
      variant: "default",
    };
  }

  const nextAiring = nextEpisode?.nextAiring ?? null;
  const showProgress = !isMovie && status !== "PLAN_TO_WATCH";

  let note: React.ReactNode = null;
  if (nextAiring && status !== "COMPLETED" && status !== "DROPPED") {
    note = (
      <span>
        {seasonEpLabel(nextAiring.seasonNumber, nextAiring.episodeNumber)} airs{" "}
        {nextAiring.airDate ? relativeDay(nextAiring.airDate) : "soon"}
      </span>
    );
  } else if (section === CAUGHT_UP) {
    note = "Waiting for new episodes";
  }

  return (
    <Card className="gap-0 p-0 transition-shadow hover:shadow-md">
      <div className="flex gap-3 p-3">
        <Link href={href} className="shrink-0" tabIndex={-1} aria-hidden>
          {media.coverImage ? (
            <Image
              src={media.coverImage}
              alt=""
              width={72}
              height={108}
              className="rounded-md object-cover"
              style={{ width: 72, height: 108 }}
            />
          ) : (
            <div className="flex h-[108px] w-[72px] items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
              No image
            </div>
          )}
        </Link>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-start gap-1">
            <div className="min-w-0 flex-1">
              <Link
                href={href}
                className="line-clamp-2 text-sm font-medium leading-tight hover:underline"
              >
                {title}
              </Link>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {MEDIA_TYPE_LABELS[media.mediaType]}
                {media.releaseYear ? ` · ${media.releaseYear}` : ""}
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="-mr-1 -mt-1 shrink-0 text-muted-foreground"
                    aria-label={`More actions for ${title}`}
                  />
                }
              >
                <MoreHorizontal />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => router.push(href)}>
                  <ExternalLink /> Open details
                </DropdownMenuItem>
                {hasEpisodeList && (
                  <DropdownMenuItem onClick={() => setEpisodesOpen(true)}>
                    <ListOrdered /> Browse episodes
                  </DropdownMenuItem>
                )}
                {!isMovie && (
                  <DropdownMenuItem onClick={() => setProgressOpen(true)}>
                    <Pencil /> Where I&apos;m up to…
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Status</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={status}
                    onValueChange={(v) => {
                      if (v !== status) setStatus(v as string);
                    }}
                  >
                    {STATUS_ORDER.map((s) => (
                      <DropdownMenuRadioItem key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {showProgress && (
            <ProgressDisplay
              current={current}
              total={isManga ? media.totalChapters : media.totalEpisodes}
              released={isManga ? null : nextEpisode?.airedEpisodes || media.releasedEpisodes}
              unit={unit}
            />
          )}

          {(primary || note) && (
            <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {primary && (
                <Button
                  size="sm"
                  variant={primary.variant}
                  onClick={primary.onClick}
                  disabled={busy}
                >
                  {primary.icon}
                  {primary.label}
                </Button>
              )}
              {note && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                  {note}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {hasEpisodeList && (
        <EpisodeListDialog
          mediaId={media.id}
          mediaTitle={title}
          currentEpisode={currentEp}
          seasons={seasons}
          open={episodesOpen}
          onOpenChange={setEpisodesOpen}
          onEpisodeUpdate={(ep) => {
            setCurrentEp(ep);
            router.refresh();
          }}
        />
      )}
      {hasEpisodeList && (
        <EpisodePickerDialog
          mediaId={media.id}
          mediaTitle={title}
          currentEpisode={currentEp}
          seasons={seasons}
          open={progressOpen}
          onOpenChange={setProgressOpen}
          onPick={(ep) => setProgress(ep, { undoable: true })}
        />
      )}
      {isManga && (
        <SetProgressDialog
          open={progressOpen}
          onOpenChange={setProgressOpen}
          title={title}
          unit={unit}
          current={current}
          max={available ?? null}
          seasons={seasons}
          onSave={(v) => setProgress(v, { undoable: true })}
        />
      )}
    </Card>
  );
}
