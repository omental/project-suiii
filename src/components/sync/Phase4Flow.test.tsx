import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignInPage } from "@/components/auth/SignInPage";
import { LocalMigrationPage } from "@/components/sync/LocalMigrationPage";
import { SyncDataPage } from "@/components/sync/SyncDataPage";
import { resetSyncQueueForTests } from "@/lib/syncQueue";
import { resetNutritionStateForTests } from "@/lib/nutritionRepository";
import { resetTrainingStateForTests } from "@/lib/trainingRepository";

const replaceMock = vi.fn();
const refreshMock = vi.fn();
const pushRouteMock = vi.fn();
const apiRequestMock = vi.fn();
const loginMock = vi.fn(() => Promise.resolve({ user: { id: "user-1", email: "athlete@example.test", full_name: "Demo Athlete", timezone: "Asia/Dhaka", is_active: true, is_admin: false }, csrf_token: "csrf", expires_at: "2026-07-16T00:00:00.000Z" }));

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>("next/navigation");
  return {
    ...actual,
    usePathname: () => "/sync",
    useRouter: () => ({ push: pushRouteMock, replace: replaceMock, refresh: refreshMock })
  };
});

vi.mock("@/lib/apiClient", () => ({
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message);
    }
  },
  NetworkError: class NetworkError extends Error {},
  apiRequest: (path: unknown, options?: unknown) => apiRequestMock(path, options),
  fetchMe: vi.fn(() => Promise.resolve({ id: "user-1", email: "athlete@example.test", full_name: "Demo Athlete", timezone: "Asia/Dhaka", is_active: true, is_admin: false })),
  fetchSyncStatus: vi.fn(() => Promise.resolve({ online: true, pending_mutations: 0, last_sync_at: "2026-07-15T10:00:00.000Z", device_name: "This device", recent_activity: [] })),
  login: () => loginMock(),
  logout: vi.fn(),
  userFacingApiError: () => "Something went wrong. Please try again."
}));

function migrationResponse(overrides: Record<string, unknown> = {}) {
  return {
    batch_id: "batch",
    status: "completed",
    imported_records: 1,
    skipped_records: 0,
    conflict_records: 0,
    error_records: 0,
    summary: { meal_logs: 1, workout_sessions: 0, daily_check_ins: 0, sets: 0, date_range: "2026-07-15", total_records: 1 },
    ...overrides
  };
}

function seedMigrationData() {
  window.localStorage.setItem("project-suiii:phase-2-nutrition", JSON.stringify({
    version: 2,
    waterIncrementsMl: [],
    cigaretteIncrements: [],
    completedTimelineIds: [],
    weighing: {},
    mealLogs: {
      "2026-07-15:pre-badminton": {
        id: "2026-07-15:pre-badminton",
        date: "2026-07-15",
        mealDefinitionId: "pre-badminton",
        status: "completed",
        ingredientLogs: [],
        startedAt: "2026-07-15T06:08:30.092Z",
        completedAt: "2026-07-15T06:08:32.205Z",
        updatedAt: "2026-07-15T06:08:32.205Z",
        pendingMigration: true
      }
    },
    weighingSessions: {}
  }));
  window.localStorage.setItem("project-suiii:phase-3-training", JSON.stringify({
    version: 3,
    sessions: {
      "session-1": {
        id: "session-1",
        date: "2026-07-15",
        workoutDefinitionId: "lower-a",
        status: "completed",
        startedAt: "2026-07-15T07:00:00.000Z",
        completedAt: "2026-07-15T08:00:00.000Z",
        exerciseSessions: [],
        pendingMigration: true
      }
    },
    activeSessionId: null,
    readinessByDate: {
      "2026-07-15": { id: "readiness-2026-07-15", date: "2026-07-15", badmintonGames: 1, energy: "normal", soreness: 2, sleepHours: 7, note: "", pendingMigration: true }
    },
    uncomfortableExerciseIds: []
  }));
}

function seedScopedQueue(queue: Record<string, unknown>) {
  window.localStorage.setItem("project-suiii:offline-account-marker", JSON.stringify({ accountId: "user-1", deviceId: "device-local", enabled: true }));
  window.localStorage.setItem("project-suiii:user-1:device-local:syncQueue:v4", JSON.stringify(queue));
}

function fillSignInForm() {
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "athlete@example.test" } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password" } });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
}

