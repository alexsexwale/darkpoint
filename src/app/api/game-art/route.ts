import { NextResponse } from "next/server";
import { fetchGameArt, THEGAMESDB_PLATFORM_IDS } from "@/lib/gameArt";
import type { Platform } from "@/stores/romsStore";

const VALID_PLATFORMS = new Set<string>(Object.keys(THEGAMESDB_PLATFORM_IDS));

/** In-memory cache: key = `${title}|${platform}`, value = imageUrl or null */
const artCache = new Map<string, string | null>();
const MAX_CACHE_SIZE = 2000;

function getCacheKey(title: string, platform: string): string {
  return `${title.toLowerCase().trim()}|${platform}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title");
  const platform = searchParams.get("platform");

  if (!title?.trim()) {
    return NextResponse.json(
      { imageUrl: null, error: "Missing title" },
      { status: 400 }
    );
  }

  if (!platform || !VALID_PLATFORMS.has(platform)) {
    return NextResponse.json(
      { imageUrl: null, error: "Missing or invalid platform" },
      { status: 400 }
    );
  }

  const cacheKey = getCacheKey(title, platform);
  const cached = artCache.get(cacheKey);
  if (cached !== undefined) {
    return NextResponse.json({ imageUrl: cached });
  }

  const apiKey = process.env.GAME_ART_API_KEY ?? "";
  const result = await fetchGameArt({
    title: title.trim(),
    platform: platform as Platform,
    apiKey,
  });

  if (artCache.size >= MAX_CACHE_SIZE) {
    const firstKey = artCache.keys().next().value;
    if (firstKey) artCache.delete(firstKey);
  }
  artCache.set(cacheKey, result.imageUrl);

  return NextResponse.json({ imageUrl: result.imageUrl });
}
