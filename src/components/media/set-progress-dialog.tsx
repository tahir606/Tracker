"use client";

import { useState } from "react";
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

/** Lets the user type an exact episode/chapter count instead of stepping one at a time. */
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
            <DialogTitle>Set progress</DialogTitle>
            <DialogDescription>
              How many {unit} of <span className="font-medium text-foreground">{title}</span>{" "}
              have you {verb}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label htmlFor="progress-value" className="text-sm font-medium">
              {unit === "episodes" ? "Episodes watched" : "Chapters read"}
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="progress-value"
                type="number"
                inputMode="numeric"
                min={0}
                max={max ?? undefined}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-24 text-center"
                autoFocus
              />
              {max !== null && (
                <span className="text-sm text-muted-foreground">of {max}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground min-h-4">
              {!valid
                ? max !== null
                  ? `Enter a number from 0 to ${max}.`
                  : "Enter 0 or more."
                : unit === "episodes" && parsed > 0 && seasons?.length
                ? `Last watched: ${episodeLabel(parsed, seasons)}`
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
