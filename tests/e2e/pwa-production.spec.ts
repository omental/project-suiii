import { expect, test, type Page } from "@playwright/test";

const appOrigin = "http://127.0.0.1:3100";
const apiOrigin = "http://127.0.0.1:8100";

async function authenticate(page: Page) {
  await page.addInitScript(() => {
    const queue = JSON.stringify({ version: 4, deviceId: "device-local", deviceName: "This device", csrfToken: null, pending: [], failed: [], lastSyncAt: null, recentActivity: [] });
    if (!window.localStorage.getItem("project-suiii:phase-4-sync-queue")) window.localStorage.setItem("project-suiii:phase-4-sync-queue", queue);
    if (!window.localStorage.getItem("project-suiii:account-a:device-local:syncQueue:v4")) window.localStorage.setItem("project-suiii:account-a:device-local:syncQueue:v4", queue);
    if (!window.localStorage.getItem("project-suiii:offline-account-marker")) window.localStorage.setItem("project-suiii:offline-account-marker", JSON.stringify({ accountId: "account-a", deviceId: "device-local", enabled: true, authenticatedAt: new Date().toISOString() }));
  });
  await page.context().addCookies([{ name: "project-suiii-session", value: "test-session", domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" }]);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
}

async function resetApi(failPullOnce = false) {
  await fetch(`${apiOrigin}/api/v1/__test/reset${failPullOnce ? "?failPullOnce=1" : ""}`);
}

async function waitForServiceWorker(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  if (!(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))) {
    await page.reload();
    await page.evaluate(async () => navigator.serviceWorker.ready);
  }
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
  });
}

test.beforeEach(async ({ page }) => {
  await resetApi();
  await page.context().clearCookies();
});

test("service worker registers with root scope and manifest is inspectable", async ({ page }) => {
  await authenticate(page);
  await waitForServiceWorker(page);
  const registration = await page.evaluate(async () => {
    const item = await navigator.serviceWorker.ready;
    return { scope: item.scope, activeScript: item.active?.scriptURL };
  });
  expect(registration.scope).toBe(`${appOrigin}/`);
  expect(registration.activeScript).toBe(`${appOrigin}/sw.js`);
  const manifest = await page.evaluate(async () => fetch("/manifest.webmanifest").then((response) => response.json()));
  expect(manifest.name).toBe("Project SUIII");
  expect(manifest.scope).toBe("/");
});

test("static assets are cached but API responses and authenticated HTML are absent", async ({ page }) => {
  await authenticate(page);
  await waitForServiceWorker(page);
  await page.reload();
  await page.waitForLoadState("networkidle");
  const result = await page.evaluate(async () => {
    const names = await caches.keys();
    const entries = [];
    for (const name of names) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) entries.push(request.url);
    }
    const htmlBodies = [];
    for (const name of names) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) {
        const response = await cache.match(request);
        if (response?.headers.get("Content-Type")?.includes("text/html")) htmlBodies.push(await response.text());
      }
    }
    return { entries, htmlBodies };
  });
  expect(result.entries.some((url) => url.includes("/_next/static/"))).toBe(true);
  expect(result.entries.some((url) => url.includes("/api/v1/"))).toBe(false);
  expect(result.htmlBodies.join("\n")).not.toContain("Test Athlete");
});

test("offline shell loads from cache and does not contain cached dashboard HTML", async ({ page, context }) => {
  await authenticate(page);
  await waitForServiceWorker(page);
  await context.setOffline(true);
  await page.goto("/offline.html");
  await expect(page.getByText("You're offline")).toBeVisible();
  await expect(page.getByText(/Test Athlete/)).toHaveCount(0);
  await context.setOffline(false);
});

