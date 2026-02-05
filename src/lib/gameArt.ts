/**
 * Game cover art via TheGamesDB API.
 * Maps our platform IDs to TheGamesDB numeric platform IDs.
 * @see https://api.thegamesdb.net/
 */

import type { Platform } from "@/stores/romsStore";

/** Our platform id -> TheGamesDB platform id (numeric) */
export const THEGAMESDB_PLATFORM_IDS: Partial<Record<Platform, number>> = {
  // Sony
  psx: 10,   // Sony Playstation
  ps2: 11,   // Sony Playstation 2
  ps3: 12,   // Sony Playstation 3
  psp: 13,   // Sony Playstation Portable
  // Nintendo
  nes: 7,    // Nintendo Entertainment System
  snes: 8,   // Super Nintendo
  n64: 9,    // Nintendo 64
  gb: 20,    // Nintendo Game Boy
  gba: 21,   // Nintendo Game Boy Advance
  nds: 22,   // Nintendo DS
  gamecube: 23, // Nintendo GameCube
  // Sega
  mastersystem: 28, // Sega Master System
  genesis: 18,     // Sega Genesis / Mega Drive
  megacd: 27,      // Sega CD
  gamegear: 29,    // Sega Game Gear
  saturn: 26,      // Sega Saturn
  dreamcast: 25,   // Sega Dreamcast
  // Atari
  atari2600: 30,
  atari7800: 31,
  atarijaguar: 32,
  atarilynx: 33,
  // Microsoft
  xbox: 14,   // Microsoft Xbox
  xbox360: 15, // Microsoft Xbox 360
  // Commodore (Amiga) - less common in TGDB, include if available
  amigacd: 44,
  amigacd32: 45,
  amigacdtv: 46,
};

const TGDB_BASE = "https://api.thegamesdb.net/v1";
const TGDB_CDN = "https://cdn.thegamesdb.net/images";

export interface FetchGameArtOptions {
  title: string;
  platform: Platform;
  apiKey: string;
}

export interface FetchGameArtResult {
  imageUrl: string | null;
}

/**
 * Fetch box art URL for a game from TheGamesDB.
 * Returns CDN URL for front boxart or null if not found / no key / unmapped platform.
 */
export async function fetchGameArt(options: FetchGameArtOptions): Promise<FetchGameArtResult> {
  const { title, platform, apiKey } = options;
  if (!apiKey?.trim()) {
    return { imageUrl: null };
  }

  const platformId = THEGAMESDB_PLATFORM_IDS[platform];
  if (platformId === undefined) {
    return { imageUrl: null };
  }

  const name = title.trim();
  if (!name) return { imageUrl: null };

  try {
    const searchUrl = new URL(`${TGDB_BASE}/Games/ByGameName`);
    searchUrl.searchParams.set("apikey", apiKey);
    searchUrl.searchParams.set("name", name);
    searchUrl.searchParams.set("platform_id", String(platformId));

    const res = await fetch(searchUrl.toString(), { next: { revalidate: 86400 } });
    if (!res.ok) return { imageUrl: null };

    const data = (await res.json()) as {
      code?: number;
      data?: { count?: number; games?: Array<{ id?: number; game_id?: number }> };
    };

    const games = data?.data?.games;
    if (!Array.isArray(games) || games.length === 0) return { imageUrl: null };

    const first = games[0];
    const gameId = first?.id ?? first?.game_id;
    if (gameId == null) return { imageUrl: null };

    // TGDB CDN pattern: thumb/boxart/front/{id}-1.jpg (or .png)
    const imageUrl = `${TGDB_CDN}/thumb/boxart/front/${gameId}-1.jpg`;
    return { imageUrl };
  } catch {
    return { imageUrl: null };
  }
}
