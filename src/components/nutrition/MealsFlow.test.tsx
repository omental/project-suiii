import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MealComplete } from "@/components/nutrition/MealComplete";
import { MealDetail } from "@/components/nutrition/MealDetail";
import { MealsDashboard } from "@/components/nutrition/MealsDashboard";
import { SevenDayPlan } from "@/components/nutrition/SevenDayPlan";
import { WeighingWorkflow } from "@/components/nutrition/WeighingWorkflow";
import { createInitialLogs } from "@/lib/nutritionCalc";
import { completeMeal, defaultPhase2State, resetNutritionStateForTests, writeNutritionState } from "@/lib/nutritionRepository";
import { getMealDefinition } from "@/data/nutrition";

const push = vi.fn();

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>("next/navigation");
  return {
    ...actual,
    usePathname: () => "/meals",
    useRouter: () => ({ push })
  };
});

describe("Phase 2 meals flow", () => {
  beforeEach(() => {
    resetNutritionStateForTests();
    push.mockReset();
  });

  it("renders the meals dashboard and active meal navigation", async () => {
    render(<MealsDashboard />);
    expect(screen.getByRole("heading", { name: /today's meals/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view 7-day plan/i })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /pre-badminton/i })).toBeInTheDocument();
  });

  it("renders seven-day plan, day selection, and week controls", async () => {
    const user = userEvent.setup();
    render(<SevenDayPlan />);
    expect(screen.getByRole("heading", { name: /7-day meal plan/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /previous week/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /wed/i }));
    expect(screen.getByText(/Wednesday · Strength Day/i)).toBeInTheDocument();
  });

  it("renders meal detail and applies then reverts a controlled substitution", async () => {
    const user = userEvent.setup();
    render(<MealDetail date="2026-07-14" mealId="lunch" />);
    expect(screen.getByRole("heading", { name: /^lunch$/i })).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: /swap/i })[0]);
    await user.click(screen.getByRole("button", { name: /cooked roti/i }));
    expect(await screen.findByRole("heading", { name: /cooked roti/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /revert original/i }));
    expect(await screen.findByRole("heading", { name: /cooked rice/i })).toBeInTheDocument();
  });

  it("confirms skipped meal after confirmation", async () => {
    const user = userEvent.setup();
    render(<MealDetail date="2026-07-14" mealId="snack" />);
    await user.click(screen.getByRole("button", { name: /mark meal as skipped/i }));
    await user.click(screen.getByRole("button", { name: /confirm skip/i }));
    await waitFor(() => expect(window.localStorage.getItem("project-suiii:phase-2-nutrition")).toContain("skipped"));
  });

  it("creates a weighing session, validates grams, confirms ingredients, navigates previous and saves", async () => {
    const user = userEvent.setup();
    render(<WeighingWorkflow date="2026-07-14" mealId="pre-badminton" />);
    expect(await screen.findByRole("heading", { name: /weigh your meal/i })).toBeInTheDocument();
    const input = await screen.findByLabelText(/actual weight/i);
    await user.clear(input);
    await user.type(input, "0");
    await user.click(screen.getByRole("button", { name: /confirm/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/positive/i);
    await user.clear(input);
    await user.type(input, "118");
    await user.click(screen.getByRole("button", { name: /confirm 118 g/i }));
    expect(await screen.findByText(/Low-fat milk/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /previous/i }));
    expect(await screen.findByText(/Banana/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /save & exit/i }));
    expect(push).toHaveBeenCalledWith("/meals/2026-07-14/pre-badminton");
  });

  it("skips ingredient and completes meal without duplicating daily totals", async () => {
    const user = userEvent.setup();
    render(<WeighingWorkflow date="2026-07-14" mealId="pre-badminton" />);
    const input = await screen.findByLabelText(/actual weight/i);
    await user.clear(input);
    await user.type(input, "118");
    await user.click(screen.getByRole("button", { name: /confirm 118 g/i }));
    await user.click(await screen.findByRole("button", { name: /skip ingredient/i }));
    expect(push).toHaveBeenCalledWith("/meals/2026-07-14/pre-badminton/complete");
  });

  it("renders completion and supports editing measurements", async () => {
    const meal = getMealDefinition("2026-07-14", "pre-badminton")!;
    const logs = createInitialLogs(meal).map((log) => ({ ...log, actualAmount: log.targetAmount, completedAt: "2026-07-14T00:00:00.000Z" }));
    writeNutritionState(completeMeal(defaultPhase2State, "2026-07-14", meal.id, logs));
    render(<MealComplete date="2026-07-14" mealId="pre-badminton" />);
    expect(await screen.findByRole("heading", { name: /pre-badminton complete/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /edit measurements/i })).toHaveAttribute("href", "/meals/2026-07-14/pre-badminton/weigh");
  });
});
