"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { episodeLabel, type SeasonInfo } from "@/lib/episodes";

/**
 * "Where are you up to?" for things with no titles to pick from (manga
 * chapters): the last one you finished, with − and + to nudge it.
 */
export function SetProgressDialog({
  open,
  onOpenChange,
  title,
  unit,
  current,
  max,
  seasons,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  unit: "episodes" | "chapters";
  current: number;
  max: number | null;
  seasons?: SeasonInfo[];
  onSave: (value: number) => Promise<void> | void;
}) {
  const [value, setValue] = useState(String(current));
  const [saving, setSaving] = useState(false);

  const parsed = Number.parseInt(value, 10);
  const valid =
    Number.isFinite(parsed) && parsed >= 0 && (max === null || parsed <= max);
  const verb = unit === "episodes" ? "watched" : "read";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    await onSave(parsed);
    setSaving(false);
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setValue(String(current));
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={save} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Where are you up to?</DialogTitle>
            <DialogDescription>
              The last {unit === "episodes" ? "episode" : "chapter"} of{" "}
              <span className="font-medium text-foreground">{title}</span> you {verb}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label htmlFor="progress-value" className="text-sm font-medium">
              {unit === "episodes" ? "Last episode you watched" : "Last chapter you read"}
            </label>
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-r-none"
                  aria-label="One less"
                  disabled={!Number.isFinite(parsed) || parsed <= 0}
                  onClick={() => setValue(String(Math.max(0, (Number.isFinite(parsed) ? parsed : 0) - 1)))}
                >
                  <Minus />
                </Button>
                <Input
                  id="progress-value"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={max ?? undefined}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="h-9 w-20 rounded-none border-x-0 text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  autoFocus
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-l-none"
                  aria-label="One more"
                  disabled={max !== null && Number.isFinite(parsed) && parsed >= max}
                  onClick={() => setValue(String((Number.isFinite(parsed) ? parsed : 0) + 1))}
                >
                  <Plus />
                </Button>
              </div>
              {max !== null && (
                <span className="text-sm text-muted-foreground">of {max} out</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground min-h-4">
              {!valid
                ? max !== null
                  ? `Enter a number from 0 to ${max}.`
                  : "Enter 0 or more."
                : parsed === 0
                ? "0 means you haven't started."
                : unit === "episodes" && seasons?.length
                ? `That's ${episodeLabel(parsed, seasons)}.`
                : null}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid || saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
