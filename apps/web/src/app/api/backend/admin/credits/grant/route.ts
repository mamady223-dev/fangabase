import { NextRequest, NextResponse } from "next/server";
export async function POST(request: NextRequest) {
  const origin = process.env.FANGABASE_API_ORIGIN;
  if (!origin)
    return NextResponse.json(
      { error: { code: "NOT_CONFIGURED" } },
      { status: 503 },
    );
  try {
    const response = await fetch(origin + "/api/admin/billing/credits/grant", {
      method: "POST",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
        "content-type": "application/json",
        "x-csrf-token": request.headers.get("x-csrf-token") ?? "",
        "idempotency-key": request.headers.get("idempotency-key") ?? "",
      },
      body: await request.text(),
      cache: "no-store",
    });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "UPSTREAM_UNAVAILABLE" } },
      { status: 503 },
    );
  }
}
