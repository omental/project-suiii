import { expect, test, type Browser, type Locator, type Page, type TestInfo } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";

const apiOrigin = process.env.REAL_SYNC_BACKEND_URL ?? "http://127.0.0.1:8210";
const databaseUrl = process.env.REAL_SYNC_DATABASE_URL ?? "postgresql+asyncpg://postgres:postgres123@127.0.0.1:5432/suii_real_sync_e2e";
const password = "SyncReal123!";

type CapturedSync = {
  request: unknown;
  response: unknown;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function routeDiagnostics(page: Page, testInfo: TestInfo, message: string, requestedUrl: string, status?: number | null): Promise<never> {
  const screenshot = testInfo.outputPath(`route-failure-${Date.now()}.png`);
  await page.screenshot({ path: screenshot, fullPage: true }).catch(() => undefined);
  const title = await page.title().catch(() => "<title unavailable>");
  const heading = await page.locator("h1,h2").first().innerText().catch(() => "<heading unavailable>");
  throw new Error([
    message,
    `requested URL: ${requestedUrl}`,
    `final URL: ${page.url()}`,
    `HTTP status: ${status ?? "unknown"}`,
    `page title: ${title}`,
    `first heading: ${heading}`,
    `screenshot: ${screenshot}`
  ].join("\n"));
}

async function gotoHealthy(page: Page, testInfo: TestInfo, url: string, heading: RegExp) {
  const response = await page.goto(url);
  const status = response?.status() ?? null;
  if (status !== null && status >= 400) await routeDiagnostics(page, testInfo, "Navigation returned an error document.", url, status);
  await expect(page.getByRole("heading", { name: heading })).toBeVisible().catch(async () => {
    await routeDiagnostics(page, testInfo, "Navigation did not reach the expected page.", url, status);
  });
  return response;
}

async function clickAndReach(page: Page, testInfo: TestInfo, control: Locator, heading: RegExp) {
  const requestedUrl = page.url();
  const navigation = page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 10_000 }).catch(() => null);
  await control.click();
  const headingLocator = page.getByRole("heading", { name: heading });
  const response = await Promise.race([
    navigation,
    headingLocator.waitFor({ state: "visible", timeout: 10_000 }).then(() => null)
  ]);
  const status = response?.status() ?? null;
  if (status !== null && status >= 400) await routeDiagnostics(page, testInfo, "Click navigation returned an error document.", requestedUrl, status);
  await expect(headingLocator).toBeVisible().catch(async () => {
    await routeDiagnostics(page, testInfo, "Click navigation did not reach the expected page.", requestedUrl, status);
  });
}

function pythonExe() {
  return path.join(process.cwd(), "backend", ".venv", "Scripts", process.platform === "win32" ? "python.exe" : "python");
}

function queryScalar(sql: string, args: string[] = []) {
  const code = [
    "import asyncio, asyncpg, json, os, sys",
    "async def main():",
    "    conn=await asyncpg.connect(os.environ['REAL_SYNC_DATABASE_URL'].replace('postgresql+asyncpg://','postgresql://'))",
    "    sql=sys.argv[1]",
    "    args=sys.argv[2:]",
    "    value=await conn.fetchval(sql, *args)",
    "    print(json.dumps(value, default=str))",
    "    await conn.close()",
    "asyncio.run(main())"
  ].join("\n");
  const output = execFileSync(pythonExe(), ["-c", code, sql, ...args], {
    cwd: process.cwd(),
    env: { ...process.env, REAL_SYNC_DATABASE_URL: databaseUrl },
    encoding: "utf8"
  }).trim();
  return JSON.parse(output) as string | number | boolean | null;
}

function queryJson(sql: string, args: string[] = []) {
  const code = [
    "import asyncio, asyncpg, json, os, sys",
    "async def main():",
    "    conn=await asyncpg.connect(os.environ['REAL_SYNC_DATABASE_URL'].replace('postgresql+asyncpg://','postgresql://'))",
    "    rows=await conn.fetch(sys.argv[1], *sys.argv[2:])",
    "    print(json.dumps([dict(row) for row in rows], default=str))",
    "    await conn.close()",
    "asyncio.run(main())"
  ].join("\n");
  const output = execFileSync(pythonExe(), ["-c", code, sql, ...args], {
    cwd: process.cwd(),
    env: { ...process.env, REAL_SYNC_DATABASE_URL: databaseUrl },
    encoding: "utf8"
  }).trim();
  return JSON.parse(output) as Array<Record<string, unknown>>;
}

