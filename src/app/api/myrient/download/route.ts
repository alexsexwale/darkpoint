import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");
    const filename = searchParams.get("filename");

    if (!url) {
      return NextResponse.json(
        { error: "Missing url parameter" },
        { status: 400 }
      );
    }

    const target = decodeURIComponent(url);
    const upstream = await fetch(target, { redirect: "follow" });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: `Upstream error ${upstream.status}` },
        { status: upstream.status || 502 }
      );
    }

    const derivedName =
      filename ||
      decodeURIComponent(new URL(target).pathname.split("/").pop() || "download.zip");

    // Create response with the streamed body
    const headers = new Headers();
    headers.set("Content-Type", "application/octet-stream");
    headers.set("Content-Disposition", `attachment; filename="${derivedName}"`);

    const contentLength = upstream.headers.get("content-length");
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Download failed" },
      { status: 500 }
    );
  }
}

