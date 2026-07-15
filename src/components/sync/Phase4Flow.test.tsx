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
const apiRequestMock = vi.fn();

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>("next/navigation");
  return {
    ...actual,
    usePathname: () => "/sync",
    useRouter: () => ({ push: vi.fn(), replace: replaceMock, refresh: refreshMock })
  };
});

vi.mock("@/lib/apiClient", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
  login: vi.fn(),
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
        updatedAt: "2026-07-15T06:08:32.205Z"
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
        exerciseSessions: []
      }
    },
    activeSessionId: null,
    readinessByDate: {
      "2026-07-15": { id: "readiness-2026-07-15", date: "2026-07-15", badmintonGames: 1, energy: "normal", soreness: 2, sleepHours: 7, note: "" }
    },
    uncomfortableExerciseIds: []
  }));
}

describe("Phase 4 auth and sync screens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    window.localStorage.setItem("project-suiii:phase-2-nutrition", JSON.stringify({ version: 2, mealLogs: { a: { id: "a" } } }));
    window.localStorage.setItem("project-suiii:phase-3-training", JSON.stringify({ version: 3, sessions: { s: { exerciseSessions: [{ setLogs: [{ id: "set" }] }] } }, readinessByDate: { "2026-07-14": {} } }));
    render(<LocalMigrationPage />);
    expect(await screen.findByRole("heading", { name: /bring your progress/i })).toBeInTheDocument();
    expect(screen.getByText(/Keep the most recent version/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /import/i })).toBeInTheDocument();
  });

  it("renders Sync & Data status with offline queue sections", async () => {
    render(<SyncDataPage />);
    expect(await screen.findByRole("heading", { name: /sync & data/i })).toBeInTheDocument();
    expect(screen.getByText(/Offline Ready/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Meals/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Sign Out/i)).toBeInTheDocument();
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

  it("clears confirmed migrated records and replaces the route on full success", async () => {
    seedMigrationData();
    apiRequestMock.mockResolvedValue(migrationResponse({ imported_records: 3, summary: { meal_logs: 1, workout_sessions: 1, daily_check_ins: 1, sets: 0, date_range: "2026-07-15", total_records: 3 } }));
    render(<LocalMigrationPage />);

    fireEvent.click(await screen.findByRole("button", { name: /import/i }));

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/"));
    expect(apiRequestMock).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem("project-suiii:phase-2-nutrition")).not.toContain("2026-07-15:pre-badminton");
    expect(window.localStorage.getItem("project-suiii:phase-3-training")).not.toContain("session-1");
    expect(window.localStorage.getItem("project-suiii:phase-3-training")).not.toContain("readiness-2026-07-15");
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

    await waitFor(() => expect(window.localStorage.getItem("project-suiii:phase-2-nutrition")).not.toContain("2026-07-15:pre-badminton"));
  });

  it("treats already-existing records as successful completion", async () => {
    seedMigrationData();
    apiRequestMock.mockResolvedValue(migrationResponse({ imported_records: 0, skipped_records: 3, summary: { meal_logs: 1, workout_sessions: 1, daily_check_ins: 1, sets: 0, date_range: "2026-07-15", total_records: 3 } }));
    render(<LocalMigrationPage />);

    fireEvent.click(await screen.findByRole("button", { name: /import/i }));

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/"));
    expect(window.localStorage.getItem("project-suiii:phase-2-nutrition")).not.toContain("2026-07-15:pre-badminton");
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
    expect(window.localStorage.getItem("project-suiii:phase-3-training")).not.toContain("session-1");
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