async function login(page: Page, email: string, deviceId: string) {
  await page.addInitScript(({ seededDeviceId }) => {
    const queue = {
      version: 4,
      deviceId: seededDeviceId,
      deviceName: seededDeviceId,
      csrfToken: null,
      pending: [],
      failed: [],
      lastSyncAt: null,
      recentActivity: []
    };
    window.localStorage.setItem("project-suiii:phase-4-sync-queue", JSON.stringify(queue));
  }, { seededDeviceId: deviceId });
  const response = await page.goto("/sign-in");
  expect(response?.status()).toBeLessThan(400);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  return page.evaluate(() => JSON.parse(window.localStorage.getItem("project-suiii:offline-account-marker") ?? "null") as { accountId: string; deviceId: string });
}

async function newLoggedInPage(browser: Browser, email: string, deviceId: string) {
  const context = await browser.newContext({ baseURL: "http://127.0.0.1:3200" });
  const page = await context.newPage();
  const marker = await login(page, email, deviceId);
  return { context, page, marker };
}

async function completeMealThroughUi(page: Page, testInfo: TestInfo, date: string, mealId: string) {
  const mealName = mealId === "pre-badminton" ? "Pre-badminton" : mealId.replace(/-/g, " ");
  await gotoHealthy(page, testInfo, "/meals", /today's meals/i);
  await clickAndReach(page, testInfo, page.getByRole("link", { name: new RegExp(escapeRegExp(mealName), "i") }).first(), new RegExp(escapeRegExp(mealName), "i"));
  await clickAndReach(page, testInfo, page.getByRole("link", { name: /start weighing|edit measurements/i }), /weigh your meal/i);
  for (let index = 0; index < 8; index += 1) {
    if (await page.getByRole("heading", { name: /complete/i }).isVisible().catch(() => false)) break;
    const confirm = page.getByRole("button", { name: /^confirm/i });
    if (!(await confirm.isVisible().catch(() => false))) break;
    const actualWeight = page.locator("#actual-weight");
    await expect(actualWeight).toBeVisible();
    if (!(await actualWeight.inputValue()).trim()) {
      await actualWeight.fill("100");
    }
    await confirm.click({ timeout: 5_000 }).catch(async (error) => {
      if (!(await page.getByRole("heading", { name: /complete/i }).isVisible().catch(() => false))) throw error;
    });
    if (await page.getByRole("heading", { name: /complete/i }).isVisible().catch(() => false)) break;
    await page.waitForTimeout(150);
  }
  await expect(page.getByRole("heading", { name: /complete/i })).toBeVisible();
  await expect.poll(async () => page.evaluate((expectedEntityId) => {
    const marker = JSON.parse(window.localStorage.getItem("project-suiii:offline-account-marker") ?? "null") as { accountId: string; deviceId: string };
    const queue = JSON.parse(window.localStorage.getItem(`project-suiii:${marker.accountId}:${marker.deviceId}:syncQueue:v4`) ?? "{}") as { pending?: Array<{ entity_type: string; entity_id: string; payload?: { status?: string } }> };
    const nutrition = JSON.parse(window.localStorage.getItem(`project-suiii:${marker.accountId}:${marker.deviceId}:nutrition:v2`) ?? "{}") as { mealLogs?: Record<string, { status?: string }> };
    const pendingStatus = queue.pending?.find((mutation) => mutation.entity_type === "meal_log" && mutation.entity_id === expectedEntityId)?.payload?.status ?? null;
    return { pendingStatus, localStatus: nutrition.mealLogs?.[expectedEntityId]?.status ?? null };
  }, `${date}:${mealId}`)).toMatchObject({ pendingStatus: "completed", localStatus: "completed" });
}

async function clickSyncAndCapture(page: Page, testInfo: TestInfo): Promise<CapturedSync> {
  const capture = page.waitForResponse((response) => response.url() === `${apiOrigin}/api/v1/sync/push` && response.request().method() === "POST");
  await gotoHealthy(page, testInfo, "/sync", /sync & data/i);
  await page.getByRole("button", { name: /sync now/i }).click();
  const response = await capture;
  const request = response.request().postDataJSON();
  return { request, response: await response.json() };
}

async function syncAndReadHeadline(page: Page, testInfo: TestInfo) {
  await gotoHealthy(page, testInfo, "/sync", /sync & data/i);
  const headline = page.locator("section").first().locator("h2");
  await page.getByRole("button", { name: /sync now/i }).click();
  await expect(headline).not.toContainText(/Syncing/i);
  return headline.innerText();
}

async function readQueue(page: Page) {
  return page.evaluate(() => {
    const marker = JSON.parse(window.localStorage.getItem("project-suiii:offline-account-marker") ?? "null") as { accountId: string; deviceId: string };
    return {
      marker,
      queue: JSON.parse(window.localStorage.getItem(`project-suiii:${marker.accountId}:${marker.deviceId}:syncQueue:v4`) ?? "{}") as {
        pullCursor?: string | null;
        pending?: Array<{ entity_type: string; entity_id: string; payload?: Record<string, unknown> }>;
        lastSyncAt?: string | null;
      }
    };
  });
}

async function pushFreshServerMeasurement(page: Page) {
  const measurementId = `measurement-pull-failure-${randomUUID()}`;
  const measuredAt = new Date().toISOString();
  const payload = await page.evaluate(async ({ apiOrigin, measurementId, measuredAt, mutationId }) => {
    const response = await fetch(`${apiOrigin}/api/v1/sync/push`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": window.localStorage.getItem("project-suiii:phase-4-csrf") ?? ""
      },
      body: JSON.stringify({
        mutations: [{
          client_mutation_id: mutationId,
          device_id: "computer-failure",
          entity_type: "body_measurement",
          entity_id: measurementId,
          mutation_type: "upsert",
          payload: {
            client_record_id: measurementId,
            measured_at: measuredAt,
            local_date: "2026-07-16",
            weight_kg: "83.10",
            waist_in: "34.10",
            source: "pull-failure-test",
            note: "server-side record created after cursor capture",
            version: 1
          }
        }]
      })
    });
    return { status: response.status, body: await response.json() };
  }, { apiOrigin, measurementId, measuredAt, mutationId: randomUUID() });
  expect(payload.status).toBeLessThan(400);
  console.log("REAL_SYNC_PULL_FAILURE_SERVER_PUSH", JSON.stringify(payload.body));
  expect(payload.body.results).toEqual([expect.objectContaining({ entity_type: "body_measurement", entity_id: measurementId, status: "applied" })]);
}

