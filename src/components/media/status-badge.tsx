import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/lib/constants";

const VARIANT_MAP: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  WATCHING: "default",
  COMPLETED: "secondary",
  DROPPED: "destructive",
  PAUSED: "outline",
  PLAN_TO_WATCH: "outline",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={VARIANT_MAP[status] || "outline"} className="text-xs">
      {STATUS_LABELS[status] || status}
    </Badge>
  );
}
