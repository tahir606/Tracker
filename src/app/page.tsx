import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "@/components/media/dashboard-client";
import { UpcomingEpisodes } from "@/components/media/upcoming-episodes";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

function UpcomingSkeleton() {
  return (
    <section className="space-y-3">
      <Skeleton className="h-6 w-48" />
      <div className="rounded-lg border divide-y overflow-hidden">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-10 w-7 rounded shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function DashboardPage() {
  const media = await prisma.media.findMany({
    include: { tracking: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <Suspense fallback={<UpcomingSkeleton />}>
        <UpcomingEpisodes />
      </Suspense>
      <DashboardClient initialMedia={JSON.parse(JSON.stringify(media))} />
    </div>
  );
}
