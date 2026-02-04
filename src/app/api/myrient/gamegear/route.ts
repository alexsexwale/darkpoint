import { NextResponse } from "next/server";
import { parseMyrientRoms } from "@/lib/myrientParser";

const BASE_URL = "https://myrient.erista.me/files/RetroAchievements/RA%20-%20Sega%20Game%20Gear/";

export async function GET() {
  try {
    const response = await fetch(BASE_URL, { next: { revalidate: 3600 } });
    const html = await response.text();
    const { roms, regions } = parseMyrientRoms(html, BASE_URL, "gamegear", "Sega Game Gear");
    return NextResponse.json({ success: true, count: roms.length, regions, roms });
  } catch (error) {
    console.error("Error fetching Myrient Game Gear ROMs:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error", roms: [], regions: [] },
      { status: 500 }
    );
  }
}
