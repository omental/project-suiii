import { expect, test, type Browser, type Page } from "@playwright/test";

const appOrigin = "http://127.0.0.1:3100";
const apiOrigin = "http://127.0.0.1:8100";

type MockMutation = {
  entity_type: string;
  entity_id: string;
};

async function authenticate(page: Page, options: { accountId?: string; deviceId?: string; session?: string } = {}) {
  const accountId = options.accountId ?? "account-a";
  const deviceId = options.deviceId ?? "device-local";
  await page.addInitScript(({ accountId: seededAccountId, deviceId: seededDeviceId }) => {
    const queue = JSON.stringify({ version: 4, deviceId: seededDeviceId, deviceName: "This device", csrfToken: null, pending: [], failed: [], lastSyncAt: null, recentActivity: [] });
    if (!window.localStorage.getItem("project-suiii:phase-4-sync-queue")) window.localStorage.setItem("project-suiii:phase-4-sync-queue", queue);
    if (!window.localStorage.getItem(`project-suiii:${seededAccountId}:${seededDeviceId}:syncQueue:v4`)) window.localStorage.setItem(`project-suiii:${seededAccountId}:${seededDeviceId}:syncQueue:v4`, queue);
    if (!window.localStorage.getItem("project-suiii:offline-account-marker")) window.localStorage.setItem("project-suiii:offline-account-marker", JSON.stringify({ accountId: seededAccountId, deviceId: seededDeviceId, enabled: true, authenticatedAt: new Date().toISOString() }));
  }, { accountId, deviceId });
  await page.context().addCookies([{ name: "project-suiii-session", value: options.session ?? accountId, domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" }]);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
}

async function resetApi(failPullOnce = false) {
  await fetch(`${apiOrigin}/api/v1/__test/reset${failPullOnce ? "?failPullOnce=1" : ""}`);
}

async function resetApiWithFailure(kind: "push" | "pull") {
  await fetch(`${apiOrigin}/api/v1/__test/reset?fail${kind === "push" ? "Push" : "Pull"}Once=1`);
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

test("manual sync reports failed push and keeps local mutation pending", async ({ page }) => {
  await resetApiWithFailure("push");
  await authenticate(page);
  await page.evaluate(() => {
    window.localStorage.setItem("project-suiii:account-a:device-local:syncQueue:v4", JSON.stringify({
      version: 4,
      deviceId: "device-local",
      deviceName: "This device",
      csrfToken: null,
      pending: [{ client_mutation_id: "mut-push-fail", device_id: "device-local", entity_type: "meal_log", entity_id: "meal-1", mutation_type: "upsert", created_at: "2026-07-15T00:00:00.000Z", payload: { client_record_id: "meal-1" } }],
      failed: [],
      lastSyncAt: null,
      recentActivity: []
    }));
  });

  await page.goto("/sync");
  await page.getByRole("button", { name: /sync now/i }).click();
  await expect(page.getByRole("heading", { name: /Server unavailable - 1 changes retained/i })).toBeVisible();
  const queue = await page.evaluate(() => JSON.parse(window.localStorage.getItem("project-suiii:account-a:device-local:syncQueue:v4") || "{}"));
  expect(queue.pending[0].client_mutation_id).toBe("mut-push-fail");
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

async function newAuthenticatedPage(browser: Browser, accountId: string, deviceId: string) {
  const context = await browser.newContext({ baseURL: appOrigin });
  const page = await context.newPage();
  await authenticate(page, { accountId, deviceId, session: accountId });
  return { context, page };
}

test("same account syncs repaired meal logs from computer to phone", async ({ browser }) => {
  const computer = await newAuthenticatedPage(browser, "account-a", "computer");
  const phone = await newAuthenticatedPage(browser, "account-a", "phone");
  await computer.page.evaluate(() => {
    window.localStorage.setItem("project-suiii:account-a:computer:nutrition:v2", JSON.stringify({
      version: 2,
      waterIncrementsMl: [],
      cigaretteIncrements: [],
      completedTimelineIds: [],
      weighing: { actionId: "", actualGrams: null, completed: false },
      mealLogs: {
        "2026-07-15:breakfast": {
          id: "2026-07-15:breakfast",
          date: "2026-07-15",
          mealDefinitionId: "breakfast",
          status: "completed",
          ingredientLogs: [],
          startedAt: "2026-07-15T01:00:00.000Z",
          completedAt: "2026-07-15T01:10:00.000Z",
          updatedAt: "2026-07-15T01:10:00.000Z"
        }
      },
      weighingSessions: {}
    }));
  });

  await computer.page.goto("/sync");
  await computer.page.getByRole("button", { name: /sync now/i }).click();
  await expect(computer.page.getByRole("heading", { name: /Sync completed: 1 uploaded/i })).toBeVisible();

  await phone.page.goto("/sync");
  await phone.page.getByRole("button", { name: /sync now/i }).click();
  await expect(phone.page.getByRole("heading", { name: /downloaded/i })).toBeVisible();
  const pulled = await phone.page.evaluate(() => window.localStorage.getItem("project-suiii:account-a:phone:nutrition:v2"));
  expect(pulled).toContain("2026-07-15:breakfast");
  expect(pulled).toContain("serverUpdatedAt");
  await computer.context.close();
  await phone.context.close();
});

test("same account syncs repaired daily tracking from phone to computer and different users stay isolated", async ({ browser }) => {
  const phone = await newAuthenticatedPage(browser, "account-a", "phone");
  const computer = await newAuthenticatedPage(browser, "account-a", "computer");
  const other = await newAuthenticatedPage(browser, "account-b", "phone");
  await phone.page.evaluate(() => {
    window.localStorage.setItem("project-suiii:account-a:phone:training:v3", JSON.stringify({
      version: 3,
      sessions: {},
      activeSessionId: null,
      readinessByDate: {
        "2026-07-15": {
          id: "readiness-2026-07-15",
          date: "2026-07-15",
          badmintonGames: 2,
          energy: "high",
          soreness: 1,
          sleepHours: 7.5,
          note: "phone readiness",
          soreAreas: [],
          warningFlags: [],
          createdAt: "2026-07-15T00:00:00.000Z"
        }
      },
      uncomfortableExerciseIds: []
    }));
  });

  await phone.page.goto("/sync");
  await phone.page.getByRole("button", { name: /sync now/i }).click();
  await expect(phone.page.getByRole("heading", { name: /Sync completed: 1 uploaded/i })).toBeVisible();

  await computer.page.goto("/sync");
  await computer.page.getByRole("button", { name: /sync now/i }).click();
  const accountAReadiness = await computer.page.evaluate(() => window.localStorage.getItem("project-suiii:account-a:computer:training:v3"));
  expect(accountAReadiness).toContain("phone readiness");

  await other.page.goto("/sync");
  await other.page.getByRole("button", { name: /sync now/i }).click();
  const accountBReadiness = await other.page.evaluate(() => window.localStorage.getItem("project-suiii:account-b:phone:training:v3"));
  expect(accountBReadiness).not.toContain("phone readiness");
  await phone.context.close();
  await computer.context.close();
  await other.context.close();
});

test("offline workout completed on computer syncs to phone history without duplicate uploads", async ({ browser }) => {
  const computer = await newAuthenticatedPage(browser, "account-a", "computer");
  await computer.page.goto("/train");
  await computer.page.getByRole("button", { name: /^Start Workout$/i }).click();
  await expect(computer.page).toHaveURL(/\/train\/session\//);
  const sessionId = new URL(computer.page.url()).pathname.split("/").at(-1)!;

  await computer.context.setOffline(true);
  await computer.page.getByRole("button", { name: /^Complete Set$/i }).click();
  await computer.page.getByRole("button", { name: /^Skip Rest$/i }).click();
  await computer.page.getByRole("button", { name: /^Complete Partial Session$/i }).click();
  await expect(computer.page.getByRole("heading", { name: /Workout Saved/i })).toBeVisible();

  const localWorkout = await computer.page.evaluate((id) => {
    const training = JSON.parse(window.localStorage.getItem("project-suiii:account-a:computer:training:v3") || "{}");
    const queue = JSON.parse(window.localStorage.getItem("project-suiii:account-a:computer:syncQueue:v4") || "{}");
    const pending = Array.isArray(queue.pending) ? queue.pending as MockMutation[] : [];
    return {
      status: training.sessions?.[id]?.status,
      pendingWorkoutCount: pending.filter((mutation) => mutation.entity_type === "workout_session" && mutation.entity_id === id).length,
      pendingCount: pending.length
    };
  }, sessionId);
  expect(localWorkout).toMatchObject({ status: "partial", pendingWorkoutCount: 1 });
  expect(localWorkout.pendingCount).toBeGreaterThan(0);

  await computer.context.setOffline(false);
  await computer.page.goto("/sync");
  await computer.page.getByRole("button", { name: /sync now/i }).click();
  await expect(computer.page.getByRole("heading", { name: /Sync completed/i })).toBeVisible();
  const computerQueueAfterAck = await computer.page.evaluate(() => JSON.parse(window.localStorage.getItem("project-suiii:account-a:computer:syncQueue:v4") || "{}"));
  expect(computerQueueAfterAck.pending).toHaveLength(0);

  const serverState = await fetch(`${apiOrigin}/api/v1/__test/state`).then((response) => response.json());
  const workoutUploads = serverState.lastPushedMutations.filter((mutation: MockMutation) => mutation.entity_type === "workout_session" && mutation.entity_id === sessionId);
  expect(workoutUploads).toHaveLength(1);
  expect(serverState.records["account-a"][`workout_session:${sessionId}`].payload.id).toBe(sessionId);
  expect(serverState.records["account-a"][`workout_session:${sessionId}`].payload.status).toBe("partial");

  const phone = await newAuthenticatedPage(browser, "account-a", "phone");
  await phone.page.goto("/sync");
  await phone.page.getByRole("button", { name: /sync now/i }).click();
  await expect(phone.page.getByRole("heading", { name: /downloaded/i })).toBeVisible();
  await phone.page.goto("/train/history");
  await expect(phone.page.getByRole("heading", { name: /Training History/i })).toBeVisible();
  const syncedWorkoutLink = phone.page.locator(`a[href="/train/session/${sessionId}/complete"]`);
  await expect(syncedWorkoutLink).toBeVisible();
  await expect(syncedWorkoutLink).toContainText(/Full Body/i);
  await expect(syncedWorkoutLink).toContainText(/partial/i);
  const phoneTraining = await phone.page.evaluate((id) => window.localStorage.getItem("project-suiii:account-a:phone:training:v3")?.includes(id), sessionId);
  expect(phoneTraining).toBe(true);

  const other = await newAuthenticatedPage(browser, "account-b", "phone");
  await other.page.goto("/sync");
  await other.page.getByRole("button", { name: /sync now/i }).click();
  await other.page.goto("/train/history");
  await expect(other.page.locator(`a[href="/train/session/${sessionId}/complete"]`)).toHaveCount(0);
  const otherTraining = await other.page.evaluate((id) => window.localStorage.getItem("project-suiii:account-b:phone:training:v3")?.includes(id) ?? false, sessionId);
  expect(otherTraining).toBe(false);

  const pushCallsBeforeRepeat = await fetch(`${apiOrigin}/api/v1/__test/state`).then((response) => response.json()).then((state) => state.pushCalls);
  await computer.page.goto("/sync");
  await computer.page.getByRole("button", { name: /sync now/i }).click();
  await phone.page.goto("/sync");
  await phone.page.getByRole("button", { name: /sync now/i }).click();
  const pushCallsAfterRepeat = await fetch(`${apiOrigin}/api/v1/__test/state`).then((response) => response.json()).then((state) => state.pushCalls);
  expect(pushCallsAfterRepeat).toBe(pushCallsBeforeRepeat);

  await computer.context.close();
  await phone.context.close();
  await other.context.close();
});
