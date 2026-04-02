"use client";

import { useState } from "react";
import { Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface IncrementButtonProps {
  mediaId: string;
  field: "currentEpisode" | "currentChapter";
  current: number;
  total: number | null;
  onUpdate?: (newValue: number, completed: boolean) => void;
}

export function IncrementButton({
  mediaId,
  field,
  current,
  total,
  onUpdate,
}: IncrementButtonProps) {
  const [loading, setLoading] = useState(false);
  const isMaxed = total !== null && current >= total;

  async function handleIncrement() {
    if (isMaxed || loading) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/media/${mediaId}/increment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field }),
      });

      if (!res.ok) throw new Error("Failed");

      const data = await res.json();
      const newValue = data.tracking?.[field] ?? current + 1;
      const completed = data.tracking?.status === "COMPLETED";

      if (completed) {
        toast.success("Completed! Great job!");
      }

      onUpdate?.(newValue, completed);
    } catch {
      toast.error("Failed to update");
    } finally {
      setLoading(false);
    }
  }

  if (isMaxed) {
    return (
      <Button size="icon" variant="ghost" disabled className="h-8 w-8">
        <Check className="h-4 w-4 text-green-500" />
      </Button>
    );
  }

  return (
    <Button
      size="icon"
      variant="outline"
      className="h-8 w-8 shrink-0"
      onClick={handleIncrement}
      disabled={loading}
    >
      <Plus className="h-4 w-4" />
    </Button>
  );
}
