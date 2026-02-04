/**
 * Parse Myrient directory listing HTML into ROM entries.
 * Used by both Redump and RetroAchievements API routes.
 */
export interface ParsedRom {
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
}

function extractRegion(fileName: string): string {
  if (fileName.includes("(Japan)")) return "Japan";
  if (fileName.includes("(USA)")) return "USA";
  if (fileName.includes("(Europe)")) return "Europe";
  if (fileName.includes("(World)")) return "World";
  if (fileName.includes("(Korea)")) return "Korea";
  if (fileName.includes("(Germany)")) return "Germany";
  if (fileName.includes("(France)")) return "France";
  if (fileName.includes("(Spain)")) return "Spain";
  if (fileName.includes("(Italy)")) return "Italy";
  if (fileName.includes("(Brazil)")) return "Brazil";
  if (fileName.includes("(Australia)")) return "Australia";
  if (fileName.includes("(Various)")) return "Various";
  if (fileName.includes("(Japan, USA)")) return "Japan, USA";
  if (fileName.includes("(Asia)")) return "Asia";
  return "Unknown";
}

export function parseMyrientRoms(
  html: string,
  baseUrl: string,
  platform: string,
  consoleName: string
): { roms: ParsedRom[]; regions: string[] } {
  const roms: ParsedRom[] = [];
  const tableRowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/g;
  // Match .zip links: with or without title attribute (Redump vs RetroAchievements)
  const linkRegex = /<a[^>]*href="([^"]*\.zip)"[^>]*(?:title="[^"]*"[^>]*)?>([^<]*)<\/a>/gi;
  const sizeRegex = />(\d+\.?\d*)\s*([KMGT]iB|B)<\/td>/g;

  const rows = html.match(tableRowRegex) || [];

  for (const row of rows) {
    const linkMatch = linkRegex.exec(row);
    linkRegex.lastIndex = 0;

    if (linkMatch) {
      const hrefPath = linkMatch[1];
      const fileName = linkMatch[2].trim();

      const sizeMatch = sizeRegex.exec(row);
      sizeRegex.lastIndex = 0;

      let fileSize = "Unknown";
      let sizeBytes = 0;
      if (sizeMatch) {
        const sizeNum = parseFloat(sizeMatch[1]);
        const sizeUnit = sizeMatch[2];
        fileSize = `${sizeNum} ${sizeUnit}`;
        const multipliers: Record<string, number> = {
          B: 1,
          KiB: 1024,
          MiB: 1024 * 1024,
          GiB: 1024 * 1024 * 1024,
          TiB: 1024 * 1024 * 1024 * 1024,
        };
        sizeBytes = Math.round(sizeNum * (multipliers[sizeUnit] || 1));
      }

      if (fileName.includes("..") || !fileName.toLowerCase().endsWith(".zip")) {
        continue;
      }

      let cleanName = fileName.replace(/\.zip$/i, "");
      cleanName = cleanName.replace(/\s*\([^)]*\)\s*/g, " ").trim();
      cleanName = cleanName.replace(/\s+/g, " ");

      const region = extractRegion(fileName);
      const id = fileName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 32);
      const fullUrl = new URL(hrefPath, baseUrl).toString();

      roms.push({
        id,
        title: cleanName,
        fileName,
        size: fileSize,
        sizeBytes,
        region,
        downloadUrl: fullUrl,
        imageUrl: ["/images/placeholder-game.png"],
        console: consoleName,
        platform,
      });
    }
  }

  roms.sort((a, b) => a.title.localeCompare(b.title));
  const regions = [...new Set(roms.map((r) => r.region))].sort();
  return { roms, regions };
}
