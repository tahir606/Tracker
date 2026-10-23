import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ProgressDisplayProps {
  current: number;
  total: number | null;
  released?: number | null;
  /** Plural noun for the count, e.g. "episodes" or "chapters". */
  unit: string;
  className?: string;
}

export function ProgressDisplay({
  current,
  total,
  released,
  unit,
  className,
}: ProgressDisplayProps) {
  // Ongoing series count against what's out so far, not the announced total.
  const effectiveTotal = released || total;
  const percentage = effectiveTotal
    ? Math.min((current / effectiveTotal) * 100, 100)
    : 0;

  const text = effectiveTotal
    ? `${current} of ${effectiveTotal} ${unit}`
    : `${current} ${unit}`;
  const left = effectiveTotal ? Math.max(effectiveTotal - current, 0) : null;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium tabular-nums">{text}</span>
        {left !== null && left > 0 && (
          <span className="tabular-nums text-muted-foreground">{left} left</span>
        )}
      </div>
      {effectiveTotal ? (
        <Progress value={percentage} aria-label={text} />
      ) : null}
    </div>
  );
}