describe("Phase 4 auth and sync screens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loginMock.mockResolvedValue({ user: { id: "user-1", email: "athlete@example.test", full_name: "Demo Athlete", timezone: "Asia/Dhaka", is_active: true, is_admin: false }, csrf_token: "csrf", expires_at: "2026-07-16T00:00:00.000Z" });
    resetSyncQueueForTests();
    resetNutritionStateForTests();
    resetTrainingStateForTests();
  });

  it("renders the private sign-in screen without token storage language", () => {
    render(<SignInPage />);
    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByText(/private access/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByText(/localStorage token/i)).not.toBeInTheDocument();
  });

  it("summarizes local migration data and conflict policy options", async () => {
    window.localStorage.setItem("project-suiii:phase-2-nutrition", JSON.stringify({ version: 2, mealLogs: { a: { id: "a", pendingMigration: true } } }));
    window.localStorage.setItem("project-suiii:phase-3-training", JSON.stringify({ version: 3, sessions: { s: { pendingMigration: true, exerciseSessions: [{ setLogs: [{ id: "set" }] }] } }, readinessByDate: { "2026-07-14": { pendingMigration: true } } }));
    render(<LocalMigrationPage />);
    expect(await screen.findByRole("heading", { name: /bring your progress/i })).toBeInTheDocument();
    expect(screen.getByText(/Keep the most recent version/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /import/i })).toBeInTheDocument();
  });

  it("does not classify ordinary cached records as legacy migration records", async () => {
    window.localStorage.setItem("project-suiii:phase-2-nutrition", JSON.stringify({ version: 2, mealLogs: { a: { id: "a", date: "2026-07-15" } } }));
    window.localStorage.setItem("project-suiii:phase-3-training", JSON.stringify({ version: 3, sessions: { s: { id: "s", date: "2026-07-15", exerciseSessions: [] } }, readinessByDate: { "2026-07-14": { date: "2026-07-14" } } }));

    render(<LocalMigrationPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/"));
    expect(apiRequestMock).not.toHaveBeenCalled();
  });

  it("sends users to the dashboard after login when only normal cache exists", async () => {
    window.localStorage.setItem("project-suiii:phase-2-nutrition", JSON.stringify({ version: 2, mealLogs: { a: { id: "a", date: "2026-07-15" } } }));
    render(<SignInPage />);

    fillSignInForm();

    await waitFor(() => expect(pushRouteMock).toHaveBeenCalledWith("/"));
  });

  it("routes to migration for old legacy records without modern flags", async () => {
    window.localStorage.setItem("project-suiii:phase-2-nutrition", JSON.stringify({ version: 1, mealLogs: { a: { id: "a", date: "2026-07-15", mealDefinitionId: "pre-badminton", status: "completed" } } }));
    render(<SignInPage />);

    fillSignInForm();

    await waitFor(() => expect(pushRouteMock).toHaveBeenCalledWith("/sync/migrate"));
  });

  it("completed migration marker is isolated by account and device", async () => {
    window.localStorage.setItem("project-suiii:phase-4-sync-queue", JSON.stringify({ version: 4, deviceId: "device-local", deviceName: "This device", csrfToken: null, pending: [], failed: [], lastSyncAt: null, recentActivity: [] }));
    window.localStorage.setItem("project-suiii:migration:v1:user-1:device-local", JSON.stringify({ migrationVersion: 1, completedAt: "2026-07-15T00:00:00.000Z", accountId: "user-1", deviceId: "device-local", resultSummary: {} }));
    window.localStorage.setItem("project-suiii:phase-2-nutrition", JSON.stringify({ version: 2, mealLogs: { a: { id: "a", date: "2026-07-15", mealDefinitionId: "pre-badminton", status: "completed", pendingMigration: true } } }));
    loginMock.mockResolvedValueOnce({ user: { id: "user-2", email: "other@example.com", full_name: "Other User", timezone: "Asia/Dhaka", is_active: true, is_admin: false }, csrf_token: "csrf", expires_at: "2026-07-16T00:00:00.000Z" });
    render(<SignInPage />);

    fillSignInForm();

    await waitFor(() => expect(pushRouteMock).toHaveBeenCalledWith("/sync/migrate"));
  });

  it("completed migration marker sends the same account and device to dashboard", async () => {
    window.localStorage.setItem("project-suiii:phase-4-sync-queue", JSON.stringify({ version: 4, deviceId: "device-local", deviceName: "Renamed device", csrfToken: null, pending: [], failed: [], lastSyncAt: null, recentActivity: [] }));
    window.localStorage.setItem("project-suiii:migration:v1:user-1:device-local", JSON.stringify({ migrationVersion: 1, completedAt: "2026-07-15T00:00:00.000Z", accountId: "user-1", deviceId: "device-local", resultSummary: {} }));
    window.localStorage.setItem("project-suiii:phase-2-nutrition", JSON.stringify({ version: 2, mealLogs: { a: { id: "a", date: "2026-07-15", mealDefinitionId: "pre-badminton", status: "completed", pendingMigration: true } } }));
    render(<SignInPage />);

    fillSignInForm();

    await waitFor(() => expect(pushRouteMock).toHaveBeenCalledWith("/"));
  });

  it("renders Sync & Data status with offline queue sections", async () => {
    render(<SyncDataPage />);
    expect(await screen.findByRole("heading", { name: /sync & data/i })).toBeInTheDocument();
    expect(screen.getByText(/Local Data Available/i)).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(["Full Body A", "uploaded"].join(" "), "i"))).not.toBeInTheDocument();
    expect(screen.queryByText(new RegExp(["automatically when", "you reconnect"].join(" "), "i"))).not.toBeInTheDocument();
    expect(screen.getAllByText(/Meals/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Sign Out/i)).toBeInTheDocument();
  });

  it("sync now calls normal push workflow once and never calls migration", async () => {
    seedScopedQueue({
      version: 4,
      deviceId: "device-local",
      deviceName: "This device",
      csrfToken: null,
      pending: [{ client_mutation_id: "mut-1", device_id: "device-local", entity_type: "meal_log", entity_id: "meal-1", mutation_type: "upsert", created_at: "2026-07-15T00:00:00.000Z", payload: { client_record_id: "meal-1", version: 2 } }],
      failed: [],
      lastSyncAt: null,
      recentActivity: []
    });
    apiRequestMock.mockResolvedValueOnce({
      results: [{ mutation_id: "server-mut-1", entity_type: "meal_log", entity_id: "meal-1", status: "applied", server_version: 3, payload: {} }],
      server_time: "2026-07-15T10:00:00.000Z"
    }).mockResolvedValueOnce({ records: [], server_time: "2026-07-15T10:00:01.000Z" });
    render(<SyncDataPage />);

    const button = await screen.findByRole("button", { name: /sync now/i });
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledTimes(2));
    expect(apiRequestMock).toHaveBeenCalledWith("/sync/push", expect.any(Object));
    expect(apiRequestMock).toHaveBeenCalledWith("/sync/pull", undefined);
    expect(apiRequestMock).not.toHaveBeenCalledWith("/sync/migrate", expect.any(Object));
    await waitFor(() => expect(screen.getAllByText(/Sync completed/i).length).toBeGreaterThan(0));
  });

  it("does not report success when pull fails after push", async () => {
    seedScopedQueue({
      version: 4,
      deviceId: "device-local",
      deviceName: "This device",
      csrfToken: null,
      pending: [{ client_mutation_id: "mut-1", device_id: "device-local", entity_type: "meal_log", entity_id: "meal-1", mutation_type: "upsert", created_at: "2026-07-15T00:00:00.000Z", payload: { client_record_id: "meal-1", version: 2 } }],
      failed: [],
      lastSyncAt: null,
      recentActivity: []
    });
    apiRequestMock.mockResolvedValueOnce({
      results: [{ mutation_id: "server-mut-1", entity_type: "meal_log", entity_id: "meal-1", status: "applied", server_version: 3, payload: {} }],
      server_time: "2026-07-15T10:00:00.000Z"
    }).mockRejectedValueOnce(new Error("pull failed"));
    render(<SyncDataPage />);

    fireEvent.click(await screen.findByRole("button", { name: /sync now/i }));

    await waitFor(() => expect(screen.getByText(/Push accepted, but pull failed/i)).toBeInTheDocument());
    const scopedQueue = window.localStorage.getItem("project-suiii:user-1:device-local:syncQueue:v4");
    expect(scopedQueue).not.toContain("mut-1");
    expect(scopedQueue).not.toContain("lastSyncAt\":\"2026");
  });

  it("reviews device data summaries and expands readable records without auth secrets", async () => {
    seedMigrationData();
    window.localStorage.setItem("project-suiii:phase-4-csrf", "csrf-secret");
    render(<SyncDataPage />);

    fireEvent.click(await screen.findByRole("button", { name: /review device data/i }));
    expect(await screen.findByRole("heading", { name: /review/i })).toBeInTheDocument();
    expect(screen.getByText(/Nutrition/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Nutrition/i }));

    expect((await screen.findAllByText(/pre-badminton/i)).length).toBeGreaterThan(0);
    expect(screen.queryByText(/csrf-secret/i)).not.toBeInTheDocument();
  });

  it("labels malformed device data safely in review", async () => {
    window.localStorage.setItem("project-suiii:phase-2-nutrition", "{bad");
    render(<SyncDataPage />);

    fireEvent.click(await screen.findByRole("button", { name: /review device data/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Nutrition/i }));

    expect((await screen.findAllByText(/Needs attention/i)).length).toBeGreaterThan(0);
    expect(screen.getByText(/could not be read safely/i)).toBeInTheDocument();
  });

  it("exports device data and reports export failures safely", async () => {
    seedMigrationData();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn() });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    const createUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:backup");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    render(<SyncDataPage />);

    fireEvent.click(await screen.findByRole("button", { name: /export my data/i }));

    expect(await screen.findByText(/project-suiii-device-backup/i)).toBeInTheDocument();
    expect(createUrl).toHaveBeenCalled();
    expect(window.localStorage.getItem("project-suiii:phase-2-nutrition")).toContain("2026-07-15:pre-badminton");

    createUrl.mockImplementationOnce(() => { throw new Error("blocked"); });
    fireEvent.click(screen.getByRole("button", { name: /export my data/i }));
    expect(await screen.findByText(/Export failed/i)).toBeInTheDocument();
  });

  it("redirects without calling the API when no local migration data remains", async () => {
    render(<LocalMigrationPage />);
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/"));
    expect(refreshMock).toHaveBeenCalled();
    expect(apiRequestMock).not.toHaveBeenCalled();
  });

  it("marks confirmed migrated records and replaces the route on full success", async () => {
    seedMigrationData();
    apiRequestMock.mockResolvedValue(migrationResponse({ imported_records: 3, summary: { meal_logs: 1, workout_sessions: 1, daily_check_ins: 1, sets: 0, date_range: "2026-07-15", total_records: 3 } }));
    render(<LocalMigrationPage />);

    fireEvent.click(await screen.findByRole("button", { name: /import/i }));

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/"));
    expect(apiRequestMock).toHaveBeenCalledTimes(1);
    const request = JSON.parse(String((apiRequestMock.mock.calls[0][1] as { body: string }).body)) as { records: { entity_type: string; payload: Record<string, unknown> }[] };
    const daily = request.records.find((record) => record.entity_type === "daily_tracking");
    expect(daily?.payload).not.toHaveProperty("water_ml");
    expect(daily?.payload).not.toHaveProperty("cigarettes");
    expect(window.localStorage.getItem("project-suiii:phase-2-nutrition")).toContain("2026-07-15:pre-badminton");
    expect(window.localStorage.getItem("project-suiii:phase-2-nutrition")).toContain("migratedAt");
    expect(window.localStorage.getItem("project-suiii:phase-3-training")).toContain("session-1");
    expect(window.localStorage.getItem("project-suiii:phase-3-training")).toContain("readiness-2026-07-15");
  });

  it("does not clear local records before backend confirmation", async () => {
    seedMigrationData();
    let resolveRequest: (value: unknown) => void = () => undefined;
    apiRequestMock.mockReturnValue(new Promise((resolve) => {
      resolveRequest = resolve;
    }));
    render(<LocalMigrationPage />);

    fireEvent.click(await screen.findByRole("button", { name: /import/i }));
    expect(window.localStorage.getItem("project-suiii:phase-2-nutrition")).toContain("2026-07-15:pre-badminton");
    await act(async () => {
      resolveRequest(migrationResponse({ imported_records: 3, summary: { meal_logs: 1, workout_sessions: 1, daily_check_ins: 1, sets: 0, date_range: "2026-07-15", total_records: 3 } }));
    });

    await waitFor(() => expect(window.localStorage.getItem("project-suiii:phase-2-nutrition")).toContain("migratedAt"));
  });

  it("treats already-existing records as successful completion", async () => {
    seedMigrationData();
    apiRequestMock.mockResolvedValue(migrationResponse({ imported_records: 0, skipped_records: 3, summary: { meal_logs: 1, workout_sessions: 1, daily_check_ins: 1, sets: 0, date_range: "2026-07-15", total_records: 3 } }));
    render(<LocalMigrationPage />);

    fireEvent.click(await screen.findByRole("button", { name: /import/i }));

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/"));
    expect(window.localStorage.getItem("project-suiii:phase-2-nutrition")).toContain("migratedAt");
  });

  it("keeps rejected records locally and remains on the page for partial success", async () => {
    seedMigrationData();
    apiRequestMock.mockResolvedValue(migrationResponse({
      imported_records: 2,
      error_records: 1,
      status: "completed_with_errors",
      summary: {
        meal_logs: 1,
        workout_sessions: 1,
        daily_check_ins: 1,
        sets: 0,
        date_range: "2026-07-15",
        total_records: 3,
        rejected_items: [{ record_type: "meal_log", client_record_id: "2026-07-15:pre-badminton", status: "rejected", code: "invalid_timestamp", message: "Invalid timestamp" }]
      }
    }));
    render(<LocalMigrationPage />);

    fireEvent.click(await screen.findByRole("button", { name: /import/i }));

    expect(await screen.findByText(/need attention/i)).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalledWith("/");
    expect(window.localStorage.getItem("project-suiii:phase-2-nutrition")).toContain("2026-07-15:pre-badminton");
    expect(window.localStorage.getItem("project-suiii:phase-3-training")).toContain("migratedAt");
  });

  it("retains all local data on HTTP 500 or network failure", async () => {
    for (const error of [new Error("500"), new TypeError("network")]) {
      vi.clearAllMocks();
      resetNutritionStateForTests();
      resetTrainingStateForTests();
      seedMigrationData();
      apiRequestMock.mockRejectedValueOnce(error);
      const view = render(<LocalMigrationPage />);

      fireEvent.click(await screen.findByRole("button", { name: /import/i }));

      expect(await screen.findByText(/local data remains/i)).toBeInTheDocument();
      expect(window.localStorage.getItem("project-suiii:phase-2-nutrition")).toContain("2026-07-15:pre-badminton");
      view.unmount();
    }
  });

  it("prevents duplicate submission while pending and after success", async () => {
    seedMigrationData();
    let resolveRequest: (value: unknown) => void = () => undefined;
    apiRequestMock.mockReturnValue(new Promise((resolve) => {
      resolveRequest = resolve;
    }));
    render(<LocalMigrationPage />);

    const button = await screen.findByRole("button", { name: /import/i });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(apiRequestMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveRequest(migrationResponse({ imported_records: 3, summary: { meal_logs: 1, workout_sessions: 1, daily_check_ins: 1, sets: 0, date_range: "2026-07-15", total_records: 3 } }));
    });

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/"));
    fireEvent.click(button);
    expect(apiRequestMock).toHaveBeenCalledTimes(1);
  });

  it("does not auto-submit on render or rerender", async () => {
    seedMigrationData();
    const view = render(<LocalMigrationPage />);
    await screen.findByRole("button", { name: /import/i });
    view.rerender(<LocalMigrationPage />);
    expect(apiRequestMock).not.toHaveBeenCalled();
  });

  it("uses route replacement for the continue fallback", async () => {
    seedMigrationData();
    apiRequestMock.mockResolvedValue(migrationResponse({
      imported_records: 2,
      error_records: 1,
      status: "completed_with_errors",
      summary: {
        meal_logs: 1,
        workout_sessions: 1,
        daily_check_ins: 1,
        sets: 0,
        date_range: "2026-07-15",
        total_records: 3,
        rejected_items: [{ record_type: "meal_log", client_record_id: "2026-07-15:pre-badminton", status: "rejected", code: "invalid_timestamp", message: "Invalid timestamp" }]
      }
    }));
    render(<LocalMigrationPage />);

    fireEvent.click(await screen.findByRole("button", { name: /import/i }));
    fireEvent.click(await screen.findByRole("button", { name: /continue to dashboard/i }));

    expect(replaceMock).toHaveBeenCalledWith("/");
    expect(refreshMock).toHaveBeenCalled();
  });
});
