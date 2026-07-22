import { expect, test } from "@playwright/test";

test("exposes only the neutral technical status", async ({ page }) => {
  const responses: string[] = [];
  page.on("response", async (response) => {
    if (response.request().resourceType() === "document")
      responses.push(await response.text());
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "FangaBase" }),
  ).toBeVisible();
  await expect(page.getByText(/Socle headless/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Santé du frontend/ }),
  ).toBeVisible();
  await expect(
    page.locator(
      'a[href="/pricing"], a[href="/billing"], a[href="/dashboard"], a[href="/admin/billing"]',
    ),
  ).toHaveCount(0);
  expect(responses.join("\n")).not.toMatch(
    /APP_KEY|DATABASE_URL|STRIPE_SECRET|STITCH_API_KEY|BANANI_API_KEY/,
  );
});

test("returns redacted health and handles an absent backend", async ({
  page,
  request,
}) => {
  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();
  expect(await health.text()).not.toMatch(
    /APP_KEY|DATABASE_URL|SECRET|PASSWORD/,
  );
  await page.goto("/");
  await expect(
    page.getByText(/origine non configurée|unavailable/),
  ).toBeVisible();
});
