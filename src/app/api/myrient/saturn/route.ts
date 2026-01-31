import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch(
      "https://myrient.erista.me/files/Redump/Sega%20-%20Saturn/",
      { next: { revalidate: 3600 } }
    );
    const html = await response.text();

    const roms: {
      id: string;
      title: string;
      fileName: string;
      size: string;
      sizeBytes: number;
      region: string;
      downloadUrl: string;
      imageUrl: string[];
      console: string;
      platform: string;
    }[] = [];

    const tableRowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/g;
    const linkRegex = /<a[^>]*href="([^"]*\.zip)"[^>]*title="([^"]*)"[^>]*>([^<]*)<\/a>/g;
    const sizeRegex = />(\d+\.?\d*)\s*([KMGT]iB)<\/td>/g;

    const rows = html.match(tableRowRegex) || [];

    for (const row of rows) {
      const linkMatch = linkRegex.exec(row);
      linkRegex.lastIndex = 0;

      if (linkMatch) {
        const hrefPath = linkMatch[1];
        const fileName = linkMatch[3].trim();

        const sizeMatch = sizeRegex.exec(row);
        sizeRegex.lastIndex = 0;
        
        let fileSize = "Unknown";
        let sizeBytes = 0;
        if (sizeMatch) {
          const sizeNum = parseFloat(sizeMatch[1]);
          const sizeUnit = sizeMatch[2];
          fileSize = `${sizeNum} ${sizeUnit}`;
          
          const multipliers: Record<string, number> = {
            "KiB": 1024,
            "MiB": 1024 * 1024,
            "GiB": 1024 * 1024 * 1024,
            "TiB": 1024 * 1024 * 1024 * 1024,
          };
          sizeBytes = Math.round(sizeNum * (multipliers[sizeUnit] || 1));
        }

        if (fileName.includes("..") || !fileName.endsWith(".zip")) {
          continue;
        }

        let cleanName = fileName.replace(".zip", "");
        cleanName = cleanName.replace(/\s*\([^)]*\)\s*/g, " ").trim();
        cleanName = cleanName.replace(/\s+/g, " ");

        let region = "Unknown";
        if (fileName.includes("(Japan)")) region = "Japan";
        else if (fileName.includes("(USA)")) region = "USA";
        else if (fileName.includes("(Europe)")) region = "Europe";
        else if (fileName.includes("(World)")) region = "World";
        else if (fileName.includes("(Korea)")) region = "Korea";
        else if (fileName.includes("(Germany)")) region = "Germany";
        else if (fileName.includes("(France)")) region = "France";
        else if (fileName.includes("(Spain)")) region = "Spain";
        else if (fileName.includes("(Italy)")) region = "Italy";
        else if (fileName.includes("(Brazil)")) region = "Brazil";
        else if (fileName.includes("(Australia)")) region = "Australia";

        const id = fileName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 32);
        const base = "https://myrient.erista.me/files/Redump/Sega%20-%20Saturn/";
        const fullUrl = new URL(hrefPath, base).toString();

        roms.push({
          id,
          title: cleanName,
          fileName,
          size: fileSize,
          sizeBytes,
          region,
          downloadUrl: fullUrl,
          imageUrl: ["/images/placeholder-game.png"],
          console: "Sega Saturn",
          platform: "saturn",
        });
      }
    }

    roms.sort((a, b) => a.title.localeCompare(b.title));

    const regions = [...new Set(roms.map(r => r.region))].sort();

    return NextResponse.json({
      success: true,
      count: roms.length,
      regions,
      roms,
    });
  } catch (error) {
    console.error("Error fetching Myrient Saturn ROMs:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        roms: [],
        regions: [],
      },
      { status: 500 }
    );
  }
}
