"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MEDIA_TYPE_LABELS, STATUS_LABELS } from "@/lib/constants";
import { toast } from "sonner";
import type { SearchResult } from "@/types";

export function SearchResultCard({ result }: { result: SearchResult }) {
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("WATCHING");

  async function handleAdd() {
    setLoading(true);
    try {
      const res = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...result,
          trackingStatus: selectedStatus,
        }),
      });

      if (!res.ok) throw new Error("Failed");

      setAdded(true);
      setOpen(false);
      toast.success(`Added "${result.titleEnglish || result.title}" to your library`);
    } catch {
      toast.error("Failed to add");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex gap-3 p-3">
        {result.coverImage ? (
          <Image
            src={result.coverImage}
            alt={result.title}
            width={80}
            height={120}
            className="rounded-md object-cover shrink-0"
            style={{ width: 80, height: 120 }}
          />
        ) : (
          <div className="flex h-[120px] w-[80px] shrink-0 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
            No Image
          </div>
        )}

        <CardContent className="flex flex-1 flex-col gap-1.5 p-0">
          <div>
            <p className="font-medium text-sm leading-tight line-clamp-2">
              {result.titleEnglish || result.title}
            </p>
            {result.titleEnglish && result.titleEnglish !== result.title && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {result.title}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {MEDIA_TYPE_LABELS[result.mediaType]}
              {result.releaseYear ? ` · ${result.releaseYear}` : ""}
              {result.totalEpisodes ? ` · ${result.totalEpisodes} eps` : ""}
              {result.totalChapters ? ` · ${result.totalChapters} ch` : ""}
            </p>
          </div>

          {result.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {result.description}
            </p>
          )}

          <div className="mt-auto">
            {added ? (
              <Button size="sm" variant="ghost" disabled className="h-7 text-xs">
                <Check className="h-3 w-3 mr-1" /> Added
              </Button>
            ) : (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger
                  render={<Button size="sm" variant="outline" className="h-7 text-xs" />}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add to List
                </DialogTrigger>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="text-base">
                      Add &quot;{result.titleEnglish || result.title}&quot;
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="text-sm font-medium">Status</label>
                      <Select
                        value={selectedStatus}
                        onValueChange={(val) => { if (val) setSelectedStatus(val); }}
                      >
                        <SelectTrigger className="mt-1">
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
                    <Button
                      onClick={handleAdd}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? "Adding..." : "Add to Library"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
