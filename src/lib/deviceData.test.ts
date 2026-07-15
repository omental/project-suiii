import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { backupFilename, buildDeviceDataExport, downloadDeviceDataBackup, getDeviceDataSummary } from "@/lib/deviceData";
import { resetSyncQueueForTests, writeSyncQueue, defaultSyncQueueState } from "@/lib/syncQueue";

function seedDeviceData() {
  window.localStorage.setItem("project-suiii:phase-2-nutrition", JSON.stringify({
    version: 2,
    mealLogs: {
      meal1: { id: "meal1", date: "2026-07-15", mealDefinitionId: "pre-badminton", status: "completed", startedAt: "2026-07-15T06:08:30.092Z", completedAt: "2026-07-15T06:08:32.205Z" }
    },
    weighingSessions: {}
  }));
  window.localStorage.setItem("project-suiii:phase-3-training", JSON.stringify({
    version: 3,
    sessions: {
      session1: { id: "session1", date: "2026-07-15", workoutDefinitionId: "lower-a", status: "completed", startedAt: "2026-07-15T07:00:00.000Z", completedAt: "2026-07-15T08:00:00.000Z", exerciseSessions: [{ setLogs: [{ id: "set1" }] }] }
    },
    readinessByDate: { "2026-07-15": { id: "readiness-2026-07-15", date: "2026-07-15", badmintonGames: 1, energy: "normal", soreness: 2, sleepHours: 7 } }
  }));
  window.localStorage.setItem("project-suiii:phase-5-progress", JSON.stringify({
    version: 5,
    measurements: { m1: { id: "m1", clientRecordId: "mc1", measuredAt: "2026-07-15T00:00:00.000Z", localDate: "2026-07-15", weightKg: 78, waistIn: 37, chestIn: null, armIn: null, thighIn: null, source: "manual", note: "check", version: 1, deletedAt: null } },
    checkIns: { c1: { id: "c1", clientRecordId: "cc1", weekNumber: 1, checkInDate: "2026-07-15", status: "completed", energy: "normal", hunger: "normal", digestion: "good", averageSleepMinutes: 420, privateNote: "private", measurementId: "m1", completedAt: "2026-07-15T00:00:00.000Z", version: 1, deletedAt: null } },
    photos: { p1: { id: "p1", checkInId: "c1", pose: "front", previewUrl: "blob:local-photo", uploaded: false, uploadState: "pending", createdAt: "2026-07-15T00:00:00.000Z" } },
    smokingBaseline: null,
    smokingDailyLimit: 12,
    currentDraftCheckInId: null
  }));
  writeSyncQueue({ ...defaultSyncQueueState, deviceId: "device-abcdef123456", deviceName: "Phone", pending: [{ client_mutation_id: "mut1", device_id: "device-abcdef123456", entity_type: "body_measurement", entity_id: "m1", mutation_type: "upsert", created_at: "2026-07-15T00:00:00.000Z", payload: { client_record_id: "mc1" } }] });
  window.localStorage.setItem("random-other-app", "secret");
  window.localStorage.setItem("project-suiii:phase-4-csrf", "csrf-secret");
}

describe("device data inventory and export", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T14:30:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    resetSyncQueueForTests();
    vi.restoreAllMocks();
  });

  it("counts supported categories and ignores unrelated browser storage", () => {
    seedDeviceData();
    const summary = getDeviceDataSummary();
    expect(summary.totalSupportedRecords).toBeGreaterThanOrEqual(7);
    expect(summary.categories.find((item) => item.id === "nutrition")?.total).toBe(1);
    expect(summary.categories.find((item) => item.id === "workouts")?.total).toBe(1);
    expect(summary.categories.find((item) => item.id === "photos")?.total).toBe(1);
    expect(JSON.stringify(summary)).not.toContain("random-other-app");
    expect(JSON.stringify(summary)).not.toContain("csrf-secret");
  });

  it("handles empty and malformed storage without crashing", () => {
    expect(getDeviceDataSummary().totalSupportedRecords).toBe(0);
    window.localStorage.setItem("project-suiii:phase-2-nutrition", "{bad");
    const summary = getDeviceDataSummary();
    expect(summary.malformedRecords[0].status).toBe("needs_attention");
    expect(summary.malformedRecords[0].safeIssue).toMatch(/could not be read/i);
  });

  it("builds a versioned JSON envelope with supported records and no auth secrets", () => {
    seedDeviceData();
    const envelope = buildDeviceDataExport(new Date("2026-07-15T14:30:00.000Z"));
    const serialized = JSON.stringify(envelope);
    expect(envelope.application).toBe("Project SUIII");
    expect(envelope.exportType).toBe("device-backup");
    expect(envelope.formatVersion).toBe(1);
    expect(envelope.timezone).toBe("Asia/Dhaka");
    expect(serialized).toContain("meal1");
    expect(serialized).toContain("2026-07-15");
    expect(serialized).toContain("2026-07-15T06:08:30.092Z");
    expect(serialized).not.toContain("csrf-secret");
    expect(serialized).not.toContain("random-other-app");
    expect(envelope.summary.photoBinaryIncluded).toBe(false);
    expect(envelope.notes.join(" ")).toMatch(/Photo image files are not included/i);
  });

  it("generates a predictable filename and does not delete local data", () => {
    seedDeviceData();
    expect(backupFilename(new Date("2026-07-15T14:30:00.000Z"))).toBe("project-suiii-device-backup-20260715-143000.json");
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn() });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    const createUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:backup");
    const revokeUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const result = downloadDeviceDataBackup(new Date("2026-07-15T14:30:00.000Z"));
    expect(result.filename).toBe("project-suiii-device-backup-20260715-143000.json");
    expect(createUrl).toHaveBeenCalled();
    expect(revokeUrl).toHaveBeenCalledWith("blob:backup");
    expect(click).toHaveBeenCalled();
    expect(window.localStorage.getItem("project-suiii:phase-2-nutrition")).toContain("meal1");
    expect(window.localStorage.getItem("project-suiii:device-export-meta")).toContain("2026-07-15T14:30:00.000Z");
  });
});
