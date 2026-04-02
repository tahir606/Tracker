"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tv, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Tv className="h-5 w-5" />
          Media Tracker
        </Link>
        <nav className="ml-8 flex gap-4">
          <Link
            href="/"
            className={cn(
              "text-sm transition-colors hover:text-foreground",
              pathname === "/"
                ? "text-foreground font-medium"
                : "text-muted-foreground"
            )}
          >
            Dashboard
          </Link>
          <Link
            href="/search"
            className={cn(
              "flex items-center gap-1 text-sm transition-colors hover:text-foreground",
              pathname === "/search"
                ? "text-foreground font-medium"
                : "text-muted-foreground"
            )}
          >
            <Search className="h-3.5 w-3.5" />
            Search
          </Link>
        </nav>
      </div>
    </header>
  );
}
