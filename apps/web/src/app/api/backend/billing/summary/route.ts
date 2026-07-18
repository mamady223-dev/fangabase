import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const origin = process.env.FANGABASE_API_ORIGIN;
  if (!origin)
    return NextResponse.json(
      { error: { code: "NOT_CONFIGURED", message: "Service indisponible" } },
      { status: 503 },
    );
  try {
    const response = await fetch(`${origin}/api/billing/summary`, {
      headers: {
        cookie: request.headers.get("cookie") ?? "",
        accept: "application/json",
      },
      cache: "no-store",
    });
    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "UPSTREAM_UNAVAILABLE",
          message: "Service indisponible",
        },
      },
      { status: 503 },
    );
  }
}
