import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TodayDashboard } from "@/components/TodayDashboard";
import { FormGuidePage } from "@/components/training/FormGuidePage";
import { TrainDashboard } from "@/components/training/TrainDashboard";
import { TrainingHistory } from "@/components/training/TrainingHistory";
import { WorkoutPlayer } from "@/components/training/WorkoutPlayer";
import { createWorkoutSession, defaultPhase3TrainingState, resetTrainingStateForTests, writeTrainingState } from "@/lib/trainingRepository";
import { resetNutritionStateForTests } from "@/lib/nutritionRepository";
import { getExerciseDefinition, getWorkoutDefinition } from "@/data/training";

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

  it("renders every exercise in the current workout preview without a hidden-count row", async () => {
    vi.setSystemTime(new Date("2026-07-14T23:30:00.000Z"));
    const workout = getWorkoutDefinition("full-body-c");
    render(<TrainDashboard />);

    const preview = (await screen.findByRole("heading", { name: /workout preview/i })).closest("section")!;
    workout.exercises.forEach((prescription) => {
      expect(within(preview).getByText(getExerciseDefinition(prescription.exerciseId).name)).toBeInTheDocument();
    });
    expect(within(preview).queryByText(new RegExp(`\\+\\s*\\d+\\s*${["more", "exercises"].join(" ")}`, "i"))).not.toBeInTheDocument();
    expect(within(preview).getAllByText(/sets/i)).toHaveLength(workout.exercises.length);
  });

  it("matches Full Body C exercise order and preserves unilateral, weight, reps and sets details", async () => {
    vi.setSystemTime(new Date("2026-07-14T23:30:00.000Z"));
    const workout = getWorkoutDefinition("full-body-c");
    render(<TrainDashboard />);

    const preview = (await screen.findByRole("heading", { name: /workout preview/i })).closest("section")!;
    const names = Array.from(preview.querySelectorAll(".font-bold.text-white")).map((item) => item.textContent);
    expect(names).toEqual(workout.exercises.map((item) => getExerciseDefinition(item.exerciseId).name));
    expect(within(preview).getByText(/2 sets · 12 each arm · 7.5 kg/i)).toBeInTheDocument();
    expect(within(preview).getByText(/2 sets · 8-12 · 5 kg pair/i)).toBeInTheDocument();
    expect(within(preview).getByText(/2 sets · 20-30 each side · Bodyweight/i)).toBeInTheDocument();
  });

  it("starts the guided workout for the current preview workout", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.setSystemTime(new Date("2026-07-14T23:30:00.000Z"));
    render(<TrainDashboard />);

    await user.click(await screen.findByRole("button", { name: /start today's workout/i }));

    expect(push).toHaveBeenCalledWith(expect.stringMatching(/^\/train\/session\/session-2026-07-15-full-body-c-/));
  });

  it("does not render a strength preview on Friday rest day", async () => {
    vi.setSystemTime(new Date("2026-07-16T23:30:00.000Z"));
    render(<TrainDashboard />);

    expect(await screen.findByRole("heading", { name: /complete rest/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /workout preview/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Dumbbell Sumo Squat/i)).not.toBeInTheDocument();
  });

  it("updates the preview when the Dhaka programme day changes", async () => {
    vi.setSystemTime(new Date("2026-07-14T17:30:00.000Z"));
    render(<TrainDashboard />);
    expect(await screen.findAllByText(/Shoulder Care/i)).not.toHaveLength(0);

    vi.setSystemTime(new Date("2026-07-14T18:01:00.000Z"));
    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    await waitFor(() => expect(screen.getAllByText(/Full Body C/i).length).toBeGreaterThan(0));
    expect(screen.getByText(/Dumbbell Sumo Squat/i)).toBeInTheDocument();
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

  it("restores an active session on the dashboard with review and confirmed discard actions", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let state = createWorkoutSession(defaultPhase3TrainingState, "2026-07-14", "full-body-a", null);
    state = { ...state, sessions: { ...state.sessions, [state.activeSessionId!]: { ...state.sessions[state.activeSessionId!], updatedAt: "2026-07-14T12:02:00.000Z" } } };
    writeTrainingState(state);

    render(<TrainDashboard />);

    expect(await screen.findByText(/Resume Full Body A/i)).toBeInTheDocument();
    expect(screen.getByText(/current: Goblet Squat/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^resume$/i })).toHaveAttribute("href", `/train/session/${state.activeSessionId}`);
    expect(screen.getByRole("link", { name: /review/i })).toHaveAttribute("href", `/train/session/${state.activeSessionId}/complete`);
    await user.click(screen.getByRole("button", { name: /discard/i }));
    expect(screen.getByRole("heading", { name: /discard saved workout/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /keep workout/i }));
    expect(screen.queryByRole("heading", { name: /discard saved workout/i })).not.toBeInTheDocument();
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
    expect(screen.getByText(/Recovery day protected/i)).toBeInTheDocument();
    expect(screen.getByText(/Accessible chart values/i)).toBeInTheDocument();
    expect(screen.getByText(/Next Progression/i)).toBeInTheDocument();
  });

  it("integrates training into Today with a route-backed workout CTA", () => {
    render(<TodayDashboard />);
    expect(screen.getAllByText(/Shoulder Care/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /start workout/i })).toHaveAttribute("href", "/train");
  });
});
