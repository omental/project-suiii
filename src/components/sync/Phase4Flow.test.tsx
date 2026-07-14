import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignInPage } from "@/components/auth/SignInPage";
import { LocalMigrationPage } from "@/components/sync/LocalMigrationPage";
import { SyncDataPage } from "@/components/sync/SyncDataPage";
import { resetSyncQueueForTests } from "@/lib/syncQueue";
import { resetNutritionStateForTests } from "@/lib/nutritionRepository";
import { resetTrainingStateForTests } from "@/lib/trainingRepository";

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>("next/navigation");
  return {
    ...actual,
    usePathname: () => "/sync",
    useRouter: () => ({ push: vi.fn() })
  };
});

describe("Phase 4 auth and sync screens", () => {
  beforeEach(() => {
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
});
