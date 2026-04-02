-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('ANIME', 'MANGA', 'TV', 'MOVIE');

-- CreateEnum
CREATE TYPE "TrackingStatus" AS ENUM ('WATCHING', 'COMPLETED', 'DROPPED', 'PAUSED', 'PLAN_TO_WATCH');

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "title" TEXT NOT NULL,
    "titleEnglish" TEXT,
    "description" TEXT,
    "coverImage" TEXT,
    "totalEpisodes" INTEGER,
    "totalChapters" INTEGER,
    "releaseYear" INTEGER,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tracking" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "status" "TrackingStatus" NOT NULL DEFAULT 'WATCHING',
    "currentEpisode" INTEGER NOT NULL DEFAULT 0,
    "currentChapter" INTEGER NOT NULL DEFAULT 0,
    "rating" INTEGER,
    "notes" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tracking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Media_externalId_source_key" ON "Media"("externalId", "source");

-- CreateIndex
CREATE UNIQUE INDEX "Tracking_mediaId_key" ON "Tracking"("mediaId");

-- AddForeignKey
ALTER TABLE "Tracking" ADD CONSTRAINT "Tracking_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
