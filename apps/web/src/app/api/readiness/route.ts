export const runtime = "nodejs";
export function GET() {
  const missing = ["DATABASE_URL", "SESSION_SECRET"].filter(
    (name) => !process.env[name],
  );
  if (missing.length > 0)
    return Response.json(
      {
        error: {
          code: "NOT_READY",
          message: "D?pendances obligatoires indisponibles",
          missing,
        },
      },
      { status: 503 },
    );
  return Response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    optional: {
      redis: Boolean(process.env.REDIS_URL),
      sentry: Boolean(process.env.SENTRY_DSN),
    },
  });
}
