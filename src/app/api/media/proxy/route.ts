import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Media Proxy Route
 * Proxies external video and image streams to enable CORS-safe Canvas manipulation.
 */
export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get("url");

  if (!urlParam) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const targetUrl = new URL(urlParam);

    // Security check: only allow http and https protocols
    if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
      return NextResponse.json({ error: "Invalid protocol" }, { status: 400 });
    }

    const rangeHeader = req.headers.get("range");
    const fetchHeaders: HeadersInit = {
      "User-Agent": "PersonaMotion-MediaProxy/1.0",
    };
    if (rangeHeader) {
      fetchHeaders["Range"] = rangeHeader;
    }

    const response = await fetch(targetUrl.toString(), {
      headers: fetchHeaders,
    });

    if (!response.ok && response.status !== 206) {
      return NextResponse.json(
        { error: `Proxy upstream returned status ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get("content-type") || "video/mp4";
    const contentLength = response.headers.get("content-length");
    const contentRange = response.headers.get("content-range");
    const acceptRanges = response.headers.get("accept-ranges");

    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", contentType);
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    responseHeaders.set("Access-Control-Allow-Headers", "*");
    responseHeaders.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=3600");

    if (contentLength) responseHeaders.set("Content-Length", contentLength);
    if (contentRange) responseHeaders.set("Content-Range", contentRange);
    if (acceptRanges) responseHeaders.set("Accept-Ranges", acceptRanges);

    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[Media Proxy Error]:", error);
    return NextResponse.json(
      { error: "Failed to proxy media", message: (error as Error).message },
      { status: 500 }
    );
  }
}
