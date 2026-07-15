import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, NetworkError } from "@/lib/apiClient";
import { classifyConnectivity, isNonRetryableSyncError, shouldRetrySync } from "@/lib/connectivity";
import { canUseOfflineDeviceMode, disableOfflineAccountAccess, recordAuthenticatedAccount } from "@/lib/offlineAccount";
import { scopedStorageKey } from "@/lib/accountStorage";
import { dismissInstallPrompt, getInstallState, type BeforeInstallPromptEvent } from "@/lib/installPrompt";
import { createServiceWorkerController } from "@/lib/pwaServiceWorker";
import { completeSession, createWorkoutSession, defaultPhase3TrainingState, saveSet } from "@/lib/trainingRepository";
import { readSyncQueue, resetSyncQueueForTests, writeSyncQueue, defaultSyncQueueState } from "@/lib/syncQueue";

describe("Sprint 4 PWA offline and privacy behavior", () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetSyncQueueForTests();
    vi.restoreAllMocks();
  });

  it("service worker source caches static assets and explicitly excludes private API routes", () => {
    const source = readFileSync("public/sw.js", "utf8");
    expect(source).toContain("caches.open");
    expect(source).toContain("/_next/static/");
    expect(source).toContain("/offline.html");
    expect(source).toMatch(/api\\\/v1\\\/auth/);
    expect(source).toMatch(/api\\\/v1\\\/profile/);
    expect(source).toMatch(/api\\\/v1\\\/sync/);
    expect(source).toContain("Authorization");
    expect(source).not.toMatch(/\/api\/v1\/auth[\s\S]*cache\.put/);
  });

  it("offline shell is neutral and contains no private fixture data", () => {
    const shell = readFileSync("public/offline.html", "utf8");
    expect(shell).toContain("You're offline");
    expect(shell).toContain("unsynced changes stay on this device");
    expect(shell).not.toMatch(/athlete@example|protein|waist|csrf|token/i);
  });

  it("registers once and handles registration failures", async () => {
    const register = vi.fn().mockResolvedValue({ active: {}, addEventListener: vi.fn() });
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { register, controller: {} } });
    const controller = createServiceWorkerController();
    await controller.register();
    await controller.register();
    expect(register).toHaveBeenCalledTimes(1);

    const failingRegister = vi.fn().mockRejectedValue(new Error("blocked"));
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { register: failingRegister, controller: null } });
    const failed = await createServiceWorkerController().register();
    expect(failed.error).toBe("blocked");
  });

  it("activates waiting worker and clears offline app cache without touching local logs", async () => {
    const postMessage = vi.fn();
    const deleteCache = vi.fn();
    Object.defineProperty(window, "caches", { configurable: true, value: { keys: vi.fn().mockResolvedValue(["project-suiii-static-v1"]), delete: deleteCache } });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        controller: {},
        addEventListener: (_name: string, callback: () => void) => callback(),
        register: vi.fn().mockResolvedValue({ active: { postMessage }, waiting: { postMessage }, addEventListener: vi.fn() })
      }
    });
    window.localStorage.setItem("project-suiii:phase-3-training", "workout-log");
    const controller = createServiceWorkerController();
    await controller.register();
    expect(await controller.activateUpdate()).toBe(true);
    expect(postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
    expect(await controller.clearOfflineCache()).toBe(true);
    expect(window.localStorage.getItem("project-suiii:phase-3-training")).toBe("workout-log");
  });

  it("connectivity does not treat browser online as server reachable and classifies retry rules", () => {
    expect(classifyConnectivity(false, null, 0, 0)).toBe("offline");
    expect(classifyConnectivity(true, null, 0, 0)).toBe("connection_unknown");
    expect(classifyConnectivity(true, true, 2, 0)).toBe("sync_pending");
    expect(classifyConnectivity(true, false, 0, 1)).toBe("sync_failed");
    expect(shouldRetrySync(new NetworkError())).toBe(true);
    expect(shouldRetrySync(new ApiError(503, "temporary"))).toBe(true);
    expect(isNonRetryableSyncError(new ApiError(401, "expired"))).toBe(true);
    expect(isNonRetryableSyncError(new ApiError(409, "conflict"))).toBe(true);
  });

  it("install prompt state respects availability, dismissal and iOS fallback", () => {
    const prompt = { prompt: vi.fn(), userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }) } as unknown as BeforeInstallPromptEvent;
    expect(getInstallState(prompt)).toBe("install_available");
    dismissInstallPrompt(Date.now());
    expect(getInstallState(prompt)).toBe("dismissed");
    window.localStorage.clear();
    Object.defineProperty(navigator, "userAgent", { configurable: true, value: "iPhone" });
    expect(getInstallState(null)).toBe("browser");
  });

  it("offline account marker isolates account A from account B and logout disables access", () => {
    writeSyncQueue({ ...defaultSyncQueueState, deviceId: "device-a" });
    recordAuthenticatedAccount("account-a");
    expect(canUseOfflineDeviceMode("account-a")).toBe(true);
    expect(canUseOfflineDeviceMode("account-b")).toBe(false);
    disableOfflineAccountAccess();
    expect(canUseOfflineDeviceMode("account-a")).toBe(false);
  });

  it("workout completion saves locally and queues a workout mutation for reconnect sync", () => {
    let state = createWorkoutSession(defaultPhase3TrainingState, "2026-07-15", "full-body-a", null);
    const sessionId = state.activeSessionId!;
    state = saveSet(state, sessionId, { reps: 12, rir: 2, formRating: "good", note: "offline" });
    state = completeSession(state, sessionId);
    const queue = readSyncQueue();
    expect(state.sessions[sessionId].status).toBe("completed");
    expect(queue.pending).toHaveLength(1);
    expect(queue.pending[0]).toMatchObject({ entity_type: "workout_session", entity_id: sessionId, mutation_type: "upsert" });
    expect(JSON.stringify(queue.pending[0])).toContain("offline");
  });

  it("migrates legacy stores to account A, isolates account B, and preserves A data when switching back", () => {
    window.localStorage.setItem("project-suiii:phase-4-sync-queue", JSON.stringify({ ...defaultSyncQueueState, deviceId: "device-local" }));
    window.localStorage.setItem("project-suiii:phase-2-nutrition", JSON.stringify({ version: 2, mealLogs: { "meal-a": { id: "meal-a", date: "2026-07-15" } }, weighingSessions: {} }));
    window.localStorage.setItem("project-suiii:phase-3-training", JSON.stringify({ version: 3, sessions: { "workout-a": { id: "workout-a", date: "2026-07-15" } }, readinessByDate: {}, activeSessionId: null }));
    window.localStorage.setItem("project-suiii:phase-5-progress", JSON.stringify({ version: 5, measurements: { "progress-a": { id: "progress-a", localDate: "2026-07-15" } }, checkIns: {}, photos: {}, currentDraftCheckInId: null }));

    recordAuthenticatedAccount("account-a");
    expect(window.localStorage.getItem(scopedStorageKey("account-a", "device-local", "nutrition"))).toContain("meal-a");
    disableOfflineAccountAccess();

    recordAuthenticatedAccount("account-b");
    expect(window.localStorage.getItem(scopedStorageKey("account-b", "device-local", "nutrition"))).toBeNull();
    expect(window.localStorage.getItem(scopedStorageKey("account-b", "device-local", "training"))).toBeNull();
    expect(window.localStorage.getItem(scopedStorageKey("account-b", "device-local", "progress"))).toBeNull();

    recordAuthenticatedAccount("account-a");
    expect(window.localStorage.getItem(scopedStorageKey("account-a", "device-local", "nutrition"))).toContain("meal-a");
    expect(window.localStorage.getItem(scopedStorageKey("account-a", "device-local", "training"))).toContain("workout-a");
    expect(window.localStorage.getItem(scopedStorageKey("account-a", "device-local", "progress"))).toContain("progress-a");
  });
});
