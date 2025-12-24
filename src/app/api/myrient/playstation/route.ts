import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Fetch the Myrient PlayStation directory
    const response = await fetch(
      "https://myrient.erista.me/files/Redump/Sony%20-%20PlayStation/",
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );
    const html = await response.text();

    // Parse the HTML to extract ROM information
    const roms: {
      id: string;
      title: string;
      fileName: string;
      size: string;
      region: string;
      downloadUrl: string;
      imageUrl: string[];
      console: string;
      platform: string;
    }[] = [];

    // Use regex to extract table rows with ZIP files
    const tableRowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/g;
    const linkRegex = /<a[^>]*href="([^"]*\.zip)"[^>]*title="([^"]*)"[^>]*>([^<]*)<\/a>/g;
    const sizeRegex = />(\d+\.?\d*\s*[KMGT]iB)<\/td>/g;

    const rows = html.match(tableRowRegex) || [];

    for (const row of rows) {
      const linkMatch = linkRegex.exec(row);
      linkRegex.lastIndex = 0; // Reset regex

      if (linkMatch) {
        const hrefPath = linkMatch[1]; // URL-encoded relative path to the file
        const fileName = linkMatch[3].trim();

        // Extract file size
        const sizeMatch = sizeRegex.exec(row);
        sizeRegex.lastIndex = 0; // Reset regex
        const fileSize = sizeMatch ? sizeMatch[1] : "Unknown";

        // Skip parent directory and non-game files
        if (fileName.includes("..") || !fileName.endsWith(".zip")) {
          continue;
        }

        // Clean up the name for display
        let cleanName = fileName.replace(".zip", "");
        // Remove common regional tags for cleaner display
        cleanName = cleanName.replace(/\s*\([^)]*\)\s*/g, " ").trim();
        cleanName = cleanName.replace(/\s+/g, " "); // Clean multiple spaces

        // Determine region
        let region = "Unknown";
        if (fileName.includes("(Japan)")) region = "Japan";
        else if (fileName.includes("(USA)")) region = "USA";
        else if (fileName.includes("(Europe)")) region = "Europe";
        else if (fileName.includes("(World)")) region = "World";

        // Generate a simple ID
        const id = fileName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
          .slice(0, 32);

        const base = "https://myrient.erista.me/files/Redump/Sony%20-%20PlayStation/";
        const fullUrl = new URL(hrefPath, base).toString();

        roms.push({
          id,
          title: cleanName,
          fileName: fileName,
          size: fileSize,
          region: region,
          downloadUrl: fullUrl,
          imageUrl: ["/images/placeholder-game.png"],
          console: "PlayStation 1",
          platform: "psx",
        });
      }
    }

    // Sort roms alphabetically by title
    roms.sort((a, b) => a.title.localeCompare(b.title));

    return NextResponse.json({
      success: true,
      count: roms.length,
      roms: roms,
    });
  } catch (error) {
    console.error("Error fetching Myrient PlayStation ROMs:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        roms: [],
      },
      { status: 500 }
    );
  }
}

