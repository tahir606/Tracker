"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export function CollapsibleSection({
  title,
  count,
  icon,
  children,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <section className="space-y-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 w-full text-left group"
      >
        {icon}
        <span className="text-lg font-semibold">{title}</span>
        <span className="text-sm font-normal text-muted-foreground">({count})</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto group-hover:text-foreground transition-colors" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto group-hover:text-foreground transition-colors" />
        )}
      </button>
      {open && children}
    </section>
  );
}
