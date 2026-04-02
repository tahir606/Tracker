import { Progress } from "@/components/ui/progress";

interface ProgressDisplayProps {
  current: number;
  total: number | null;
  released?: number | null;
  label?: string;
}

export function ProgressDisplay({
  current,
  total,
  released,
  label,
}: ProgressDisplayProps) {
  // Use released episodes as the denominator for ongoing series, total for completed ones
  const effectiveTotal = released ?? total;
  const percentage = effectiveTotal
    ? Math.min((current / effectiveTotal) * 100, 100)
    : 0;

  let displayText: string;
  if (released && !total) {
    // Ongoing series: show current/released
    displayText = `${current}/${released}`;
  } else if (total) {
    displayText = `${current}/${total}`;
  } else {
    displayText = `${current}/?`;
  }

  return (
    <div className="space-y-1">
      {label && (
        <span className="text-xs text-muted-foreground">{label}</span>
      )}
      <div className="flex items-center gap-2">
        {effectiveTotal ? (
          <Progress value={percentage} className="h-2 flex-1" />
        ) : (
          <div className="h-2 flex-1 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary/50"
              style={{ width: `${Math.min(current * 0.1, 100)}%` }}
            />
          </div>
        )}
        <span className="text-xs font-medium tabular-nums whitespace-nowrap">
          {displayText}
        </span>
      </div>
    </div>
  );
}
