"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStoredBoolean } from "@/lib/use-stored-boolean";

const STORAGE_PREFIX = "section-open:";

/**
 * A titled section the user can fold away. The open/closed choice is
 * remembered per `id` in localStorage, falling back to `defaultOpen`.
 */
export function CollapsibleSection({
  id,
  title,
  count,
  hint,
  icon,
  defaultOpen = true,
  action,
  children,
}: {
  id: string;
  title: string;
  count?: number;
  hint?: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  /** Extra control shown at the right of the heading (only while open). */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useStoredBoolean(STORAGE_PREFIX + id, defaultOpen);
  const toggle = () => setOpen(!open);

  const contentId = `section-${id}`;

  return (
    <section className="space-y-3">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={contentId}
          className="group -mx-1.5 flex min-w-0 flex-1 items-start gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted/60"
        >
          <ChevronRight
            className={cn(
              "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:text-foreground",
              open && "rotate-90"
            )}
          />
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              {icon}
              <span className="text-lg font-semibold leading-snug">{title}</span>
              {count !== undefined && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                  {count}
                </span>
              )}
            </span>
            {hint && (
              <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
            )}
          </span>
        </button>
        {open && action && <div className="shrink-0 pt-1">{action}</div>}
      </div>
      <div id={contentId} hidden={!open}>
        {children}
      </div>
    </section>
  );
}
