"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Library, Plus, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const onLibrary = pathname === "/" || pathname.startsWith("/media/");

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
        <Link href="/" className="mr-4 flex items-center gap-2 font-semibold">
          <Tv className="h-5 w-5" />
          <span className="hidden sm:inline">Media Tracker</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/"
            aria-current={onLibrary ? "page" : undefined}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-muted hover:text-foreground",
              onLibrary ? "font-medium text-foreground" : "text-muted-foreground"
            )}
          >
            <Library className="h-4 w-4" />
            Library
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <Button
            render={<Link href="/search" />}
            nativeButton={false}
            variant={pathname === "/search" ? "secondary" : "default"}
          >
            <Plus />
            Add title
          </Button>
        </div>
      </div>
    </header>
  );
}
