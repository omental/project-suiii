import { describe, expect, it } from "vitest";
import { getMealDefinition } from "@/data/nutrition";
import {
  createInitialLogs,
  differenceStatus,
  mealLogId,
  mealLogNutrition,
  mealPlannedNutrition,
  nutritionFor,
  roundNutrition,
  validateActualAmount
} from "@/lib/nutritionCalc";
import { completeMeal, defaultPhase2State, readNutritionState, skipMeal } from "@/lib/nutritionRepository";
import { resetNutritionStateForTests, writeNutritionState } from "@/lib/nutritionRepository";

describe("nutrition calculation engine", () => {
  it("calculates food nutrition from per-100g values", () => {
    expect(roundNutrition(nutritionFor("banana", 120))).toEqual({
      calories: 107,
      protein: 1,
      carbs: 28,
      fat: 0
    });
  });

  it("derives meal planned nutrition from ingredient data", () => {
    const meal = getMealDefinition("2026-07-14", "lunch");
    expect(meal).toBeDefined();
    expect(roundNutrition(mealPlannedNutrition(meal!)).calories).toBeGreaterThan(600);
  });

  it("recalculates actual meal nutrition from logs and avoids skipped ingredients", () => {
    const meal = getMealDefinition("2026-07-14", "pre-badminton")!;
    const logs = createInitialLogs(meal).map((log, index) => ({
      ...log,
      actualAmount: index === 0 ? 118 : null,
      skipped: index === 1,
      completedAt: "2026-07-14T08:20:00.000Z"
    }));
    const state = completeMeal(defaultPhase2State, "2026-07-14", meal.id, logs);
    const logged = state.mealLogs[mealLogId("2026-07-14", meal.id)];
    expect(roundNutrition(mealLogNutrition(logged)).calories).toBe(105);
  });

  it("validates impossible amounts and classifies differences", () => {
    expect(validateActualAmount(0, 120)).toMatch(/positive/i);
    expect(validateActualAmount(Number.POSITIVE_INFINITY, 120)).toMatch(/valid/i);
    expect(differenceStatus(120, 120)).toBe("on_target");
    expect(differenceStatus(80, 120)).toBe("materially_under");
  });

  it("stores skipped meals without nutrition", () => {
    const state = skipMeal(defaultPhase2State, "2026-07-14", "lunch");
    const log = state.mealLogs[mealLogId("2026-07-14", "lunch")];
    expect(log.status).toBe("skipped");
    expect(roundNutrition(mealLogNutrition(log)).calories).toBe(0);
  });
});

describe("local-state migration", () => {
  it("recovers phase 1 water and cigarette state", () => {
    resetNutritionStateForTests();
    window.localStorage.setItem(
      "project-suiii:phase-1-dashboard",
      JSON.stringify({
        version: 1,
        waterIncrementsMl: [250],
        cigaretteIncrements: [1],
        completedTimelineIds: ["hydration-0645"],
        weighing: { actionId: "pre-badminton-fuel", actualGrams: 118, completed: true }
      })
    );
    const state = readNutritionState();
    expect(state.version).toBe(2);
    expect(state.waterIncrementsMl).toEqual([250]);
    expect(state.cigaretteIncrements).toEqual([1]);
  });

  it("recovers malformed phase 2 data safely", () => {
    resetNutritionStateForTests();
    window.localStorage.setItem("project-suiii:phase-2-nutrition", "{bad");
    expect(readNutritionState()).toEqual(defaultPhase2State);
    writeNutritionState(defaultPhase2State);
    expect(readNutritionState().version).toBe(2);
  });
});
