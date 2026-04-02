import { NextRequest, NextResponse } from "next/server";
import { searchAniList } from "@/lib/anilist";
import { searchTMDB } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q");
  const type = searchParams.get("type") as
    | "ANIME"
    | "MANGA"
    | "TV"
    | "MOVIE"
    | null;

  if (!query || !type) {
    return NextResponse.json(
      { error: "Missing q or type parameter" },
      { status: 400 }
    );
  }

  try {
    if (type === "ANIME" || type === "MANGA") {
      const results = await searchAniList(query, type);
      return NextResponse.json(results);
    }

    if (type === "TV" || type === "MOVIE") {
      const results = await searchTMDB(query, type);
      return NextResponse.json(results);
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to search" },
      { status: 500 }
    );
  }
}