async function createMeasurementThroughUi(page: Page, testInfo: TestInfo, weight: string, waist: string) {
  await gotoHealthy(page, testInfo, "/progress", /progress/i);
  await clickAndReach(page, testInfo, page.getByRole("link", { name: /start check-in/i }), /measure your progress/i);
  await page.locator('input[inputmode="decimal"]').nth(0).fill(weight);
  await page.locator('input[inputmode="decimal"]').nth(1).fill(waist);
  await page.getByRole("button", { name: /save without photos/i }).click();
  await expect(page).toHaveURL(/\/progress\/review\//);
  await expect(page.getByRole("heading", { name: /week .* complete/i })).toBeVisible().catch(async () => {
    await routeDiagnostics(page, testInfo, "Measurement save did not reach the review page.", "/progress via Start Check-In", null);
  });
  await expect.poll(async () => {
    const { queue } = await readQueue(page);
    return queue.pending?.filter((mutation) => mutation.entity_type === "body_measurement").length ?? 0;
  }).toBeGreaterThan(0);
}

async function startWorkoutThroughUi(page: Page, testInfo: TestInfo) {
  await gotoHealthy(page, testInfo, "/train", /train/i);
  await page.getByRole("button", { name: /^Start Workout$/i }).click();
  await expect(page).toHaveURL(/\/train\/session\//);
  await expect(page.getByRole("button", { name: /^Complete Set$/i })).toBeVisible().catch(async () => {
    await routeDiagnostics(page, testInfo, "Workout start did not reach an active session.", "/train via Start Workout", null);
  });
  return new URL(page.url()).pathname.split("/").at(-1)!;
}

async function completePartialWorkoutThroughUi(page: Page, sessionId: string) {
  await page.getByRole("button", { name: /^Complete Set$/i }).click();
  await page.getByRole("button", { name: /^Skip Rest$/i }).click();
  await page.getByRole("button", { name: /^Complete Partial Session$/i }).click();
  await expect(page.getByRole("heading", { name: /Workout Saved|Workout Complete/i })).toBeVisible();
  await expect.poll(async () => {
    const { queue } = await readQueue(page);
    return queue.pending?.filter((mutation) => mutation.entity_type === "workout_session" && mutation.entity_id === sessionId).length ?? 0;
  }).toBe(1);
  return sessionId;
}

test("real UI meal sync persists pull cursor and second pull is empty", async ({ browser }, testInfo) => {
  const date = "2026-07-16";
  const mealDefinitionId = "pre-badminton";
  const mealId = `${date}:${mealDefinitionId}`;
  const computer = await newLoggedInPage(browser, "sync-a@example.com", "computer-real");
  await completeMealThroughUi(computer.page, testInfo, date, mealDefinitionId);

  const push = await clickSyncAndCapture(computer.page, testInfo);
  console.log("REAL_SYNC_PUSH_REQUEST", JSON.stringify(push.request));
  console.log("REAL_SYNC_PUSH_RESPONSE", JSON.stringify(push.response));
  expect(push.request).toMatchObject({
    mutations: [{
      entity_type: "meal_log",
      entity_id: mealId,
      mutation_type: "upsert",
      payload: { client_record_id: mealId, definition_id: mealDefinitionId, status: "completed" }
    }]
  });
  expect(push.response).toMatchObject({ results: [{ entity_type: "meal_log", entity_id: mealId, status: "applied" }] });

  const committedCount = queryScalar("select count(*)::int from meal_logs where client_record_id=$1", [mealId]);
  console.log("REAL_SYNC_COMMITTED_MEAL_COUNT", committedCount);
  expect(committedCount).toBe(1);

  const phone = await newLoggedInPage(browser, "sync-a@example.com", "phone-real");
  await gotoHealthy(phone.page, testInfo, "/sync", /sync & data/i);
  await phone.page.getByRole("button", { name: /sync now/i }).click();
  const syncHeadline = phone.page.locator("section").first().locator("h2");
  await expect(syncHeadline).toContainText(/1 downloaded/i);
  console.log("REAL_SYNC_FIRST_PHONE_HEADLINE", await syncHeadline.innerText());
  const phoneHasMeal = await phone.page.evaluate((id) => {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key && window.localStorage.getItem(key)?.includes(id)) return true;
    }
    return false;
  }, mealId);
  expect(phoneHasMeal).toBe(true);
  await gotoHealthy(phone.page, testInfo, "/meals", /today's meals/i);
  await expect(phone.page.getByRole("link", { name: /pre-badminton/i })).toContainText(/completed/i);
  await gotoHealthy(phone.page, testInfo, "/sync", /sync & data/i);

  await phone.page.getByRole("button", { name: /sync now/i }).click();
  await expect(syncHeadline).not.toContainText(/Syncing/i);
  console.log("REAL_SYNC_SECOND_PHONE_HEADLINE", await syncHeadline.innerText());
  await expect(syncHeadline).toContainText(/All caught up/i);

  const secondMealDefinitionIds = ["breakfast", "lunch", "snack"];
  for (const nextMeal of secondMealDefinitionIds) {
    await completeMealThroughUi(computer.page, testInfo, date, nextMeal);
  }
  const secondPush = await clickSyncAndCapture(computer.page, testInfo);
  console.log("REAL_SYNC_SECOND_PUSH_RESPONSE", JSON.stringify(secondPush.response));
  for (const nextMeal of secondMealDefinitionIds) {
    expect(queryScalar("select count(*)::int from meal_logs where client_record_id=$1", [`${date}:${nextMeal}`])).toBe(1);
  }

  const afterCursorHeadline = await syncAndReadHeadline(phone.page, testInfo);
  console.log("REAL_SYNC_AFTER_CURSOR_PHONE_HEADLINE", afterCursorHeadline);
  expect(afterCursorHeadline).toMatch(/0 uploaded, 3 downloaded/i);
  await gotoHealthy(phone.page, testInfo, "/meals", /today's meals/i);
  await expect(phone.page.getByRole("link", { name: /breakfast/i })).toContainText(/completed/i);
  await expect(phone.page.getByRole("link", { name: /lunch/i })).toContainText(/completed/i);
  await expect(phone.page.getByRole("link", { name: /snack/i })).toContainText(/completed/i);
  const repeatAfterCursorHeadline = await syncAndReadHeadline(phone.page, testInfo);
  console.log("REAL_SYNC_AFTER_CURSOR_REPEAT_HEADLINE", repeatAfterCursorHeadline);
  expect(repeatAfterCursorHeadline).toMatch(/All caught up/i);

  await computer.context.close();
  await phone.context.close();
});

test("real body measurement syncs phone to computer and repeats empty", async ({ browser }, testInfo) => {
  const phone = await newLoggedInPage(browser, "sync-a@example.com", "phone-measurement");
  await createMeasurementThroughUi(phone.page, testInfo, "82.4", "35.2");
  const push = await clickSyncAndCapture(phone.page, testInfo);
  console.log("REAL_SYNC_MEASUREMENT_PUSH", JSON.stringify(push.response));
  expect(push.request).toMatchObject({ mutations: expect.arrayContaining([expect.objectContaining({ entity_type: "body_measurement" })]) });
  const measurementCount = queryScalar("select count(*)::int from body_measurements where weight_kg = 82.40");
  console.log("REAL_SYNC_MEASUREMENT_ROW_COUNT", measurementCount);
  expect(measurementCount).toBe(1);

  const computer = await newLoggedInPage(browser, "sync-a@example.com", "computer-measurement");
  const headline = await syncAndReadHeadline(computer.page, testInfo);
  console.log("REAL_SYNC_MEASUREMENT_COMPUTER_HEADLINE", headline);
  expect(headline).toMatch(/downloaded/i);
  await gotoHealthy(computer.page, testInfo, "/progress/history", /history/i);
  await expect(computer.page.getByText(/82.4 kg/i)).toBeVisible();
  const repeat = await syncAndReadHeadline(computer.page, testInfo);
  console.log("REAL_SYNC_MEASUREMENT_REPEAT_HEADLINE", repeat);
  expect(repeat).toMatch(/All caught up/i);
  expect(queryScalar("select count(*)::int from body_measurements where weight_kg = 82.40")).toBe(1);

  await phone.context.close();
  await computer.context.close();
});

test("real offline workout reconnects, pushes once, and phone repeats empty", async ({ browser }, testInfo) => {
  const computer = await newLoggedInPage(browser, "sync-a@example.com", "computer-workout");
  const sessionId = await startWorkoutThroughUi(computer.page, testInfo);
  await computer.context.setOffline(true);
  await completePartialWorkoutThroughUi(computer.page, sessionId);
  const local = await readQueue(computer.page);
  expect(local.queue.pending?.filter((mutation) => mutation.entity_type === "workout_session" && mutation.entity_id === sessionId)).toHaveLength(1);
  await computer.context.setOffline(false);

  const pushCapture = computer.page.waitForResponse((response) => response.url() === `${apiOrigin}/api/v1/sync/push` && response.request().method() === "POST");
  const headline = await syncAndReadHeadline(computer.page, testInfo);
  const pushResponse = await pushCapture;
  const pushed = pushResponse.request().postDataJSON() as { mutations: Array<{ entity_type: string; entity_id: string }> };
  console.log("REAL_SYNC_WORKOUT_PUSH", JSON.stringify(pushed));
  expect(headline).toMatch(/uploaded/i);
  expect(pushed.mutations.filter((mutation) => mutation.entity_type === "workout_session" && mutation.entity_id === sessionId)).toHaveLength(1);
  const workoutCount = queryScalar("select count(*)::int from workout_sessions where client_record_id=$1", [sessionId]);
  console.log("REAL_SYNC_WORKOUT_ROW_COUNT", workoutCount);
  expect(workoutCount).toBe(1);
  expect((await readQueue(computer.page)).queue.pending ?? []).toHaveLength(0);

  const phone = await newLoggedInPage(browser, "sync-a@example.com", "phone-workout");
  const phoneHeadline = await syncAndReadHeadline(phone.page, testInfo);
  expect(phoneHeadline).toMatch(/downloaded/i);
  await gotoHealthy(phone.page, testInfo, "/train/history", /training history/i);
  await expect(phone.page.getByRole("link", { name: /active recovery/i })).toContainText(/partial/i);
  const phoneHasWorkout = await phone.page.evaluate((id) => {
    const marker = JSON.parse(window.localStorage.getItem("project-suiii:offline-account-marker") ?? "null") as { accountId: string; deviceId: string };
    return window.localStorage.getItem(`project-suiii:${marker.accountId}:${marker.deviceId}:training:v3`)?.includes(id) ?? false;
  }, sessionId);
  expect(phoneHasWorkout).toBe(true);
  expect(await syncAndReadHeadline(phone.page, testInfo)).toMatch(/All caught up/i);
  expect(await syncAndReadHeadline(computer.page, testInfo)).toMatch(/All caught up/i);

  await computer.context.close();
  await phone.context.close();
});

test("real pull failure preserves cursor and retry applies missing record", async ({ browser }, testInfo) => {
  const computer = await newLoggedInPage(browser, "sync-a@example.com", "computer-failure");
  const phone = await newLoggedInPage(browser, "sync-a@example.com", "phone-failure");
  await syncAndReadHeadline(phone.page, testInfo);
  const before = (await readQueue(phone.page)).queue.pullCursor;
  console.log("REAL_SYNC_PULL_FAILURE_CURSOR_BEFORE", before);

  await pushFreshServerMeasurement(computer.page);
  await phone.page.request.post(`${apiOrigin}/api/v1/__test/fail-next-sync-pull`);
  const failedHeadline = await syncAndReadHeadline(phone.page, testInfo);
  console.log("REAL_SYNC_PULL_FAILURE_HEADLINE", failedHeadline);
  expect(failedHeadline).not.toMatch(/All caught up|Sync completed/i);
  const afterFailure = (await readQueue(phone.page)).queue.pullCursor;
  console.log("REAL_SYNC_PULL_FAILURE_CURSOR_AFTER_FAILURE", afterFailure);
  expect(afterFailure).toBe(before);

  const retry = await syncAndReadHeadline(phone.page, testInfo);
  console.log("REAL_SYNC_PULL_RETRY_HEADLINE", retry);
  expect(retry).toMatch(/1 downloaded/i);
  const afterRetry = (await readQueue(phone.page)).queue.pullCursor;
  console.log("REAL_SYNC_PULL_FAILURE_CURSOR_AFTER_RETRY", afterRetry);
  expect(afterRetry).not.toBe(before);
  expect(await syncAndReadHeadline(phone.page, testInfo)).toMatch(/All caught up/i);

  await computer.context.close();
  await phone.context.close();
});

test("cursor storage is isolated by authenticated account and device", async ({ browser }, testInfo) => {
  const accountA = await newLoggedInPage(browser, "sync-a@example.com", "shared-device");
  await completeMealThroughUi(accountA.page, testInfo, "2026-07-16", "snack");
  await clickSyncAndCapture(accountA.page, testInfo);
  await syncAndReadHeadline(accountA.page, testInfo);
  const aState = await readQueue(accountA.page);
  expect(aState.queue.pullCursor).toBeTruthy();
  await gotoHealthy(accountA.page, testInfo, "/sync", /sync & data/i);
  accountA.page.on("dialog", (dialog) => dialog.accept());
  await accountA.page.getByTestId("sync-sign-out").dispatchEvent("click");
  await expect(accountA.page).toHaveURL(/\/sign-in/);

  await login(accountA.page, "sync-b@example.com", "shared-device");
  const bStateBefore = await readQueue(accountA.page);
  console.log("REAL_SYNC_ACCOUNT_A_CURSOR", aState.marker.accountId, aState.queue.pullCursor);
  console.log("REAL_SYNC_ACCOUNT_B_CURSOR_BEFORE", bStateBefore.marker.accountId, bStateBefore.queue.pullCursor ?? null);
  expect(bStateBefore.marker.accountId).not.toBe(aState.marker.accountId);
  expect(bStateBefore.queue.pullCursor ?? null).toBeNull();
  await syncAndReadHeadline(accountA.page, testInfo);
  await gotoHealthy(accountA.page, testInfo, "/meals", /today's meals/i);
  await expect(accountA.page.getByRole("link", { name: /snack/i })).not.toContainText(/completed/i);
  const arbitrary = queryJson("select entity_type, entity_id from sync_changes where user_id = (select id from users where email = $1)", ["sync-a@example.com"]);
  expect(arbitrary.length).toBeGreaterThan(0);

  await accountA.context.close();
});