test("offline workout progress persists locally and cache clearing keeps local data", async ({ page, context }) => {
  await authenticate(page);
  await waitForServiceWorker(page);
  await page.goto("/train");
  await page.getByRole("button", { name: /start workout/i }).click();
  await expect(page.getByRole("button", { name: /complete set/i })).toBeVisible();
  await context.setOffline(true);
  await page.getByRole("button", { name: /complete set/i }).click();
  const before = await page.evaluate(() => window.localStorage.getItem("project-suiii:account-a:device-local:training:v3"));
  expect(before).toContain("setLogs");
  await context.setOffline(false);
  await page.goto("/settings/data");
  await page.getByRole("button", { name: /clear offline app cache/i }).click();
  const after = await page.evaluate(() => window.localStorage.getItem("project-suiii:account-a:device-local:training:v3"));
  expect(after).toBe(before);
});

test("reconnect sync runs push, pull, status once and pull failure preserves lastSyncAt", async ({ page, context }) => {
  await authenticate(page);
  await waitForServiceWorker(page);
  await page.evaluate(() => {
    window.localStorage.setItem("project-suiii:account-a:device-local:syncQueue:v4", JSON.stringify({
      version: 4,
      deviceId: "device-local",
      deviceName: "This device",
      csrfToken: null,
      pending: [{ client_mutation_id: "mut-1", device_id: "device-local", entity_type: "workout_session", entity_id: "session-1", mutation_type: "upsert", created_at: "2026-07-15T00:00:00.000Z", payload: { client_record_id: "session-1" } }],
      failed: [],
      lastSyncAt: null,
      recentActivity: []
    }));
  });
  await context.setOffline(true);
  await context.setOffline(false);
  await expect.poll(async () => fetch(`${apiOrigin}/api/v1/__test/state`).then((response) => response.json()).then((state) => state.pushCalls)).toBe(1);
  let state = await fetch(`${apiOrigin}/api/v1/__test/state`).then((response) => response.json());
  expect(state.pullCalls).toBe(1);
  expect(state.statusCalls).toBeGreaterThanOrEqual(1);

  await resetApi(true);
  await page.evaluate(() => {
    window.localStorage.setItem("project-suiii:account-a:device-local:syncQueue:v4", JSON.stringify({
      version: 4,
      deviceId: "device-local",
      deviceName: "This device",
      csrfToken: null,
      pending: [{ client_mutation_id: "mut-2", device_id: "device-local", entity_type: "workout_session", entity_id: "session-2", mutation_type: "upsert", created_at: "2026-07-15T00:00:00.000Z", payload: { client_record_id: "session-2" } }],
      failed: [],
      lastSyncAt: null,
      recentActivity: []
    }));
  });
  await context.setOffline(true);
  await context.setOffline(false);
  await expect.poll(async () => fetch(`${apiOrigin}/api/v1/__test/state`).then((response) => response.json()).then((next) => next.pullCalls)).toBe(1);
  const queue = await page.evaluate(() => JSON.parse(window.localStorage.getItem("project-suiii:account-a:device-local:syncQueue:v4") || "{}"));
  expect(queue.lastSyncAt).toBeNull();
});

test("logout and account switch do not reveal previous account local data", async ({ page, context }) => {
  await authenticate(page);
  await waitForServiceWorker(page);
  await page.evaluate(() => {
    window.localStorage.setItem("project-suiii:account-a:device-local:nutrition:v2", JSON.stringify({ version: 2, mealLogs: { "meal-a": { id: "meal-a", date: "2026-07-15" } }, weighingSessions: {} }));
  });
  await page.goto("/sync");
  await expect(page.getByText(/Sync & Data/i)).toBeVisible();
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByTestId("sync-sign-out").dispatchEvent("click");
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => JSON.parse(window.localStorage.getItem("project-suiii:offline-account-marker") || "{}").enabled)).toBe(false);
  await context.setOffline(true);
  await page.goBack().catch(() => undefined);
  await expect(page.getByText(/meal-a/i)).toHaveCount(0);
  await context.setOffline(false);
  await page.evaluate(() => {
    window.localStorage.setItem("project-suiii:offline-account-marker", JSON.stringify({ accountId: "account-b", deviceId: "device-local", enabled: true, authenticatedAt: new Date().toISOString() }));
  });
  const accountBMeal = await page.evaluate(() => window.localStorage.getItem("project-suiii:account-b:device-local:nutrition:v2"));
  expect(accountBMeal).toBeNull();
});
