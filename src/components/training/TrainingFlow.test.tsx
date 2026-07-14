import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TodayDashboard } from "@/components/TodayDashboard";
import { FormGuidePage } from "@/components/training/FormGuidePage";
import { TrainDashboard } from "@/components/training/TrainDashboard";
import { TrainingHistory } from "@/components/training/TrainingHistory";
import { WorkoutPlayer } from "@/components/training/WorkoutPlayer";
import { createWorkoutSession, defaultPhase3TrainingState, resetTrainingStateForTests, writeTrainingState } from "@/lib/trainingRepository";
import { resetNutritionStateForTests } from "@/lib/nutritionRepository";

const push = vi.fn();

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>("next/navigation");
  return {
    ...actual,
    usePathname: () => "/train",
    useRouter: () => ({ push })
  };
});

describe("Phase 3 training flow", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-07-13T23:30:00.000Z"));
    resetTrainingStateForTests();
    resetNutritionStateForTests();
    push.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the Train dashboard, schedule, readiness and real start action", () => {
    render(<TrainDashboard />);
    expect(screen.getByRole("heading", { name: /^train$/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Shoulder Care/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Weekly Schedule/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Readiness/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /start workout/i })).toBeInTheDocument();
  });

  it("renders workout player controls and form-guide navigation", async () => {
    const state = createWorkoutSession(defaultPhase3TrainingState, "2026-07-14", "full-body-a", null);
    writeTrainingState(state);
    render(<WorkoutPlayer sessionId={state.activeSessionId!} />);
    expect(await screen.findByRole("heading", { name: /full body a/i })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: /workout progress/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/repetitions/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /form guide/i })).toHaveAttribute("href", `/train/session/${state.activeSessionId}/exercise/goblet-squat/form`);
  });

  it("logs a set and opens the absolute rest timer state", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const state = createWorkoutSession(defaultPhase3TrainingState, "2026-07-14", "full-body-a", null);
    writeTrainingState(state);
    render(<WorkoutPlayer sessionId={state.activeSessionId!} />);
    expect(await screen.findByRole("heading", { name: /full body a/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /complete set/i }));
    expect(await screen.findByText(/Original rest 75s/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /\+15s/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start set/i })).toBeInTheDocument();
  });

  it("renders detailed form guide and discomfort action", async () => {
    const state = createWorkoutSession(defaultPhase3TrainingState, "2026-07-14", "full-body-a", null);
    writeTrainingState(state);
    render(<FormGuidePage sessionId={state.activeSessionId!} exerciseId="goblet-squat" />);
    expect(await screen.findByRole("heading", { name: /goblet squat/i })).toBeInTheDocument();
    expect(screen.getByText(/Hold one dumbbell vertically/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mark exercise uncomfortable/i })).toBeInTheDocument();
  });

  it("renders history, progression recommendation and accessible chart text", () => {
    render(<TrainingHistory />);
    expect(screen.getByRole("heading", { name: /training history/i })).toBeInTheDocument();
    expect(screen.getByText(/Friday recovery protected/i)).toBeInTheDocument();
    expect(screen.getByText(/Accessible chart values/i)).toBeInTheDocument();
    expect(screen.getByText(/Next Progression/i)).toBeInTheDocument();
  });

  it("integrates training into Today with a route-backed workout CTA", () => {
    render(<TodayDashboard />);
    expect(screen.getAllByText(/Shoulder Care/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /start workout/i })).toHaveAttribute("href", "/train");
  });
});
