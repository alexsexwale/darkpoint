import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function isValidUrl(s: unknown): s is string {
  return (
    typeof s === "string" &&
    s.length > 0 &&
    (s.startsWith("http://") || s.startsWith("https://"))
  );
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      fileName,
      size,
      sizeBytes,
      region,
      downloadUrl,
      console: consoleName,
      platform,
      imageUrl,
    } = body;

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof fileName !== "string" ||
      !fileName.trim() ||
      typeof size !== "string" ||
      !size.trim() ||
      typeof region !== "string" ||
      !region.trim() ||
      !isValidUrl(downloadUrl) ||
      typeof consoleName !== "string" ||
      !consoleName.trim() ||
      typeof platform !== "string" ||
      !platform.trim()
    ) {
      return NextResponse.json(
        { error: "Missing or invalid required fields: title, fileName, size, region, downloadUrl, console, platform" },
        { status: 400 }
      );
    }

    const sizeBytesNum = typeof sizeBytes === "number" && sizeBytes >= 0 ? sizeBytes : 0;
    const imageUrlVal =
      typeof imageUrl === "string" && imageUrl.trim().length > 0 ? imageUrl.trim() : null;

    const row = {
      user_id: user.id,
      title: title.trim(),
      file_name: fileName.trim(),
      size: size.trim(),
      size_bytes: sizeBytesNum,
      region: region.trim(),
      download_url: downloadUrl.trim(),
      console: consoleName.trim(),
      platform: platform.trim(),
      image_url: imageUrlVal,
      last_downloaded_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("user_rom_downloads")
      .upsert(row, {
        onConflict: "user_id,download_url",
        ignoreDuplicates: false,
      })
      .select("id")
      .single();

    if (error) {
      console.error("user_rom_downloads upsert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      id: data?.id ?? undefined,
    });
  } catch (error) {
    console.error("Error recording ROM download:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
