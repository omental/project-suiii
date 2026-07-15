import { beforeEach, describe, expect, it, vi } from "vitest";
import { runTwoWaySync } from "@/lib/connectivity";
import { completeMeal, defaultPhase2State, saveWeighingSession, startWeighingSession, writeNutritionState } from "@/lib/nutritionRepository";
import { defaultProgressState, saveMeasurement, startOrUpdateDraftCheckIn, writeProgressState } from "@/lib/progressRepository";
import { readSyncQueue, resetSyncQueueForTests, writeSyncQueue } from "@/lib/syncQueue";
import { repairMissingOutboxMutations } from "@/lib/syncOutbox";
import { completeSession, createReadiness, createWorkoutSession, defaultPhase3TrainingState, saveSet, writeTrainingState } from "@/lib/trainingRepository";
import type { Phase2LocalState } from "@/types/nutrition";
import type { ProgressLocalState } from "@/types/progress";
import type { Phase3TrainingState } from "@/types/training";

const apiRequestMock = vi.fn();

vi.mock("@/lib/apiClient", () => ({
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message);
    }
  },
  NetworkError: class NetworkError extends Error {},
  apiRequest: (path: unknown, options?: unknown) => apiRequestMock(path, options),
  fetchMe: vi.fn(() => Promise.resolve({ id: "account-a", email: "athlete@example.test", full_name: "Test Athlete", timezone: "Asia/Dhaka", is_active: true, is_admin: false })),
  fetchSyncStatus: vi.fn(() => Promise.resolve({ online: true, pending_mutations: 0, last_sync_at: "2026-07-15T12:00:00.000Z", device_name: "This device", recent_activity: [] }))
}));

function seedAccount() {
  window.localStorage.setItem("project-suiii:offline-account-marker", JSON.stringify({ accountId: "account-a", deviceId: "device-a", enabled: true }));
  writeSyncQueue({ version: 4, deviceId: "device-a", deviceName: "This device", csrfToken: null, pending: [], failed: [], lastSyncAt: null, recentActivity: [] });
}

function entityCount(entityType: string) {
  return readSyncQueue().pending.filter((mutation) => mutation.entity_type === entityType).length;
}

