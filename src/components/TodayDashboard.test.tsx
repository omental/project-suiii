import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TodayDashboard } from "@/components/TodayDashboard";
import { createInitialLogs } from "@/lib/nutritionCalc";
import { completeMeal, defaultPhase2State, resetNutritionStateForTests, writeNutritionState } from "@/lib/nutritionRepository";
import { resetTrainingStateForTests } from "@/lib/trainingRepository";
import { getMealDefinition } from "@/data/nutrition";

describe("TodayDashboard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-07-13T23:30:00.000Z"));
    resetNutritionStateForTests();
    resetTrainingStateForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the Today dashboard without private identity fallback values", () => {
    render(<TodayDashboard />);

    expect(screen.getByRole("heading", { name: /good morning, athlete/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /project suiii/i })).toBeInTheDocument();
    expect(screen.queryByText(/mubasshir/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/79.0 kg/i)).not.toBeInTheDocument();
    expect(screen.queryByText(new RegExp(["73", "74"].join("-") + " kg", "i"))).not.toBeInTheDocument();
    expect(screen.queryByText(new RegExp(["38", "5"].join(".") + " in", "i"))).not.toBeInTheDocument();
  });

  it("links the next action to the weighing workflow", () => {
    render(<TodayDashboard />);

    expect(screen.getByRole("link", { name: /start weighing/i })).toHaveAttribute(
      "href",
      "/meals/2026-07-14/pre-badminton/weigh"
    );
  });

  it("reflects completed meal nutrition from the shared repository", async () => {
    const meal = getMealDefinition("2026-07-14", "pre-badminton")!;
    const logs = createInitialLogs(meal).map((log) => ({ ...log, actualAmount: log.targetAmount, completedAt: "2026-07-14T00:00:00.000Z" }));
    writeNutritionState(completeMeal(defaultPhase2State, "2026-07-14", meal.id, logs));

    render(<TodayDashboard />);
    expect(await screen.findByText(/Pre-badminton/i)).toBeInTheDocument();
    expect(screen.getByText(/Done/i)).toBeInTheDocument();
  });

  it("increments and undoes water", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<TodayDashboard />);

    expect(screen.getByText(/Water: 0.0 of 2.5 L/i)).toBeInTheDocument();
    const waterControl = screen.getByRole("group", { name: /water quick actions/i });
    await user.click(within(waterControl).getByRole("button", { name: /\+250 ml/i }));
    expect(screen.getByText(/Water: 0.3 of 2.5 L/i)).toBeInTheDocument();
    await user.click(within(waterControl).getByRole("button", { name: /undo/i }));
    expect(screen.getByText(/Water: 0.0 of 2.5 L/i)).toBeInTheDocument();
  });

  it("increments and undoes cigarettes while preventing negative values", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<TodayDashboard />);

    const cigaretteControl = screen.getByRole("group", { name: /cigarettes quick actions/i });
    const undo = within(cigaretteControl).getByRole("button", { name: /undo/i });
    expect(undo).toBeDisabled();

    await user.click(within(cigaretteControl).getByRole("button", { name: /\+1/i }));
    expect(screen.getByText(/Cigarettes: 1 of 10/i)).toBeInTheDocument();
    await user.click(undo);
    expect(screen.getByText(/Cigarettes: 0 of 10/i)).toBeInTheDocument();
    expect(undo).toBeDisabled();
  });

  it("links the workout preview to the Phase 3 Train flow", () => {
    render(<TodayDashboard />);

    expect(screen.getAllByText(/Shoulder Care/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /start workout/i })).toHaveAttribute("href", "/train");
  });
});
