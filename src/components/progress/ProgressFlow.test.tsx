import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, beforeEach } from "vitest";
import { ProgressDashboard } from "@/components/progress/ProgressDashboard";
import { ProgressHistoryPage } from "@/components/progress/ProgressHistoryPage";
import { ProgressPhotosPage } from "@/components/progress/ProgressPhotosPage";
import { WeeklyCheckInPage } from "@/components/progress/WeeklyCheckInPage";
import { WeeklyReviewPage } from "@/components/progress/WeeklyReviewPage";
import { ReportsPage } from "@/components/progress/ReportsPage";
import { resetProgressStateForTests, writeProgressState, defaultProgressState } from "@/lib/progressRepository";

describe("Phase 5 progress flow", () => {
  beforeEach(() => {
    resetProgressStateForTests();
  });

  it("renders progress dashboard empty states and check-in action", () => {
    render(<ProgressDashboard />);
    expect(screen.getByRole("heading", { name: /Progress/i })).toBeInTheDocument();
    expect(screen.getByText(/No measurements yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Start Check-In/i })).toBeInTheDocument();
  });

  it("validates weekly check-in measurement input and saves draft", async () => {
    const user = userEvent.setup();
    render(<WeeklyCheckInPage />);
    await user.clear(screen.getByLabelText(/Weight/i));
    await user.clear(screen.getByLabelText(/Waist at navel/i));
    await user.click(screen.getByRole("button", { name: /Save Without Photos/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/Enter at least/i);
  });

  it("renders photo capture fallback and privacy state", () => {
    render(<ProgressPhotosPage />);
    expect(screen.getByRole("heading", { name: /Capture Consistently/i })).toBeInTheDocument();
    expect(screen.getByText(/Choose From Device/i)).toBeInTheDocument();
    expect(screen.getByText(/not considered backed up/i)).toBeInTheDocument();
  });

  it("renders history, weekly review and report controls with stored data", () => {
    writeProgressState({
      ...defaultProgressState,
      measurements: {
        one: { id: "one", clientRecordId: "c1", measuredAt: "2026-07-15T00:00:00.000Z", localDate: "2026-07-15", weightKg: 78, waistIn: 38, chestIn: null, armIn: null, thighIn: null, source: "manual", note: "", version: 1, deletedAt: null }
      },
      checkIns: {
        check: { id: "check", clientRecordId: "cc", weekNumber: 1, checkInDate: "2026-07-15", status: "completed", energy: "normal", hunger: "normal", digestion: "good", averageSleepMinutes: 420, privateNote: "", measurementId: "one", completedAt: "2026-07-15T00:00:00.000Z", version: 1, deletedAt: null }
      }
    });
    render(<ProgressHistoryPage />);
    expect(screen.getByText(/Weight 78/i)).toBeInTheDocument();
    render(<WeeklyReviewPage checkInId="check" />);
    expect(screen.getByText(/Coaching Insight/i)).toBeInTheDocument();
    render(<ReportsPage />);
    expect(screen.getByRole("button", { name: /Generate Weekly PDF/i })).toBeInTheDocument();
  });
});