describe("sync outbox integrity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    resetSyncQueueForTests();
    seedAccount();
  });

  it("creates and upserts one pending meal log mutation across repeated edits", () => {
    let state = startWeighingSession(defaultPhase2State, "2026-07-15", "breakfast");
    state = saveWeighingSession(state, "2026-07-15", "breakfast", state.mealLogs["2026-07-15:breakfast"].ingredientLogs, 1);
    state = completeMeal(state, "2026-07-15", "breakfast", state.mealLogs["2026-07-15:breakfast"].ingredientLogs);

    expect(entityCount("meal_log")).toBe(1);
    expect(readSyncQueue().pending[0].payload).toMatchObject({ client_record_id: "2026-07-15:breakfast", status: "completed" });
  });

  it("creates and upserts daily readiness and completed workout mutations", () => {
    const readiness = createReadiness("2026-07-15", { badmintonGames: 2, energy: "high", sleepHours: 7 });
    let state = createWorkoutSession(defaultPhase3TrainingState, "2026-07-15", "full-body-a", readiness);
    const sessionId = state.activeSessionId!;
    state = saveSet(state, sessionId, { reps: 12, rir: 2, formRating: "good", note: "offline set" });
    state = completeSession(state, sessionId);
    state = completeSession(state, sessionId);

    expect(state.sessions[sessionId].status).toBe("completed");
    expect(entityCount("daily_tracking")).toBe(1);
    expect(entityCount("workout_session")).toBe(1);
    expect(JSON.stringify(readSyncQueue().pending)).toContain("offline set");
  });

  it("creates and upserts body measurement and weekly check-in mutations", () => {
    let state = saveMeasurement(defaultProgressState, { id: "measurement-1", clientRecordId: "measurement-client-1", weightKg: 78 });
    state = saveMeasurement(state, { id: "measurement-1", clientRecordId: "measurement-client-1", weightKg: 77.5, version: state.measurements["measurement-1"].version });
    state = startOrUpdateDraftCheckIn(state, { weightKg: 77.5, energy: "normal", privateNote: "draft one" });
    state = startOrUpdateDraftCheckIn(state, { weightKg: 77.4, energy: "high", privateNote: "draft two" });

    expect(entityCount("body_measurement")).toBe(3);
    expect(entityCount("weekly_check_in")).toBe(1);
    expect(readSyncQueue().pending.find((mutation) => mutation.entity_type === "weekly_check_in")?.payload).toMatchObject({ status: "draft", private_note: "draft two" });
  });

  it("repairs orphaned unsynced records and skips confirmed server records for every supported entity", () => {
    const nutrition: Phase2LocalState = {
      ...defaultPhase2State,
      mealLogs: {
        "meal-local": { id: "meal-local", date: "2026-07-15", mealDefinitionId: "breakfast", status: "completed", ingredientLogs: [], startedAt: null, completedAt: "2026-07-15T01:00:00.000Z", updatedAt: "2026-07-15T01:00:00.000Z" },
        "meal-confirmed": { id: "meal-confirmed", date: "2026-07-15", mealDefinitionId: "lunch", status: "completed", ingredientLogs: [], startedAt: null, completedAt: "2026-07-15T02:00:00.000Z", updatedAt: "2026-07-15T02:00:00.000Z", serverUpdatedAt: "2026-07-15T03:00:00.000Z" } as never
      }
    };
    const training: Phase3TrainingState = {
      ...defaultPhase3TrainingState,
      sessions: {
        "session-local": { id: "session-local", date: "2026-07-15", workoutDefinitionId: "full-body-a", status: "completed", currentExerciseIndex: 0, currentSetNumber: 1, startedAt: "2026-07-15T00:00:00.000Z", pausedAt: null, totalPausedDurationMs: 0, completedAt: "2026-07-15T01:00:00.000Z", updatedAt: "2026-07-15T01:00:00.000Z", readiness: null, adjustment: null, exerciseSessions: [], restTimer: null, feedback: null },
        "session-confirmed": { id: "session-confirmed", date: "2026-07-15", workoutDefinitionId: "full-body-a", status: "completed", currentExerciseIndex: 0, currentSetNumber: 1, startedAt: "2026-07-15T00:00:00.000Z", pausedAt: null, totalPausedDurationMs: 0, completedAt: "2026-07-15T01:00:00.000Z", updatedAt: "2026-07-15T01:00:00.000Z", readiness: null, adjustment: null, exerciseSessions: [], restTimer: null, feedback: null, serverUpdatedAt: "2026-07-15T03:00:00.000Z" } as never
      },
      readinessByDate: {
        "2026-07-15": createReadiness("2026-07-15", { badmintonGames: 1 }),
        "2026-07-16": { ...createReadiness("2026-07-16", { badmintonGames: 0 }), serverUpdatedAt: "2026-07-16T03:00:00.000Z" } as never
      }
    };
    const progress: ProgressLocalState = {
      ...defaultProgressState,
      measurements: {
        "measurement-local": { id: "measurement-local", clientRecordId: "measurement-client-local", measuredAt: "2026-07-15T00:00:00.000Z", localDate: "2026-07-15", weightKg: 78, waistIn: null, chestIn: null, armIn: null, thighIn: null, source: "manual", note: "", version: 1, deletedAt: null },
        "measurement-confirmed": { id: "measurement-confirmed", clientRecordId: "measurement-client-confirmed", measuredAt: "2026-07-15T00:00:00.000Z", localDate: "2026-07-15", weightKg: 77, waistIn: null, chestIn: null, armIn: null, thighIn: null, source: "manual", note: "", version: 1, deletedAt: null, serverUpdatedAt: "2026-07-15T03:00:00.000Z" } as never
      },
      checkIns: {
        "check-local": { id: "check-local", clientRecordId: "check-client-local", weekNumber: 1, checkInDate: "2026-07-15", status: "draft", energy: "normal", hunger: null, digestion: null, averageSleepMinutes: null, privateNote: "", measurementId: null, completedAt: null, version: 1, deletedAt: null },
        "check-confirmed": { id: "check-confirmed", clientRecordId: "check-client-confirmed", weekNumber: 1, checkInDate: "2026-07-15", status: "draft", energy: "normal", hunger: null, digestion: null, averageSleepMinutes: null, privateNote: "", measurementId: null, completedAt: null, version: 1, deletedAt: null, serverUpdatedAt: "2026-07-15T03:00:00.000Z" } as never
      }
    };
    writeNutritionState(nutrition);
    writeTrainingState(training);
    writeProgressState(progress);

    const repair = repairMissingOutboxMutations();

    expect(repair.repaired).toBe(5);
    expect(readSyncQueue().pending.map((mutation) => `${mutation.entity_type}:${mutation.entity_id}`).sort()).toEqual([
      "body_measurement:measurement-local",
      "daily_tracking:2026-07-15",
      "meal_log:meal-local",
      "weekly_check_in:check-local",
      "workout_session:session-local"
    ]);
    expect(JSON.stringify(readSyncQueue().pending)).not.toContain("confirmed");
  });

  it("clears pending only after successful acknowledgement and pull, and pulled confirmed records are not re-enqueued", async () => {
    writeSyncQueue({
      ...readSyncQueue(),
      pending: [{ client_mutation_id: "mut-1", device_id: "device-a", entity_type: "meal_log", entity_id: "meal-1", mutation_type: "upsert", created_at: "2026-07-15T00:00:00.000Z", payload: { client_record_id: "meal-1", version: 1 } }]
    });
    apiRequestMock
      .mockResolvedValueOnce({ results: [{ mutation_id: "mut-1", entity_type: "meal_log", entity_id: "meal-1", status: "applied", server_version: 1, payload: {} }], server_time: "2026-07-15T12:00:00.000Z" })
      .mockResolvedValueOnce({ records: [{ entity_type: "meal_log", entity_id: "meal-1", client_record_id: "meal-1", server_version: 1, server_updated_at: "2026-07-15T12:00:00.000Z", payload: { id: "meal-1", date: "2026-07-15", mealDefinitionId: "breakfast", status: "completed", ingredientLogs: [], startedAt: null, completedAt: null, updatedAt: "2026-07-15T12:00:00.000Z" } }], server_time: "2026-07-15T12:00:01.000Z" });

    const result = await runTwoWaySync("manual");
    const repair = repairMissingOutboxMutations();

    expect(result).toMatchObject({ status: "complete", uploaded: 1, downloaded: 1, stillPending: 0 });
    expect(readSyncQueue().pending).toHaveLength(0);
    expect(repair.repaired).toBe(0);
  });

  it("failed push leaves pending, and pull failure after accepted upload does not recreate pending", async () => {
    writeSyncQueue({
      ...readSyncQueue(),
      pending: [{ client_mutation_id: "mut-fail", device_id: "device-a", entity_type: "workout_session", entity_id: "session-1", mutation_type: "upsert", created_at: "2026-07-15T00:00:00.000Z", payload: { client_record_id: "session-1", version: 1 } }]
    });
    apiRequestMock.mockRejectedValueOnce(new Error("push failed"));

    const failedPush = await runTwoWaySync("manual");
    expect(failedPush).toMatchObject({ status: "server_unavailable", stillPending: 1, pushFailed: true });
    expect(readSyncQueue().pending).toHaveLength(1);

    apiRequestMock
      .mockResolvedValueOnce({ results: [{ mutation_id: "mut-fail", entity_type: "workout_session", entity_id: "session-1", status: "applied", server_version: 1, payload: {} }], server_time: "2026-07-15T12:00:00.000Z" })
      .mockRejectedValueOnce(new Error("pull failed"));

    const pullFailed = await runTwoWaySync("manual");
    expect(pullFailed).toMatchObject({ status: "server_unavailable", uploaded: 1, stillPending: 0, pullFailed: true });
    expect(readSyncQueue().pending).toHaveLength(0);
  });

  it("does not claim completion when account storage is uninitialized or unsupported photo uploads remain", async () => {
    window.localStorage.removeItem("project-suiii:offline-account-marker");
    expect(await runTwoWaySync("manual")).toMatchObject({ status: "storage_uninitialized" });

    seedAccount();
    writeProgressState({ ...defaultProgressState, photos: { "photo-1": { id: "photo-1", checkInId: "check-1", pose: "front", previewUrl: "blob:photo", uploaded: false, uploadState: "pending", createdAt: "2026-07-15T00:00:00.000Z" } } });
    apiRequestMock.mockResolvedValueOnce({ records: [], server_time: "2026-07-15T12:00:00.000Z" });

    expect(await runTwoWaySync("manual")).toMatchObject({ status: "attention", unsupported: 1 });
  });
});
