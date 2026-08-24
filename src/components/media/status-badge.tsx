import { Badge } from "@/components/ui/badge";
import { CAUGHT_UP, SECTION_LABELS } from "@/lib/constants";

const VARIANT_MAP: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  WATCHING: "default",
  [CAUGHT_UP]: "secondary",
  COMPLETED: "secondary",
  DROPPED: "destructive",
  PAUSED: "outline",
  PLAN_TO_WATCH: "outline",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant={VARIANT_MAP[status] || "outline"} className={`text-xs ${className ?? ""}`}>
      {SECTION_LABELS[status] || status}
    </Badge>
  );
}
