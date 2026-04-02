import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { MediaDetailClient } from "@/components/media/media-detail-client";

export const dynamic = "force-dynamic";

export default async function MediaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const media = await prisma.media.findUnique({
    where: { id },
    include: { tracking: true },
  });

  if (!media) notFound();

  return <MediaDetailClient media={JSON.parse(JSON.stringify(media))} />;
}
