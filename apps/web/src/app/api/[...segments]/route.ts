import type { BackendRequest } from "@fangabase/backend-next";
import { NextRequest, NextResponse } from "next/server";
import { backendApplication as runtimeBackend } from "../../../server/backend.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ segments: string[] }> };

async function handle(
  request: NextRequest,
  context: Context,
): Promise<NextResponse> {
  const { segments } = await context.params;
  const rawBody =
    request.method === "GET" || request.method === "HEAD"
      ? ""
      : await request.text();
  let body: unknown;
  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      body = undefined;
    }
  }
  const headers = Object.fromEntries(
    [...request.headers.entries()].map(([name, value]) => [
      name.toLowerCase(),
      value,
    ]),
  );
  const backendRequest: BackendRequest = {
    method: request.method as BackendRequest["method"],
    path: `/${segments.join("/")}`,
    headers,
    cookies: Object.fromEntries(
      request.cookies.getAll().map((cookie) => [cookie.name, cookie.value]),
    ),
    query: Object.fromEntries(request.nextUrl.searchParams.entries()),
    body,
    rawBody,
  };
  const result = await runtimeBackend().handle(backendRequest);
  const response = NextResponse.json(result.body, {
    status: result.status,
    ...(result.headers ? { headers: result.headers } : {}),
  });
  applyCors(request, response);
  for (const cookie of result.cookies ?? [])
    response.cookies.set(cookie.name, cookie.value, {
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
      maxAge: cookie.maxAge,
      path: "/",
    });
  return response;
}

function allowedOrigin(request: NextRequest): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const configured = (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return configured.includes(origin) ? origin : null;
}

function applyCors(request: NextRequest, response: NextResponse): void {
  const origin = allowedOrigin(request);
  if (!origin) return;
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Vary", "Origin");
}

export function OPTIONS(request: NextRequest) {
  const origin = allowedOrigin(request);
  if (!origin)
    return NextResponse.json(
      { error: { code: "CORS_ORIGIN_FORBIDDEN", message: "Origine refusée" } },
      { status: 403 },
    );
  const response = new NextResponse(null, { status: 204 });
  applyCors(request, response);
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET,POST,PATCH,DELETE,OPTIONS",
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Accept,Content-Type,Origin,X-CSRF-Token,X-Request-ID,Idempotency-Key",
  );
  response.headers.set("Access-Control-Max-Age", "600");
  return response;
}

export function GET(request: NextRequest, context: Context) {
  return handle(request, context);
}

export function POST(request: NextRequest, context: Context) {
  return handle(request, context);
}

export function PATCH(request: NextRequest, context: Context) {
  return handle(request, context);
}

export function DELETE(request: NextRequest, context: Context) {
  return handle(request, context);
}
