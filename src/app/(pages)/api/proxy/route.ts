import { validateUrl } from "@/common/utils";
import ky from "ky";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (url == null) {
    return NextResponse.json({ error: "Missing URL. ?url=" }, { status: 400 });
  }

  if (!validateUrl(url)) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const response = await ky.get(url, {
      next: {
        revalidate: 30, // 30 seconds
      },
    });
    const { status, headers } = response;
    if (
      !headers.has("content-type") ||
      (headers.has("content-type") &&
        !headers.get("content-type")?.includes("application/json"))
    ) {
      return NextResponse.json({
        error: "We only support proxying JSON responses",
      });
    }

    const body = await response.json();
    return NextResponse.json(body, {
      status: status,
    });
  } catch (err) {
    console.error(`Error fetching data from ${url}:`, err);
    return NextResponse.json(
      { error: "Failed to proxy this request." },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
}
